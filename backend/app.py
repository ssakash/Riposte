from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import random
import string
import requests
import json 
import traceback

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quiz.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(8), unique=True, nullable=False)
    max_players = db.Column(db.Integer)
    complete = db.Column(db.Boolean, default=False)

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    session_id = db.Column(db.Integer, db.ForeignKey('session.id'))
    answers = db.Column(db.PickleType)  # list of answers
    completed = db.Column(db.Boolean, default=False)


def generate_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@app.route("/create-session", methods=["POST"])
def create_session():
    data = request.get_json()
    max_players = data.get("max_players", 2)
    code = generate_code()

    session = Session(code=code, max_players=max_players)
    db.session.add(session)
    db.session.commit()
    return jsonify({"session_code": code})

@app.route("/join-session", methods=["POST"])
def join_session():
    data = request.get_json()
    code = data.get("session_code")
    name = data.get("name")

    session = Session.query.filter_by(code=code).first()
    if not session:
        return jsonify({"error": "Invalid session"}), 400

    player = Player(name=name, session_id=session.id, answers=[])
    db.session.add(player)
    db.session.commit()
    return jsonify({"player_id": player.id, "session_id": session.id})

@app.route("/submit-answer", methods=["POST"])
def submit_answer():
    data = request.get_json()
    player_id = data.get("player_id")
    answer = data.get("answer")

    player = Player.query.get(player_id)
    if not player:
        return jsonify({"error": "Invalid player ID"}), 400

    player.answers.append(answer)
    if len(player.answers) == 10:
        player.completed = True
    db.session.commit()
    return jsonify({"status": "Answer recorded"})

@app.route("/session-status/<code>", methods=["GET"])
def session_status(code):
    session = Session.query.filter_by(code=code).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    players = Player.query.filter_by(session_id=session.id).all()
    status = [{"name": p.name, "completed": p.completed} for p in players]
    all_done = all(p.completed for p in players)

    return jsonify({"players": status, "all_done": all_done})

@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    data = request.get_json()
    topic = data.get("topic")
    if not topic:
        return jsonify({"error": "No topic provided"}), 400

    prompt = (
        f"Generate 3 multiple-choice quiz questions on the topic '{topic}'. "
        "Each question should have 1 correct answer and 3 incorrect ones. "
        "Format the output as a JSON array like this: ["
        "{\"question\": \"...\", \"options\": [\"...\"], \"answer\": \"...\"}, ...]"
    )

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3", "prompt": prompt, "stream": False},
            timeout=60
        )
        response.raise_for_status()
        content = response.json()["response"]

        # Extract JSON array from the response
        start_idx = content.find("[")
        end_idx = content.rfind("]") + 1
        json_text = content[start_idx:end_idx]
        questions = json.loads(json_text)

        return jsonify(questions)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



@app.route("/results/<code>", methods=["GET"])
def get_results(code):
    session = Session.query.filter_by(code=code).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    players = Player.query.filter_by(session_id=session.id).all()
    results = {}
    for p in players:
        traits = {}
        for answer in p.answers:
            traits[answer] = traits.get(answer, 0) + 1
        top_trait = max(traits.items(), key=lambda x: x[1])[0] if traits else "unknown"
        results[p.name] = top_trait

    return jsonify(results)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
