'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ItemDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchItem = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('データ取得エラー:', error);
        router.push('/');
      } else {
        setItem(data);
      }
      setLoading(false);
    };

    if (id) fetchItem();
  }, [id, supabase, router]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>読み込み中...</div>;
  if (!item) return <div style={{ padding: '50px', textAlign: 'center' }}>データが見つかりません。</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={() => router.push('/')}
          style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer', border: 'none', backgroundColor: '#eee', borderRadius: '8px' }}
        >
          ← ダッシュボードへ戻る
        </button>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          {/* メイン写真 */}
          <div style={{ width: '100%', height: '400px', backgroundColor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.photo_url ? (
              <img src={item.photo_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ color: '#666' }}>画像なし</span>
            )}
          </div>

          {/* 詳細情報 */}
          <div style={{ padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h1 style={{ fontSize: '2rem', margin: 0 }}>{item.name}</h1>
              <span style={{ 
                padding: '8px 16px', 
                borderRadius: '20px', 
                backgroundColor: item.status === '保管中' ? '#e6f7ff' : '#fff1f0',
                color: item.status === '保管中' ? '#1890ff' : '#f5222d',
                fontWeight: 'bold'
              }}>
                {item.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', borderTop: '1px solid #eee', paddingTop: '30px' }}>
              <div>
                <h3 style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px' }}>管理番号</h3>
                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{item.management_number}</p>
                
                <h3 style={{ color: '#888', fontSize: '0.9rem', marginTop: '20px', marginBottom: '8px' }}>拾得場所</h3>
                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{item.location}</p>

                <h3 style={{ color: '#888', fontSize: '0.9rem', marginTop: '20px', marginBottom: '8px' }}>拾得日時</h3>
                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{new Date(item.found_at).toLocaleString()}</p>
              </div>

              <div>
                <h3 style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px' }}>カテゴリ</h3>
                <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{item.category}</p>

                <h3 style={{ color: '#888', fontSize: '0.9rem', marginTop: '20px', marginBottom: '8px' }}>詳細説明・メモ</h3>
                <p style={{ fontSize: '1rem', lineHeight: '1.6', color: '#444', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                  {item.description || '説明なし'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}