"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Upload, Loader2, ArrowLeft, Tag, MapPin, Info, Camera, X } from "lucide-react";
import Link from "next/link";

const supabaseUrl = "https://ebcbdgordzueljtplwpe.supabase.co";
const supabaseAnonKey = "sb_publishable_VLaJtPU_k4lM8A22iyCX9w_l21d4o8K";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CATEGORIES = [
  "財布・現金", "スマートフォン・携帯", "鍵", "衣類・傘", 
  "バック・ポーチ", "アクセサリー・貴金属", "書類・カード", "その他"
];

export default function NewItemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // 型定義を明示的に指定してエラーを回避
  const [files, setFiles] = useState<(File | null)[]>([null, null, null, null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null, null, null, null]);

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const newFiles = [...files];
      newFiles[index] = selectedFile;
      setFiles(newFiles);

      const url = URL.createObjectURL(selectedFile);
      const newPreviews = [...previews];
      newPreviews[index] = url;
      setPreviews(newPreviews);
    }
  };

  const removeFile = (index: number) => {
    // メモリリーク防止のためオブジェクトURLを解放
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]!);
    }

    const newFiles = [...files];
    newFiles[index] = null;
    setFiles(newFiles);

    const newPreviews = [...previews];
    newPreviews[index] = null;
    setPreviews(newPreviews);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const location = formData.get("location") as string;
    const description = formData.get("description") as string;

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from("lost_items")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("lost_items")
            .getPublicUrl(fileName);
          
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      const { error: dbError } = await supabase
        .from("lost_items")
        .insert([{
          name,
          category,
          location,
          description,
          photo_url: uploadedUrls[0] || "",
          status: "保管中",
          management_number: `L-${Date.now().toString().slice(-6)}`,
          found_at: new Date().toISOString()
        }]);

      if (dbError) throw dbError;

      router.push("/");
      router.refresh();
    } catch (error: any) {
      alert(`登録エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = { fontSize: "14px", fontWeight: "800", color: "#475569", display: "flex", alignItems: "center", gap: "6px" };
  const inputStyle: React.CSSProperties = { padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "16px", outline: "none", backgroundColor: "#fff" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#64748b", textDecoration: "none", marginBottom: "20px", fontSize: "14px", fontWeight: "bold" }}>
          <ArrowLeft size={16} /> ダッシュボードに戻る
        </Link>

        <div style={{ backgroundColor: "#fff", padding: "40px", borderRadius: "24px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", marginBottom: "32px", textAlign: "center" }}>拾得アイテム登録</h1>
          
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={labelStyle}><Tag size={16} /> 品名 <span style={{ color: "#ef4444", fontSize: "10px" }}>[必須]</span></label>
              <input name="name" required style={inputStyle} placeholder="例：黒色の長財布" />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={labelStyle}><Info size={16} /> カテゴリー</label>
              <select name="category" style={inputStyle}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={labelStyle}><MapPin size={16} /> 拾得場所 <span style={{ color: "#ef4444", fontSize: "10px" }}>[必須]</span></label>
              <input name="location" required style={inputStyle} placeholder="例：3F ラウンジ" />
            </div>

            {/* 写真アップロードエリア */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={labelStyle}><Camera size={16} /> 写真 (最大5枚)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
                {previews.map((previewUrl, index) => (
                  <div key={index} style={{ position: "relative", aspectRatio: "1/1", border: "2px dashed #e2e8f0", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fcfcfd" }}>
                    {previewUrl ? (
                      <div style={{ position: "relative", width: "100%", height: "100%" }}>
                        <img src={previewUrl} alt={`preview ${index}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => removeFile(index)} style={{ position: "absolute", top: "2px", right: "2px", backgroundColor: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: "18px", height: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", cursor: "pointer" }}>
                        <Upload size={16} color="#94a3b8" />
                        <span style={{ fontSize: "8px", color: "#94a3b8", marginTop: "4px" }}>{index + 1}枚目</span>
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(index, e)} style={{ display: "none" }} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={labelStyle}><Info size={16} /> 特徴・詳細説明</label>
              <textarea name="description" rows={3} style={{ ...inputStyle, resize: "none" }} placeholder="色、傷、中身の詳細など" />
            </div>

            <button type="submit" disabled={loading} style={{ marginTop: "10px", padding: "18px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "14px", fontWeight: "900", fontSize: "16px", cursor: loading ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)" }}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
              {loading ? "アップロード中..." : "アイテムを登録する"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}