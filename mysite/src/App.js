import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

export default function App() {
  const [name, setName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState(30);
  const [showResult, setShowResult] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState('choose');
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!joined || showResult || showFeedback) return;
    if (countdown === 0) handleAnswer(null);
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, joined, showResult, showFeedback]);

  const createSession = async () => {
    if (!name || !topic) {
      alert("Please enter your name and topic.");
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/create-session', { max_players: 2 });
      const code = res.data.session_code;
      setSessionCode(code);

      const joinRes = await axios.post('http://localhost:5000/join-session', {
        name,
        session_code: code,
      });
      setPlayerId(joinRes.data.player_id);
      setJoined(true);

      const quizRes = await axios.post('http://localhost:5000/generate-quiz', { topic });
      console.log("Quiz response:", quizRes.data);
      setQuestions(quizRes.data);
    } catch (err) {
      console.error(err);
      alert('Failed to create or join session.');
    }
  };

  const joinSession = async () => {
    if (!name || !sessionCode) {
      alert("Please enter your name and session code.");
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/join-session', { name, session_code: sessionCode });
      setPlayerId(res.data.player_id);
      setJoined(true);

      const questionsRes = await axios.get(`http://localhost:5000/get-quiz/${sessionCode}`);
      setQuestions(questionsRes.data);
    } catch {
      alert('Join failed. Check code.');
    }
  };

  const handleAnswer = async (selected) => {
    if (!playerId) {
      alert("Error: player ID missing.");
      return;
    }

    const currentQuestion = questions[currentIndex];
    if (selected === currentQuestion?.answer) setScore(score + 1);

    setSelectedAnswer(selected);
    setShowFeedback(true);

    setTimeout(async () => {
      try {
        await axios.post('http://localhost:5000/submit-answer', { player_id: playerId, answer: selected });

        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(currentIndex + 1);
          setCountdown(30);
          setSelectedAnswer(null);
          setShowFeedback(false);
        } else {
          setShowResult(true);
          const res = await axios.get(`http://localhost:5000/results/${sessionCode}`);
          const leaderboardData = Object.entries(res.data).map(([player, trait]) => ({ player, trait }));
          setLeaderboard(leaderboardData);
        }
      } catch {
        alert('Failed to submit answer. Please try again.');
      }
    }, 1500);
  };

  if (!joined && mode === 'choose') {
    return (
      <div className="page">
        <div className="card">
          <h1>Welcome to the Quiz Game</h1>
          <input className="input" placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)} />
          <div className="mode-buttons">
            <button className="button" onClick={() => setMode('create')}>Create Session</button>
            <button className="button" onClick={() => setMode('join')}>Join Session</button>
          </div>
        </div>
      </div>
    );
  }

  if (!joined && mode === 'create') {
    return (
      <div className="page">
        <div className="card">
          <h2>Create a New Quiz Session</h2>
          <input className="input" placeholder="Topic (e.g. space, history)" value={topic} onChange={e => setTopic(e.target.value)} />
          <button className="button" onClick={createSession}>Create Session</button>
        </div>
      </div>
    );
  }

  if (!joined && mode === 'join') {
    return (
      <div className="page">
        <div className="card">
          <h2>Join a Quiz Session</h2>
          <input className="input" placeholder="Session Code" value={sessionCode} onChange={e => setSessionCode(e.target.value)} />
          <button className="button" onClick={joinSession}>Join</button>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="page">
        <div className="card">
          <h2>Quiz Complete!</h2>
          <p>You scored {score}/{questions.length}</p>
          <h3>Leaderboard:</h3>
          <ul>
            {leaderboard.map((entry, index) => (
              <li key={index}>{entry.player}: {entry.trait}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (!questions[currentIndex]) {
    return (
      <div className="page">
        <div className="card">
          <p>Loading questions or something went wrong. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h2>Question {currentIndex + 1}</h2>
        <p>{questions[currentIndex].question}</p>
        <div className="button-group">
          {questions[currentIndex].options.map((opt, i) => {
            let btnClass = "button";
            if (showFeedback) {
              if (opt === questions[currentIndex].answer) {
                btnClass += " correct";
              } else if (opt === selectedAnswer) {
                btnClass += " wrong";
              }
            }
            return (
              <button
                key={i}
                className={btnClass}
                disabled={showFeedback}
                onClick={() => handleAnswer(opt)}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <p>Time remaining: {countdown} sec</p>
      </div>
    </div>
  );
}