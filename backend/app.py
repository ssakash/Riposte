import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route('/ask', methods=['POST', 'OPTIONS'])
def ask():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    question = data.get("question", "").strip()

    if not question:
        return jsonify({'error': 'Question is empty'}), 400

    try:
        response = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": "llama3",
                "messages": [
                    {"role": "user", "content": question}
                ],
                "stream": False  # Disable streaming to get single JSON
            }
        )
        result = response.json()
        answer = result['message']['content'].strip()
        return jsonify({'answer': answer})


    except Exception as e:
        print("Error using Ollama:", e)
        return jsonify({'error': 'LLM call failed'}), 500

if __name__ == '__main__':
    app.run(debug=True)
