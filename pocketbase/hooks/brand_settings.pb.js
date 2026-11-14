// pocketbase/hooks/brand_settings.pb.js
//
// Configuração central de marca (coleção program_settings, campos key/value_json).
//
// GET /backend/v1/public/brand — rota PÚBLICA (sem autenticação): devolve
// SOMENTE as 14 chaves de marca declaradas em BRAND_KEYS. Nunca um dump de
// program_settings: qualquer chave fora da lista branca é ignorada.
//
// Regra do projeto: nada declarado no topo do arquivo é visível dentro dos
// callbacks do PocketBase — toda constante usada no callback é redeclarada
// dentro dele.

routerAdd('GET', '/backend/v1/public/brand', (e) => {
  const BRAND_KEYS = [
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
  ]

  const brand = {}
  BRAND_KEYS.forEach((key) => {
    try {
      const rec = $app.findFirstRecordByData('program_settings', 'key', key)
      const raw = rec.getString('value_json') || '""'
      try {
        brand[key] = JSON.parse(raw)
      } catch (_) {
        brand[key] = raw
      }
    } catch (_) {
      // chave ainda não existe (antes da migração): devolve vazia, nunca erro
      brand[key] = ''
    }
  })

  return e.json(200, { brand })
})
