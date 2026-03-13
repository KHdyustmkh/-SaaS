'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchItems = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setItems(data);
      }
      setLoading(false);
    };

    fetchItems();
  }, [supabase, router]);

  // ステータスごとにアイテムを振り分け
  const groupedItems = useMemo(() => {
    return {
      保管中: items.filter(item => item.status === '保管中' || !item.status),
      引き渡し済: items.filter(item => item.status === '引き渡し済'),
      回収済: items.filter(item => item.status === '回収済'),
      廃棄済: items.filter(item => item.status === '廃棄済'),
    };
  }, [items]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>拾得物管理ダッシュボード</h1>
          <button 
            onClick={() => router.push('/items/new')}
            style={{ backgroundColor: '#0070f3', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            + 新規登録
          </button>
        </div>

        {/* 各セクションをループで表示 */}
        {(Object.entries(groupedItems) as [string, any[]][]).map(([status, list]) => (
          <section key={status} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{status}</h2>
              <span style={{ backgroundColor: '#888', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '0.9rem' }}>
                {list.length} 件
              </span>
            </div>

            {list.length === 0 ? (
              <p style={{ color: '#999', padding: '20px' }}>{status}のアイテムはありません。</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {list.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => router.push(`/items/${item.id}`)}
                    style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ width: '100%', height: '180px', backgroundColor: '#eee' }}>
                      {item.photo_url ? (
                        <img src={item.photo_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>画像なし</div>
                      )}
                    </div>
                    <div style={{ padding: '15px' }}>
                      <div style={{ fontSize: '0.8rem', color: '#0070f3', fontWeight: 'bold', marginBottom: '5px' }}>{item.category}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '5px' }}>{item.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>管理番号: {item.management_number}</div>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>場所: {item.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}