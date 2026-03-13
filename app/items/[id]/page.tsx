'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ItemDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('lost_items')
        .update({ status: newStatus })
        .eq('id', id); // ここで確実にこのアイテムだけを指定

      if (error) throw error;

      // 1. ローカルの状態を更新
      setItem((prev: any) => ({ ...prev, status: newStatus }));
      
      // 2. サーバー側のデータを最新にする（ダッシュボードに戻った時に反映させるため）
      router.refresh();
      
      alert(`ステータスを「${newStatus}」に変更しました。`);
    } catch (error: any) {
      alert('更新に失敗しました: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const allPhotos = useMemo(() => {
    if (!item) return [];
    const photos = [];
    if (item.photo_url) photos.push(item.photo_url);
    if (item.face_photo_url) {
      const secondaryPhotos = item.face_photo_url.split(',').filter((url: string) => url.trim() !== '');
      photos.push(...secondaryPhotos);
    }
    return photos;
  }, [item]);

  useEffect(() => {
    if (!id) return;
    const fetchItem = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
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
        <button onClick={() => router.push('/')} style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer', border: 'none', backgroundColor: '#ddd', borderRadius: '8px', fontWeight: 'bold' }}>← 戻る</button>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a1a', padding: '20px' }}>
            <div style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
              {allPhotos.length > 0 ? <img src={allPhotos[activePhotoIndex]} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ color: '#666' }}>画像なし</div>}
            </div>
            {allPhotos.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {allPhotos.map((url, index) => (
                  <div key={index} onClick={() => setActivePhotoIndex(index)} style={{ width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer', border: activePhotoIndex === index ? '2px solid #0070f3' : '2px solid transparent', opacity: activePhotoIndex === index ? 1 : 0.5 }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', borderBottom: '2px solid #f0f0f0', paddingBottom: '15px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', margin: '0 0 5px 0' }}>{item.name}</h1>
                <div style={{ color: '#888' }}>管理番号: {item.management_number}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '5px' }}>ステータス変更</label>
                <select value={item.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={updating} style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid #0070f3', fontWeight: 'bold', color: '#0070f3' }}>
                  <option value="保管中">🔵 保管中</option>
                  <option value="引き渡し済">🟢 引き渡し済</option>
                  <option value="回収済">🟡 回収済</option>
                  <option value="廃棄済">🔴 廃棄済</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
              <section>
                <div style={{ marginBottom: '20px' }}><label style={{ color: '#888', fontSize: '0.85rem' }}>拾得場所</label><div style={{ fontWeight: 'bold' }}>{item.location}</div></div>
                <div style={{ marginBottom: '20px' }}><label style={{ color: '#888', fontSize: '0.85rem' }}>カテゴリー</label><div style={{ fontWeight: 'bold' }}>{item.category}</div></div>
              </section>
              <section>
                <label style={{ color: '#888', fontSize: '0.85rem' }}>詳細説明</label>
                <div style={{ backgroundColor: '#f8f8fa', padding: '15px', borderRadius: '10px', minHeight: '100px' }}>{item.description || 'なし'}</div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}