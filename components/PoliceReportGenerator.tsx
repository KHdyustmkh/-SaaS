'use client';

import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PoliceReportProps {
  itemData: {
    product_name: string;
    category_hint: string;
    location: string;
    color: string;
    description: string;
    image_url?: string;
  };
}

export const PoliceReportGenerator: React.FC<PoliceReportProps> = ({ itemData }) => {
  // ★修正: 初期値を空ではなく itemData.location に設定
  const [location, setLocation] = useState(itemData.location);
  const [claimRights, setClaimRights] = useState('主張する');
  const reportRef = useRef<HTMLDivElement>(null);

  // データが遅れて読み込まれた場合のために同期処理を追加
  useEffect(() => {
    if (itemData.location) {
      setLocation(itemData.location);
    }
  }, [itemData.location]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { 
      scale: 2, 
      useCORS: true,
      logging: false 
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`拾得物届出書_${itemData.product_name}.pdf`);
  };

  return (
    <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #e5e5e7', borderRadius: '12px', backgroundColor: '#fff' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '15px' }}>📄 警察提出用PDF生成</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '4px' }}>拾得場所（自動入力済）</label>
        <input 
          type="text" 
          value={location} 
          onChange={(e) => setLocation(e.target.value)}
          placeholder="例: 1F ロビー奥のソファ付近"
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }} 
        />
      </div>

      <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0f7ff', borderRadius: '8px', border: '1px solid #cce5ff' }}>
        <label style={{ fontSize: '0.75rem', color: '#0056b3', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
          所有権取得の希望（ビジネスモデルの維持に必須）
        </label>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label style={{ fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input 
              type="radio" 
              value="主張する" 
              checked={claimRights === '主張する'} 
              onChange={(e) => setClaimRights(e.target.value)} 
            /> 主張する（推奨）
          </label>
          <label style={{ fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#999' }}>
            <input 
              type="radio" 
              value="放棄する" 
              checked={claimRights === '放棄する'} 
              onChange={(e) => {
                if(window.confirm("【警告】権利を放棄すると、期間満了後にこの物品を資産として買い取ることができなくなります。本当によろしいですか？")) {
                  setClaimRights(e.target.value);
                }
              }} 
            /> 放棄する
          </label>
        </div>
      </div>

      <button 
        onClick={handleDownloadPDF}
        style={{ width: '100%', padding: '12px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        PDFを生成して保存
      </button>

      {/* PDFレンダリング用（画面外） */}
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={reportRef} style={{ width: '210mm', padding: '20mm', backgroundColor: 'white', color: 'black', fontFamily: 'sans-serif' }}>
          <h1 style={{ textAlign: 'center', fontSize: '22pt', marginBottom: '10px' }}>拾得物届出書（控）</h1>
          <p style={{ textAlign: 'right', fontSize: '10pt', marginBottom: '20px' }}>発行日: {new Date().toLocaleDateString('ja-JP')}</p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}>
            <tbody>
              <tr><td style={{ width: '30%', border: '1px solid black', padding: '12px', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>物件名</td><td style={{ border: '1px solid black', padding: '12px' }}>{itemData.product_name}</td></tr>
              <tr><td style={{ border: '1px solid black', padding: '12px', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>カテゴリー</td><td style={{ border: '1px solid black', padding: '12px' }}>{itemData.category_hint}</td></tr>
              <tr><td style={{ border: '1px solid black', padding: '12px', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>拾得場所</td><td style={{ border: '1px solid black', padding: '12px' }}>{location || '施設内'}</td></tr>
              <tr><td style={{ border: '1px solid black', padding: '12px', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>特徴・状態</td><td style={{ border: '1px solid black', padding: '12px' }}>{itemData.description}</td></tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '12px', backgroundColor: '#e6f7ff', fontWeight: 'bold' }}>所有権取得の希望</td>
                <td style={{ border: '1px solid black', padding: '12px', fontWeight: 'bold' }}>{claimRights}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '10pt', lineHeight: '1.6' }}>
            <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '8px' }}>所有権取得に関する特記事項</p>
            <p style={{ margin: 0 }}>
              本届出物件について、遺失物法第28条に基づき、保管期間満了時における所有権の取得を主張いたします。
              所有権取得後は、提携する資源循環事業者（古物商許可保有）を通じて、適正な再流通または再資源化を執り行います。
            </p>
          </div>

          {itemData.image_url && (
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <p style={{ textAlign: 'left', fontWeight: 'bold' }}>【参考写真】</p>
              <img src={itemData.image_url} alt="" style={{ maxWidth: '160mm', maxHeight: '100mm', border: '1px solid #eee' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};