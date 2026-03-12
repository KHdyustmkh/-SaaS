'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      // 1. 現在ログインしているユーザーを確認
      const { data: { user } } = await supabase.auth.getUser();

      // ログインしていなければログイン画面へ飛ばす
      if (!user) {
        router.push('/login');
        return;
      }

      // 2. 自分の施設のデータだけを取得（SQLのRLSが効くので自動的にフィルタリングされます）
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

    checkUserAndFetchData();
  }, [supabase, router]);

  if (loading) return <p style={{ textAlign: 'center', marginTop: '50px' }}>読み込み中...</p>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>施設別 拾得物管理パネル</h1>
        <button 
          onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          ログアウト
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>管理番号</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>名称</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>状態</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>登録日時</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.management_number}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.name}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.status}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{new Date(item.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p style={{ textAlign: 'center', marginTop: '20px' }}>データがありません。新しく登録してください。</p>}
    </div>
  );
}