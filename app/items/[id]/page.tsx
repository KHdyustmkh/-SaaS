'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PoliceReportGenerator } from '@/components/PoliceReportGenerator';

export default function ItemDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  
  const [item, setItem] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditingPolice, setIsEditingPolice] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // ★画像選択・撮影時の即時プレビュー用
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  // ★ファイル選択・撮影時に即座にプレビューを表示する
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setActivePhotoIndex(-1); 
  };

  // ★画像48番の404エラーを解消するためのAPI呼び出し
  const handleAIAnalysis = async () => {
    if (!item?.photo_url) return;
    setUpdating(true);
    try {
      const response = await fetch(item.photo_url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const result = reader.result as string;
        if (!result) return;
        
        const base64data = result.split(',')[1];

        // 画像48の原因：存在しないエンドポイントを叩かないよう、
        // プロジェクト内の標準パス '/api/analyze' を指定
        const aiResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64data }),
        });

        if (!aiResponse.ok) throw new Error(`APIエラー: ${aiResponse.status}`);
        
        const res = await aiResponse.json();
        
        const { error } = await supabase.from('lost_items').update({
          name: res["product_name"] || item.name,
          category: res["category_hint"] || item.category,
          description: res["description"] || item.description
        }).eq('id', id);

        if (error) throw error;
        
        setItem((prev: any) => ({ 
          ...prev, 
          name: res["product_name"] || prev.name,
          category: res["category_hint"] || prev.category,
          description: res["description"] || prev.description
        }));
        
        alert('AIによる再判定が完了しました。');
      };
    } catch (error: any) {
      alert('AI判定失敗: ' + error.message);
    } finally {
      setUpdating(false);
    }
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

  const handleSavePoliceInfo = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      const updates: any = {
        reported_to_police_at: editPoliceDate || null,
        police_receipt_number: editPoliceNumber || null
      };
      if (editPoliceNumber && editPoliceNumber.trim() !== "") {
        updates.status = '警察届出済';
      }
      const { error } = await supabase.from('lost_items').update(updates).eq('id', id);
      if (error) throw error;
      setItem((prev: any) => ({ ...prev, ...updates }));
      setIsEditingPolice(false);
      alert('警察情報を更新しました。');
      router.refresh();
    } catch (error: any) {
      alert('保存失敗: ' + error.message);
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
      image_url: item.photo_url || "",
      registered_by: item.registered_by,
      found_at: item.found_at,
      management_number: item.management_number,
      cash_counts: item.cash_counts,
      reported_to_police_at: item.reported_to_police_at
    };
  }, [item]);

  useEffect(() => {
    if (!id) return;
    const fetchItem = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [itemRes, profileRes] = await Promise.all([
        supabase.from('lost_items').select('*').eq('id', id).single(),
        supabase.schema('public').from('profiles').select('*').eq('id', user.id).maybeSingle()
      ]);

      if (itemRes.error || !itemRes.data) {
        router.push('/');
      } else {
        setItem(itemRes.data);
        setEditPoliceDate(itemRes.data.reported_to_police_at ? itemRes.data.reported_to_police_at.split('T')[0] : '');
        setEditPoliceNumber(itemRes.data.police_receipt_number || '');
      }

      if (!profileRes.error) {
        setProfile(profileRes.data);
      }
      setLoading(false);
    };
    fetchItem();
  }, [id, supabase, router]);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>読み込み中...</div>;
  if (!item) return null;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <button onClick={() => router.push('/')} style={{ padding: '10px 24px', cursor: 'pointer', border: 'none', backgroundColor: '#e5e5e7', borderRadius: '10px', fontWeight: 'bold' }}>← 戻る</button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleAIAnalysis} disabled={updating} style={{ padding: '10px 24px', cursor: 'pointer', border: 'none', backgroundColor: '#5856d6', color: 'white', borderRadius: '10px', fontWeight: 'bold' }}>✨ AI再判定</button>
            <button onClick={handleDelete} disabled={updating} style={{ padding: '10px 24px', cursor: 'pointer', border: 'none', backgroundColor: '#ff3b30', color: 'white', borderRadius: '10px', fontWeight: 'bold' }}>🗑️ 削除</button>
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#000', padding: '20px' }}>
            <div style={{ width: '100%', height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
              {previewUrl ? (
                <img src={previewUrl} alt="プレビュー" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : allPhotos.length > 0 ? (
                <img src={allPhotos[activePhotoIndex]} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ color: '#555' }}>画像なし</div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
               <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ color: 'white', cursor: 'pointer' }} />
            </div>

            {allPhotos.length > 1 && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {allPhotos.map((url, index) => (
                  <div key={index} onClick={() => { setActivePhotoIndex(index); setPreviewUrl(null); }} style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: activePhotoIndex === index && !previewUrl ? '2px solid #007aff' : '2px solid transparent' }}>
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

                <div style={{ marginTop: '32px', padding: '24px', backgroundColor: '#f0f7ff', borderRadius: '16px', border: '1px solid #cce5ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <label style={{ color: '#007aff', fontSize: '0.9rem', fontWeight: 'bold' }}>🚔 警察届出情報</label>
                    {!isEditingPolice && (
                      <button onClick={() => setIsEditingPolice(true)} style={{ color: '#007aff', fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}>編集</button>
                    )}
                  </div>

                  {isEditingPolice ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                      <input type="date" value={editPoliceDate} onChange={(e) => setEditPoliceDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ccc' }} />
                      <input type="text" value={editPoliceNumber} placeholder="受理番号" onChange={(e) => setEditPoliceNumber(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ccc' }} />
                      <button onClick={handleSavePoliceInfo} style={{ backgroundColor: '#007aff', color: 'white', padding: '8px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>保存</button>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>届出日: {formatDate(item.reported_to_police_at)}</div>
                      <div style={{ fontSize: '0.9rem' }}>受理番号: {item.police_receipt_number || '未登録'}</div>
                    </div>
                  )}

                  {itemDataForPdf && (
                    <PoliceReportGenerator 
                      itemData={itemDataForPdf} 
                      profileData={profile} 
                    />
                  )}
                </div>
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