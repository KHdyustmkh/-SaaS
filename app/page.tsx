'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchDashboardData = async () => {
      // 1. ユーザー情報の取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email ?? '不明なユーザー');

      // 2. 最新10件のアイテム取得
      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('データ取得エラー:', error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [supabase, router]);

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* 上部ナビゲーション・ユーザー情報エリア */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.85rem', color: '#86868b' }}>
            ログイン中: <strong>{userEmail}</strong>
          </span>
          <button 
            onClick={handleLogout}
            style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #ff3b30', color: '#ff3b30', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
          >
            ログアウト
          </button>
        </div>

        {/* メインヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d1d1f', margin: 0 }}>管理中アイテム</h1>
            <p style={{ color: '#86868b', marginTop: '8px' }}>最新の拾得物 10件を表示しています</p>
          </div>
          <button 
            onClick={() => router.push('/items/new')}
            style={{ backgroundColor: '#0070f3', color: 'white', padding: '14px 28px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 14px rgba(0, 112, 243, 0.3)' }}
          >
            + 新規アイテム登録
          </button>
        </div>

        {/* カードグリッド */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px', marginBottom: '40px' }}>
          {items.map((item) => (
            <div 
              key={item.id}
              onClick={() => router.push(`/items/${item.id}`)}
              style={{ backgroundColor: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ width: '100%', height: '180px', backgroundColor: '#f0f0f2', position: 'relative' }}>
                {item.photo_url ? (
                  <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Image</div>
                )}
                <div style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: item.status === '保管中' ? '#0070f3' : '#ff3b30', color: 'white' }}>
                  {item.status}
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ color: '#86868b', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '5px' }}>{item.management_number}</div>
                <h3 style={{ margin: '0 0 10px', fontSize: '1.1rem', fontWeight: 'bold' }}>{item.name}</h3>
                <div style={{ display: 'inline-block', backgroundColor: '#f2f2f7', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>{item.category}</div>
                <div style={{ fontSize: '0.85rem', color: '#444' }}>場所: {item.location}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 検索ページへのボタン */}
        <div style={{ textAlign: 'center', paddingBottom: '60px' }}>
          <button 
            onClick={() => router.push('/items/list')}
            style={{ padding: '16px 40px', backgroundColor: 'white', color: '#0070f3', border: '2px solid #0070f3', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}
          >
            すべての登録済みアイテムを検索する →
          </button>
        </div>

      </div>
    </div>
  );
}