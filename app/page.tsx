"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  MapPin, Calendar, CheckCircle2, RotateCcw, 
  Box, Tag, ImageIcon, X, Info, Filter, Search
} from "lucide-react";

// --- [CONFIG] ---
const supabaseUrl = "https://ebcbdgordzueljtplwpe.supabase.co";
const supabaseAnonKey = "sb_publishable_VLaJtPU_k4lM8A22iyCX9w_l21d4o8K";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CATEGORIES = [
  "すべて", "財布・現金", "スマートフォン・携帯", "鍵", "衣類・傘", 
  "バック・ポーチ", "アクセサリー・貴金属", "書類・カード", "その他"
];

// 絞り込み用の年（現在の年から過去3年分）
const YEARS = ["すべて", "2024", "2025", "2026"];
const MONTHS = ["すべて", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // 絞り込み用ステート
  const [filterCategory, setFilterCategory] = useState("すべて");
  const [filterYear, setFilterYear] = useState("すべて");
  const [filterMonth, setFilterMonth] = useState("すべて");

  const fetchData = async () => {
    const { data } = await supabase
      .from("lost_items")
      .select("*")
      .order("found_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 年月・カテゴリーによるリアルタイム絞り込み
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCategory = filterCategory === "すべて" || item.category === filterCategory;
      
      // 日付文字列 (YYYY-MM-DD...) から年と月を抽出
      const itemYear = item.found_at.substring(0, 4);
      const itemMonth = item.found_at.substring(5, 7);
      
      const matchYear = filterYear === "すべて" || itemYear === filterYear;
      const matchMonth = filterMonth === "すべて" || itemMonth === filterMonth;
      
      return matchCategory && matchYear && matchMonth;
    });
  }, [items, filterCategory, filterYear, filterMonth]);

  const updateStatus = async (id: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    await supabase.from("lost_items").update({ status: newStatus }).eq("id", id);
    fetchData();
    if (selectedItem?.id === id) setSelectedItem({ ...selectedItem, status: newStatus });
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>読み込み中...</div>;

  const totalStored = filteredItems.filter((i) => i.status === "保管中").length;

  const filterInputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", 
    fontSize: "14px", outline: "none", color: "#475569", backgroundColor: "#fff", cursor: "pointer"
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "50px", fontFamily: "sans-serif" }}>
      
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Box style={{ color: "#2563eb", width: "20px", height: "20px" }} /> 拾得物管理システム
          </h1>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "#94a3b8" }}>表示数</span>
            <p style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>{filteredItems.length}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "#2563eb" }}>保管中</span>
            <p style={{ fontSize: "18px", fontWeight: "900", color: "#2563eb", margin: 0 }}>{totalStored}</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1400px", margin: "24px auto", padding: "0 24px" }}>
        
        {/* 絞り込みバー (年月選択式) */}
        <div style={{ 
          backgroundColor: "#fff", padding: "16px 24px", borderRadius: "16px", border: "1px solid #e2e8f0", 
          marginBottom: "32px", display: "flex", alignItems: "center", gap: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={18} color="#64748b" />
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#475569" }}>検索条件:</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#94a3b8" }}>カテゴリー</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={filterInputStyle}>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#94a3b8" }}>年</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={filterInputStyle}>
              {YEARS.map(year => <option key={year} value={year}>{year === "すべて" ? year : `${year}年`}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold", color: "#94a3b8" }}>月</label>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={filterInputStyle}>
              {MONTHS.map(month => <option key={month} value={month}>{month === "すべて" ? month : `${month}月`}</option>)}
            </select>
          </div>

          {(filterCategory !== "すべて" || filterYear !== "すべて" || filterMonth !== "すべて") && (
            <button 
              onClick={() => { setFilterCategory("すべて"); setFilterYear("すべて"); setFilterMonth("すべて"); }}
              style={{ fontSize: "12px", color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontWeight: "bold", marginLeft: "auto" }}
            >
              条件をクリア
            </button>
          )}
        </div>

        {/* カードグリッド */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => setSelectedItem(item)}
              style={{
                backgroundColor: "#fff", borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", cursor: "pointer", transition: "transform 0.2s",
                display: "flex", flexDirection: "column", opacity: item.status === "保管中" ? 1 : 0.7
              }}
            >
              <div style={{ height: "4px", backgroundColor: item.status === "保管中" ? "#2563eb" : "#94a3b8" }} />
              <div style={{ width: "100%", height: "160px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <ImageIcon size={32} color="#94a3b8" />
                )}
              </div>
              <div style={{ padding: "16px", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "700", margin: 0 }}>{item.name}</h3>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "100px", backgroundColor: item.status === "保管中" ? "#dbeafe" : "#f1f5f9", color: item.status === "保管中" ? "#1e4ed8" : "#475569", fontWeight: "bold" }}>{item.status}</span>
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><MapPin size={12} /> {item.location}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={12} /> {new Date(item.found_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px", color: "#94a3b8" }}>
            <Search size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
            <p>条件に一致するアイテムはありません</p>
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedItem && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "flex-end", zIndex: 100 }}>
          <div style={{ width: "100%", maxWidth: "500px", backgroundColor: "#fff", height: "100%", overflowY: "auto", boxShadow: "-4px 0 20px rgba(0,0,0,0.1)" }}>
            <div style={{ padding: "24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1 }}>
              <h2 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>アイテム詳細</h2>
              <button onClick={() => setSelectedItem(null)} style={{ border: "none", backgroundColor: "#f1f5f9", borderRadius: "50%", padding: "8px", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{ width: "100%", aspectRatio: "4/3", backgroundColor: "#f1f5f9", borderRadius: "12px", overflow: "hidden", marginBottom: "24px" }}>
                {selectedItem.photo_url ? (
                  <img src={selectedItem.photo_url} alt="detail" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={48} color="#94a3b8" /></div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div><span style={{ fontSize: "10px", fontWeight: "bold", color: "#94a3b8" }}>管理番号</span><p style={{ fontSize: "16px", fontWeight: "700", margin: "4px 0" }}>{selectedItem.management_number}</p></div>
                <div><span style={{ fontSize: "10px", fontWeight: "bold", color: "#94a3b8" }}>品名 / カテゴリー</span><p style={{ fontSize: "18px", fontWeight: "900", margin: "4px 0", color: "#2563eb" }}>{selectedItem.name}</p><p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>{selectedItem.category}</p></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div><span style={{ fontSize: "10px", fontWeight: "bold", color: "#94a3b8" }}>拾得場所</span><p style={{ fontSize: "14px", fontWeight: "600", margin: "4px 0", display: "flex", alignItems: "center", gap: "4px" }}><MapPin size={14} /> {selectedItem.location}</p></div>
                  <div><span style={{ fontSize: "10px", fontWeight: "bold", color: "#94a3b8" }}>拾得日時</span><p style={{ fontSize: "14px", fontWeight: "600", margin: "4px 0", display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={14} /> {new Date(selectedItem.found_at).toLocaleString()}</p></div>
                </div>
                <div style={{ padding: "16px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#94a3b8", display: "flex", alignItems: "center", gap: "4px" }}><Info size={12} /> 特徴・詳細説明</span>
                  <p style={{ fontSize: "14px", color: "#1e293b", lineHeight: "1.6", margin: "8px 0 0 0" }}>{selectedItem.description || "説明はありません"}</p>
                </div>
                <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: "#94a3b8" }}>現在のステータス: {selectedItem.status}</span>
                  {selectedItem.status === "保管中" ? (
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button onClick={(e) => updateStatus(selectedItem.id, "引き取り済み", e)} style={{ flex: 1, padding: "14px", backgroundColor: "#0f172a", color: "#fff", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}>引き取り完了</button>
                      <button onClick={(e) => updateStatus(selectedItem.id, "処理済み", e)} style={{ flex: 1, padding: "14px", backgroundColor: "#fff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}>廃棄・処理済み</button>
                    </div>
                  ) : (
                    <button onClick={(e) => updateStatus(selectedItem.id, "保管中", e)} style={{ padding: "14px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><RotateCcw size={16} /> 保管中に戻す</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}