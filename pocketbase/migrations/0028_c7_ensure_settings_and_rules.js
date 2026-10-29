/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir que clube_beneficios_url existe
    try {
      const exist = app.findFirstRecordByData('program_settings', 'key', 'clube_beneficios_url')
      if (exist) {
        exist.set('value_json', JSON.stringify(''))
        app.save(exist)
      }
    } catch (_) {
      try {
        const col = app.findCollectionByNameOrId('program_settings')
        const rec = new Record(col)
        rec.set('key', 'clube_beneficios_url')
        rec.set('value_json', JSON.stringify(''))
        rec.set(
          'description',
          'URL do Clube de benefícios Godoy Prime exibido no painel de participantes ativos',
        )
        app.save(rec)
      } catch (e2) {
        console.warn('[migration 0028] Erro ao salvar clube_beneficios_url:', e2)
      }
    }

    // 2. Desativar regras antigas que ainda estejam ativas de fechamento, tabela_faixas, etc.
    try {
      app
        .db()
        .newQuery(
          `UPDATE reward_rules
           SET active = 0,
               notes = CASE 
                 WHEN notes IS NULL OR notes = '' THEN '[OBSOLETA - C7] Desativada: novo modelo de recompensa final pela informacao.'
                 ELSE notes || ' | [OBSOLETA - C7] Desativada: novo modelo de recompensa final pela informacao.'
               END
           WHERE active = 1
             AND (
               milestone = 'fechamento'
               OR reward_type = 'tabela_faixas'
               OR referral_type = 'inquilino'
               OR cap_pct_of_commission > 0
               OR name LIKE '%Fechamento%'
               OR name LIKE '%Inquilino%'
               OR name LIKE '%Faixas%'
               OR name LIKE '%Volume%'
               OR name LIKE '%Bonus%'
               OR name LIKE '%Indicar%'
             )`,
        )
        .execute()
    } catch (err) {
      console.warn('[migration 0028] Erro ao desativar regras antigas remanescentes:', err)
    }

    // 3. Garantir que as regras antigas pré-existentes de captação (s9sl711qr73x3ra etc.) também estejam com released_for_use = false
    try {
      app
        .db()
        .newQuery(
          `UPDATE reward_rules
           SET released_for_use = 0
           WHERE released_for_use IS NULL`,
        )
        .execute()
    } catch (err) {
      console.warn('[migration 0028] Erro ao normalizar released_for_use:', err)
    }
  },
  (app) => {
    // down logic
  },
)
