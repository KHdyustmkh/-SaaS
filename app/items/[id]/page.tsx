'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PoliceReportGenerator } from '@/components/PoliceReportGenerator';

export default function ItemDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditingPolice, setIsEditingPolice] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const [editPoliceDate, setEditPoliceDate] = useState('');
  const [editPoliceNumber, setEditPoliceNumber] = useState('');

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未登録';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('このアイテムを完全に削除しますか？')) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from('lost_items').delete().eq('id', id);
      if (error) throw error;
      alert('削除しました。');
      window.location.href = '/'; 
    } catch (error: any) {
      alert('削除失敗: ' + error.message);
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
      alert('更新失敗: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  // ★統合・拡張：警察情報の保存と自動ステータス更新
  const handleSavePoliceInfo = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      // 更新データの作成
      const updates: any = {
        reported_to_police_at: editPoliceDate || null,
        police_receipt_number: editPoliceNumber || null
      };

      // 【ロジック修正】受理番号が入力されている場合、ステータスを自動で「警察届出済」にする
      if (editPoliceNumber && editPoliceNumber.trim() !== "") {
        updates.status = '警察届出済';
      }

      const { error } = await supabase
        .from('lost_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // ローカルステートの更新（画面の即時反映）
      setItem((prev: any) => ({
        ...prev,
        ...updates
      }));
      
      setIsEditingPolice(false);
      
      const message = updates.status 
        ? '警察情報を更新し、ステータスを「警察届出済」に変更しました。' 
        : '警察情報を更新しました。';
      
      alert(message);
      router.refresh();
    } catch (error: any) {
      alert('保存に失敗しました: ' + error.message);
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

  const itemDataForPdf = useMemo(() => {
    if (!item) return null;
    return {
      product_name: item.name,
      category_hint: item.category,
      location: item.location || "",
      color: item.color || "", 
      description: item.description || "",
      image_url: item.photo_url || ""
    };
  }, [item]);

  useEffect(() => {
    if (!id) return;
    const fetchItem = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data, error } = await supabase.from('lost_items').select('*').eq('id', id).single();
      if (error || !data) {
        router.push('/');
      } else {
        setItem(data);
        setEditPoliceDate(data.reported_to_police_at ? data.reported_to_police_at.split('T')[0] : '');
        setEditPoliceNumber(data.police_receipt_number || '');
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
            🗑️ 削除
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
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#86868b', marginBottom: '8px', fontWeight: '600' }}>ステータス</label>
                <select value={item.status || '届出未完了'} onChange={(e) => handleStatusChange(e.target.value)} disabled={updating} style={{ padding: '10px 16px', borderRadius: '12px', border: '2px solid #007aff', fontWeight: 'bold', color: '#007aff', backgroundColor: '#fff' }}>
                  <option value="届出未完了">🚨 届出未完了</option>
                  <option value="警察届出済">🚔 警察届出済</option>
                  <option value="お客様返却済">🤝 お客様返却済</option>
                  <option value="回収済">📦 回収済</option>
                  <option value="廃棄済">🗑️ 廃棄済</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '40px' }}>
              <section>
                <div style={{ marginBottom: '24px' }}><label style={{ color: '#86868b', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>拾得場所</label><div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{item.location}</div></div>
                <div style={{ marginBottom: '24px' }}><label style={{ color: '#86868b', fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>カテゴリー</label><div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{item.category}</div></div>
                
                <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '14px', border: '1px solid #cce5ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ color: '#007aff', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>🚔 警察届出情報</label>
                    {!isEditingPolice ? (
                      <button onClick={() => setIsEditingPolice(true)} style={{ background: 'none', border: 'none', color: '#007aff', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>編集する</button>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setIsEditingPolice(false)} style={{ background: 'none', border: 'none', color: '#86868b', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}>キャンセル</button>
                        <button onClick={handleSavePoliceInfo} disabled={updating} style={{ backgroundColor: '#007aff', border: 'none', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px' }}>保存</button>
                      </div>
                    )}
                  </div>

                  {!isEditingPolice ? (
                    <>
                      <div style={{ marginBottom: '12px' }}>
                        <span style={{ color: '#86868b', fontSize: '0.8rem', display: 'block' }}>届出日</span>
                        <span style={{ fontWeight: '600', color: '#1d1d1f' }}>{formatDate(item.reported_to_police_at)}</span>
                      </div>
                      <div>
                        <span style={{ color: '#86868b', fontSize: '0.8rem', display: 'block' }}>受理番号</span>
                        <span style={{ fontWeight: '600', color: '#1d1d1f' }}>{item.police_receipt_number || '未登録'}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#86868b' }}>届出日</label>
                        <input type="date" value={editPoliceDate} onChange={(e) => setEditPoliceDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d2d2d7' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#86868b' }}>受理番号</label>
                        <input type="text" value={editPoliceNumber} placeholder="第12345号" onChange={(e) => setEditPoliceNumber(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d2d2d7' }} />
                      </div>
                    </div>
                  )}
                </div>

                {itemDataForPdf && (
                  <div style={{ marginTop: '20px' }}>
                    <PoliceReportGenerator itemData={itemDataForPdf} />
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