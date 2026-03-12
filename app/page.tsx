'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchItems = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // .limit(10) を追加して最新10件に絞り込み
      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('データ取得エラー:', error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };

    fetchItems();
  }, [supabase, router]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d1d1f', margin: 0 }}>最新の拾得物 (10件)</h1>
            <p style={{ color: '#86868b', marginTop: '8px' }}>直近で登録されたアイテムを表示しています</p>
          </div>
          <button 
            onClick={() => router.push('/items/new')}
            style={{ backgroundColor: '#0070f3', color: 'white', padding: '14px 28px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 14px rgba(0, 112, 243, 0.3)' }}
          >
            + 新規登録
          </button>
        </div>

        {/* カードグリッド */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px', marginBottom: '40px' }}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onClick={() => router.push(`/items/${item.id}`)} />
          ))}
        </div>

        {/* 全件表示へのボタン */}
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <button 
            onClick={() => router.push('/items/list')}
            style={{ padding: '16px 40px', backgroundColor: 'white', color: '#0070f3', border: '2px solid #0070f3', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', transition: '0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f7ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
          >
            過去の全アイテムを検索・確認する →
          </button>
        </div>

      </div>
    </div>
  );
}

// カードの見た目パーツ（使い回し用）
function ItemCard({ item, onClick }: { item: any, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      style={{ backgroundColor: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', cursor: 'pointer' }}
    >
      <div style={{ width: '100%', height: '180px', backgroundColor: '#f0f0f2', position: 'relative' }}>
        {item.photo_url ? (
          <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No Image</div>
        )}
      </div>
      <div style={{ padding: '15px' }}>
        <div style={{ color: '#86868b', fontSize: '0.7rem', fontWeight: '600' }}>{item.management_number}</div>
        <h3 style={{ margin: '5px 0', fontSize: '1.1rem', color: '#1d1d1f' }}>{item.name}</h3>
        <div style={{ display: 'inline-block', backgroundColor: '#f2f2f7', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', marginBottom: '10px' }}>{item.category}</div>
        <div style={{ fontSize: '0.8rem', color: '#444' }}>場所: {item.location}</div>
      </div>
    </div>
  );
}