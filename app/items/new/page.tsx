'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
// パスが間違っている可能性を考慮し、相対パスを再確認してください
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

  const handleAIAnalysis = async () => {
    if (imageFiles.length === 0) return;
    setIsAnalyzing(true);
    try {
      const base64 = await convertToBase64(imageFiles[0]);
      const res = await analyzeImage(base64); 
      
      setName(res.product_name);
      setDescription(res.description);
      setManagementNumber(res.police_id);

      const aiHint = res.category_hint; // 例: "かばん"

      // 【修正の核心】
      // AIが何を返してきても、CATEGORY_TREEの中を全探索して「含まれているもの」を強制セット
      let isFound = false;
      for (const main in CATEGORY_TREE) {
        for (const sub in CATEGORY_TREE[main]) {
          for (const type of CATEGORY_TREE[main][sub]) {
            // AIの回答がシステム定義の単語に含まれているか、その逆であれば合致とみなす
            if (aiHint && (type.includes(aiHint) || aiHint.includes(type))) {
              setMainCategory(main);
              setSubCategory(sub);
              setItemType(type);
              if (isAssetCategory(main)) setRightsFlags({ reward: 0, ownership: 1, disclosure: 0 });
              isFound = true;
              break;
            }
          }
          if (isFound) break;
        }
        if (isFound) break;
      }
    } catch (e) {
      console.error(e);
      alert('解析失敗。コンソールを確認してください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mainCategories = Object.keys(CATEGORY_TREE);
  const subCategories = useMemo(() => mainCategory ? Object.keys(CATEGORY_TREE[mainCategory]) : [], [mainCategory]);
  const itemTypes = useMemo(() => mainCategory && subCategory ? CATEGORY_TREE[mainCategory][subCategory] : [], [mainCategory, subCategory]);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <input type="file" onChange={(e) => {
        const files = Array.from(e.target.files || []);
        setImageFiles(files);
        setImagePreviews(files.map(f => URL.createObjectURL(f)));
      }} />
      <button type="button" onClick={handleAIAnalysis} disabled={isAnalyzing}>
        {isAnalyzing ? '解析中...' : 'AI判定実行'}
      </button>
      <hr />
      <div>
        <label>管理番号</label>
        <input value={managementNumber} onChange={e => setManagementNumber(e.target.value)} />
      </div>
      <div>
        <label>大分類</label>
        <select value={mainCategory} onChange={e => setMainCategory(e.target.value)}>
          <option value="">未選択</option>
          {mainCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label>中分類</label>
        <select value={subCategory} onChange={e => setSubCategory(e.target.value)} disabled={!mainCategory}>
          <option value="">未選択</option>
          {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label>種類(小分類)</label>
        <select value={itemType} onChange={e => setItemType(e.target.value)} disabled={!subCategory}>
          <option value="">未選択</option>
          {itemTypes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}