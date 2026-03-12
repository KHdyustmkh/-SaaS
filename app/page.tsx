'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        setItems(data || []);
      }
      setLoading(false);
    };

    checkUserAndFetchData();
  }, [supabase, router]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <p>データを読み込み中...</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* ヘッダー */}
      <header style={{ backgroundColor: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '1.25rem', color: '#333', margin: 0 }}>拾得物管理ダッシュボード</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>{user?.email}</span>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', backgroundColor: 'white' }}
          >
            ログアウト
          </button>
        </div>
      </header>

      <main style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>管理中のアイテム ({items.length})</h2>
          {/* 今後ここをクリックして登録ページへ飛ぶように設定します */}
          <button 
            onClick={() => router.push('/items/new')}
            style={{ backgroundColor: '#0070f3', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ＋ 新規登録
          </button>
        </div>

        {/* カードグリッド */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {items.map((item) => (
            <div 
              key={item.id} 
              style={{ 
                backgroundColor: 'white', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s',
                cursor: 'pointer',
                border: '1px solid #eee'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              /* 修正ポイント: クリックで詳細ページへ遷移 */
              onClick={() => router.push(`/items/${item.id}`)}
            >
              {/* 画像エリア */}
              <div style={{ height: '180px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: '#999' }}>No Image</span>
                )}
              </div>

              {/* コンテンツエリア */}
              <div style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    backgroundColor: item.status === '保管中' ? '#e6f7ff' : '#fff1f0',
                    color: item.status === '保管中' ? '#1890ff' : '#f5222d',
                    fontWeight: 'bold'
                  }}>
                    {item.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#999' }}>#{item.management_number}</span>
                </div>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: '#222' }}>{item.name}</h3>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 1rem 0' }}>
                  場所: {item.location}<br />
                  日時: {new Date(item.found_at).toLocaleDateString()}
                </p>
                <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem', fontSize: '0.8rem', color: '#888' }}>
                  カテゴリ: {item.category}
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem', backgroundColor: 'white', borderRadius: '12px', color: '#999' }}>
            データがまだありません。右上のボタンから登録してください。
          </div>
        )}
      </main>
    </div>
  );
}