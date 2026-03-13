'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert('エラーが発生しました: ' + error.message);
    } else {
      setMessage('再設定用のメールを送信しました。メールボックスを確認してください。');
    }
    setLoading(false);
  };

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px', textAlign: 'center' }}>パスワードの再設定</h1>
        
        {message ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: '#1d1d1f', marginBottom: '20px' }}>{message}</p>
            <button onClick={() => router.push('/login')} style={{ color: '#007aff', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: '600' }}>ログイン画面に戻る</button>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p style={{ fontSize: '0.85rem', color: '#86868b', lineHeight: '1.4' }}>登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。</p>
            <div>
              <input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', fontSize: '1rem' }} />
            </div>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#007aff', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}>
              {loading ? '送信中...' : '再設定メールを送信'}
            </button>
            <button type="button" onClick={() => router.push('/login')} style={{ backgroundColor: 'transparent', border: 'none', color: '#86868b', fontSize: '0.85rem', cursor: 'pointer' }}>キャンセル</button>
          </form>
        )}
      </div>
    </div>
  );
}