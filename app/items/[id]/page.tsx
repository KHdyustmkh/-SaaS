'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ItemDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 画像配列の生成ロジック
  const allPhotos = useMemo(() => {
    if (!item) return [];
    const photos = [];
    if (item.photo_url) photos.push(item.photo_url);
    if (item.face_photo_url) {
      // カンマ区切りの文字列を配列に変換
      const secondaryPhotos = item.face_photo_url.split(',').filter((url: string) => url.trim() !== '');
      photos.push(...secondaryPhotos);
    }
    return photos;
  }, [item]);

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
        console.error('データ取得エラー:', error);
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
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button 
          onClick={() => router.push('/')}
          style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer', border: 'none', backgroundColor: '#ddd', borderRadius: '8px', fontWeight: 'bold' }}
        >
          ← ダッシュボードへ戻る
        </button>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
          
          {/* ギャラリーエリア */}
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a1a', padding: '20px' }}>
            <div style={{ width: '100%', height: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
              {allPhotos.length > 0 ? (
                <img 
                  src={allPhotos[activePhotoIndex]} 
                  alt={item.name} 
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                />
              ) : (
                <div style={{ color: '#666' }}>画像データがありません</div>
              )}
            </div>

            {/* サムネイル一覧 */}
            {allPhotos.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {allPhotos.map((url, index) => (
                  <div 
                    key={index}
                    onClick={() => setActivePhotoIndex(index)}
                    style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '6px', 
                      overflow: 'hidden', 
                      cursor: 'pointer',
                      border: activePhotoIndex === index ? '2px solid #0070f3' : '2px solid transparent',
                      opacity: activePhotoIndex === index ? 1 : 0.5
                    }}
                  >
                    <img src={url} alt={`thumb-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 情報表示エリア */}
          <div style={{ padding: '40px' }}>
            {/* エラー箇所修正済み: pb -> paddingBottom */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '2px solid #f0f0f0', paddingBottom: '15px' }}>
              <h1 style={{ fontSize: '1.8rem', margin: 0, color: '#1d1d1f' }}>{item.name}</h1>
              <span style={{ 
                padding: '6px 16px', 
                borderRadius: '20px', 
                backgroundColor: item.status === '保管中' ? '#e6f7ff' : '#fff1f0',
                color: item.status === '保管中' ? '#1890ff' : '#f5222d',
                fontWeight: 'bold'
              }}>
                {item.status}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
              <section>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: '#888', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>管理番号</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{item.management_number}</div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: '#888', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>拾得場所</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{item.location}</div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: '#888', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>拾得日時</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{item.found_at ? new Date(item.found_at).toLocaleString() : '-'}</div>
                </div>
              </section>

              <section>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: '#888', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>カテゴリー</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{item.category}</div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <label style={{ color: '#888', fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>詳細説明</label>
                  <div style={{ 
                    fontSize: '1rem', 
                    lineHeight: '1.6', 
                    color: '#333', 
                    backgroundColor: '#f8f8fa', 
                    padding: '15px', 
                    borderRadius: '10px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {item.description || '特記事項なし'}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}