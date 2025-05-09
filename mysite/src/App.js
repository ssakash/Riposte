import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
  setAnswer('');
  setLoading(true);
  try {
    const res = await fetch('http://localhost:5000/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let fullAnswer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      fullAnswer += chunk;
      setAnswer(prev => prev + chunk); // live typing effect
    }

  } catch (err) {
    setAnswer('Something went wrong.');
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="container">
      <h1>Ask a Question</h1>
      <textarea
        className="question-box"
        rows={4}
        placeholder="Type your question here..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button className="ask-button" onClick={askQuestion} disabled={loading}>
        {loading ? 'Thinking...' : 'Ask'}
      </button>

      {answer && (
<p className="answer-box" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
  {answer}
</p>


)}
    </div>
  );
}

export default App;
