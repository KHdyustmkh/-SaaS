'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    facilityName: '',
    managerName: '',
    managerList: [] as string[], // 担当者名簿
    address: '',
    email: '',
    logoUrl: '' 
  });

  const [newManagerName, setNewManagerName] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const savedManager = user.user_metadata?.manager_name || '';
      const savedList = user.user_metadata?.manager_list || [];
      const initialList = savedList.length > 0 ? savedList : (savedManager ? [savedManager] : []);

      setProfile({
        facilityName: user.user_metadata?.facility_name || '',
        managerName: savedManager,
        managerList: initialList,
        address: user.user_metadata?.address || '', 
        email: user.email || '',
        logoUrl: user.user_metadata?.logo_url || '' 
      });
      setLoading(false);
    }
    getProfile();
  }, [supabase, router]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      alert('画像のアップロードに失敗しました');
      setSaving(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    setProfile({ ...profile, logoUrl: publicUrl });
    setSaving(false);
  };

  const handleUpdate = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        facility_name: profile.facilityName,
        manager_name: profile.managerName,
        manager_list: profile.managerList,
        address: profile.address, 
        logo_url: profile.logoUrl 
      }
    });

    if (error) {
      alert('更新に失敗しました');
    } else {
      alert('プロフィールを更新しました');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('本当にログアウトしてよろしいですか？');
    if (confirmed) {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #d2d2d7',
    fontSize: '1rem',
    boxSizing: 'border-box',
    marginTop: '4px'
  };

  if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>;

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', padding: '20px 15px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        <header style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => router.push('/')} style={{ backgroundColor: 'transparent', border: 'none', color: '#007aff', fontSize: '1rem', cursor: 'pointer', padding: 0, fontWeight: '600' }}>← 戻る</button>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>マイページ</h1>
        </header>

        <section style={{ backgroundColor: 'white', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.0rem', fontWeight: '700', marginBottom: '18px', borderBottom: '1px solid #f5f5f7', paddingBottom: '10px' }}>プロフィール設定</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #d2d2d7' }}>
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.5rem' }}>🔳</span>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#007aff', fontWeight: '600', cursor: 'pointer' }}>
                  画像をアップロード
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                </label>
                <p style={{ fontSize: '0.65rem', color: '#86868b', margin: '4px 0 0 0' }}>正方形の画像が推奨されます</p>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#86868b', fontWeight: '600' }}>メールアドレス（変更不可）</label>
              <input type="text" value={profile.email} disabled style={{ ...inputStyle, backgroundColor: '#f5f5f7', color: '#86868b' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#1d1d1f', fontWeight: '600' }}>施設名</label>
              <input type="text" value={profile.facilityName} onChange={(e) => setProfile({...profile, facilityName: e.target.value})} style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#1d1d1f', fontWeight: '600' }}>所在地（PDFに反映されます）</label>
              <input 
                type="text" 
                value={profile.address} 
                placeholder="例: 東京都渋谷区神南1-2-3" 
                onChange={(e) => setProfile({...profile, address: e.target.value})} 
                style={inputStyle} 
              />
            </div>

            <div style={{ padding: '15px', backgroundColor: '#fcfcfc', border: '1px solid #e5e5ea', borderRadius: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#1d1d1f', fontWeight: '700', marginBottom: '12px' }}>担当者の管理（切り替え・編集）</label>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#86868b', fontWeight: '600', marginBottom: '4px' }}>現在の担当者（書類に記載されます）</label>
                <select 
                  value={profile.managerName} 
                  onChange={(e) => setProfile({...profile, managerName: e.target.value})} 
                  style={{ ...inputStyle, marginTop: 0, backgroundColor: 'white', cursor: 'pointer' }}
                >
                  <option value="">選択してください</option>
                  {profile.managerList.map((name, index) => (
                    <option key={index} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#86868b', fontWeight: '600', marginBottom: '4px' }}>名簿に新しい担当者を追加</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={newManagerName} 
                    onChange={(e) => setNewManagerName(e.target.value)} 
                    placeholder="新しい名前" 
                    style={{ ...inputStyle, marginTop: 0, flex: 1 }} 
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const nameToAdd = newManagerName.trim();
                      if (nameToAdd && !profile.managerList.includes(nameToAdd)) {
                        setProfile({
                          ...profile,
                          managerList: [...profile.managerList, nameToAdd],
                          managerName: nameToAdd
                        });
                        setNewManagerName('');
                      }
                    }}
                    style={{ backgroundColor: '#007aff', color: 'white', border: 'none', borderRadius: '10px', padding: '0 16px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    追加
                  </button>
                </div>
              </div>

              {/* ★追加箇所：登録済み名簿の一覧と削除機能 */}
              {profile.managerList.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: '#86868b', fontWeight: '600', marginBottom: '8px' }}>登録済みの名簿（✕で削除）</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {profile.managerList.map((name, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#e5e5ea', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem' }}>
                        <span>{name}</span>
                        <button 
                          type="button"
                          onClick={() => {
                            if (window.confirm(`${name} さんを名簿から削除しますか？`)) {
                              const newList = profile.managerList.filter(n => n !== name);
                              setProfile({
                                ...profile,
                                managerList: newList,
                                managerName: profile.managerName === name ? (newList[0] || '') : profile.managerName
                              });
                            }
                          }}
                          style={{ border: 'none', background: 'none', marginLeft: '6px', color: '#86868b', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', padding: '0 2px' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleUpdate} 
              disabled={saving}
              style={{ backgroundColor: '#007aff', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}
            >
              {saving ? '保存中...' : '設定を保存する'}
            </button>
          </div>
        </section>

        <section style={{ backgroundColor: 'white', borderRadius: '18px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <button 
            onClick={handleLogout}
            style={{ width: '100%', backgroundColor: 'transparent', color: '#ff3b30', padding: '12px', borderRadius: '12px', border: '1px solid #ff3b30', fontWeight: '700', fontSize: '1rem', cursor: 'pointer' }}
          >
            ログアウト
          </button>
        </section>

      </div>
    </div>
  );
}