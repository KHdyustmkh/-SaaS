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
    
    // PDF生成処理
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`拾得物届出書_${itemData.product_name}.pdf`);
  };

  return (
    <div className="mt-8 p-6 border rounded-xl bg-gray-50">
      <h3 className="text-xl font-bold mb-4 text-gray-800">警察届け出用設定</h3>
      
      {/* UI入力セクション */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">拾得場所 (詳細に記入)</label>
          <input
            type="text"
            className="mt-1 block w-full border rounded-md p-2"
            placeholder="例：2F ロビー 西側エレベーター付近"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">報労金・所有権の権利</label>
          <select
            className="mt-1 block w-full border rounded-md p-2"
            value={claimRights}
            onChange={(e) => setClaimRights(e.target.value)}
          >
            <option value="放棄する">すべて放棄する (推奨：事務簡略化のため)</option>
            <option value="主張する">報労金・所有権を主張する</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleDownloadPDF}
        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
      >
        警察提出用PDFをダウンロード
      </button>

      {/* PDFレンダリング用隠しエリア (画面外に配置) */}
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={reportRef} style={{ width: '210mm', padding: '20mm', backgroundColor: 'white', color: 'black' }}>
          <h1 style={{ fontSize: '24pt', fontWeight: 'bold', textAlign: 'center', marginBottom: '10mm' }}>拾得物届出書 (控)</h1>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', width: '30%', backgroundColor: '#f0f0f0' }}>拾得日時</td>
                <td style={{ border: '1px solid black', padding: '10px' }}>{new Date().toLocaleString('ja-JP')}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f0f0f0' }}>拾得場所</td>
                <td style={{ border: '1px solid black', padding: '10px' }}>{location || '（未記入）'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f0f0f0' }}>物件名</td>
                <td style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold' }}>{itemData.product_name}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f0f0f0' }}>特徴・色</td>
                <td style={{ border: '1px solid black', padding: '10px' }}>{itemData.color} / {itemData.description}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f0f0f0' }}>権利の主張</td>
                <td style={{ border: '1px solid black', padding: '10px' }}>{claimRights}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '10mm' }}>
            <p>※本資料は管理システム「Filtering Agent」によって自動生成されました。</p>
            {itemData.image_url && (
              <div style={{ marginTop: '10px' }}>
                <p>【添付写真】</p>
                <img src={itemData.image_url} alt="拾得物" style={{ maxWidth: '100%', maxHeight: '80mm', objectFit: 'contain' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};