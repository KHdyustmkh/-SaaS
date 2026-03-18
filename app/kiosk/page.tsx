'use client'

import { createBrowserClient } from '@supabase/ssr'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'

type LostItem = {
  id: string
  management_number?: string
  name: string
  category: string
  location: string
  storage_location?: string
  found_at: string
  status?: string
  photo_url?: string
  created_at: string
}

function KioskContent () {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('query') || ''

  const [items, setItems] = useState<LostItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const isMobile = useIsMobile()
  const [query, setQuery] = useState(initialQuery)
  const [foundWithinDays, setFoundWithinDays] = useState('30')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('active')
  const [facilityName, setFacilityName] = useState('')
  const [locationPresets, setLocationPresets] = useState<string[]>([])
  const [isEditingPresets, setIsEditingPresets] = useState(false)
  const [presetDraft, setPresetDraft] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchMe = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const fName = user?.user_metadata?.facility_name || ''
      setFacilityName(fName)
    }
    const fetchItems = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('lost_items')
        .select('id, management_number, name, category, location, storage_location, found_at, status, photo_url, created_at')
        .order('created_at', { ascending: false })
        .limit(200)

      if (!error && data) setItems(data as LostItem[])
      setIsLoading(false)
    }
    fetchMe()
    fetchItems()
  }, [supabase])

  const presetKey = useMemo(() => {
    const safe = facilityName ? facilityName : 'default'
    return `kioskLocationPresets:${safe}`
  }, [facilityName])

  const uniqueLocations = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => { if (i.location) set.add(i.location) })
    return Array.from(set).slice(0, 30)
  }, [items])

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>()
    items.forEach(i => { if (i.category) set.add(i.category) })
    return Array.from(set).slice(0, 40)
  }, [items])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(presetKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const list = parsed.map(v => String(v).trim()).filter(Boolean).slice(0, 20)
          setLocationPresets(list)
          setPresetDraft(list.join('\n'))
          return
        }
      }
    } catch {}

    const fallback = uniqueLocations.slice(0, 10)
    setLocationPresets(fallback)
    setPresetDraft(fallback.join('\n'))
  }, [presetKey, uniqueLocations])

  const savePresets = () => {
    const list = presetDraft
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 20)

    setLocationPresets(list)
    try {
      window.localStorage.setItem(presetKey, JSON.stringify(list))
    } catch {}
    setIsEditingPresets(false)
  }

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    const days = Number(foundWithinDays)
    const cutoff = Number.isFinite(days) ? (Date.now() - (days * 24 * 60 * 60 * 1000)) : 0

    return items
      .filter(item => {
        if (cutoff && new Date(item.found_at).getTime() < cutoff) return false
        return true
      })
      .filter(item => {
        if (!selectedLocation) return true
        return item.location === selectedLocation
      })
      .filter(item => {
        if (!selectedCategory) return true
        return item.category === selectedCategory
      })
      .filter(item => {
        if (selectedStatus === 'all') return true
        const s = item.status || '届出未完了'
        const inactive = ['お客様返却済', '回収済', '廃棄済']
        if (selectedStatus === 'active') return !inactive.includes(s)
        if (selectedStatus === 'inactive') return inactive.includes(s)
        return true
      })
      .filter(item => {
        if (!q) return true
        const hay = [
          item.name,
          item.management_number,
          item.category,
          item.location
        ].filter(Boolean).join(' ').toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 60)
  }, [items, query, foundWithinDays, selectedLocation, selectedCategory, selectedStatus])

  return (
    <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', fontFamily: '-apple-system, sans-serif' }}>
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #d2d2d7', padding: '16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1d1d1f' }}>落とし物 かんたん照会</div>
            <div style={{ color: '#86868b', fontSize: '0.85rem' }}>
              {facilityName ? `施設: ${facilityName}` : '施設: 未設定'} / 店舗スタッフ向け（お客様に見せる場合は配慮してください）
            </div>
          </div>

          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 160px', gap: '10px' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="品名・管理番号・カテゴリ・拾得場所で検索"
              style={{ width: '100%', padding: '12px 12px', borderRadius: '12px', border: '1px solid #d2d2d7', fontSize: '16px', backgroundColor: '#fff', boxSizing: 'border-box' }}
            />
            <select
              value={foundWithinDays}
              onChange={(e) => setFoundWithinDays(e.target.value)}
              style={{ width: '100%', padding: '12px 12px', borderRadius: '12px', border: '1px solid #d2d2d7', fontSize: '16px', backgroundColor: '#fff', boxSizing: 'border-box' }}
            >
              <option value="7">直近7日</option>
              <option value="30">直近30日</option>
              <option value="90">直近90日</option>
              <option value="365">直近1年</option>
            </select>
          </div>

          {isMobile ? (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedLocation('')}
                  style={{
                    flex: '0 0 auto',
                    padding: '10px 12px',
                    borderRadius: '999px',
                    border: selectedLocation === '' ? '2px solid #007aff' : '1px solid #d2d2d7',
                    backgroundColor: selectedLocation === '' ? '#eaf2ff' : 'white',
                    fontWeight: 900,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  すべて
                </button>
                {locationPresets.map(loc => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setSelectedLocation(loc)}
                    style={{
                      flex: '0 0 auto',
                      padding: '10px 12px',
                      borderRadius: '999px',
                      border: selectedLocation === loc ? '2px solid #007aff' : '1px solid #d2d2d7',
                      backgroundColor: selectedLocation === loc ? '#eaf2ff' : 'white',
                      fontWeight: 900,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {loc}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #d2d2d7', backgroundColor: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">カテゴリ（すべて）</option>
                  {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #d2d2d7', backgroundColor: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="active">受付対応中のみ</option>
                  <option value="inactive">完了済のみ</option>
                  <option value="all">すべて</option>
                </select>
              </div>

              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsEditingPresets(!isEditingPresets)}
                  style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #d2d2d7', backgroundColor: 'white', cursor: 'pointer', fontWeight: 900 }}
                >
                  場所編集
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '220px 1fr 180px 140px', gap: '10px' }}>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #d2d2d7', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                <option value="">拾得場所（すべて）</option>
                {locationPresets.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                {uniqueLocations.filter(l => !locationPresets.includes(l)).length > 0 && <option disabled>────────</option>}
                {uniqueLocations.filter(l => !locationPresets.includes(l)).map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #d2d2d7', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                <option value="">カテゴリ（すべて）</option>
                {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #d2d2d7', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                <option value="active">受付対応中のみ</option>
                <option value="inactive">完了済のみ</option>
                <option value="all">すべて</option>
              </select>

              <button
                type="button"
                onClick={() => setIsEditingPresets(!isEditingPresets)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #d2d2d7', backgroundColor: 'white', cursor: 'pointer', fontWeight: 900 }}
              >
                場所編集
              </button>
            </div>
          )}

          {isEditingPresets && (
            <div style={{ marginTop: '10px', backgroundColor: '#fff', border: '1px solid #e5e5e7', borderRadius: '14px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
                <div style={{ fontWeight: 900, color: '#1d1d1f' }}>拾得場所プリセット（施設ごと）</div>
                <div style={{ fontSize: '0.8rem', color: '#86868b' }}>1行=1場所（推奨: 10件）</div>
              </div>
              <textarea
                value={presetDraft}
                onChange={(e) => setPresetDraft(e.target.value)}
                rows={6}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #d2d2d7', boxSizing: 'border-box', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsEditingPresets(false)} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #d2d2d7', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 900 }}>キャンセル</button>
                <button type="button" onClick={savePresets} style={{ padding: '10px 14px', borderRadius: '12px', border: 'none', backgroundColor: '#007aff', color: 'white', cursor: 'pointer', fontWeight: 900 }}>保存</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px' }}>
        {isLoading ? (
          <div style={{ padding: '50px 0', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', margin: '12px 0 14px' }}>
              <div style={{ color: '#86868b', fontSize: '0.9rem' }}>表示: {filteredItems.length} 件</div>
              <div style={{ color: '#86868b', fontSize: '0.8rem' }}>詳細編集は通常画面で行ってください</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {filteredItems.length === 0 ? (
                <div style={{ color: '#86868b', padding: '30px 0' }}>該当なし</div>
              ) : filteredItems.map(item => (
                <div key={item.id} style={{ backgroundColor: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e5e5e7' }}>
                  <div style={{ width: '100%', height: '120px', backgroundColor: '#f5f5f7' }}>
                    {item.photo_url
                      ? <img src={item.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d2d2d7', fontSize: '2rem' }}>📦</div>}
                  </div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#007aff', fontWeight: 800, marginBottom: '4px' }}>{item.category}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1d1d1f', marginBottom: '6px', lineHeight: 1.2, minHeight: '2.4em' }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#86868b' }}>#{item.management_number || '---'}</div>
                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#1d1d1f' }}>
                      <div style={{ color: '#86868b', fontSize: '0.72rem' }}>拾得場所</div>
                      <div style={{ fontWeight: 700 }}>{item.location}</div>
                    </div>
                    {item.storage_location && (
                      <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#1d1d1f' }}>
                        <div style={{ color: '#86868b', fontSize: '0.72rem' }}>保管場所</div>
                        <div style={{ fontWeight: 800 }}>{item.storage_location}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function KioskPage () {
  return (
    <Suspense fallback={<div style={{ padding: '50px 0', textAlign: 'center', color: '#86868b' }}>読み込み中...</div>}>
      <KioskContent />
    </Suspense>
  )
}

