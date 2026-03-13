'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // データを取得するメイン関数
  const fetchItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserEmail(user.email ?? null);

    const { data, error } = await supabase
      .from('lost_items')
      .select('*', { count: 'exact' }) 
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    fetchItems();
    
    const handleFocus = () => {
      fetchItems();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchItems]);

  const groupedItems = useMemo(() => {
    const definedStatuses = ['引き渡し済', '回収済', '廃棄済'];

    return {
      保管中: items.filter(item => 
        !item.status || 
        item.status === '保管中' || 
        !definedStatuses.includes(item.status)
      ),
      引き渡し済: items.filter(item => item.status === '引き渡し済'),
      回収済: items.filter(item => item.status === '回収済'),
      廃棄済: items.filter(item => item.status === '廃棄済'),
    };
  }, [items]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '0 0 40px 0', fontFamily: 'sans-serif' }}>
      {/* ログイン情報・ヘッダーエリア */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #d2d2d7', padding: '10px 20px', marginBottom: '30px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: '#86868b' }}>
            ログイン中: <span style={{ fontWeight: '600', color: '#1d1d1f' }}>{userEmail}</span>
          </div>
          <button 
            onClick={handleLogout}
            style={{ backgroundColor: 'transparent', border: '1px solid #d2d2d7', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', color: '#ff3b30', fontWeight: '600' }}
          >
            ログアウト
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1d1d1f', margin: 0 }}>拾得物管理ポータル</h1>
          <button 
            onClick={() => router.push('/items/new')} 
            style={{ backgroundColor: '#007aff', color: 'white', padding: '12px 28px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,122,255,0.3)' }}
          >
            + 新規登録
          </button>
        </div>

        {(Object.entries(groupedItems) as [string, any[]][]).map(([status, list]) => (
          <section key={status} style={{ marginBottom: '50px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #d2d2d7', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#1d1d1f' }}>{status}</h2>
              <span style={{ backgroundColor: '#86868b', color: 'white', padding: '2px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                {list.length}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {list.length === 0 ? (
                <div style={{ color: '#86868b', fontSize: '0.95rem', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #d2d2d7', textAlign: 'center', gridColumn: '1 / -1' }}>
                  現在、{status}のアイテムはありません
                </div>
              ) : (
                list.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => router.push(`/items/${item.id}`)} 
                    style={{ backgroundColor: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                    }}
                  >
                    <div style={{ width: '100%', height: '200px', backgroundColor: '#f5f5f7' }}>
                      {item.photo_url ? (
                        <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d2d2d7', fontSize: '3rem' }}>📦</div>
                      )}
                    </div>
                    <div style={{ padding: '20px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#007aff', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>{item.category}</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px', color: '#1d1d1f' }}>{item.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#86868b', lineHeight: '1.4' }}>管理番号: {item.management_number}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}