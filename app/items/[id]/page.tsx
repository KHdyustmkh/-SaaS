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

  // 日付フォーマット関数（警察届出用）
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmDelete = window.confirm('このアイテムを完全に削除しますか？');
    if (!confirmDelete) return;

    setUpdating(true);
    try {
      const { error } = await supabase.from('lost_items').delete().eq('id', id);
      if (error) throw error;
      alert('アイテムを削除しました。ダッシュボードへ戻ります。');
      window.location.href = '/'; 
    } catch (error: any) {
      alert('削除に失敗しました: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from('lost_items').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setItem((prev: any) => ({ ...prev, status: newStatus }));
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button onClick={() => router.push('/')} style={{ padding: '10px 24px', cursor: 'pointer', border: 'none', backgroundColor: '#e5e5e7', borderRadius: '10px', fontWeight: 'bold' }}>← 戻る</button>
          <button onClick={handleDelete} disabled={updating} style={{ padding: '10px 24px', cursor: 'pointer', border: 'none', backgroundColor: '#ff3b30', color: 'white', borderRadius: '10px', fontWeight: 'bold', opacity: updating ? 0.5 : 1 }}>
            {updating ? '処理中...' : '🗑️ この情報を完全に削除'}
          </button>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#000', padding: '20px' }}>
            <div style={{ width: '100%', height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
              {allPhotos.length > 0 ? <img src={allPhotos[activePhotoIndex]} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ color: '#555' }}>画像なし</div>}
            </div>
            {allPhotos.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {allPhotos.map((url, index) => (
                  <div key={index} onClick={() => setActivePhotoIndex(index)} style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: activePhotoIndex === index ? '2px solid #007aff' : '2px solid transparent' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 8px 0', color: '#1d1d1f' }}>{item.name}</h1>
                <div style={{ color: '#86868b', fontSize: '0.9rem' }}>管理番号: {item.management_number}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>ステータス管理</label>
                <select value={item.status || '保管中'} onChange={(e) => handleStatusChange(e.target.value)} disabled={updating} style={{ padding: '10px 16px', borderRadius: '12px', border: '2px solid #007aff', fontWeight: 'bold', color: '#007aff', backgroundColor: '#fff', cursor: 'pointer' }}>
                  <option value="保管中">🔵 保管中</option>
                  <option value="引き渡し済">🟢 引き渡し済</option>
                  <option value="回収済">🟡 回収済</option>
                  <option value="廃棄済">🔴 廃棄済</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
              <section>
                <div style={{ marginBottom: '24px' }}><label style={{ color: '#86868b', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>拾得場所</label><div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{item.location}</div></div>
                <div style={{ marginBottom: '24px' }}><label style={{ color: '#86868b', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>カテゴリー</label><div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{item.category}</div></div>
                
                {/* 警察関連の情報を追加 */}
                {(item.reported_to_police_at || item.police_receipt_number) && (
                  <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '14px', border: '1px solid #cce5ff' }}>
                    <label style={{ color: '#007aff', fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🚔 警察届出情報</label>
                    {item.reported_to_police_at && (
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{ color: '#86868b', fontSize: '0.8rem', display: 'block' }}>届出日</span>
                        <span style={{ fontWeight: '600', color: '#1d1d1f' }}>{formatDate(item.reported_to_police_at)}</span>
                      </div>
                    )}
                    {item.police_receipt_number && (
                      <div>
                        <span style={{ color: '#86868b', fontSize: '0.8rem', display: 'block' }}>受理番号</span>
                        <span style={{ fontWeight: '600', color: '#1d1d1f' }}>{item.police_receipt_number}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section>
                <label style={{ color: '#86868b', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>詳細説明</label>
                <div style={{ backgroundColor: '#f5f5f7', padding: '20px', borderRadius: '14px', minHeight: '120px', color: '#1d1d1f', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {item.description || '追加の説明はありません。'}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}