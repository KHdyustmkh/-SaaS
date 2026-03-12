'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ItemDetailPage() {
  const params = useParams();
  const id = params?.id; // 安全にIDを取得
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!id) return;

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

      if (error || !data) {
        console.error('取得エラー:', error);
        // データがない場合はトップに戻す
        router.push('/');
      } else {
        setItem(data);
      }
      setLoading(false);
    };

    fetchItem();
  }, [id, supabase, router]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>読み込み中...</div>;
  if (!item) return null;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button 
          onClick={() => router.push('/')}
          style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer', border: 'none', backgroundColor: '#ddd', borderRadius: '8px', fontWeight: 'bold' }}
        >
          ← 戻る
        </button>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ width: '100%', height: '400px', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.photo_url ? (
              <img src={item.photo_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ color: '#999' }}>画像なし</span>
            )}
          </div>
          <div style={{ padding: '40px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>{item.name}</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <p><strong>状態:</strong> {item.status}</p>
              <p><strong>管理番号:</strong> {item.management_number}</p>
              <p><strong>場所:</strong> {item.location}</p>
              <p><strong>カテゴリ:</strong> {item.category}</p>
            </div>
            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <strong>メモ:</strong><br />{item.description || 'なし'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}