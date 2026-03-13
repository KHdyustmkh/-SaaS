'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';

// Vercel(TypeScript)エラー防止用の型定義
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

// 検索パラメータ取得のためのコンポーネント分離
function ListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || '保管中';

  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  // 【完全継承】ダッシュボードと同じ期限管理ロジック
  const getDeadlineInfo = (item: LostItem) => {
    if (item.status !== '保管中' || item.reported_to_police_at) return null;
    const foundDate = new Date(item.found_at);
    const today = new Date();
    const diffTime = today.getTime() - foundDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 7 - diffDays;

    if (remaining <= 0) return { label: '期限切れ', color: '#ff3b30' };
    if (remaining <= 2) return { label: `あと${remaining}日`, color: '#ff9500' };
    return { label: `あと${remaining}日`, color: '#34c759' };
  };

  // フィルタリングロジック（ステータス一致 ＋ キーワード検索）
  const filteredList = useMemo(() => {
    return items.filter(item => {
      // ステータスの判定
      const definedStatuses = ['引き渡し済', '回収済', '廃棄済'];
      const currentItemStatus = (!item.status || item.status === '保管中' || !definedStatuses.includes(item.status)) ? '保管中' : item.status;
      
      const isCorrectStatus = currentItemStatus === statusFilter;
      if (!isCorrectStatus) return false;

      // キーワード検索
      return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             (item.management_number && item.management_number.includes(searchQuery));
    });
  }, [items, statusFilter, searchQuery]);

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #d2d2d7', padding: '15px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#007aff', fontSize: '1rem', cursor: 'pointer', fontWeight: '600' }}>
            ＜ 戻る
          </button>
          <h1 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>{statusFilter} 一覧</h1>
          <span style={{ backgroundColor: '#86868b', color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>{filteredList.length} 件</span>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div style={{ marginBottom: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <input 
            type="text" 
            placeholder={`${statusFilter}の中から検索...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d2d2d7', outline: 'none', fontSize: '1rem' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '15px' }}>
          {filteredList.length === 0 ? (
            <div style={{ color: '#86868b', textAlign: 'center', gridColumn: '1 / -1', padding: '40px' }}>該当するアイテムはありません</div>
          ) : (
            filteredList.map((item) => {
              const deadline = getDeadlineInfo(item);
              return (
                <div key={item.id} onClick={() => router.push(`/items/${item.id}`)} style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', cursor: 'pointer', position: 'relative' }}>
                  {deadline && <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: deadline.color, color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800' }}>{deadline.label}</div>}
                  <div style={{ width: '100%', height: '130px', backgroundColor: '#f5f5f7' }}>
                    {item.photo_url ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d2d2d7', fontSize: '2rem' }}>📦</div>}
                  </div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '0.65rem', color: '#007aff', fontWeight: '700', marginBottom: '4px' }}>{item.category}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1d1d1f', marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.name}</div>
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

// Suspenseでラップしてビルドエラーを回避
export default function ListPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center' }}>読み込み中...</div>}>
      <ListContent />
    </Suspense>
  );
}