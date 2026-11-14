// pocketbase/migrations/0043_brand_settings.js
//
// Duas partes, ambas idempotentes (no-op quando nada a fazer):
//
// 1) Remove de program_settings toda chave legada do harness de QA
//    (qualquer chave que contenha "qa_harness_ran"). O hook qa_harness.pb.js
//    gravava resultados ali; o harness já foi removido do repo.
//
// 2) Insere as 13 chaves centrais de marca em program_settings com os valores
//    oficiais da Godoy Prime hoje fixos no código (fontes: src/main.css,
//    src/components/brand/GodoyLogo.tsx, pocketbase/migrations/0041,
//    index.html e hooks de comunicação). Não duplica chave que já exista.
//
// public_base_url é o domínio oficial do programa, já usado fixo nos hooks
// (operations.pb.js:3424, partners_levels_benefits.pb.js:169 etc).
//
// Regra desta migração: NENHUMA chave nasce com valor vazio — value_json é
// `required` na coleção (0004) e o PocketBase rejeita "", null, "null", [] e
// {}. A chave support_whatsapp NÃO é criada aqui (não existe WhatsApp real);
// a rota pública GET /backend/v1/public/brand devolve "" para chaves ausentes.

migrate(
  (app) => {
    // ---------- parte 1: limpeza do harness de QA ----------
    let qaKeys = []
    try {
      qaKeys = app.findRecordsByFilter(
        'program_settings',
        'key ~ "qa_harness_ran"',
        '-created',
        200,
        0,
      )
    } catch (_) {
      qaKeys = []
    }

    if (qaKeys.length === 0) {
      console.log('[0043] nenhuma chave qa_harness_ran* em program_settings (no-op).')
    } else {
      qaKeys.forEach((rec) => {
        const key = rec.getString('key')
        app.delete(rec)
        console.log('[0043] removida chave legada de QA: ' + key)
      })
    }

    // ---------- parte 2: chaves centrais de marca ----------
    const BRAND_ENTRIES = [
      { key: 'brand_name', value: 'Godoy Prime Realty', description: 'Nome comercial da marca' },
      {
        key: 'program_name',
        value: 'Godoy Prime Indica',
        description: 'Nome oficial do programa de indicações',
      },
      {
        key: 'legal_name',
        value: 'Godoy Prime Realty',
        description: 'Razão social (conforme regulamento/documentos jurídicos)',
      },
      { key: 'cnpj', value: '58.409.058/0001-73', description: 'CNPJ da promotora' },
      { key: 'creci', value: '11841', description: 'CRECI-RJ PJ da promotora' },
      {
        key: 'support_email',
        value: 'contato@primecircle.app.br',
        description: 'E-mail de contato/suporte (canal de privacidade nos documentos)',
      },
      {
        key: 'public_base_url',
        value: 'https://indicacao.godoyprime.com.br',
        description: 'URL base pública do programa (links de indicação /i/CODIGO)',
      },
      {
        key: 'site_url',
        value: 'https://godoyprime.com.br',
        description: 'Site institucional da marca',
      },
      {
        key: 'logo_url',
        value: '/brand/godoy/logotipo-principal-oficial.png',
        description: 'Logotipo principal oficial (fundo claro)',
      },
      {
        key: 'logo_negative_url',
        value: '/brand/godoy/logotipo-negativo-01.png',
        description: 'Logotipo negativo (fundo navy/escuro)',
      },
      {
        key: 'symbol_url',
        value: '/brand/godoy/simbolo-gold.png',
        description: 'Símbolo da marca (dourado)',
      },
      {
        key: 'primary_color',
        value: '#C4993A',
        description: 'Cor primária (--primary em main.css)',
      },
      {
        key: 'accent_color',
        value: '#D4AF37',
        description: 'Cor de destaque (--gold-brand em main.css)',
      },
    ]

    const col = app.findCollectionByNameOrId('program_settings')

    BRAND_ENTRIES.forEach((entry) => {
      if (!entry.value || entry.value === 'null' || entry.value === '[]' || entry.value === '{}') {
        throw new Error('[0043] valor vazio proibido em value_json para a chave ' + entry.key)
      }
      let existing = null
      try {
        existing = app.findFirstRecordByData('program_settings', 'key', entry.key)
      } catch (_) {
        existing = null
      }
      if (existing) {
        return // idempotente: nunca duplicar chave
      }
      const rec = new Record(col)
      rec.set('key', entry.key)
      rec.set('value_json', JSON.stringify(entry.value))
      rec.set('description', entry.description)
      app.save(rec)
      console.log('[0043] inserida chave de marca: ' + entry.key)
    })
  },
  (app) => {
    // down: remove apenas as 13 chaves de marca (a limpeza de QA não é
    // revertida — apagar dados do harness é permanente de propósito).
    const keys = [
      'brand_name',
      'program_name',
      'legal_name',
      'cnpj',
      'creci',
      'support_email',
      'public_base_url',
      'site_url',
      'logo_url',
      'logo_negative_url',
      'symbol_url',
      'primary_color',
      'accent_color',
    ]
    keys.forEach((key) => {
      try {
        const rec = app.findFirstRecordByData('program_settings', 'key', key)
        app.delete(rec)
      } catch (_) {}
    })
  },
)
