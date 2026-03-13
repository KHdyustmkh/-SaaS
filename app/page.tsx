'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';

// Vercel(TypeScript)エラーを防ぐための型定義
interface LostItem {
  id: string;
  name: string;
  category: string;
  location: string;
  found_at: string;
  status: string;
  photo_url?: string;
  management_number?: string;
  reported_to_police_at?: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  
  // 【追加】検索・フィルター用のステート
  const [searchQuery, setSearchQuery] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState('all'); // all, urgent, expired
  
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
      .select('*') 
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data as LostItem[]);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    fetchItems();
    const handleFocus = () => fetchItems();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchItems]);

  const getDeadlineInfo = (item: LostItem) => {
    if (item.status !== '保管中' || item.reported_to_police_at) return null;
    const foundDate = new Date(item.found_at);
    const today = new Date();
    const diffTime = today.getTime() - foundDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 7 - diffDays;

    if (remaining <= 0) return { label: '期限切れ', color: '#ff3b30', isUrgent: true, remaining };
    if (remaining <= 2) return { label: `あと${remaining}日`, color: '#ff9500', isUrgent: true, remaining };
    return { label: `あと${remaining}日`, color: '#34c759', isUrgent: false, remaining };
  };

  // 【維持】通知用：緊急アイテムの抽出
  const urgentItemsForNotify = useMemo(() => {
    return items
      .filter(item => getDeadlineInfo(item)?.isUrgent)
      .map(item => ({ ...item, deadline: getDeadlineInfo(item) }));
  }, [items]);

  const urgentItemsCount = urgentItemsForNotify.length;

  const extremelyUrgentCount = useMemo(() => {
    return urgentItemsForNotify.filter(item => (item.deadline?.remaining ?? 99) <= 1).length;
  }, [urgentItemsForNotify]);

  useEffect(() => {
    if (!loading && extremelyUrgentCount > 0) {
      setShowUrgentModal(true);
    }
  }, [loading, extremelyUrgentCount]);

  // 【追加・修正】検索とフィルターを適用したアイテムリスト
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. キーワード検索 (名称 or 管理番号)
      const matchesQuery = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.management_number && item.management_number.includes(searchQuery));
      
      if (!matchesQuery) return false;

      // 2. 期限フィルター
      const deadline = getDeadlineInfo(item);
      if (deadlineFilter === 'urgent') return deadline?.isUrgent === true;
      if (deadlineFilter === 'expired') return (deadline?.remaining ?? 99) <= 0;
      
      return true;
    });
  }, [items, searchQuery, deadlineFilter]);

  const groupedItems = useMemo(() => {
    const definedStatuses = ['引き渡し済', '回収済', '廃棄済'];
    return {
      保管中: filteredItems.filter(item => !item.status || item.status === '保管中' || !definedStatuses.includes(item.status)),
      引き渡し済: filteredItems.filter(item => item.status === '引き渡し済'),
      回収済: filteredItems.filter(item => item.status === '回収済'),
      廃棄済: filteredItems.filter(item => item.status === '廃棄済'),
    };
  }, [filteredItems]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '0 0 40px 0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {urgentItemsCount > 0 && (
        <div style={{ backgroundColor: '#ff3b30', color: 'white', padding: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', position: 'sticky', top: 0, zIndex: 200 }}>
          ⚠️ 警察への届出期限が近いアイテムが {urgentItemsCount} 件あります。至急確認してください。
        </div>
      )}

      {showUrgentModal && extremelyUrgentCount > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚨</div>
            <h2 style={{ color: '#ff3b30', margin: '0 0 10px 0' }}>至急の対応が必要です</h2>
            <p style={{ fontSize: '0.95rem', color: '#1d1d1f', lineHeight: '1.5' }}>
              警察への届出期限が**本日中、または明日まで**のアイテムが <strong>{extremelyUrgentCount} 件</strong> あります。
            </p>
            <button 
              onClick={() => setShowUrgentModal(false)}
              style={{ width: '100%', backgroundColor: '#1d1d1f', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer', marginTop: '20px' }}
            >
              内容を確認して閉じる
            </button>
          </div>
        </div>
      )}

      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #d2d2d7', padding: '10px 15px', position: 'sticky', top: urgentItemsCount > 0 ? '38px' : 0, zIndex: 100 }}>
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
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowNotificationPopup(!showNotificationPopup)}>
              <span style={{ fontSize: '1.4rem' }}>🔔</span>
              {urgentItemsCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#ff3b30', color: 'white', fontSize: '0.6rem', fontWeight: '800', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
                  {urgentItemsCount}
                </span>
              )}
              
              {showNotificationPopup && (
                <div style={{ position: 'absolute', top: '35px', right: '0', width: '280px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid #d2d2d7', zIndex: 500, overflow: 'hidden' }}>
                  <div style={{ padding: '12px', borderBottom: '1px solid #f5f5f7', fontWeight: '700', fontSize: '0.85rem' }}>通知詳細</div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {urgentItemsForNotify.length === 0 ? (
                      <div style={{ padding: '20px', fontSize: '0.75rem', color: '#86868b', textAlign: 'center' }}>現在、緊急の通知はありません。</div>
                    ) : (
                      urgentItemsForNotify.map(item => (
                        <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ padding: '12px', borderBottom: '1px solid #f5f5f7', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: item.deadline?.color }}>⚠️ {item.deadline?.label}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#1d1d1f' }}>{item.name}</div>
                          <div style={{ fontSize: '0.65rem', color: '#86868b' }}>#{item.management_number}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => router.push('/items/new')} style={{ backgroundColor: '#007aff', color: 'white', padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>+ 新規登録</button>
            <button onClick={() => router.push('/mypage')} style={{ backgroundColor: '#f5f5f7', border: '1px solid #d2d2d7', padding: '5px 8px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: '600' }}>マイページ</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {urgentItemsCount > 0 && (
          <div style={{ backgroundColor: '#fff2f2', border: '1px solid #ff3b30', borderRadius: '12px', padding: '15px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
              <div style={{ fontWeight: '800', color: '#ff3b30' }}>警察への届出期限が迫っています</div>
              <div style={{ color: '#1d1d1f' }}>拾得から1週間以内の届出が必要です。対象が {urgentItemsCount} 件あります。</div>
            </div>
          </div>
        )}

        {/* 【追加】ハイブリッド検索・フィルターバー */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#86868b' }}>🔍</span>
            <input 
              type="text" 
              placeholder="品名、管理番号で検索..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
          <select 
            value={deadlineFilter}
            onChange={(e) => setDeadlineFilter(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '0.9rem', outline: 'none', backgroundColor: 'white', minWidth: '130px' }}
          >
            <option value="all">すべての期限</option>
            <option value="urgent">緊急 (残り2日以内)</option>
            <option value="expired">期限切れ</option>
          </select>
        </div>

        {(Object.entries(groupedItems) as [string, LostItem[]][]).map(([status, list]) => (
          <section key={status} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid #d2d2d7', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>{status}</h2>
              <span style={{ backgroundColor: '#86868b', color: 'white', padding: '1px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>{list.length}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '15px' }}>
              {list.length === 0 ? (
                <div style={{ color: '#86868b', fontSize: '0.85rem', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #d2d2d7', textAlign: 'center', gridColumn: '1 / -1' }}>該当するアイテムはありません</div>
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