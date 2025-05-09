import os
import requests
import json
from flask import Flask, request, jsonify, Response
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

@app.route('/ask', methods=['POST', 'OPTIONS'])
def ask():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    question = data.get("question", "").strip()

    def generate():
        try:
            response = requests.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": "llama3",
                    "messages": [
                        {"role": "user", "content": question}
                    ],
                    "stream": True
                },
                stream=True
            )
            for line in response.iter_lines():
                if line:
                    json_data = json.loads(line.decode('utf-8'))
                    content = json_data.get("message", {}).get("content", "")
                    yield content
        except Exception as e:
            yield f"\n[ERROR]: {str(e)}"

    return Response(generate(), mimetype='text/plain')

if __name__ == '__main__':
    app.run(debug=True)
