'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // ユーザー情報の状態管理
  const [email, setEmail] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [managerName, setManagerName] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 初回読み込み時に現在の登録情報を取得
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      setEmail(user.email || '');
      // user_metadataから施設名と担当者名を取り出す
      setFacilityName(user.user_metadata?.facility_name || '');
      setManagerName(user.user_metadata?.manager_name || '');
      setLoading(false);
    };

    fetchUserProfile();
  }, [router, supabase]);

  // 更新処理
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      // Supabaseのauth.updateUserを使ってメタデータを安全に更新
      const { error } = await supabase.auth.updateUser({
        data: {
          facility_name: facilityName,
          manager_name: managerName
        }
      });

      if (error) throw error;
      
      alert('マイページ情報を正常に更新しました。');
      router.refresh();
    } catch (error: any) {
      alert('更新に失敗しました: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button 
          onClick={() => router.push('/')} 
          style={{ marginBottom: '20px', padding: '10px 24px', cursor: 'pointer', border: 'none', backgroundColor: '#e5e5e7', borderRadius: '10px', fontWeight: 'bold' }}
        >
          ← ダッシュボードに戻る
        </button>

        <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1d1d1f', marginBottom: '30px', borderBottom: '2px solid #f0f0f0', paddingBottom: '15px' }}>
            マイページ（登録情報）
          </h1>

          <form onSubmit={handleUpdateProfile}>
            {/* メールアドレス（変更不可の読み取り専用） */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#86868b', fontWeight: '600', marginBottom: '8px' }}>
                ログインメールアドレス（変更不可）
              </label>
              <input 
                type="email" 
                value={email} 
                disabled 
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: '#f5f5f7', color: '#86868b', boxSizing: 'border-box' }}
              />
            </div>

            {/* 施設名 */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#1d1d1f', fontWeight: '600', marginBottom: '8px' }}>
                施設名 / 企業名
              </label>
              <input 
                type="text" 
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                placeholder="例：〇〇ショッピングモール"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #d2d2d7', boxSizing: 'border-box', fontSize: '1rem' }}
              />
            </div>

            {/* 担当者名 */}
            <div style={{ marginBottom: '40px' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', color: '#1d1d1f', fontWeight: '600', marginBottom: '8px' }}>
                担当者名
              </label>
              <input 
                type="text" 
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="例：山田 太郎"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #d2d2d7', boxSizing: 'border-box', fontSize: '1rem' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={updating}
              style={{ width: '100%', padding: '14px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.7 : 1, boxShadow: '0 4px 12px rgba(0,122,255,0.3)' }}
            >
              {updating ? '更新中...' : '登録情報を保存する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}