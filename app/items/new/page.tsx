'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { analyzeImage, convertToBase64 } from '@/lib/utils';
import { CATEGORY_TREE, isAssetCategory } from '@/lib/categories';

export default function NewItemPage() {
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [managementNumber, setManagementNumber] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [itemType, setItemType] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const handleAIAnalysis = async () => {
    if (imageFiles.length === 0) return;
    setIsAnalyzing(true);
    try {
      const base64 = await convertToBase64(imageFiles[0]);
      const res = await analyzeImage(base64); 

      setManagementNumber(res.police_id || "");
      setName(res.product_name || "");
      setDescription(res.description || "");

      // AIの回答（衣類）をシステム用語（衣類・履物）に変換する地図
      const aliasMap: { [key: string]: string } = {
        "衣類": "衣類・履物",
        "かばん": "かばん・袋物",
        "日用品": "日用品・雑貨",
        "財布": "財布・類",
        "携帯電話": "携帯電話類"
      };

      const aiHint = res.category_hint;
      const target = aliasMap[aiHint] || aiHint;

      let matched = false;
      outer: for (const m in CATEGORY_TREE) {
        for (const s in CATEGORY_TREE[m]) {
          for (const t of CATEGORY_TREE[m][s]) {
            // target（衣類・履物）がツリー内の単語に含まれているか、その逆を判定
            if (target && (t.includes(target) || target.includes(t))) {
              setMainCategory(m);
              setSubCategory(s);
              setItemType(t);
              matched = true;
              break outer;
            }
          }
        }
      }
      
      if (!matched) alert("不一致のため手動で選択してください: " + aiHint);

    } catch (e: any) {
      alert("エラー: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mainCategories = Object.keys(CATEGORY_TREE);
  const subCategories = useMemo(() => mainCategory ? Object.keys(CATEGORY_TREE[mainCategory]) : [], [mainCategory]);
  const itemTypes = useMemo(() => mainCategory && subCategory ? CATEGORY_TREE[mainCategory][subCategory] : [], [mainCategory, subCategory]);

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>拾得物 新規登録</h1>
      <input type="file" onChange={(e) => setImageFiles(Array.from(e.target.files || []))} />
      <button type="button" onClick={handleAIAnalysis} disabled={isAnalyzing} style={{ padding: '10px', background: '#0070f3', color: 'white' }}>
        {isAnalyzing ? '解析中...' : 'AI判定実行'}
      </button>
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input placeholder="品名" value={name} readOnly style={{ background: '#f9f9f9' }} />
        <select value={mainCategory} onChange={e => setMainCategory(e.target.value)}>
          <option value="">大分類</option>
          {mainCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={subCategory} onChange={e => setSubCategory(e.target.value)} disabled={!mainCategory}>
          <option value="">中分類</option>
          {subCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={itemType} onChange={e => setItemType(e.target.value)} disabled={!subCategory}>
          <option value="">小分類</option>
          {itemTypes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}