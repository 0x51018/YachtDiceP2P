import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { YachtDiceGame } from './YachtDiceGame';
import Peer from 'peerjs';

const App = () => {
  const gameContainer = useRef(null);
  const gameRef = useRef(null);
  const [peer, setPeer] = useState(null);
  const [connection, setConnection] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [opponentId, setOpponentId] = useState('');
  const [isMatchCreated, setIsMatchCreated] = useState(false);
  const [opponentNickname, setOpponentNickname] = useState('');
  const [localNickname, setLocalNickname] = useState('');
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [joinRequestSent, setJoinRequestSent] = useState(false);
  const idPrefix = 'yacht-';

  useEffect(() => {
    // Create a new peer with a prefixed ID
    const newPeer = new Peer(idPrefix + createRandomId());
    setPeer(newPeer);

    newPeer.on('open', id => {
      setPeerId(id);
    });

    newPeer.on('connection', conn => {
      setConnection(conn);
      conn.on('data', data => {
        if (data.type === 'nickname') {
          setOpponentNickname(data.nickname);
        }
      });
    });

    return () => {
      newPeer.destroy();
    };
  }, []);

  const createRandomId = () => {
    return Math.random().toString(36).slice(2, 7).toUpperCase();
  };

  const handleCreateMatch = () => {
    setIsMatchCreated(true);
  };

  const handleJoinMatch = () => {
    const conn = peer.connect(idPrefix + opponentId);  // Use the prefixed ID
    setJoinRequestSent(true);
    conn.on('open', () => {
      setConnection(conn);
      conn.send({ type: 'nickname', nickname: localNickname });
    });
    conn.on('data', data => {
      if (data.type === 'nickname') {
        setOpponentNickname(data.nickname);
      } else if (data.type === 'startGame') {
        startGame(false);
      }
    });
  };

  const handleStartGame = () => {
    if (connection) {
      connection.send({ type: 'startGame', firstTurn: false });
      startGame(true);
    }
  };

  const startGame = (isFirstPlayer) => {
    setIsMatchCreated(false);
    setIsGameStarted(true);
    const config = {
      type: Phaser.AUTO,
      width: 1280,
      height: 720,
      scene: new YachtDiceGame(connection, peerId, isFirstPlayer),
    };
    if (gameRef.current) {
      gameRef.current.destroy(true);
    }
    const game = new Phaser.Game(config);
    gameRef.current = game;
    gameContainer.current.appendChild(game.canvas);
  };

  useEffect(() => {
    if (connection) {
      connection.on('data', data => {
        if (data.type === 'startGame') {
          startGame(false);
        }
      });
    }
  }, [connection]);

  return (
    <div className="app-container">
      {!isGameStarted && (
        <div className="connection-interface">
          <h1>Yacht Dice Game</h1>
          {isMatchCreated ? (
            <div className="match-created">
              <p>Your Peer ID: <span className="highlight">{peerId.slice(idPrefix.length)}</span></p> {/* Show only the room ID without prefix */}
              {opponentNickname ? (
                <div className="opponent-joined">
                  <p>{opponentNickname} has joined the game</p>
                  <button onClick={handleStartGame} className="start-button">Start Game</button>
                </div>
              ) : (
                <p>Waiting for opponent...</p>
              )}
            </div>
          ) : (
            <div className="match-setup">
              <input
                type="text"
                placeholder="Your Nickname"
                value={localNickname}
                onChange={e => setLocalNickname(e.target.value)}
                className="input-field"
              />
              <button onClick={handleCreateMatch} className="create-button">Create Match</button>
              <div className="join-match">
                <input
                  type="text"
                  placeholder="Opponent's Room Code"
                  value={opponentId}
                  onChange={e => setOpponentId(e.target.value)}
                  className="input-field"
                />
                <button onClick={handleJoinMatch} className="join-button">Join Match</button>
                {joinRequestSent && <p className="join-feedback">Join request sent. Waiting for opponent to respond...</p>}
              </div>
            </div>
          )}
        </div>
      )}
      <div ref={gameContainer} className="game-container"></div>
      <style jsx>{`
        .app-container {
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #f0f0f0;
        }
        .connection-interface {
          background-color: white;
          padding: 2rem;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }
        h1 {
          color: #333;
          margin-bottom: 1.5rem;
        }
        .input-field {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 1rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 1rem;
        }
        button {
          padding: 0.5rem 1rem;
          font-size: 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .create-button, .start-button {
          background-color: #4CAF50;
          color: white;
          width: 100%;
        }
        .create-button:hover, .start-button:hover {
          background-color: #45a049;
        }
        .join-button {
          background-color: #008CBA;
          color: white;
          width: 100%;
        }
        .join-button:hover {
          background-color: #007B9A;
        }
        .join-match {
          margin-top: 1rem;
        }
        .highlight {
          font-weight: bold;
          color: #4CAF50;
        }
        .match-created, .opponent-joined {
          margin-top: 1rem;
        }
        .game-container {
          margin-top: 2rem;
        }
        .join-feedback {
          margin-top: 1rem;
          color: #555;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default App;
