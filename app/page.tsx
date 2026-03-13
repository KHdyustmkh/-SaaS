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
      
      {/* --- ヘッダーエリア (画像に基づき修正) --- */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #d2d2d7', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          {/* 左側：アイコン + タイトル + ダッシュボードタグ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 1, overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#2c52e1', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '1.2rem' }}>⊞</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f5f5f7', borderRadius: '10px', padding: '4px 10px', gap: '8px', border: '1px solid #e5e5e7' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1d1d1f', whiteSpace: 'nowrap' }}>拾得物管理ポータル</span>
              <div style={{ width: '1px', height: '14px', backgroundColor: '#d2d2d7' }}></div>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#86868b', whiteSpace: 'nowrap' }}>ダッシュボード</span>
            </div>
          </div>

          {/* 右側：新規登録ボタン (画像を参考に青背景白抜き) */}
          <button 
            onClick={() => router.push('/items/new')}
            style={{ backgroundColor: '#2c52e1', color: 'white', padding: '8px 14px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <span style={{ fontSize: '1.1rem' }}>⊕</span> 新規登録
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '15px' }}>
        
        {/* --- ユーザー情報エリア (現在のデザインを維持) --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '60%' }}>
            {profileInfo.displayName && (
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1d1d1f' }}>👤 {profileInfo.displayName}</div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#86868b' }}>✉️ {profileInfo.email}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => router.push('/mypage')} style={{ backgroundColor: '#f5f5f7', border: '1px solid #d2d2d7', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>マイページ</button>
            <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #d2d2d7', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', color: '#ff3b30' }}>ログアウト</button>
          </div>
        </div>

        {/* --- 以下、リスト表示エリア (現状の良さを維持) --- */}
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          拾得物管理ポータル
          <button onClick={() => router.push('/items/new')} style={{ backgroundColor: '#007aff', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.9rem', border: 'none' }}>+ 新規</button>
        </h1>

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
                list.map((item) => (
                  <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                    <div style={{ width: '100%', height: '140px', backgroundColor: '#f5f5f7' }}>
                      {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d2d2d7', fontSize: '2rem' }}>📦</div>}
                    </div>
                    <div style={{ padding: '12px' }}>
                      <div style={{ fontSize: '0.65rem', color: '#007aff', fontWeight: '700', marginBottom: '4px' }}>{item.category}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1d1d1f' }}>{item.name}</div>
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