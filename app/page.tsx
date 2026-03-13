'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileInfo, setProfileInfo] = useState<{ displayName: string | null; email: string | null; }>({ displayName: null, email: null });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setProfileInfo({
      displayName: (user.user_metadata?.facility_name || '') + (user.user_metadata?.manager_name ? ` ${user.user_metadata.manager_name} 様` : ''),
      email: user.email ?? null
    });
    const { data, error } = await supabase.from('lost_items').select('*').order('created_at', { ascending: false });
    if (!error && data) setItems(data);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const getDeadlineInfo = (item: any) => {
    if (item.status !== '保管中' || item.reported_to_police_at) return null;
    const foundDate = new Date(item.found_at);
    const diffDays = Math.floor((new Date().getTime() - foundDate.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = 7 - diffDays;
    if (remaining <= 0) return { label: '期限切れ', color: '#ff3b30', isUrgent: true };
    if (remaining <= 2) return { label: `あと${remaining}日`, color: '#ff9500', isUrgent: true };
    return { label: `あと${remaining}日`, color: '#34c759', isUrgent: false };
  };

  const urgentItemsCount = useMemo(() => items.filter(item => getDeadlineInfo(item)?.isUrgent).length, [items]);

  const groupedItems = useMemo(() => ({
    保管中: items.filter(item => !['引き渡し済', '回収済', '廃棄済'].includes(item.status)),
    引き渡し済: items.filter(item => item.status === '引き渡し済'),
    回収済: items.filter(item => item.status === '回収済'),
    廃棄済: items.filter(item => item.status === '廃棄済'),
  }), [items]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '0 0 40px 0', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      
      {/* 1. 【唯一のヘッダー：青枠】これ以外のヘッダー・タイトル行は一切存在させません */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #d2d2d7', padding: '10px 12px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ backgroundColor: '#2c52e1', padding: '6px', borderRadius: '8px' }}><span style={{ color: 'white' }}>⊞</span></div>
            <span style={{ fontSize: 'clamp(0.65rem, 3.2vw, 0.95rem)', fontWeight: '800' }}>拾得物管理ポータル</span>
            <div style={{ backgroundColor: '#f5f5f7', padding: '3px 6px', borderRadius: '5px', border: '1px solid #d2d2d7', fontSize: '0.7rem' }}>ダッシュボード</div>
          </div>
          {/* ボタンはここ（青枠内）だけに集約 */}
          <button onClick={() => router.push('/items/new')} style={{ backgroundColor: '#2c52e1', color: 'white', padding: '8px 12px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '0.8rem' }}>⊕ 新規登録</button>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '15px' }}>
        {/* 2. ユーザー情報セクション */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>👤 {profileInfo.displayName}</div>
            <div style={{ fontSize: '0.7rem', color: '#86868b' }}>✉️ {profileInfo.email}</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => router.push('/mypage')} style={{ border: '1px solid #d2d2d7', padding: '5px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>マイページ</button>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} style={{ border: '1px solid #d2d2d7', padding: '5px 8px', borderRadius: '6px', fontSize: '0.7rem', color: '#ff3b30' }}>ログアウト</button>
          </div>
        </div>

        {/* 3. 警察届出アラート */}
        {urgentItemsCount > 0 && (
          <div style={{ backgroundColor: '#fff2f2', border: '1px solid #ff3b30', borderRadius: '12px', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div style={{ fontSize: '0.85rem' }}>
              <div style={{ fontWeight: '800', color: '#ff3b30' }}>届出期限のアラート</div>
              <div style={{ color: '#1d1d1f' }}>警察への提出期限が迫っているものが {urgentItemsCount}件 あります。</div>
            </div>
          </div>
        )}

        {/* 4. アイテムリスト：ヘッダーのすぐ下に直接リストを開始 */}
        {Object.entries(groupedItems).map(([status, list]) => (
          <section key={status} style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #d2d2d7', paddingBottom: '6px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>{status}</h2>
              <span style={{ backgroundColor: '#86868b', color: 'white', padding: '1px 6px', borderRadius: '12px', fontSize: '0.7rem' }}>{list.length}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
              {list.length === 0 ? (
                <div style={{ color: '#86868b', fontSize: '0.8rem', padding: '20px', backgroundColor: 'white', borderRadius: '10px', border: '1px dashed #d2d2d7', textAlign: 'center', gridColumn: '1 / -1' }}>アイテムはありません</div>
              ) : (
                list.map((item: any) => (
                  <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
                    <div style={{ width: '100%', height: '120px', backgroundColor: '#f5f5f7' }}>
                      {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d2d2d7' }}>📦</div>}
                    </div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '0.6rem', color: '#007aff', fontWeight: '700' }}>{item.category}</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', height: '2.4em', overflow: 'hidden' }}>{item.name}</div>
                      <div style={{ fontSize: '0.65rem', color: '#86868b' }}>#{item.management_number}</div>
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