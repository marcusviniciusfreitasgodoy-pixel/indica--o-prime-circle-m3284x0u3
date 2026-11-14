import { useState, useEffect } from 'react'
import {
  BRAND_SETTING_KEYS,
  DEFAULT_BRAND_SETTINGS,
  getBrandSettings,
  type BrandSettings,
} from '@/services/brandSettings'

/**
 * Carrega as configurações de marca. No app público usa a rota pública
 * GET /backend/v1/public/brand; no painel (admin) usa getBrandSettings.
 * `brand` começa com os valores padrão e é preenchido quando a resposta chega.
 */
export function usePublicBrand(): { brand: BrandSettings; loading: boolean } {
  const [brand, setBrand] = useState<BrandSettings>({ ...DEFAULT_BRAND_SETTINGS })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/backend/v1/public/brand')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('rota indisponível'))))
      .then((data) => {
        if (cancelled || !data || !data.brand) return
        const next = { ...DEFAULT_BRAND_SETTINGS }
        BRAND_SETTING_KEYS.forEach((key) => {
          const v = data.brand[key]
          if (typeof v === 'string' && v !== '') {
            next[key] = v
          }
        })
        setBrand(next)
      })
      .catch(() => {
        /* mantém os valores padrão */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { brand, loading }
}
