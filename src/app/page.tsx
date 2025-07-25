'use client';

import { useState, useEffect, useRef } from 'react';
import { GameState } from '../lib/types';
import { initialGameState } from '../lib/state-engine';

const isDevelopment = process.env.NODE_ENV === 'development';

interface ApiResponse {
  newState: GameState;
  narrative: string;
  signature: string;
}

// 텍스트 스트리밍 효과를 위한 컴포넌트
const StreamingText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText(''); // 새로운 텍스트가 들어오면 초기화
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(intervalId);
      }
    }, 30); // 타이핑 속도 (ms)

    return () => clearInterval(intervalId);
  }, [text]);

  return <>{displayedText}</>;
};


export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isInputDisabled = isLoading || (isDevelopment && !apiKey) || gameState.isEscaped;

  useEffect(() => {
    setMessages([{ role: 'assistant', content: initialGameState.roomDescription }]);
    inputRef.current?.focus();
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
          apiKey: isDevelopment ? apiKey : '', // 운영에서는 빈 문자열 전송
          userInput: currentInput,
          currentState: gameState,
          signature: signature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API 호출에 실패했습니다.');
      }

      const { newState, narrative, signature: newSignature } = await response.json() as ApiResponse;
      
      setGameState(newState);
      setSignature(newSignature);

      // 게임이 종료되었고(isEscaped) 마지막 메시지가 있다면, LLM의 서술 대신 그 메시지를 사용합니다.
      const assistantResponse = newState.isEscaped && newState.lastMessage
        ? newState.lastMessage
        : narrative;

      setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);

    } catch (error: unknown) { // 'any' 대신 'unknown' 사용
      if (error instanceof Error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${error.message}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `알 수 없는 오류가 발생했습니다.` }]);
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus(); // 응답 후 입력창에 다시 포커스
    }
  };

  return (
    <div className="bg-gray-900 text-white w-full h-screen">
      <div className="chat-container flex flex-col h-screen">
        <header className="p-4 bg-gray-800 border-b border-gray-700">
          <h1 className="text-xl font-bold">LLM 방탈출 챗봇</h1>
          {isDevelopment && (
            <div className="mt-2">
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="OpenAI API 키를 입력하세요 (개발용)"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
          )}
        </header>

        <main className="flex-1 p-4 overflow-y-auto bg-gray-900">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-4 py-2 rounded-lg max-w-lg whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  {msg.role === 'assistant' && index === messages.length - 1 ? (
                    <StreamingText text={msg.content} />
                  ) : (
                    msg.content
                  )}
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
            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="p-4 bg-gray-800 border-t border-gray-700">
          <div className="flex">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="명령어를 입력하세요..."
              className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isInputDisabled}
            />
            <button
              onClick={handleSendMessage}
              className="px-4 py-2 bg-blue-600 rounded-r-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              disabled={isInputDisabled || !input.trim()}
            >
              {isLoading ? '생각중...' : '전송'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
