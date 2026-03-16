'use client';

import React, { useState, useEffect, useRef } from 'react';

interface MatchedItem {
  id: string;
  name: string;
  location: string;
  photo_url?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  items?: MatchedItem[];
}

export const AiMatchingOperator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'お困りですか？お探しの物の「特徴」や「場所」を教えてください。データベースからお探しします。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/matching-operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.reply,
          items: data.items 
        }]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '申し訳ありません。現在検索システムが混み合っております。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* フローティングボタン */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ 
            width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#007aff', 
            color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', 
            cursor: 'pointer', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          💬
        </button>
      )}

      {/* チャットウィンドウ */}
      {isOpen && (
        <div style={{ 
          width: '360px', height: '550px', backgroundColor: '#fff', borderRadius: '20px', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', 
          overflow: 'hidden', border: '1px solid #e5e5e7' 
        }}>
          {/* ヘッダー */}
          <div style={{ padding: '16px', backgroundColor: '#007aff', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '600' }}>AI検索アシスタント</span>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px' }}>×</button>
          </div>
          
          {/* メッセージエリア */}
          <div ref={scrollRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f9f9fb' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ 
                  padding: '10px 14px', borderRadius: '18px', 
                  backgroundColor: msg.role === 'user' ? '#007aff' : '#e5e5ea', 
                  color: msg.role === 'user' ? '#fff' : '#000', fontSize: '14px', lineHeight: '1.4'
                }}>
                  {msg.content}
                </div>
                
                {/* 検索結果のアイテム表示 */}
                {msg.items && msg.items.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {msg.items.map(item => (
                      <div key={item.id} style={{ minWidth: '110px', border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#fff' }}>
                        {item.photo_url ? (
                          <img src={item.photo_url} alt="" style={{ width: '110px', height: '70px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '110px', height: '70px', backgroundColor: '#eee' }} />
                        )}
                        <div style={{ padding: '4px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && <div style={{ fontSize: '12px', color: '#999' }}>AIが照合中...</div>}
          </div>

          {/* 入力エリア */}
          <div style={{ padding: '12px', borderTop: '1px solid #e5e5e7', display: 'flex', gap: '8px' }}>
            <input 
              style={{ flex: 1, border: '1px solid #ddd', borderRadius: '20px', padding: '8px 14px', outline: 'none', fontSize: '14px' }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例: 黒い財布を..."
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              disabled={isLoading}
              style={{ backgroundColor: '#007aff', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
};