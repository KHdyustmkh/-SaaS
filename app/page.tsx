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
  
  // 【新機能】検索・フィルタリング状態の管理
  const [searchQuery, setSearchQuery] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState('すべて');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setItems(data as LostItem[]);
      }
      setLoading(false);
    };
    fetchItems();
  }, [supabase]);

  // 【機能維持】期限管理ロジック
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

  // 【戦略的強化】フィルタリングロジック（品名、管理番号、カテゴリ、場所を網羅）
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesQuery = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.management_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());

      const deadline = getDeadlineInfo(item);
      let matchesDeadline = true;
      if (deadlineFilter === '7日以内') {
        matchesDeadline = !!(deadline && deadline.remaining <= 7 && deadline.remaining > 0);
      } else if (deadlineFilter === '期限切れ') {
        matchesDeadline = !!(deadline && deadline.remaining <= 0);
      }

      return matchesQuery && matchesDeadline;
    });
  }, [items, searchQuery, deadlineFilter]);

  // 【機能維持】ステータス別アイテム分類
  const stats = {
    custodyItems: filteredItems.filter(i => !i.status || i.status === '保管中'),
    returnedItems: filteredItems.filter(i => i.status === '引き渡し済'),
    collectedItems: filteredItems.filter(i => i.status === '回収済'),
    disposedItems: filteredItems.filter(i => i.status === '廃棄済'),
  };

  // 【機能維持】期限が近い順に抽出（通知用）
  const urgentItems = useMemo(() => {
    return items
      .filter(i => (!i.status || i.status === '保管中') && !i.reported_to_police_at)
      .map(i => ({ ...i, deadline: getDeadlineInfo(i) }))
      .filter(i => i.deadline !== null)
      .sort((a, b) => (a.deadline?.remaining ?? 99) - (b.deadline?.remaining ?? 99))
      .slice(0, 5);
  }, [items]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <header style={{ backgroundColor: 'white', padding: '20px', borderBottom: '1px solid #d2d2d7', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>遺失物管理</h1>
          <button onClick={() => router.push('/items/new')} style={{ backgroundColor: '#007aff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: '600', cursor: 'pointer' }}>+ 新規登録</button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        
        {/* 検索・フィルターセクション */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div style={{ width: '100%' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>クイック検索</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="品名、管理番号、場所で検索..." 
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #d2d2d7', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#f5f5f7', outline: 'none' }} 
                />
              </div>
            </div>
            <div style={{ width: '100%', maxWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>期限フィルター</label>
              <select 
                value={deadlineFilter}
                onChange={(e) => setDeadlineFilter(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: 'white', fontSize: '0.9rem', outline: 'none' }}
              >
                <option value="すべて">すべての期限</option>
                <option value="7日以内">あと7日以内</option>
                <option value="期限切れ">期限切れ</option>
              </select>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <StatCard title="保管中" count={stats.custodyItems.length} color="#007aff" onClick={() => router.push('/items/list?status=保管中')} />
          <StatCard title="引き渡し済" count={stats.returnedItems.length} color="#34c759" onClick={() => router.push('/items/list?status=引き渡し済')} />
          <StatCard title="回収済" count={stats.collectedItems.length} color="#5856d6" onClick={() => router.push('/items/list?status=回収済')} />
          <StatCard title="廃棄済" count={stats.disposedItems.length} color="#ff3b30" onClick={() => router.push('/items/list?status=廃棄済')} />
        </div>

        {/* 検索結果ゼロ時の表示 */}
        {filteredItems.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#86868b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔎</div>
            <p>条件に一致するアイテムが見つかりません</p>
          </div>
        )}

        {/* 【修正】セクション名を「新着」に変更 */}
        <StatusSection 
          title="✨ 新着の拾得物" 
          items={stats.custodyItems.slice(0, 4)} 
          onSeeAll={() => router.push('/items/list?status=保管中')} 
          getDeadlineInfo={getDeadlineInfo} 
        />
        <StatusSection title="🤝 引き渡し済" items={stats.returnedItems.slice(0, 4)} onSeeAll={() => router.push('/items/list?status=引き渡し済')} />
        <StatusSection title="🚛 回収済" items={stats.collectedItems.slice(0, 4)} onSeeAll={() => router.push('/items/list?status=回収済')} />
        <StatusSection title="🗑️ 廃棄済" items={stats.disposedItems.slice(0, 4)} onSeeAll={() => router.push('/items/list?status=廃棄済')} />

        {/* 期限要約リスト */}
        <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginTop: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '20px' }}>警察届出の期限間近</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: '#f5f5f7' }}>
            {urgentItems.length === 0 ? (
              <div style={{ backgroundColor: 'white', padding: '30px', textAlign: 'center', color: '#86868b' }}>現在、要対応のアイテムはありません</div>
            ) : (
              urgentItems.map(item => (
                <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid #f5f5f7' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: '#1d1d1f' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#86868b' }}>#{item.management_number} | {item.category}</div>
                  </div>
                  <div style={{ backgroundColor: item.deadline?.color, color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '700' }}>{item.deadline?.label}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusSection({ title, items, onSeeAll, getDeadlineInfo }: { title: string, items: LostItem[], onSeeAll: () => void, getDeadlineInfo?: (item: LostItem) => any }) {
  const router = useRouter();
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{title}</h2>
        <button onClick={onSeeAll} style={{ color: '#007aff', background: 'none', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>すべて見る ＞</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
        {items.map((item) => {
          const deadline = getDeadlineInfo ? getDeadlineInfo(item) : null;
          return (
            <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', cursor: 'pointer', position: 'relative' }}>
              {deadline && <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: deadline.color, color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', zIndex: 10 }}>{deadline.label}</div>}
              <div style={{ width: '100%', height: '120px', backgroundColor: '#f5f5f7' }}>
                {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d2d2d7', fontSize: '2rem' }}>📦</div>}
              </div>
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.65rem', color: '#007aff', fontWeight: '700' }}>{item.category}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1d1d1f', margin: '4px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</div>
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
    <div onClick={onClick} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', cursor: 'pointer' }}>
      <div style={{ color: '#86868b', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>{title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: '800', color: color }}>{count}</div>
        <div style={{ color: '#007aff', fontSize: '0.8rem', fontWeight: '600' }}>詳細 ＞</div>
      </div>
    </div>
  );
}