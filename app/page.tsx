'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const fetchItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    
    const facilityName = user.user_metadata?.facility_name?.trim();
    const managerName = user.user_metadata?.manager_name?.trim();
    
    if (facilityName || managerName) {
      let formattedName = '';
      if (facilityName) formattedName += facilityName;
      if (managerName) {
        formattedName += (formattedName ? ' ' : '') + managerName + ' 様';
      }
      setDisplayName(formattedName);
    } else {
      setDisplayName(user.email ?? null);
    }

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
    const handleFocus = () => fetchItems();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchItems]);

  const groupedItems = useMemo(() => {
    const definedStatuses = ['引き渡し済', '回収済', '廃棄済'];
    return {
      保管中: items.filter(item => !item.status || item.status === '保管中' || !definedStatuses.includes(item.status)),
      引き渡し済: items.filter(item => item.status === '引き渡し済'),
      回収済: items.filter(item => item.status === '回収済'),
      廃棄済: items.filter(item => item.status === '廃棄済'),
    };
  }, [items]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '0 0 40px 0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* --- ヘッダーエリア (レスポンシブ対応) --- */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #d2d2d7', padding: '10px 15px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* ログイン情報 */}
            <div style={{ fontSize: '0.75rem', color: '#86868b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
              👤 <span style={{ fontWeight: '600', color: '#1d1d1f' }}>{displayName}</span>
            </div>
            
            {/* ボタン群：スマホでも崩れないようにgapを調整 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => router.push('/mypage')}
                style={{ backgroundColor: '#f5f5f7', border: '1px solid #d2d2d7', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', color: '#1d1d1f', fontWeight: '600', whiteSpace: 'nowrap' }}
              >
                マイページ
              </button>
              <button 
                onClick={handleLogout}
                style={{ backgroundColor: 'transparent', border: '1px solid #d2d2d7', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', color: '#ff3b30', fontWeight: '600', whiteSpace: 'nowrap' }}
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        
        {/* --- タイトル・新規登録ボタン (スマホでは縦並び、PCでは横並び) --- */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h1 style={{ 
            fontSize: 'clamp(1.25rem, 5vw, 2rem)', // 画面幅に合わせてサイズを自動調整
            fontWeight: '800', 
            color: '#1d1d1f', 
            margin: 0,
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap' // 勝手に改行させない
          }}>
            拾得物管理ポータル
          </h1>
          <button 
            onClick={() => router.push('/items/new')} 
            style={{ backgroundColor: '#007aff', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,122,255,0.3)', whiteSpace: 'nowrap' }}
          >
            + 新規登録
          </button>
        </div>

        {/* --- リスト表示部分 --- */}
        {(Object.entries(groupedItems) as [string, any[]][]).map(([status, list]) => (
          <section key={status} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #d2d2d7', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0, color: '#1d1d1f' }}>{status}</h2>
              <span style={{ backgroundColor: '#86868b', color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600' }}>
                {list.length}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
              {list.length === 0 ? (
                <div style={{ color: '#86868b', fontSize: '0.85rem', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #d2d2d7', textAlign: 'center', gridColumn: '1 / -1' }}>
                  アイテムはありません
                </div>
              ) : (
                list.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => router.push(`/items/${item.id}`)} 
                    style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', cursor: 'pointer' }}
                  >
                    <div style={{ width: '100%', height: '140px', backgroundColor: '#f5f5f7' }}>
                      {item.photo_url ? (
                        <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d2d2d7', fontSize: '2rem' }}>📦</div>
                      )}
                    </div>
                    <div style={{ padding: '12px' }}>
                      <div style={{ fontSize: '0.65rem', color: '#007aff', fontWeight: '700', marginBottom: '4px' }}>{item.category}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '4px', color: '#1d1d1f', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#86868b' }}>#{item.management_number}</div>
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