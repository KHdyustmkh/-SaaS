'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

export default function ItemListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(''); // 検索キーワード用
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchAllItems = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 全件取得
      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.error('取得エラー:', error);
      else setItems(data || []);
      setLoading(false);
    };

    fetchAllItems();
  }, [supabase, router]);

  // キーワードで絞り込むロジック
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.management_number.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.location?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <button 
          onClick={() => router.push('/')}
          style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ← トップへ戻る
        </button>

        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '20px' }}>全アイテム検索</h1>
          
          {/* 検索バー */}
          <div style={{ position: 'relative', maxWidth: '600px' }}>
            <input 
              type="text" 
              placeholder="品名、管理番号、カテゴリー、場所で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '16px 20px', borderRadius: '12px', border: '2px solid #e5e5ea', fontSize: '1.1rem', outline: 'none', transition: 'border-color 0.2s' }}
            />
            <div style={{ marginTop: '10px', color: '#86868b', fontSize: '0.9rem' }}>
              該当件数: {filteredItems.length} 件
            </div>
          </div>
        </div>

        {/* カードグリッド（検索結果） */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' }}>
          {filteredItems.map((item) => (
            <div 
              key={item.id}
              onClick={() => router.push(`/items/${item.id}`)}
              style={{ backgroundColor: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', cursor: 'pointer' }}
            >
              <div style={{ width: '100%', height: '180px', backgroundColor: '#f0f0f2' }}>
                {item.photo_url ? (
                  <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Image</div>
                )}
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ color: '#86868b', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px' }}>{item.management_number}</div>
                <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 'bold' }}>{item.name}</h3>
                <div style={{ display: 'inline-block', backgroundColor: '#f2f2f7', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '12px' }}>{item.category}</div>
                <div style={{ fontSize: '0.85rem', color: '#444' }}>場所: {item.location}</div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px', color: '#86868b' }}>
            キーワードに一致するアイテムは見つかりませんでした。
          </div>
        )}
      </div>
    </div>
  );
}