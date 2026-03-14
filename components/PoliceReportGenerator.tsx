// components/PoliceReportGenerator.tsx (CORS対応版)
import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PoliceReportProps {
  itemData: {
    product_name: string;
    category_hint: string;
    color: string;
    description: string;
    image_url?: string;
  };
}

export const PoliceReportGenerator: React.FC<PoliceReportProps> = ({ itemData }) => {
  const [location, setLocation] = useState('');
  const [claimRights, setClaimRights] = useState('放棄する');
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    // ★重要：useCORSをtrueに設定することで、Supabaseの画像を描画可能にする
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
      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '15px' }}>📄 警察提出用PDF</h3>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '0.75rem', color: '#666', display: 'block' }}>詳細な拾得場所（任意）</label>
        <input 
          type="text" 
          value={location} 
          onChange={(e) => setLocation(e.target.value)}
          placeholder="例: 1F ロビー奥"
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }} 
        />
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
          <h1 style={{ textAlign: 'center', fontSize: '24pt', marginBottom: '20px' }}>拾得物届出書 (控)</h1>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
            <tbody>
              <tr><td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f0f0f0' }}>物件名</td><td style={{ border: '1px solid black', padding: '10px' }}>{itemData.product_name}</td></tr>
              <tr><td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f0f0f0' }}>カテゴリー</td><td style={{ border: '1px solid black', padding: '10px' }}>{itemData.category_hint}</td></tr>
              <tr><td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f0f0f0' }}>場所</td><td style={{ border: '1px solid black', padding: '10px' }}>{location}</td></tr>
              <tr><td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f0f0f0' }}>特徴・説明</td><td style={{ border: '1px solid black', padding: '10px' }}>{itemData.description}</td></tr>
            </tbody>
          </table>
          {itemData.image_url && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ textAlign: 'left' }}>【参考写真】</p>
              <img src={itemData.image_url} alt="" style={{ maxWidth: '150mm', maxHeight: '100mm', border: '1px solid #ccc' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};