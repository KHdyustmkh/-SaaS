'use client';

import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createBrowserClient } from '@supabase/ssr';

interface PoliceReportProps {
  itemData: {
    product_name: string;
    category_hint: string;
    location: string;
    color: string;
    description: string;
    image_url?: string;
    found_at?: string;
    management_number?: string;
    reported_to_police_at?: string;
  };
  profileData?: {
    facility_name?: string;
    address?: string;
    manager_name?: string;
  };
}

export const PoliceReportGenerator: React.FC<PoliceReportProps> = ({ itemData, profileData }) => {
  // 17条(保管)、20条(売却)、21条(処分)の3モード管理
  const [reportMode, setReportMode] = useState<'storage' | 'sell' | 'dispose'>('storage');
  const reportRef = useRef<HTMLDivElement>(null);

  const [fetchedProfile, setFetchedProfile] = useState({
    facilityName: '',
    address: '',
    managerName: '',
    phoneNumber: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata) {
        const meta = user.user_metadata;
        setFetchedProfile({
          facilityName: meta.facility_name || '',
          address: meta.address || meta.facility_address || '',
          managerName: meta.manager_name || '',
          phoneNumber: meta.phone_number || '',
        });
      }
    };
    if (!profileData?.facility_name) fetchProfile();
  }, [profileData]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    const modeName = reportMode === 'storage' ? '保管' : reportMode === 'sell' ? '売却' : '処分';
    pdf.save(`保管物件_${modeName}_届出書_${itemData.product_name}.pdf`);
  };

  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const fName = profileData?.facility_name || fetchedProfile.facilityName;
  const fAddr = profileData?.address || fetchedProfile.address;
  const fTel = fetchedProfile.phoneNumber;

  // 取消線のスタイル定義
  const strikethrough = { textDecoration: 'line-through', color: '#666' };
  const activeStyle = { textDecoration: 'none', color: '#000' };

  return (
    <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #e5e5e7', borderRadius: '12px', backgroundColor: '#fff' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '15px' }}>⚖️ 法的書類（17条・20条・21条）生成</h3>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9fb', borderRadius: '10px', border: '1px solid #eee' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '10px' }}>届出の種類を選択（PDFのタイトルと条文が連動します）</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setReportMode('storage')} 
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: reportMode === 'storage' ? '2px solid #34c759' : '1px solid #ddd', backgroundColor: reportMode === 'storage' ? '#f2faf5' : '#fff', fontWeight: 'bold', cursor: 'pointer' }}
          >📦 保管 (17条)</button>
          <button 
            onClick={() => setReportMode('sell')} 
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: reportMode === 'sell' ? '2px solid #007aff' : '1px solid #ddd', backgroundColor: reportMode === 'sell' ? '#eef6ff' : '#fff', fontWeight: 'bold', cursor: 'pointer' }}
          >💰 売却 (20条)</button>
          <button 
            onClick={() => setReportMode('dispose')} 
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: reportMode === 'dispose' ? '2px solid #ff3b30' : '1px solid #ddd', backgroundColor: reportMode === 'dispose' ? '#fff1f0' : '#fff', fontWeight: 'bold', cursor: 'pointer' }}
          >🗑️ 処分 (21条)</button>
        </div>
      </div>

      <button onClick={handleDownloadPDF} style={{ width: '100%', padding: '14px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
        公式様式でPDFを書き出し
      </button>

      {/* --- PDF生成用隠し領域 (todokedesyo.pdf のレイアウトを完全再現) --- */}
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -100, opacity: 0, pointerEvents: 'none' }}>
        <div ref={reportRef} style={{ width: '210mm', height: '297mm', padding: '20mm', backgroundColor: 'white', color: 'black', fontFamily: 'serif', boxSizing: 'border-box', position: 'relative' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10mm', lineHeight: '1.2' }}>
            <div style={{ fontSize: '24pt', fontWeight: 'bold' }}>
              保管物件 <br />
              <div style={reportMode === 'storage' ? activeStyle : strikethrough}>　保管</div>
              <div style={reportMode === 'sell' ? activeStyle : strikethrough}>　物件売却</div>
              <div style={reportMode === 'dispose' ? activeStyle : strikethrough}>　物件処分</div>
              届出書
            </div>
            <div style={{ textAlign: 'right', fontSize: '12pt' }}>
              {today}<br /><br />
              ○○警察署長 殿
            </div>
          </div>

          <div style={{ fontSize: '14pt', marginBottom: '10mm', lineHeight: '1.8' }}>
            遺失物法 <br />
            <span style={reportMode === 'storage' ? activeStyle : strikethrough}>第17条</span><br />
            <span style={reportMode === 'sell' ? activeStyle : strikethrough}>第20条第3項</span><br />
            <span style={reportMode === 'dispose' ? activeStyle : strikethrough}>第21条第2項</span><br />
            の規定により届出をします。
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10mm' }}>
            <tr>
              <td style={{ border: '1px solid black', padding: '5mm', width: '40mm' }}>氏名又は名称</td>
              <td style={{ border: '1px solid black', padding: '5mm' }}>{fName}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '5mm' }}>住所又は所在地</td>
              <td style={{ border: '1px solid black', padding: '5mm' }}>{fAddr}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '5mm' }}>電話番号</td>
              <td style={{ border: '1px solid black', padding: '5mm' }}>{fTel}</td>
            </tr>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}>
            <thead>
              <tr style={{ backgroundColor: '#eee' }}>
                <td style={{ border: '1px solid black', padding: '2mm', textAlign: 'center', width: '10mm' }}>番号</td>
                <td style={{ border: '1px solid black', padding: '2mm', textAlign: 'center' }}>物件の種類及び特徴等</td>
                <td style={{ border: '1px solid black', padding: '2mm', textAlign: 'center' }}>拾得日時・場所</td>
                <td style={{ border: '1px solid black', padding: '2mm', textAlign: 'center' }}>理由・方法</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid black', padding: '10mm 2mm', textAlign: 'center' }}>1</td>
                <td style={{ border: '1px solid black', padding: '2mm', fontSize: '11pt' }}>
                  {itemData.product_name}<br />
                  ({itemData.category_hint})<br />
                  色：{itemData.color}
                </td>
                <td style={{ border: '1px solid black', padding: '2mm', fontSize: '10pt' }}>
                  {itemData.found_at}<br />
                  {itemData.location}
                </td>
                <td style={{ border: '1px solid black', padding: '2mm', fontSize: '10pt' }}>
                  理由：{reportMode === 'storage' ? '規定に基づく保管' : '保管上の困難等'}<br />
                  方法：{reportMode === 'storage' ? '施設内保管' : reportMode === 'sell' ? '売却' : '廃棄処分'}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '10mm', fontSize: '11pt' }}>
            ※ 受理番号： {itemData.management_number || '　　　　　　'} <br />
            ※ 保管届出日： {itemData.reported_to_police_at ? new Date(itemData.reported_to_police_at).toLocaleDateString('ja-JP') : '　　年　月　日'}
          </div>

          <div style={{ position: 'absolute', bottom: '20mm', width: '170mm', border: '1px dashed #ccc', padding: '5mm', textAlign: 'center', color: '#666', fontSize: '9pt' }}>
            本書類は遺失物法第17条、第20条第3項、または第21条第2項に基づき、<br />正式な様式に準拠して自動生成されています。
          </div>
        </div>
      </div>
    </div>
  );
};