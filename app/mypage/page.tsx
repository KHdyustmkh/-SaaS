'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [email, setEmail] = useState(''); // メールアドレス用の状態
  const [facilityName, setFacilityName] = useState('');
  const [managerName, setManagerName] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setEmail(user.email || ''); // メールアドレスを取得
      setFacilityName(user.user_metadata?.facility_name || '');
      setManagerName(user.user_metadata?.manager_name || '');
      setLoading(false);
    };
    fetchUser();
  }, [supabase, router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    const { error } = await supabase.auth.updateUser({
      data: {
        facility_name: facilityName,
        manager_name: managerName,
      }
    });

    if (error) {
      alert('更新に失敗しました: ' + error.message);
    } else {
      alert('情報を更新しました。');
      router.push('/'); 
      router.refresh();
    }
    setUpdating(false);
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>マイページ設定</h1>
        
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* メールアドレス（表示のみ） */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#86868b' }}>登録メールアドレス</label>
            <input 
              type="text" 
              value={email} 
              readOnly 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: '#f9f9f9', color: '#86868b', cursor: 'not-allowed', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '0.75rem', color: '#86868b', marginTop: '5px' }}>※メールアドレスは変更できません</p>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>施設名・企業名</label>
            <input 
              type="text" 
              value={facilityName} 
              onChange={(e) => setFacilityName(e.target.value)} 
              placeholder="例: 中央図書館"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>担当者名</label>
            <input 
              type="text" 
              value={managerName} 
              onChange={(e) => setManagerName(e.target.value)} 
              placeholder="例: 山田 太郎"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button"
              onClick={() => router.push('/')}
              style={{ flex: 1, padding: '12px', backgroundColor: '#e5e5e7', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              戻る
            </button>
            <button 
              type="submit" 
              disabled={updating}
              style={{ flex: 2, padding: '12px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: updating ? 'not-allowed' : 'pointer' }}
            >
              {updating ? '更新中...' : '設定を保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}