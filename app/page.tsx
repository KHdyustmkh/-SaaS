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

  // ログアウト機能自体はシステム上必要（マイページ等で使う可能性）なため関数は維持しますが、ボタンは削除します
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
    const email = user.email ?? null;
    
    let nameStr = '';
    if (facilityName || managerName) {
      if (facilityName) nameStr += facilityName;
      if (managerName) {
        nameStr += (nameStr ? ' ' : '') + managerName + ' 様';
      }
    }

    setProfileInfo({
      displayName: nameStr || null,
      email: email
    });

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

  const getDeadlineInfo = (item: any) => {
    if (item.status !== '保管中' || item.reported_to_police_at) return null;
    const foundDate = new Date(item.found_at);
    const today = new Date();
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
      
      {/* ヘッダー：ログアウトボタンを物理的に削除しました */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #d2d2d7', padding: '10px 15px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxWidth: '40%' }}>
            {profileInfo.displayName && (
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                👤 {profileInfo.displayName}
              </div>
            )}
            <div style={{ fontSize: '0.65rem', color: '#86868b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ✉️ {profileInfo.email}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => router.push('/items/new')} style={{ backgroundColor: '#007aff', color: 'white', padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>+ 新規登録</button>
            <button onClick={() => router.push('/mypage')} style={{ backgroundColor: '#f5f5f7', border: '1px solid #d2d2d7', padding: '5px 8px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}>マイページ</button>
            {/* ここに存在したログアウトボタンを削除しました */}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        
        {/* 警察届出アラート */}
        {urgentItemsCount > 0 && (
          <div style={{ backgroundColor: '#fff2f2', border: '1px solid #ff3b30', borderRadius: '12px', padding: '15px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
              <div style={{ fontWeight: '800', color: '#ff3b30' }}>警察への届出期限が迫っています</div>
              <div style={{ color: '#1d1d1f' }}>拾得から1週間以内の届出が必要です。対象が {urgentItemsCount} 件あります。</div>
            </div>
          </div>
        )}

        {/* アイテムリスト */}
        {(Object.entries(groupedItems) as [string, any[]][]).map(([status, list]) => (
          <section key={status} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid #d2d2d7', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>{status}</h2>
              <span style={{ backgroundColor: '#86868b', color: 'white', padding: '1px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>{list.length}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '15px' }}>
              {list.length === 0 ? (
                <div style={{ color: '#86868b', fontSize: '0.85rem', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #d2d2d7', textAlign: 'center', gridColumn: '1 / -1' }}>アイテムはありません</div>
              ) : (
                list.map((item) => {
                  const deadline = getDeadlineInfo(item);
                  return (
                    <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', cursor: 'pointer', position: 'relative' }}>
                      {deadline && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: deadline.color, color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', zIndex: 1 }}>
                          {deadline.label}
                        </div>
                      )}
                      <div style={{ width: '100%', height: '130px', backgroundColor: '#f5f5f7' }}>
                        {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d2d2d7', fontSize: '2rem' }}>📦</div>}
                      </div>
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.65rem', color: '#007aff', fontWeight: '700', marginBottom: '4px' }}>{item.category}</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '4px', color: '#1d1d1f', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</div>
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