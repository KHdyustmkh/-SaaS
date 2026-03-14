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
  
  const [userInfo, setUserInfo] = useState<{
    email: string | null;
    facilityName: string;
    staffName: string;
  }>({ email: null, facilityName: '読み込み中...', staffName: '読み込み中...' });

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
    const fetchDashboardData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserInfo({
          email: user.email ?? null,
          facilityName: user.user_metadata?.facility_name || '未設定の施設',
          staffName: user.user_metadata?.manager_name || '未設定'
        });
      }
      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const fetchedItems = data as LostItem[];
        setItems(fetchedItems);

        const urgentItems = fetchedItems.filter((item) => {
          if (item.status !== '保管中' || item.reported_to_police_at) return false;
          return calculateRemainingDays(item.found_at) <= 3;
        });

        if (urgentItems.length > 0) {
          alert(`⚠️ 届出の猶予が少なくなっています\n\n残り3日以内、または期限切れのアイテムが ${urgentItems.length} 件あります。\n「通知」ボタンから詳細を確認してください。`);
        }
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, [supabase]);

  const urgentNotifications = useMemo(() => {
    return items.filter(item => {
      if (item.status !== '保管中' || item.reported_to_police_at) return false;
      return calculateRemainingDays(item.found_at) <= 3;
    });
  }, [items]);

  const unsubmittedCount = useMemo(() => {
    return items.filter(i => (i.status === '保管中' || !i.status) && !i.reported_to_police_at).length;
  }, [items]);

  const getDeadlineInfo = (item: LostItem) => {
    if (item.status !== '保管中' || item.reported_to_police_at) return null;
    const remaining = calculateRemainingDays(item.found_at);
    let label = "";
    let color = "";
    if (remaining <= 0) {
      label = "⚠️ 至急、警察へ届出！";
      color = "#ff3b30";
    } else if (remaining === 1) {
      label = "🚨 明日が届出期限です";
      color = "#ff3b30";
    } else if (remaining === 2) {
      label = "🔥 届出猶予：残り2日";
      color = "#ff9500";
    } else {
      label = `⏳ 届出未完了（残り${remaining}日）`;
      color = "#34c759";
    }
    return { remaining, label, color };
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesQuery = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.management_number?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const deadline = getDeadlineInfo(item);
      let matchesDeadline = true;
      if (deadlineFilter === 'あと7日以内') {
        matchesDeadline = !!(deadline && deadline.remaining <= 7 && deadline.remaining > 0);
      } else if (deadlineFilter === '期限切れ') {
        matchesDeadline = !!(deadline && deadline.remaining <= 0);
      }
      
      return matchesQuery && matchesDeadline;
    });
  }, [items, searchQuery, deadlineFilter]);

  const stats = {
    custodyItems: items.filter(i => !i.status || i.status === '保管中'),
    returnedItems: items.filter(i => i.status === '引き渡し済'),
    collectedItems: items.filter(i => i.status === '回収済'),
    disposedItems: items.filter(i => i.status === '廃棄済'),
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <header style={{ backgroundColor: 'white', padding: '10px 20px', borderBottom: '1px solid #d2d2d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
            <div style={{ backgroundColor: '#007aff', color: 'white', padding: '6px', borderRadius: '6px' }}>🔳</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: '700', color: '#1d1d1f' }}>{userInfo.facilityName}</span>
            <span style={{ color: '#d2d2d7' }}>|</span>
            <span style={{ color: '#1d1d1f' }}>担当: {userInfo.staffName} 様</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowNotificationModal(!showNotificationModal)} style={{ backgroundColor: '#f5f5f7', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🔔 通知 {urgentNotifications.length > 0 && <span style={{ backgroundColor: '#ff3b30', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 'bold' }}>{urgentNotifications.length}</span>}
            </button>
            {showNotificationModal && (
              <div style={{ position: 'absolute', top: '45px', right: 0, width: '300px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', border: '1px solid #d2d2d7', padding: '16px', zIndex: 200 }}>
                <div style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '10px', fontSize: '0.9rem' }}>至急対応が必要なアイテム</div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {urgentNotifications.length === 0 ? <div style={{ fontSize: '0.8rem', color: '#86868b', textAlign: 'center', padding: '20px 0' }}>期限間近のアイテムはありません。</div> : urgentNotifications.map(item => (
                    <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ padding: '10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px', backgroundColor: '#fff5f5' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#ff3b30', fontWeight: '600' }}>残り {calculateRemainingDays(item.found_at)} 日</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => router.push('/mypage')} style={{ backgroundColor: '#f5f5f7', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '500' }}>マイページ</button>
          <button onClick={() => router.push('/items/new')} style={{ backgroundColor: '#007aff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>+ 新規登録</button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', margin: '24px 0' }}>
          <StatCard title="🚨 届出未完了" count={unsubmittedCount} color="#5856d6" onClick={() => router.push('/items/list?unsubmitted=true')} />
          <StatCard title="保管中" count={stats.custodyItems.length} color="#007aff" onClick={() => router.push('/items/list?status=保管中')} />
          <StatCard title="引き渡し済" count={stats.returnedItems.length} color="#34c759" onClick={() => router.push('/items/list?status=引き渡し済')} />
          <StatCard title="回収済" count={stats.collectedItems.length} color="#8e8e93" onClick={() => router.push('/items/list?status=回収済')} />
          <StatCard title="廃棄済" count={stats.disposedItems.length} color="#ff3b30" onClick={() => router.push('/items/list?status=廃棄済')} />
        </div>

        {/* 【修正箇所：レイアウト衝突防止およびタイポ修正】 */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #d2d2d7' }}>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'flex-end', width: '100%', minWidth: 0 }}>
            <div style={{ flex: '1 1 0%', minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>クイック検索</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="品名、管理番号で検索..." style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #d2d2d7', fontSize: '16px', backgroundColor: '#f5f5f7' }} />
              </div>
            </div>
            <div style={{ flex: '0 0 240px', width: '240px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>期限フィルター</label>
              <select value={deadlineFilter} onChange={(e) => setDeadlineFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: 'white', fontSize: '16px', cursor: 'pointer' }}>
                <option>すべての期限</option>
                <option>あと7日以内</option>
                <option>期限切れ</option>
              </select>
            </div>
          </div>
        </div>

        <StatusSection title="✨ 新着の拾得物" items={filteredItems.slice(0, 4)} onSeeAll={() => router.push('/items/list?status=保管中')} getDeadlineInfo={getDeadlineInfo} />
      </main>
    </div>
  );
}

function StatusSection({ title, items, onSeeAll, getDeadlineInfo }: { title: string, items: LostItem[], onSeeAll: () => void, getDeadlineInfo: (item: LostItem) => any }) {
  const router = useRouter();
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{title}</h2>
        <button onClick={onSeeAll} style={{ color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>すべて見る ＞</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {items.map((item) => {
          const deadline = getDeadlineInfo(item);
          return (
            <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #d2d2d7', cursor: 'pointer', position: 'relative' }}>
              {deadline && <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: deadline.color, color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '800', zIndex: 1 }}>{deadline.label}</div>}
              <div style={{ width: '100%', height: '120px', backgroundColor: '#f5f5f7' }}>{item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', lineHeight: '120px' }}>📦</div>}</div>
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{item.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#86868b' }}>#{item.management_number || '---'}</div>
                <div style={{ fontSize: '0.7rem', color: '#007aff', marginTop: '4px', fontWeight: '600' }}>担当: {item.registered_by || '未設定'} 様</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ title, count, color, onClick }: { title: string, count: number, color: string, onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '20px', border: '1px solid #d2d2d7', cursor: 'pointer' }}>
      <div style={{ color: '#86868b', fontSize: '0.8rem', fontWeight: '600' }}>{title}</div>
      <div style={{ fontSize: '2rem', fontWeight: '800', color: color, marginTop: '8px' }}>{count}</div>
    </div>
  );
}