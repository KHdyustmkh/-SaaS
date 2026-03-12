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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setMessage('登録エラー: ' + error.message);
    } else {
      setMessage('確認メールを送りました。メール内のボタンを押して登録を完了させてください。');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '40px', border: '1px solid #ddd', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>施設管理ログイン</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
          <input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }} />
          <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '12px', borderRadius: '5px', border: '1px solid #ccc' }} />
          <button type="submit" style={{ backgroundColor: '#0070f3', color: 'white', padding: '12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>ログイン</button>
          <button type="button" onClick={handleSignUp} style={{ backgroundColor: 'white', color: '#0070f3', padding: '10px', borderRadius: '5px', border: '1px solid #0070f3', cursor: 'pointer' }}>新規施設として登録</button>
        </form>
        {message && <p style={{ color: message.includes('エラー') ? 'red' : 'blue', marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>{message}</p>}
      </div>
    </div>
  );
}