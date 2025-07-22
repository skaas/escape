'use client';

import { useState, useEffect } from 'react';
import { GameState } from '../lib/types';
import { initialGameState } from '../lib/state-engine';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 게임 시작 시 초기 메시지 설정
    setMessages([{ role: 'assistant', content: initialGameState.roomDescription }]);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    const currentInput = input;
    setInput('');

    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          userInput: currentInput, // 'input'은 항상 string 타입입니다.
          currentState: gameState,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API 호출에 실패했습니다.');
      }

      const { newState, narrative } = await response.json();
      
      setGameState(newState);
      setMessages(prev => [...prev, { role: 'assistant', content: narrative }]);

    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-xl font-bold">Writer's Study: LLM 방탈출 챗봇</h1>
        <div className="mt-2">
            <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="OpenAI API 키를 입력하세요"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-2 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                {msg.content}
              </div>
            </div>
          ))}
           {isLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-2 rounded-lg max-w-lg bg-gray-700 animate-pulse">
                ...
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="명령어를 입력하세요..."
            className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!apiKey || isLoading}
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-600 rounded-r-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={!apiKey || !input.trim() || isLoading}
          >
            {isLoading ? '생각중...' : '전송'}
          </button>
        </div>
      </footer>
    </div>
  );
}
