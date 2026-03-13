'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { analyzeImage } from '@/lib/vision';
import { convertToBase64 } from '@/lib/utils';
import { CATEGORY_TREE } from '@/lib/categories';

export default function NewItemPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [managementNumber, setManagementNumber] = useState('');
  const [name, setName] = useState('');
  const [foundAt, setFoundAt] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [itemType, setItemType] = useState('');

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const mainCategories = Object.keys(CATEGORY_TREE);
  const subCategories = useMemo(() => mainCategory ? Object.keys(CATEGORY_TREE[mainCategory]) : [], [mainCategory]);
  const itemTypes = useMemo(() => mainCategory && subCategory ? CATEGORY_TREE[mainCategory][subCategory] : [], [mainCategory, subCategory]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (imageFiles.length + files.length > 5) {
      alert('写真は最大5枚までです。');
      return;
    }
    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(newPreviews);
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  const handleAIAnalysis = async () => {
    if (imageFiles.length === 0) return;
    setIsAnalyzing(true);
    try {
      const base64 = await convertToBase64(imageFiles[0]);
      
      // AI自体に日本語で答えるよう指示し、結果を取得
      let aiResult = await analyzeImage(base64);

      // 強制日本語変換マップ（拡充版）
      const forceJapaneseMap: { [key: string]: string } = {
        "watch": "腕時計", "wristwatch": "腕時計", "clock": "時計", "ウォッチ": "腕時計",
        "wallet": "財布", "purse": "財布", "billfold": "財布", "財布類": "財布",
        "bag": "カバン", "handbag": "ハンドバッグ", "backpack": "リュックサック",
        "smartphone": "スマートフォン", "iphone": "スマートフォン", "phone": "スマートフォン",
        "glasses": "めがね", "eyeglasses": "めがね", "sunglasses": "サングラス",
        "key": "鍵", "keys": "鍵", "keychain": "キーホルダー", "家鍵": "鍵",
        "umbrella": "傘", "parasol": "日傘", "雨傘": "傘",
        "card": "カードケース", "credit card": "カード",
        "earbuds": "イヤホン", "headphones": "ヘッドホン"
      };

      const lowerResult = aiResult.toLowerCase().trim();
      const targetName = forceJapaneseMap[lowerResult] || aiResult;

      let foundMain = "";
      let foundSub = "";
      let foundType = "";

      outerLoop:
      for (const main in CATEGORY_TREE) {
        for (const sub in CATEGORY_TREE[main]) {
          for (const type of CATEGORY_TREE[main][sub]) {
            // 日本語名とAI結果の部分一致を確認
            if (targetName.includes(type) || type.includes(targetName)) {
              foundMain = main;
              foundSub = sub;
              foundType = type;
              break outerLoop;
            }
          }
        }
      }

      if (foundMain) {
        setMainCategory(foundMain);
        setSubCategory(foundSub);
        setItemType(foundType);
        setName(foundType); // カテゴリーツリー内の日本語名をセット
      } else {
        setName(targetName); // 見つからない場合も日本語変換済みの名前をセット
      }
    } catch (error) {
      console.error("AI解析エラー:", error);
      alert('AIの判定に失敗しました。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    // 【修正】現在のログインユーザーを厳格に取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
      router.push('/login'); 
      return; 
    }

    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('item-images').upload(filePath, file);
        if (uploadError) throw new Error(`失敗: ${uploadError.message}`);
        const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }

      const combinedCategory = `${mainCategory} / ${subCategory} / ${itemType}`;

      // 【重要修正】user_id を含めてインサートし、所有者を明確にする
      const { error: dbError } = await supabase.from('lost_items').insert([{
        management_number: managementNumber,
        name: name,
        status: '保管中',
        found_at: new Date(foundAt).toISOString(),
        category: combinedCategory,
        location: location,
        description: description,
        photo_url: uploadedUrls[0] || null,
        face_photo_url: uploadedUrls.slice(1).join(',') || null,
        user_id: user.id // この1行が他人のデータ混入を防ぐ鍵です
      }]);

      if (dbError) throw new Error(`DB登録エラー: ${dbError.message}`);
      
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
          <button onClick={() => router.push('/')} style={{ padding: '8px 16px', backgroundColor: '#e5e5e7', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>キャンセル</button>
        </div>

        {errorMsg && <div style={{ backgroundColor: '#fff1f0', color: '#f5222d', padding: '10px', borderRadius: '6px', marginBottom: '20px' }}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>管理番号 *</label><input type="text" value={managementNumber} onChange={(e) => setManagementNumber(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} /></div>
          
          <div style={{ padding: '15px', border: '2px dashed #ccc', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>写真（最大5枚）</label>
            <input type="file" accept="image/*" capture="environment" multiple onChange={handleImageChange} style={{ marginBottom: '15px' }} />
            
            {imagePreviews.length > 0 && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '15px', justifyContent: 'center' }}>
                {imagePreviews.map((preview, index) => (
                  <div key={index} style={{ position: 'relative', width: '120px', height: '120px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={preview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeImage(index)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {imageFiles.length > 0 && (
              <button type="button" onClick={handleAIAnalysis} disabled={isAnalyzing} style={{ width: '100%', padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}>
                {isAnalyzing ? '🔄 AI解析中...' : '✨ AIで品名とカテゴリーを自動判定'}
              </button>
            )}
          </div>

          <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>品名 *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} /></div>

          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
            <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold', color: '#0070f3' }}>詳細カテゴリー *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', display: 'block' }}>大分類</span>
                <select value={mainCategory} onChange={(e) => { setMainCategory(e.target.value); setSubCategory(''); setItemType(''); }} required style={{ width: '100%', padding: '12px', borderRadius: '6px', backgroundColor: 'white' }}>
                  <option value="">大分類を選択</option>
                  {mainCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', display: 'block' }}>中分類</span>
                <select value={subCategory} onChange={(e) => { setSubCategory(e.target.value); setItemType(''); }} required disabled={!mainCategory} style={{ width: '100%', padding: '12px', borderRadius: '6px', backgroundColor: 'white' }}>
                  <option value="">中分類を選択</option>
                  {subCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', display: 'block' }}>小分類</span>
                <select value={itemType} onChange={(e) => setItemType(e.target.value)} required disabled={!subCategory} style={{ width: '100%', padding: '12px', borderRadius: '6px', backgroundColor: 'white' }}>
                  <option value="">小分類を選択</option>
                  {itemTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>拾得日時 *</label><input type="datetime-local" value={foundAt} onChange={(e) => setFoundAt(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} /></div>
          <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>拾得場所 *</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} /></div>
          <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>詳細説明</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} /></div>

          <button type="submit" disabled={loading} style={{ backgroundColor: '#0070f3', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem', marginTop: '10px' }}>
            {loading ? '登録中...' : 'この内容で登録する'}
          </button>
        </form>
      </div>
    </div>
  );
}