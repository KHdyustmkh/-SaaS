'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { analyzeImage, convertToBase64 } from '@/lib/utils';
import { CATEGORY_TREE, getPoliceCategoryCode, isAssetCategory } from '@/lib/categories';

export default function NewItemPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [managementNumber, setManagementNumber] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [itemType, setItemType] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [rightsFlags, setRightsFlags] = useState({ reward: 0, ownership: 0, disclosure: 0 });

  // AI解析実行（ボタンに直結）
  const handleAIAnalysis = async () => {
    console.log("=== AI判定開始 ==="); // これがコンソールに出るか確認
    if (imageFiles.length === 0) {
      alert("ファイルを選択してください");
      return;
    }

    setIsAnalyzing(true);
    try {
      const base64 = await convertToBase64(imageFiles[0]);
      const res = await analyzeImage(base64); 
      
      console.log("AI解析成功:", res); // これが出れば通信は成功

      setManagementNumber(res.police_id || "");
      setName(res.product_name || "");
      setDescription(res.description || "");

      const hint = res.category_hint || "";
      
      // カテゴリーの「超」強制マッチング
      let matched = false;
      outer: for (const main in CATEGORY_TREE) {
        for (const sub in CATEGORY_TREE[main]) {
          for (const type of CATEGORY_TREE[main][sub]) {
            // AIの答えが、システム側の単語に含まれているか、その逆なら正解とする
            if (hint && (type.includes(hint) || hint.includes(type))) {
              console.log(`マッチ発見: ${main} / ${sub} / ${type}`);
              setMainCategory(main);
              setSubCategory(sub);
              setItemType(type);
              if (isAssetCategory(main)) {
                setRightsFlags({ reward: 0, ownership: 1, disclosure: 0 });
              }
              matched = true;
              break outer;
            }
          }
        }
      }
      if (!matched) console.error("カテゴリーが一致しませんでした:", hint);

    } catch (e: any) {
      console.error("重大なエラー:", e);
      alert("エラー発生: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mainCategories = Object.keys(CATEGORY_TREE);
  const subCategories = useMemo(() => mainCategory ? Object.keys(CATEGORY_TREE[mainCategory]) : [], [mainCategory]);
  const itemTypes = useMemo(() => mainCategory && subCategory ? CATEGORY_TREE[mainCategory][subCategory] : [], [mainCategory, subCategory]);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff' }}>
      <h1 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>拾得物 新規登録</h1>
      
      <div style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <input type="file" onChange={(e) => {
          const files = Array.from(e.target.files || []);
          setImageFiles(files);
          setImagePreviews(files.map(f => URL.createObjectURL(f)));
        }} />
        <button 
          type="button" 
          onClick={() => {
            console.log("ボタンがクリックされました");
            handleAIAnalysis();
          }} 
          disabled={isAnalyzing}
          style={{ padding: '10px', background: '#0070f3', color: 'white', marginLeft: '10px' }}
        >
          {isAnalyzing ? '解析中...' : 'AI判定実行'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <label>管理番号: <input value={managementNumber} onChange={e => setManagementNumber(e.target.value)} /></label>
        <label>品名: <input value={name} onChange={e => setName(e.target.value)} /></label>
        
        <label>大分類:
          <select value={mainCategory} onChange={e => setMainCategory(e.target.value)}>
            <option value="">未選択</option>
            {mainCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label>中分類:
          <select value={subCategory} onChange={e => setSubCategory(e.target.value)} disabled={!mainCategory}>
            <option value="">未選択</option>
            {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label>種類:
          <select value={itemType} onChange={e => setItemType(e.target.value)} disabled={!subCategory}>
            <option value="">未選択</option>
            {itemTypes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}