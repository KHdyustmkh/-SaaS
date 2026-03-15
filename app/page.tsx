'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

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
  registered_by?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [userInfo, setUserInfo] = useState<{
    email: string | null;
    facilityName: string;
    staffName: string;
    logoUrl: string | null;
  }>({ email: null, facilityName: '読み込み中...', staffName: '読み込み中...', logoUrl: null });

  const [searchQuery, setSearchQuery] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState('すべての期限');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const calculateRemainingDays = (foundAt: string) => {
    const foundDate = new Date(foundAt);
    const today = new Date();
    const diffTime = today.getTime() - foundDate.getTime();
    return 7 - Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);

    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserInfo({
          email: user.email ?? null,
          facilityName: user.user_metadata?.facility_name || '未設定の施設',
          staffName: user.user_metadata?.manager_name || '未設定',
          logoUrl: user.user_metadata?.logo_url || null 
        });
      }
      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setItems(data as LostItem[]);
      }
      setLoading(false);
    };
    fetchDashboardData();
    return () => window.removeEventListener('resize', handleResize);
  }, [supabase]);

  const urgentNotifications = useMemo(() => {
    return items.filter(item => {
      if (item.status !== '届出未完了' || item.reported_to_police_at) return false;
      return calculateRemainingDays(item.found_at) <= 3;
    });
  }, [items]);

  const getDeadlineInfo = (item: LostItem) => {
    if (item.status !== '届出未完了' || item.reported_to_police_at) return null;
    const remaining = calculateRemainingDays(item.found_at);
    let label = "";
    let color = "";
    if (remaining <= 0) { label = "⚠️ 至急"; color = "#ff3b30"; }
    else if (remaining === 1) { label = "🚨 明日"; color = "#ff3b30"; }
    else if (remaining === 2) { label = "🔥 残2日"; color = "#ff9500"; }
    else { label = `⏳ 残${remaining}日`; color = "#34c759"; }
    return { remaining, label, color };
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.management_number?.toLowerCase().includes(searchQuery.toLowerCase()));
      const deadline = getDeadlineInfo(item);
      let matchesDeadline = true;
      if (deadlineFilter === 'あと7日以内') { matchesDeadline = !!(deadline && deadline.remaining <= 7 && deadline.remaining > 0); }
      else if (deadlineFilter === '期限切れ') { matchesDeadline = !!(deadline && deadline.remaining <= 0); }
      return matchesQuery && matchesDeadline;
    });
  }, [items, searchQuery, deadlineFilter]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      
      {/* 修正箇所: topを '56px' に設定し、layout.tsxの1段目と重ならないように固定 */}
      <header style={{ 
        backgroundColor: '#ffffff', 
        borderBottom: '1px solid #d2d2d7', 
        position: 'sticky', 
        top: '56px', 
        left: 0,
        right: 0,
        padding: isMobile ? '10px 12px' : '14px 24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
        zIndex: 999 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ cursor: 'pointer', width: '38px', height: '38px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e5e7' }} onClick={() => router.push('/')}>
            {userInfo.logoUrl ? (
              <img src={userInfo.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ backgroundColor: '#007aff', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🔳</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>
            <span style={{ fontWeight: '700', color: '#1d1d1f' }}>{userInfo.facilityName}</span>
            <span style={{ color: '#86868b' }}>担当: {userInfo.staffName} 様</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowNotificationModal(!showNotificationModal)} style={{ backgroundColor: '#f5f5f7', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.1rem' }}>🔔</span>
              {urgentNotifications.length > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-2px', backgroundColor: '#ff3b30', color: 'white', borderRadius: '50%', padding: '2px 5px', fontSize: '0.65rem', fontWeight: 'bold' }}>{urgentNotifications.length}</span>}
            </button>
            {showNotificationModal && (
              <div style={{ position: 'absolute', top: '50px', right: 0, width: isMobile ? '260px' : '300px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #d2d2d7', padding: '16px', zIndex: 1000 }}>
                <div style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '10px', fontSize: '0.9rem' }}>至急対応が必要</div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {urgentNotifications.length === 0 ? <div style={{ fontSize: '0.8rem', color: '#86868b', textAlign: 'center', padding: '20px 0' }}>ありません。</div> : urgentNotifications.map(item => (
                    <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ padding: '10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px', backgroundColor: '#fff5f5' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#ff3b30', fontWeight: '600' }}>残り {calculateRemainingDays(item.found_at)} 日</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => router.push('/items/new')} style={{ backgroundColor: '#007aff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>+ 新規登録</button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '12px' : '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: isMobile ? '8px' : '16px', margin: '24px 0' }}>
          <StatCard title="🚨 届出未完了" count={items.filter(i => (i.status === '届出未完了' || !i.status) && !i.reported_to_police_at).length} color="#5856d6" isMobile={isMobile} onClick={() => router.push('/items/list?status=届出未完了')} />
          <StatCard title="🚔 警察届出済" count={items.filter(i => i.status === '警察届出済').length} color="#007aff" isMobile={isMobile} onClick={() => router.push('/items/list?status=警察届出済')} />
          <StatCard title="🤝 お客様返却済" count={items.filter(i => i.status === 'お客様返却済').length} color="#34c759" isMobile={isMobile} onClick={() => router.push('/items/list?status=お客様返却済')} />
          <StatCard title="📦 回収済" count={items.filter(i => i.status === '回収済').length} color="#8e8e93" isMobile={isMobile} onClick={() => router.push('/items/list?status=回収済')} />
          <StatCard title="🗑️ 廃棄済" count={items.filter(i => i.status === '廃棄済').length} color="#ff3b30" isMobile={isMobile} onClick={() => router.push('/items/list?status=廃棄済')} />
          <StatCard title="🌐 全ての拾得物" count={items.length} color="#1d1d1f" isMobile={isMobile} onClick={() => router.push('/items/list')} />
        </div>

        <div style={{ backgroundColor: 'white', padding: isMobile ? '16px' : '24px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #d2d2d7' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', width: '100%', gap: isMobile ? '16px' : '32px' }}>
            <div style={{ flex: '1', minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>クイック検索</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="品名、管理番号で検索..." style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #d2d2d7', fontSize: '16px', backgroundColor: '#f5f5f7', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ width: isMobile ? '100%' : '240px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>期限フィルター</label>
              <select value={deadlineFilter} onChange={(e) => setDeadlineFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: 'white', fontSize: '16px', cursor: 'pointer', boxSizing: 'border-box' }}>
                <option>すべての期限</option>
                <option>あと7日以内</option>
                <option>期限切れ</option>
              </select>
            </div>
          </div>
        </div>

        <StatusSection title="✨ 新着の拾得物" items={filteredItems.slice(0, 4)} onSeeAll={() => router.push('/items/list')} getDeadlineInfo={getDeadlineInfo} isMobile={isMobile} />
      </main>
    </div>
  );
}

function StatusSection({ title, items, onSeeAll, getDeadlineInfo, isMobile }: { title: string, items: LostItem[], onSeeAll: () => void, getDeadlineInfo: (item: LostItem) => any, isMobile: boolean }) {
  const router = useRouter();
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{title}</h2>
        <button onClick={onSeeAll} style={{ color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>すべて見る ＞</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {items.map((item) => {
          const deadline = getDeadlineInfo(item);
          return (
            <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #d2d2d7', cursor: 'pointer', position: 'relative' }}>
              {deadline && <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: deadline.color, color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '800', zIndex: 1 }}>{deadline.label}</div>}
              <div style={{ width: '100%', height: isMobile ? '120px' : '180px', backgroundColor: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: '2rem' }}>📦</div>}
              </div>
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#86868b' }}>#{item.management_number || '---'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ title, count, color, onClick, isMobile }: { title: string, count: number, color: string, onClick: () => void, isMobile: boolean }) {
  return (
    <div onClick={onClick} style={{ backgroundColor: 'white', padding: isMobile ? '12px' : '20px', borderRadius: isMobile ? '12px' : '20px', border: '1px solid #d2d2d7', cursor: 'pointer' }}>
      <div style={{ color: '#86868b', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: '600' }}>{title}</div>
      <div style={{ fontSize: isMobile ? '1.4rem' : '2rem', fontWeight: '800', color: color, marginTop: '8px' }}>{count}</div>
    </div>
  );
}