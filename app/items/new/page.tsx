'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';

// カテゴリーのマスターデータ（必要に応じて後から追加・修正が可能）
const CATEGORY_TREE: Record<string, Record<string, string[]>> = {
  "現金": {
    "現金": ["紙幣のみ", "硬貨のみ", "混在", "外貨"]
  },
  "かばん類": {
    "ビジネスバッグ": ["アタッシュケース", "ブリーフケース", "その他"],
    "ハンドバッグ": ["革製", "布製", "その他"],
    "リュックサック": ["登山用", "タウンユース", "その他"]
  },
  "財布類": {
    "長財布": ["革製", "布製", "その他"],
    "折り財布": ["二つ折り", "三つ折り", "その他"],
    "小銭入れ": ["がま口", "ファスナー", "その他"]
  },
  "カメラ類": {
    "デジタルカメラ": ["一眼レフ", "コンパクト", "ミラーレス"],
    "ビデオカメラ": ["家庭用", "アクションカメラ", "その他"]
  },
  "その他": {
    "その他": ["その他"]
  }
};

export default function NewItemPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // フォームステート
  const [managementNumber, setManagementNumber] = useState('');
  const [name, setName] = useState('');
  const [foundAt, setFoundAt] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [facePhotoUrl, setFacePhotoUrl] = useState('');

  // カテゴリー用ステート
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [itemType, setItemType] = useState('');

  // 選択肢の動的生成
  const mainCategories = Object.keys(CATEGORY_TREE);
  const subCategories = useMemo(() => {
    return mainCategory ? Object.keys(CATEGORY_TREE[mainCategory]) : [];
  }, [mainCategory]);
  const itemTypes = useMemo(() => {
    return mainCategory && subCategory ? CATEGORY_TREE[mainCategory][subCategory] : [];
  }, [mainCategory, subCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // ユーザー認証確認
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // カテゴリーの結合（例: "かばん類 / ビジネスバッグ / アタッシュケース"）
    const combinedCategory = `${mainCategory} / ${subCategory} / ${itemType}`;

    // データベースへの挿入
    const { error } = await supabase.from('lost_items').insert([
      {
        management_number: managementNumber,
        name: name,
        status: '保管中', // 初期ステータスを固定
        found_at: new Date(foundAt).toISOString(),
        category: combinedCategory,
        location: location,
        description: description,
        photo_url: photoUrl || null,
        face_photo_url: facePhotoUrl || null,
        user_id: user.id
      }
    ]);

    if (error) {
      setErrorMsg('登録に失敗しました: ' + error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
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
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>管理番号 *</label>
            <input type="text" value={managementNumber} onChange={(e) => setManagementNumber(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>品名（名称） *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', fontSize: '0.9rem', color: '#0070f3' }}>詳細カテゴリー分類 *</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select value={mainCategory} onChange={(e) => { setMainCategory(e.target.value); setSubCategory(''); setItemType(''); }} required style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="">大分類を選択</option>
                {mainCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select value={subCategory} onChange={(e) => { setSubCategory(e.target.value); setItemType(''); }} required disabled={!mainCategory} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: !mainCategory ? '#eee' : 'white' }}>
                <option value="">中分類を選択</option>
                {subCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select value={itemType} onChange={(e) => setItemType(e.target.value)} required disabled={!subCategory} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: !subCategory ? '#eee' : 'white' }}>
                <option value="">小分類を選択</option>
                {itemTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>拾得日時 *</label>
            <input type="datetime-local" value={foundAt} onChange={(e) => setFoundAt(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>拾得場所 *</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>全体写真URL（任意）</label>
            <input type="url" placeholder="https://..." value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>特徴写真URL（任意）</label>
            <input type="url" placeholder="https://..." value={facePhotoUrl} onChange={(e) => setFacePhotoUrl(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem' }}>詳細説明・メモ（任意）</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }} />
          </div>

          <button type="submit" disabled={loading} style={{ backgroundColor: '#0070f3', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
            {loading ? '登録中...' : 'この内容で登録する'}
          </button>
        </form>
      </div>
    </div>
  );
}