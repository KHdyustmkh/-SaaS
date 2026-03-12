'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('ログイン中...');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage('エラー: ' + error.message);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleSignUp = async () => {
    setMessage('登録処理中...');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMessage('登録エラー: ' + error.message);
    } else {
      setMessage('✅ 確認メールを送信しました。\nメール内のボタンを押して登録を完了させてください。');
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', // 画面の縦中央に配置
      backgroundColor: '#f5f5f5',
      fontFamily: 'sans-serif' 
    }}>
      <div style={{ 
        width: '380px',
        padding: '40px', 
        border: '1px solid #ddd', 
        borderRadius: '12px', 
        boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
        backgroundColor: 'white',
        position: 'relative' // 子要素の基準にする
      }}>
        <h1 style={{ marginBottom: '30px', textAlign: 'center', color: '#333', fontSize: '24px' }}>施設管理ログイン</h1>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            placeholder="メールアドレス" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }} 
          />
          <input 
            type="password" 
            placeholder="パスワード" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }} 
          />
          
          <button 
            type="submit" 
            style={{ backgroundColor: '#0070f3', color: 'white', padding: '14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}
          >
            ログイン
          </button>
          
          <button 
            type="button" 
            onClick={handleSignUp} 
            style={{ backgroundColor: 'transparent', color: '#0070f3', padding: '10px', borderRadius: '6px', border: '1px solid #0070f3', cursor: 'pointer', fontSize: '14px' }}
          >
            新規施設として登録
          </button>
        </form>

        {/* メッセージ表示エリア：高さを固定することで入力欄のズレを防ぐ */}
        <div style={{ minHeight: '60px', marginTop: '20px' }}>
          {message && (
            <p style={{ 
              color: message.includes('エラー') ? '#ff4d4f' : '#0070f3', 
              textAlign: 'center', 
              fontSize: '14px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              fontWeight: '500',
              margin: '0'
            }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}