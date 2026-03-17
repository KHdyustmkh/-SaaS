'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { convertToBase64 } from '@/lib/utils';
import { CATEGORY_TREE, getPoliceCategoryCode, isAssetCategory } from '@/lib/categories';

const DENOMINATIONS = [
  { label: '10,000円', key: '10000' },
  { label: '5,000円', key: '5000' },
  { label: '2,000円', key: '2000' },
  { label: '1,000円', key: '1000' },
  { label: '500円', key: '500' },
  { label: '100円', key: '100' },
  { label: '50円', key: '50' },
  { label: '10円', key: '10' },
  { label: '5円', key: '5' },
  { label: '1円', key: '1' },
];

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
  const [status, setStatus] = useState('届出未完了');
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [itemType, setItemType] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [rightsFlags, setRightsFlags] = useState({ reward: 0, ownership: 0, disclosure: 0 });
  const [cashCounts, setCashCounts] = useState<{ [key: string]: number }>({});
  const [totalCashAmount, setTotalCashAmount] = useState<number>(0);

  const mainCategories = Object.keys(CATEGORY_TREE);
  const subCategories = useMemo(() => mainCategory ? Object.keys(CATEGORY_TREE[mainCategory]) : [], [mainCategory]);
  const itemTypes = useMemo(() => mainCategory && subCategory ? CATEGORY_TREE[mainCategory][subCategory] : [], [mainCategory, subCategory]);

  const autoEstimateCash = (amount: number) => {
    let rem = amount;
    const newCounts: { [key: string]: number } = {};
    [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 1].forEach(d => {
      newCounts[d.toString()] = Math.floor(rem / d);
      rem %= d;
    });
    setCashCounts(newCounts);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (imageFiles.length + files.length > 5) {
      alert('写真は最大5枚までです。');
      return;
    }
    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map(file => URL.createObjectURL(file)));
  };

  const handleAIAnalysis = async () => {
    if (imageFiles.length === 0) return;
    setIsAnalyzing(true);
    try {
      const base64 = await convertToBase64(imageFiles[0]);
      // 通信先を新しく作ったAPI Route (/api/analyze) に変更
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      const aiResult = await response.json();
      if (aiResult.error) throw new Error(aiResult.error);

      setName(aiResult.product_name || "");
      setDescription(aiResult.description || "");
      setManagementNumber(`令和${new Date().getFullYear() - 2018}年-${Math.floor(Math.random() * 9000 + 1000)}`);
      
      const aiType = aiResult.item_type || "";
      let matched = false;

      outerLoop:
      for (const main in CATEGORY_TREE) {
        for (const sub in CATEGORY_TREE[main]) {
          for (const type of CATEGORY_TREE[main][sub]) {
            if (aiType && (type.includes(aiType) || aiType.includes(type))) {
              setMainCategory(main);
              setSubCategory(sub);
              setItemType(type);
              if (isAssetCategory(main)) setRightsFlags({ reward: 0, ownership: 1, disclosure: 0 });
              matched = true;
              break outerLoop;
            }
          }
        }
      }
    } catch (error) {
      console.error("AI解析エラー:", error);
      alert('AI判定に失敗しました。');
    } finally { setIsAnalyzing(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        await supabase.storage.from('item-images').upload(filePath, file);
        const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(filePath);
        uploadedUrls.push(publicUrl);
      }

      const formatPoliceDate = (dateStr: string) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        const p = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
      };

      const { error: dbError } = await supabase.from('lost_items').insert([{
        management_number: managementNumber,
        name, status, found_at: new Date(foundAt).toISOString(),
        category: `${mainCategory} / ${subCategory} / ${itemType}`,
        location, description, photo_url: uploadedUrls[0] || null,
        face_photo_url: uploadedUrls.slice(1).join(',') || null,
        user_id: user.id,
        registered_by: user.user_metadata?.manager_name || '未設定',
        police_found_at: formatPoliceDate(foundAt),
        police_category_code: getPoliceCategoryCode(itemType),
        location_type_code: 2, finder_type_code: 1, rights_flags: rightsFlags, cash_counts: cashCounts
      }]);

      if (dbError) throw dbError;
      router.push('/');
      router.refresh();
    } catch (err: any) { setErrorMsg(err.message); setLoading(false); }
  };

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>拾得物 新規登録</h1>
          <button type="button" onClick={() => router.push('/')} style={{ padding: '8px 16px', backgroundColor: '#e5e5e7', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>キャンセル</button>
        </div>
        {errorMsg && <div style={{ backgroundColor: '#fff1f0', color: '#f5222d', padding: '10px', borderRadius: '6px', marginBottom: '20px' }}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>管理番号 *</label><input type="text" value={managementNumber} onChange={(e) => setManagementNumber(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} /></div>
          
          <div style={{ padding: '15px', border: '2px dashed #ccc', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>写真</label>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ marginBottom: '15px' }} />
            {imageFiles.length > 0 && (
              <button type="button" onClick={handleAIAnalysis} disabled={isAnalyzing} style={{ width: '100%', padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                {isAnalyzing ? '🔄 AI解析中...' : '✨ AI判定'}
              </button>
            )}
          </div>

          <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>品名 *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} /></div>

          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold', color: '#0070f3' }}>詳細カテゴリー *</label>
            <select value={mainCategory} onChange={(e) => { setMainCategory(e.target.value); setRightsFlags({ reward: 0, ownership: isAssetCategory(e.target.value) ? 1 : 0, disclosure: 0 }); }} required style={{ width: '100%', padding: '12px', borderRadius: '6px', marginBottom: '10px' }}>
              <option value="">大分類を選択</option>
              {mainCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} required disabled={!mainCategory} style={{ width: '100%', padding: '12px', borderRadius: '6px', marginBottom: '10px' }}>
              <option value="">中分類を選択</option>
              {subCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={itemType} onChange={(e) => setItemType(e.target.value)} required disabled={!subCategory} style={{ width: '100%', padding: '12px', borderRadius: '6px' }}>
              <option value="">小分類を選択</option>
              {itemTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          {mainCategory === '現金' && (
            <div style={{ padding: '20px', backgroundColor: '#fff9db', borderRadius: '8px', border: '1px solid #fab005' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#856404' }}>💰 現金内訳入力</h3>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>合計金額</label>
                <input type="number" placeholder="例: 12500" onChange={(e) => { const val = Number(e.target.value); setTotalCashAmount(val); autoEstimateCash(val); }} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '6px', border: '1px solid #fab005' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {DENOMINATIONS.map(({ label, key }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', width: '60px' }}>{label}</span>
                    <input type="number" value={cashCounts[key] || 0} onChange={(e) => setCashCounts({ ...cashCounts, [key]: Number(e.target.value) })} style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }} />
                    <span style={{ fontSize: '0.85rem' }}>枚</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>拾得日時 *</label><input type="datetime-local" value={foundAt} onChange={(e) => setFoundAt(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} /></div>
          <div><label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>拾得場所 *</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} /></div>
          
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '5px' }}>
              <span>詳細説明 (30文字以内)</span>
              <span style={{ color: description.length > 30 ? 'red' : '#666', fontSize: '0.8rem' }}>{description.length}/30</span>
            </label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value.substring(0, 30))} rows={2} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" disabled={loading} style={{ backgroundColor: '#0070f3', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1rem' }}>
            {loading ? '登録中...' : 'この内容で登録する'}
          </button>
        </form>
      </div>
    </div>
  );
}