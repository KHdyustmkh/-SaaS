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
}

export default function Dashboard() {
  const router = useRouter();
  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  
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
        setItems(data as LostItem[]);
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, [supabase]);

  const getDeadlineInfo = (item: LostItem) => {
    if (item.status !== '保管中' || item.reported_to_police_at) return null;
    const foundDate = new Date(item.found_at);
    const today = new Date();
    const diffTime = today.getTime() - foundDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 7 - diffDays;
    return { 
      remaining, 
      label: remaining <= 0 ? '期限切れ' : `あと${remaining}日`, 
      color: remaining <= 0 ? '#ff3b30' : (remaining <= 2 ? '#ff9500' : '#34c759') 
    };
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
    custodyItems: filteredItems.filter(i => !i.status || i.status === '保管中'),
    returnedItems: filteredItems.filter(i => i.status === '引き渡し済'),
    collectedItems: filteredItems.filter(i => i.status === '回収済'),
    disposedItems: filteredItems.filter(i => i.status === '廃棄済'),
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <header style={{ backgroundColor: 'white', padding: '10px 20px', borderBottom: '1px solid #d2d2d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => router.push('/')}>
            <div style={{ backgroundColor: '#007aff', color: 'white', padding: '6px', borderRadius: '6px' }}>🔳</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: '700', color: '#1d1d1f' }}>{userInfo.facilityName}</span>
            <span style={{ color: '#d2d2d7' }}>|</span>
            <span style={{ color: '#1d1d1f' }}>担当: {userInfo.staffName} 様</span>
            <span style={{ color: '#d2d2d7' }}>|</span>
            <span style={{ color: '#86868b' }}>{userInfo.email}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/mypage')} style={{ backgroundColor: '#f5f5f7', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '500' }}>マイページ</button>
          <button onClick={() => router.push('/items/new')} style={{ backgroundColor: '#007aff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>+ 新規登録</button>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#ff4081', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', marginLeft: '8px' }}>
            {userInfo.email ? userInfo.email[0].toUpperCase() : 'U'}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div style={{ height: '24px' }} />

        {/* 検索・フィルターエリアの修正：flex-growとmax-widthで幅を制御 */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', marginBottom: '24px', border: '1px solid #d2d2d7' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
            <div style={{ flex: '0 1 600px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>クイック検索</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="品名、管理番号で検索..." 
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #d2d2d7', fontSize: '16px', backgroundColor: '#f5f5f7', boxSizing: 'border-box' }} 
                />
              </div>
            </div>
            <div style={{ width: '240px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>期限フィルター</label>
              <select 
                value={deadlineFilter}
                onChange={(e) => setDeadlineFilter(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: 'white', fontSize: '16px', cursor: 'pointer' }}
              >
                <option>すべての期限</option>
                <option>あと7日以内</option>
                <option>期限切れ</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
          <StatCard title="保管中" count={stats.custodyItems.length} color="#007aff" onClick={() => {}} />
          <StatCard title="引き渡し済" count={stats.returnedItems.length} color="#34c759" onClick={() => {}} />
          <StatCard title="回収済" count={stats.collectedItems.length} color="#5856d6" onClick={() => {}} />
          <StatCard title="廃棄済" count={stats.disposedItems.length} color="#ff3b30" onClick={() => {}} />
        </div>

        <StatusSection title="✨ 新着の拾得物" items={stats.custodyItems.slice(0, 4)} onSeeAll={() => router.push('/items/list?status=保管中')} getDeadlineInfo={getDeadlineInfo} />
      </main>
    </div>
  );
}

// 以下、StatusSection および StatCard コンポーネントは変更なしのため省略（前のコードと同一のものを維持してください）
function StatusSection({ title, items, onSeeAll, getDeadlineInfo }: { title: string, items: LostItem[], onSeeAll: () => void, getDeadlineInfo?: (item: LostItem) => any }) {
  const router = useRouter();
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{title}</h2>
        <button onClick={onSeeAll} style={{ color: '#007aff', background: 'none', border: 'none', cursor: 'pointer' }}>すべて見る ＞</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {items.map((item) => {
          const deadline = getDeadlineInfo ? getDeadlineInfo(item) : null;
          return (
            <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #d2d2d7', cursor: 'pointer', position: 'relative' }}>
              {deadline && <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: deadline.color, color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem' }}>{deadline.label}</div>}
              <div style={{ width: '100%', height: '120px', backgroundColor: '#f5f5f7' }}>
                {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ textAlign: 'center', lineHeight: '120px' }}>📦</div>}
              </div>
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{item.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#86868b' }}>#{item.management_number || '---'}</div>
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
    <div onClick={onClick} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #d2d2d7', cursor: 'pointer' }}>
      <div style={{ color: '#86868b', fontSize: '0.9rem', fontWeight: '600' }}>{title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: color }}>{count}</div>
        <div style={{ color: '#007aff', fontSize: '0.8rem' }}>詳細 ＞</div>
      </div>
    </div>
  );
}