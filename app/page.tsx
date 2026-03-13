'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [profileInfo, setProfileInfo] = useState<{
    displayName: string | null;
    email: string | null;
  }>({ displayName: null, email: null });

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
    
    setProfileInfo({
      displayName: (user.user_metadata?.facility_name || '') + (user.user_metadata?.manager_name ? ` ${user.user_metadata.manager_name} 様` : ''),
      email: user.email ?? null
    });

    const { data, error } = await supabase
      .from('lost_items')
      .select('*') 
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // --- 期限計算ロジック ---
  const getDeadlineInfo = (item: any) => {
    if (item.status !== '保管中' || item.reported_to_police_at) return null;
    
    const foundDate = new Date(item.found_at);
    const today = new Date();
    // 日数差を計算
    const diffTime = today.getTime() - foundDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 7 - diffDays;

    if (remaining <= 0) return { label: '期限切れ', color: '#ff3b30', isUrgent: true };
    if (remaining <= 2) return { label: `あと${remaining}日`, color: '#ff9500', isUrgent: true };
    return { label: `あと${remaining}日`, color: '#34c759', isUrgent: false };
  };

  const urgentItemsCount = useMemo(() => {
    return items.filter(item => getDeadlineInfo(item)?.isUrgent).length;
  }, [items]);

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
      
      {/* --- ヘッダーエリア (維持) --- */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #d2d2d7', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ backgroundColor: '#2c52e1', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <span style={{ color: 'white', fontSize: '1.2rem' }}>⊞</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f5f5f7', borderRadius: '10px', padding: '4px 10px', gap: '8px', border: '1px solid #e5e5e7' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1d1d1f' }}>拾得物管理ポータル</span>
              <div style={{ width: '1px', height: '14px', backgroundColor: '#d2d2d7' }}></div>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#86868b' }}>ダッシュボード</span>
            </div>
          </div>
          <button onClick={() => router.push('/items/new')} style={{ backgroundColor: '#2c52e1', color: 'white', padding: '8px 14px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⊕</span> 新規登録
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '15px' }}>
        
        {/* --- ユーザー・ボタンエリア --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>👤 {profileInfo.displayName}</div>
            <div style={{ fontSize: '0.75rem', color: '#86868b' }}>✉️ {profileInfo.email}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => router.push('/mypage')} style={{ backgroundColor: '#f5f5f7', border: '1px solid #d2d2d7', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>マイページ</button>
            <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #d2d2d7', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', color: '#ff3b30' }}>ログアウト</button>
          </div>
        </div>

        {/* --- 警察届出リマインド通知 --- */}
        {urgentItemsCount > 0 && (
          <div style={{ backgroundColor: '#fff2f2', border: '1px solid #ff3b30', borderRadius: '14px', padding: '15px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: '800', color: '#ff3b30', fontSize: '0.95rem' }}>届出期限のアラート</div>
              <div style={{ fontSize: '0.85rem', color: '#1d1d1f' }}>警察への提出期限が迫っているものが <span style={{ fontWeight: 'bold' }}>{urgentItemsCount}件</span> あります。</div>
            </div>
          </div>
        )}

        {/* --- リスト表示 --- */}
        {(Object.entries(groupedItems) as [string, any[]][]).map(([status, list]) => (
          <section key={status} style={{ marginBottom: '35px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #d2d2d7', paddingBottom: '8px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{status}</h2>
              <span style={{ backgroundColor: '#86868b', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>{list.length}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
              {list.length === 0 ? (
                <div style={{ color: '#86868b', fontSize: '0.85rem', padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px dashed #d2d2d7', textAlign: 'center', gridColumn: '1 / -1' }}>アイテムはありません</div>
              ) : (
                list.map((item) => {
                  const deadline = getDeadlineInfo(item);
                  return (
                    <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', cursor: 'pointer', position: 'relative' }}>
                      {/* カウントダウンバッジ */}
                      {deadline && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: deadline.color, color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                          {deadline.label}
                        </div>
                      )}
                      <div style={{ width: '100%', height: '130px', backgroundColor: '#f5f5f7' }}>
                        {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d2d2d7', fontSize: '2rem' }}>📦</div>}
                      </div>
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.65rem', color: '#007aff', fontWeight: '700', marginBottom: '4px' }}>{item.category}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1d1d1f', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.6em' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#86868b' }}>#{item.management_number}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}