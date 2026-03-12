'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchItems = async () => {
      // ログインチェック
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // データの取得（最新順）
      const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('データ取得エラー:', error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };

    fetchItems();
  }, [supabase, router]);

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* ヘッダーエリア */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', margin: 0, color: '#1d1d1f' }}>拾得物管理ダッシュボード</h1>
            <p style={{ color: '#86868b', margin: '5px 0 0' }}>現在 {items.length} 件のアイテムが登録されています</p>
          </div>
          <button 
            onClick={() => router.push('/items/new')}
            style={{ backgroundColor: '#0070f3', color: 'white', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
          >
            + 新規アイテム登録
          </button>
        </div>

        {/* リストエリア */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9f9fb', borderBottom: '1px solid #eee' }}>
                <th style={thStyle}>管理番号</th>
                <th style={thStyle}>画像</th>
                <th style={thStyle}>品名</th>
                <th style={thStyle}>カテゴリー（大/中/種）</th>
                <th style={thStyle}>ステータス</th>
                <th style={thStyle}>拾得場所</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0', transition: '0.2s' }}>
                  <td style={tdStyle}>{item.management_number}</td>
                  <td style={tdStyle}>
                    {item.photo_url ? (
                      <img src={item.photo_url} alt="" style={{ width: '45px', height: '45px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #eee' }} />
                    ) : (
                      <div style={{ width: '45px', height: '45px', borderRadius: '6px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>No Image</div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>{item.name}</td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.85rem', color: '#444', backgroundColor: '#f0f4f8', padding: '4px 8px', borderRadius: '4px' }}>
                      {item.category || '未設定'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontWeight: 'bold',
                      backgroundColor: item.status === '保管中' ? '#e6f7ff' : '#fff1f0',
                      color: item.status === '保管中' ? '#1890ff' : '#f5222d'
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={tdStyle}>{item.location}</td>
                  <td style={tdStyle}>
                    <button 
                      onClick={() => router.push(`/items/${item.id}`)}
                      style={{ color: '#0070f3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                    >
                      詳細表示
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {items.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>
              登録されているアイテムはありません。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 共通スタイルの定義
const thStyle: React.CSSProperties = {
  padding: '16px 20px',
  fontSize: '0.85rem',
  color: '#86868b',
  fontWeight: '600',
  letterSpacing: '0.02em'
};

const tdStyle: React.CSSProperties = {
  padding: '16px 20px',
  fontSize: '0.95rem',
  color: '#1d1d1f',
  verticalAlign: 'middle'
};