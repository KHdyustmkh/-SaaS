'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

// カテゴリーマスター
const CATEGORY_TREE: Record<string, Record<string, string[]>> = {
  "現金": { "現金": ["紙幣のみ", "硬貨のみ", "混在", "外貨"] },
  "かばん類": { "ビジネスバッグ": ["アタッシュケース", "ブリーフケース", "その他"], "ハンドバッグ": ["革製", "布製", "その他"], "リュックサック": ["登山用", "タウンユース", "その他"] },
  "財布類": { "長財布": ["革製", "布製", "その他"], "折り財布": ["二つ折り", "三つ折り", "その他"], "小銭入れ": ["がま口", "ファスナー", "その他"] },
  "カメラ類": { "デジタルカメラ": ["一眼レフ", "コンパクト", "ミラーレス"], "ビデオカメラ": ["家庭用", "アクションカメラ", "その他"] },
  "その他": { "その他": ["その他"] }
};

export default function NewItemPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // テキスト情報ステート
  const [managementNumber, setManagementNumber] = useState('');
  const [name, setName] = useState('');
  const [foundAt, setFoundAt] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // カテゴリーステート
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [itemType, setItemType] = useState('');

  // 写真ファイル管理用ステート（最大5枚）
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const mainCategories = Object.keys(CATEGORY_TREE);
  const subCategories = useMemo(() => mainCategory ? Object.keys(CATEGORY_TREE[mainCategory]) : [], [mainCategory]);
  const itemTypes = useMemo(() => mainCategory && subCategory ? CATEGORY_TREE[mainCategory][subCategory] : [], [mainCategory, subCategory]);

  // ファイル選択時の処理
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (imageFiles.length + files.length > 5) {
      alert('写真は最大5枚までです。');
      return;
    }

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    // プレビュー用のURLを生成
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  // 選択した画像の削除
  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  // 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const uploadedUrls: string[] = [];

      // 1. 画像のアップロード処理（1枚ずつStorageへ保存）
      for (const file of imageFiles) {
        // 安全なファイル名を生成
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(filePath, file);

        if (uploadError) throw new Error(`画像のアップロードに失敗しました: ${uploadError.message}`);

        // 公開URLを取得
        const { data: { publicUrl } } = supabase.storage
          .from('item-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // 2. 既存のDB構造を壊さずにURLを振り分ける戦略
      // 1枚目は photo_url に。2枚目以降はカンマ区切りで face_photo_url に格納
      const primaryPhotoUrl = uploadedUrls.length > 0 ? uploadedUrls[0] : null;
      const secondaryPhotosUrl = uploadedUrls.length > 1 ? uploadedUrls.slice(1).join(',') : null;

      const combinedCategory = `${mainCategory} / ${subCategory} / ${itemType}`;

      // 3. データベースへの登録
      const { error: dbError } = await supabase.from('lost_items').insert([
        {
          management_number: managementNumber,
          name: name,
          status: '保管中',
          found_at: new Date(foundAt).toISOString(),
          category: combinedCategory,
          location: location,
          description: description,
          photo_url: primaryPhotoUrl,
          face_photo_url: secondaryPhotosUrl,
          user_id: user.id
        }
      ]);

      if (dbError) throw new Error(`データベース登録エラー: ${dbError.message}`);

      router.push('/');
      router.refresh();

    } catch (err: any) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>拾得物 新規登録</h1>
          <button onClick={() => router.push('/')} style={{ padding: '8px 16px', cursor: 'pointer', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '6px' }}>キャンセル</button>
        </div>

        {errorMsg && <div style={{ backgroundColor: '#fff1f0', color: '#f5222d', padding: '10px', borderRadius: '6px', marginBottom: '20px' }}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* テキスト入力群 */}
          <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>管理番号 *</label><input type="text" value={managementNumber} onChange={(e) => setManagementNumber(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>品名（名称） *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>

          {/* カテゴリー選択 */}
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '0.9rem', color: '#0070f3' }}>詳細カテゴリー分類 *</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select value={mainCategory} onChange={(e) => { setMainCategory(e.target.value); setSubCategory(''); setItemType(''); }} required style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}><option value="">大分類を選択</option>{mainCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
              <select value={subCategory} onChange={(e) => { setSubCategory(e.target.value); setItemType(''); }} required disabled={!mainCategory} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: !mainCategory ? '#eee' : 'white' }}><option value="">中分類を選択</option>{subCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
              <select value={itemType} onChange={(e) => setItemType(e.target.value)} required disabled={!subCategory} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: !subCategory ? '#eee' : 'white' }}><option value="">小分類を選択</option>{itemTypes.map(type => <option key={type} value={type}>{type}</option>)}</select>
            </div>
          </div>

          <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>拾得日時 *</label><input type="datetime-local" value={foundAt} onChange={(e) => setFoundAt(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
          <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>拾得場所 *</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>

          {/* 画像アップロード領域 */}
          <div style={{ padding: '15px', border: '2px dashed #ccc', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '0.9rem' }}>
              写真の添付（最大5枚まで）
            </label>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleImageChange} 
              disabled={imageFiles.length >= 5}
              style={{ marginBottom: '15px' }}
            />
            
            {/* プレビュー表示エリア */}
            {imagePreviews.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img src={preview} alt={`preview-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #ddd' }} />
                    <button 
                      type="button" 
                      onClick={() => removeImage(index)}
                      style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>※1枚目が一覧画面に表示される代表写真になります。</p>
          </div>

          <div><label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>詳細説明・メモ（任意）</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} /></div>

          <button type="submit" disabled={loading} style={{ backgroundColor: '#0070f3', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
            {loading ? '画像アップロード＆登録中...' : 'この内容で登録する'}
          </button>
        </form>
      </div>
    </div>
  );
}