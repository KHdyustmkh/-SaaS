'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';

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

function ListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URLパラメータの取得（デフォルトを「届出未完了」に修正）
  const statusFilter = searchParams.get('status') || '届出未完了';
  const isUnsubmittedOnly = searchParams.get('unsubmitted') === 'true';

  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('deadline'); 

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('lost_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data as LostItem[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const getDeadlineInfo = (item: LostItem) => {
    // ステータス名を「届出未完了」に修正
    if (item.status !== '届出未完了' || item.reported_to_police_at) return null;
    const foundDate = new Date(item.found_at);
    const today = new Date();
    const diffTime = today.getTime() - foundDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 7 - diffDays;

    return { 
      label: remaining <= 0 ? '期限切れ' : `あと${remaining}日`, 
      color: remaining <= 0 ? '#ff3b30' : (remaining <= 2 ? '#ff9500' : '#34c759'),
      remaining 
    };
  };

  const sortedAndFilteredList = useMemo(() => {
    let list = items.filter(item => {
      // ステータスの正規化（新名称に更新：未設定は「届出未完了」として扱う）
      const definedStatuses = ['お客様返却済', '回収済', '廃棄済', '警察届出済'];
      const currentItemStatus = (!item.status || item.status === '届出未完了' || !definedStatuses.includes(item.status)) ? '届出未完了' : item.status;

      // 届出未完了モードかどうかの判定
      if (isUnsubmittedOnly) {
        // 「届出未完了」かつ「届出日が空」のものだけを通す
        if (currentItemStatus !== '届出未完了' || item.reported_to_police_at) return false;
      } else {
        // 通常のステータスフィルタ
        if (currentItemStatus !== statusFilter) return false;
      }

      // 検索ワードフィルタ
      return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             (item.management_number && item.management_number.includes(searchQuery));
    });

    return list.sort((a, b) => {
      if (sortBy === 'deadline') {
        const deadlineA = getDeadlineInfo(a)?.remaining ?? 999;
        const deadlineB = getDeadlineInfo(b)?.remaining ?? 999;
        return deadlineA - deadlineB;
      } else if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });
  }, [items, statusFilter, isUnsubmittedOnly, searchQuery, sortBy]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #d2d2d7', padding: '15px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#007aff', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}>
            ＜ 戻る
          </button>
          <h1 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>
            {isUnsubmittedOnly ? '届出未完了 一覧' : `${statusFilter} 一覧`}
          </h1>
          <span style={{ backgroundColor: '#86868b', color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem' }}>{sortedAndFilteredList.length} 件</span>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '400px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#86868b' }}>🔍</span>
                <input type="text" placeholder="品名、管理番号で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px', border: '1px solid #d2d2d7', fontSize: '16px', backgroundColor: '#f5f5f7', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#86868b', whiteSpace: 'nowrap' }}>並び替え:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: '160px', padding: '10px', borderRadius: '10px', border: '1px solid #d2d2d7', backgroundColor: 'white', fontSize: '0.9rem', outline: 'none' }}>
                  <option value="deadline">期限が近い順</option>
                  <option value="newest">登録が新しい順</option>
                  <option value="oldest">登録が古い順</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '15px' }}>
          {sortedAndFilteredList.length === 0 ? (
            <div style={{ color: '#86868b', textAlign: 'center', gridColumn: '1 / -1', padding: '40px' }}>該当なし</div>
          ) : (
            sortedAndFilteredList.map((item) => {
              const deadline = getDeadlineInfo(item);
              return (
                <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', cursor: 'pointer', position: 'relative' }}>
                  {deadline && <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: deadline.color, color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800', zIndex: 10 }}>{deadline.label}</div>}
                  <div style={{ width: '100%', height: '130px', backgroundColor: '#f5f5f7' }}>
                    {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d2d2d7', fontSize: '2rem' }}>📦</div>}
                  </div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '0.65rem', color: '#007aff', fontWeight: '700' }}>{item.category}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1d1d1f', margin: '4px 0', height: '2.4em', overflow: 'hidden' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#86868b' }}>#{item.management_number}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function ListPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center' }}>読み込み中...</div>}>
      <ListContent />
    </Suspense>
  );
}