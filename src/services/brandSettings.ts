import pb from '@/lib/pocketbase/client'

/**
 * Configuração central de marca (coleção program_settings, chaves key/value_json).
 * A lista de chaves espelha BRAND_KEYS do hook brand_settings.pb.js e a
 * migração 0043 — as 14 chaves oficiais da marca Godoy Prime.
 */

export const BRAND_SETTING_KEYS = [
  'brand_name',
  'program_name',
  'legal_name',
  'cnpj',
  'creci',
  'support_email',
  'support_whatsapp',
  'public_base_url',
  'site_url',
  'logo_url',
  'logo_negative_url',
  'symbol_url',
  'primary_color',
  'accent_color',
] as const

export type BrandSettingKey = (typeof BRAND_SETTING_KEYS)[number]

export type BrandSettings = Record<BrandSettingKey, string>

export const BRAND_LABELS: Record<BrandSettingKey, string> = {
  brand_name: 'Nome da marca',
  program_name: 'Nome do programa',
  legal_name: 'Razão social',
  cnpj: 'CNPJ',
  creci: 'CRECI-RJ PJ',
  support_email: 'E-mail de suporte',
  support_whatsapp: 'WhatsApp de suporte (somente dígitos, ex.: 5521999998888)',
  public_base_url: 'URL base pública do programa',
  site_url: 'Site institucional',
  logo_url: 'Logotipo principal (fundo claro)',
  logo_negative_url: 'Logotipo negativo (fundo escuro)',
  symbol_url: 'Símbolo da marca',
  primary_color: 'Cor primária (hex)',
  accent_color: 'Cor de destaque (hex)',
}

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  brand_name: 'Godoy Prime Realty',
  program_name: 'Godoy Prime Indica',
  legal_name: 'Godoy Prime Realty',
  cnpj: '58.409.058/0001-73',
  creci: '11841',
  support_email: 'contato@primecircle.app.br',
  support_whatsapp: '',
  public_base_url: 'https://indicacao.godoyprime.com.br',
  site_url: 'https://godoyprime.com.br',
  logo_url: '/brand/godoy/logotipo-principal-oficial.png',
  logo_negative_url: '/brand/godoy/logotipo-negativo-01.png',
  symbol_url: '/brand/godoy/simbolo-gold.png',
  primary_color: '#C4993A',
  accent_color: '#D4AF37',
}

function parseValue(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'string' ? parsed : String(parsed)
  } catch {
    return raw
  }
}

/** Carrega as 14 chaves de marca de program_settings (requer login de equipe). */
export async function getBrandSettings(): Promise<BrandSettings> {
  const result = { ...DEFAULT_BRAND_SETTINGS }
  const records = await pb.collection('program_settings').getFullList()
  records.forEach((s: any) => {
    if ((BRAND_SETTING_KEYS as readonly string[]).includes(s.key)) {
      result[s.key as BrandSettingKey] = parseValue(s.value_json)
    }
  })
  return result
}

/** Grava (upsert) as chaves de marca em program_settings. Requer papel admin. */
export async function saveBrandSettings(values: BrandSettings): Promise<void> {
  for (const key of BRAND_SETTING_KEYS) {
    const value = values[key] ?? ''
    try {
      const rec = await pb.collection('program_settings').getFirstListItem(`key = '${key}'`)
      await pb.collection('program_settings').update(rec.id, {
        value_json: JSON.stringify(value),
      })
    } catch (_) {
      await pb.collection('program_settings').create({
        key,
        value_json: JSON.stringify(value),
        description: BRAND_LABELS[key],
      })
    }
  }
}
