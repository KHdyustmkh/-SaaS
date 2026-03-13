'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // 登録用モーダル
  const [showUrgentModal, setShowUrgentModal] = useState(false); // 【追加】緊急アラート
  const [urgentCount, setUrgentCount] = useState(0); // 【追加】

  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    location: '',
    description: '',
    found_at: new Date().toISOString().split('T')[0]
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setItems(data);
        
        // --- 【追加】緊急期限チェック (残り1日以下) ---
        const now = new Date();
        const urgentItems = data.filter(item => {
          const deadline = new Date(new Date(item.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
          const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 1;
        });

        if (urgentItems.length > 0) {
          setUrgentCount(urgentItems.length);
          setShowUrgentModal(true);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('items').insert([newItem]);
    if (!error) {
      setIsModalOpen(false);
      window.location.reload();
    }
  };

  const getDaysLeft = (createdAtStr: string) => {
    const deadline = new Date(new Date(createdAtStr).getTime() + 7 * 24 * 60 * 60 * 1000);
    const diff = deadline.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const warningItemsCount = items.filter(item => getDaysLeft(item.created_at) <= 3).length;

  if (loading) return <div style={{ padding: '60px', textAlign: 'center' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      
      {/* 【追加】1. 最上部警告バナー */}
      {warningItemsCount > 0 && (
        <div style={{ backgroundColor: '#ff3b30', color: 'white', padding: '12px', textAlign: 'center', fontWeight: '700', fontSize: '0.9rem', position: 'sticky', top: 0, zIndex: 100 }}>
          ⚠️ 警察への届出期限が近いアイテムが {warningItemsCount} 件あります。
        </div>
      )}

      {/* 【追加】2. 緊急ポップアップモーダル */}
      {showUrgentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚨</div>
            <h2 style={{ color: '#ff3b30' }}>緊急のリマインド</h2>
            <p>警察への届出期限が**本日中、または明日まで**のアイテムが <strong>{urgentCount} 件</strong> あります。</p>
            <button onClick={() => setShowUrgentModal(false)} style={{ width: '100%', backgroundColor: '#1d1d1f', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer', marginTop: '20px' }}>内容を確認して閉じる</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>拾得物一覧</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setIsModalOpen(true)} style={{ backgroundColor: '#007aff', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>新規登録</button>
            <button onClick={() => router.push('/mypage')} style={{ backgroundColor: 'white', border: '1px solid #d2d2d7', padding: '10px 20px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>マイページ</button>
          </div>
        </header>

        {/* 既存のリスト表示 */}
        <div style={{ display: 'grid', gap: '15px' }}>
          {items.map((item) => {
            const daysLeft = getDaysLeft(item.created_at);
            return (
              <div key={item.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: daysLeft <= 1 ? '5px solid #ff3b30' : daysLeft <= 3 ? '5px solid #ff9500' : 'none' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{item.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#86868b' }}>場所: {item.location} / カテゴリ: {item.category}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: daysLeft <= 1 ? '#ff3b30' : daysLeft <= 3 ? '#ff9500' : '#1d1d1f' }}>
                    {daysLeft <= 0 ? '期限切れ' : `あと ${daysLeft} 日`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 既存の登録用モーダル */}
        {isModalOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
            <form onSubmit={handleCreate} style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h2 style={{ margin: '0 0 10px 0' }}>新規アイテム登録</h2>
              <input placeholder="品名" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7' }} />
              <input placeholder="カテゴリ" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7' }} />
              <input placeholder="拾得場所" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7' }} />
              <textarea placeholder="備考" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #d2d2d7', minHeight: '80px' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#007aff', color: 'white', padding: '12px', border: 'none', borderRadius: '10px', fontWeight: '700' }}>登録する</button>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, backgroundColor: '#f5f5f7', color: '#1d1d1f', padding: '12px', border: 'none', borderRadius: '10px' }}>キャンセル</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}