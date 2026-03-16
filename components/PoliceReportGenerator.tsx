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
    registered_by?: string;
  };
  profileData?: {
    facility_name?: string;
    address?: string;
    manager_name?: string;
  };
}

export const PoliceReportGenerator: React.FC<PoliceReportProps> = ({ itemData, profileData }) => {
  const [location, setLocation] = useState(itemData.location || '');
  const [claimRights, setClaimRights] = useState('主張する');
  const reportRef = useRef<HTMLDivElement>(null);

  const [fetchedProfile, setFetchedProfile] = useState({
    facilityName: '',
    address: '',
    managerName: ''
  });

  useEffect(() => {
    if (itemData.location) {
      setLocation(itemData.location);
    }
  }, [itemData.location]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const meta = user.user_metadata || {};
          console.log("【デバッグ】ユーザーメタデータ:", meta); 
          
          setFetchedProfile({
            facilityName: meta.facility_name || '',
            address: meta.facility_address || meta.address || meta.facility_location || meta.location || meta.postal_address || '',
            managerName: meta.manager_name || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    if (!profileData?.facility_name) {
      fetchProfile();
    }
  }, [profileData]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { 
      scale: 2, 
      useCORS: true,
      logging: false,
      scrollY: -window.scrollY 
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    let imgWidth = pdfWidth;
    let imgHeight = (canvas.height * pdfWidth) / canvas.width;
    if (imgHeight > pdfHeight) {
      imgHeight = pdfHeight;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }
    pdf.addImage(imgData, 'PNG', (pdfWidth - imgWidth) / 2, 0, imgWidth, imgHeight);
    pdf.save(`拾得物届出書_${itemData.product_name}.pdf`);
  };

  const displayManager = (itemData as any).registered_by || profileData?.manager_name || fetchedProfile.managerName || '';

  return (
    <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #e5e5e7', borderRadius: '12px', backgroundColor: '#fff' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '15px' }}>📄 警察提出用書類生成</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '4px' }}>詳細な拾得場所（任意・PDFに反映）</label>
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
            <input type="radio" value="主張する" checked={claimRights === '主張する'} onChange={(e) => setClaimRights(e.target.value)} /> 主張する（推奨）
          </label>
          <label style={{ fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: '#999' }}>
            <input type="radio" value="放棄する" checked={claimRights === '放棄する'} onChange={(e) => {
                if(window.confirm("【警告】権利を放棄すると、期間満了後にこの物品を資産として買い取ることができなくなります。")) {
                  setClaimRights(e.target.value);
                }
              }} 
            /> 放棄する
          </label>
        </div>
      </div>

      <button onClick={handleDownloadPDF} style={{ width: '100%', padding: '12px', backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
        警察提出用PDFを生成
      </button>

      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -100, opacity: 0, pointerEvents: 'none' }}>
        <div ref={reportRef} style={{ width: '210mm', minHeight: '297mm', padding: '20mm', backgroundColor: 'white', color: 'black', fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div style={{ fontSize: '12pt' }}>宛先： 警察署長 殿</div>
            <div style={{ textAlign: 'right', fontSize: '10pt' }}>
              提出日: {new Date().toLocaleDateString('ja-JP')}
              <div style={{ border: '1px solid black', padding: '10px', marginTop: '10px', width: '60mm', height: '20mm', textAlign: 'left' }}>
                <span style={{ fontSize: '8pt', color: '#555' }}>警察署 受理番号記入欄</span>
              </div>
            </div>
          </div>

          <h1 style={{ textAlign: 'center', fontSize: '18pt', letterSpacing: '2px', marginBottom: '30px', borderBottom: '2px solid black', paddingBottom: '5px' }}>
            拾得物提出書 兼 所有権取得申出書
          </h1>
          
          <div style={{ marginBottom: '20px', border: '1px solid black', padding: '10px' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '10pt', fontWeight: 'bold' }}>【届出者（施設管理者）】</p>
            <table style={{ width: '100%', fontSize: '11pt', borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td style={{ width: '25%', padding: '3px 0' }}>施設名・法人名:</td><td style={{ borderBottom: '1px dotted black' }}>{profileData?.facility_name || fetchedProfile.facilityName || ''}</td></tr>
                <tr><td style={{ padding: '3px 0' }}>所在地:</td><td style={{ borderBottom: '1px dotted black' }}>{profileData?.address || fetchedProfile.address || ''}</td></tr>
                <tr><td style={{ padding: '3px 0' }}>担当者・連絡先:</td><td style={{ borderBottom: '1px dotted black' }}>{displayManager}</td></tr>
              </tbody>
            </table>
          </div>

          <p style={{ margin: '0 0 5px 0', fontSize: '10pt', fontWeight: 'bold' }}>【拾得物件情報】</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', marginBottom: '20px', fontSize: '11pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '25%', border: '1px solid black', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'center' }}>物件名（類目）</td>
                <td style={{ border: '1px solid black', padding: '10px', fontWeight: 'bold' }}>{itemData.product_name} ({itemData.category_hint})</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'center' }}>拾得日時</td>
                <td style={{ border: '1px solid black', padding: '10px' }}>{itemData.found_at || '　　　年　　月　　日　　時　　分頃'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'center' }}>拾得場所</td>
                <td style={{ border: '1px solid black', padding: '10px' }}>{location || '施設内（詳細不明）'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'center' }}>物件の特徴・色</td>
                <td style={{ border: '1px solid black', padding: '10px' }}>色: {itemData.color} / 状態・特徴: {itemData.description}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '10px', backgroundColor: '#f5f5f5', textAlign: 'center' }}>所有権取得の意思</td>
                <td style={{ border: '1px solid black', padding: '10px', fontSize: '14pt', fontWeight: 'bold', textAlign: 'center' }}>
                  {claimRights === '主張する' ? '☑ 主張する　　□ 放棄する' : '□ 主張する　　☑ 放棄する'}
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid black', fontSize: '9pt', lineHeight: '1.5' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>【特記事項及び誓約事項】</p>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li>本届出物件について、遺失物法第28条の規定に基づき、保管期間満了時における所有権の取得を上記のとおり申出します。</li>
              <li>所有権取得後は、関係法令を遵守し、適正な再流通または廃棄処分を行うことを誓約いたします。</li>
              <li>本物件に個人情報等が含まれる場合、適切に消去・破棄等の処置を講じます。</li>
            </ol>
          </div>

          <div style={{ border: '1px solid black', padding: '10px', height: '100mm' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '10pt', fontWeight: 'bold' }}>【物件画像（現況記録）】</p>
            {itemData.image_url ? (
              <div style={{ textAlign: 'center' }}>
                <img src={itemData.image_url} alt="物件画像" style={{ maxWidth: '170mm', maxHeight: '80mm', objectFit: 'contain' }} crossOrigin="anonymous" />
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#999', paddingTop: '40mm' }}>画像データなし</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};