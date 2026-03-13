'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    facilityName: '',
    managerName: '',
    email: ''
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setProfile({
        facilityName: user.user_metadata?.facility_name || '',
        managerName: user.user_metadata?.manager_name || '',
        email: user.email || ''
      });
      setLoading(false);
    }
    getProfile();
  }, [supabase, router]);

  const handleUpdate = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        facility_name: profile.facilityName,
        manager_name: profile.managerName,
      }
    });

    if (error) {
      alert('更新に失敗しました');
    } else {
      alert('プロフィールを更新しました');
    }
    setSaving(false);
  };

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        <header style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => router.push('/')} style={{ backgroundColor: 'transparent', border: 'none', color: '#007aff', fontSize: '1rem', cursor: 'pointer', padding: 0 }}>← 戻る</button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>マイページ</h1>
        </header>

        <section style={{ backgroundColor: 'white', borderRadius: '18px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '20px', borderBottom: '1px solid #f5f5f7', paddingBottom: '10px' }}>プロフィール設定</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>メールアドレス（変更不可）</label>
              <input type="text" value={profile.email} disabled style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', color: '#86868b', fontSize: '1rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#1d1d1f', marginBottom: '8px', fontWeight: '600' }}>施設名</label>
              <input type="text" value={profile.facilityName} onChange={(e) => setProfile({...profile, facilityName: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', fontSize: '1rem' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#1d1d1f', marginBottom: '8px', fontWeight: '600' }}>担当者名</label>
              <input type="text" value={profile.managerName} onChange={(e) => setProfile({...profile, managerName: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', fontSize: '1rem' }} />
            </div>

            <button 
              onClick={handleUpdate} 
              disabled={saving}
              style={{ backgroundColor: '#007aff', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', marginTop: '10px', transition: 'opacity 0.2s' }}
            >
              {saving ? '保存中...' : '設定を保存する'}
            </button>
          </div>
        </section>

        {/* ログアウト専用セクション：今回追加した箇所 */}
        <section style={{ backgroundColor: 'white', borderRadius: '18px', padding: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <button 
            onClick={handleLogout}
            style={{ width: '100%', backgroundColor: 'transparent', color: '#ff3b30', padding: '12px', borderRadius: '12px', border: '1px solid #ff3b30', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}
          >
            ログアウト
          </button>
        </section>

      </div>
    </div>
  );
}