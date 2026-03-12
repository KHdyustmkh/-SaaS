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

      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false });

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
        
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1d1d1f', margin: 0 }}>管理中アイテム</h1>
            <p style={{ color: '#86868b', marginTop: '8px' }}>全 {items.length} 件の拾得物が登録されています</p>
          </div>
          <button 
            onClick={() => router.push('/items/new')}
            style={{ backgroundColor: '#0070f3', color: 'white', padding: '14px 28px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 14px rgba(0, 112, 243, 0.3)' }}
          >
            + 新規登録
          </button>
        </div>

        {/* カードグリッド */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '25px' 
        }}>
          {items.map((item) => (
            <div 
              key={item.id}
              onClick={() => router.push(`/items/${item.id}`)}
              style={{ 
                backgroundColor: 'white', 
                borderRadius: '18px', 
                overflow: 'hidden', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
                cursor: 'pointer',
                transition: 'transform 0.2s, boxShadow 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
              }}
            >
              {/* 画像エリア */}
              <div style={{ width: '100%', height: '200px', backgroundColor: '#f0f0f2', position: 'relative' }}>
                {item.photo_url ? (
                  <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.9rem' }}>No Image</div>
                )}
                {/* ステータスバッジ */}
                <div style={{ 
                  position: 'absolute', 
                  top: '12px', 
                  right: '12px', 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold',
                  backgroundColor: item.status === '保管中' ? '#0070f3' : '#ff3b30',
                  color: 'white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}>
                  {item.status}
                </div>
              </div>

              {/* コンテンツエリア */}
              <div style={{ padding: '20px' }}>
                <div style={{ color: '#86868b', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>
                  {item.management_number}
                </div>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', color: '#1d1d1f', fontWeight: 'bold' }}>
                  {item.name}
                </h3>
                
                {/* カテゴリーバッジ */}
                <div style={{ 
                  display: 'inline-block',
                  backgroundColor: '#f2f2f7', 
                  color: '#555', 
                  padding: '4px 10px', 
                  borderRadius: '6px', 
                  fontSize: '0.75rem',
                  marginBottom: '15px',
                  border: '1px solid #e5e5ea'
                }}>
                  {item.category || 'カテゴリー未設定'}
                </div>

                {/* 修正済み箇所: pt を削除 */}
                <div style={{ borderTop: '1px solid #f2f2f7', display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#444', fontSize: '0.85rem' }}>
                    <span style={{ color: '#86868b' }}>場所:</span> {item.location}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#444', fontSize: '0.85rem' }}>
                    <span style={{ color: '#86868b' }}>日時:</span> {item.found_at ? new Date(item.found_at).toLocaleDateString() : '-'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div style={{ padding: '100px', textAlign: 'center', color: '#86868b', backgroundColor: 'white', borderRadius: '18px', marginTop: '20px' }}>
            登録されているアイテムはありません。
          </div>
        )}
      </div>
    </div>
  );
}