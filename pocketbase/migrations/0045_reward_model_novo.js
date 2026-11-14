/// <reference path="../pb_data/types.d.ts" />

// Migração 0045 — Novo modelo de recompensas (Godoy Prime Indica)
//
// 1. Obsoleta (active=false, vigência encerrada em 2026-11-14, nota [OBSOLETA]) as regras
//    ativas de primeira_visita_realizada (R$ 500) — sem apagar.
// 2. Obsoleta TODAS as regras ativas de declinada_pela_godoy — sem apagar.
// 3. Cria, em TODAS as categorias, regras ativas a partir de 2026-11-14:
//    - primeira_visita_realizada (comprador) R$ 150 — visita com corretor credenciado
//      e capacidade financeira demonstrada (condições já garantidas pelo fluxo).
//    - fechamento (comprador — compra concretizada) R$ 2.500, beneficiário indicador.
//    - fechamento (proprietario_venda — venda concretizada) R$ 2.500, beneficiário indicador.
//    Valores ADICIONAIS aos marcos anteriores (acumulam com visita/captação).
// 4. Regras de R$ 100 por captação (venda e locação) permanecem como estão.
//
// Vigência: as regras novas valem para indicações registradas a partir de 2026-11-14;
// indicações anteriores seguem a regra vigente na data em que foram registradas (os hooks
// selecionam a regra pela janela valid_from/valid_to comparada à data da indicação, e uma
// regra obsoleta com vigência encerrada ainda cobre indicações registradas antes do fim
// da vigência dela). Idempotente: não duplica regras já criadas por esta migração.

migrate(
  (app) => {
    const CHANGE_DATE = '2026-11-14 00:00:00.000Z'
    const OBSOLETE_NOTE =
      '[OBSOLETA 2026-11-14 - 0045] Desativada pelo novo modelo de recompensas. Indicações registradas antes de 2026-11-14 seguem a regra vigente na data do registro.'

    // 1 + 2: obsoletar regras antigas (sem apagar)
    app
      .db()
      .newQuery(
        "UPDATE reward_rules SET active = 0, valid_to = '" +
          CHANGE_DATE +
          "', notes = CASE WHEN notes IS NULL OR notes = '' THEN '" +
          OBSOLETE_NOTE +
          "' ELSE notes || ' | " +
          OBSOLETE_NOTE +
          "' END WHERE active = 1 AND (milestone = 'primeira_visita_realizada' OR milestone = 'declinada_pela_godoy')",
      )
      .execute()

    // 3: criar novas regras em todas as categorias
    const cats = app.findRecordsByFilter('participant_categories', '', '-created', 500, 0)
    const col = app.findCollectionByNameOrId('reward_rules')

    function ruleExists(catId, milestone, refType) {
      try {
        const f =
          "category_id = '" +
          catId +
          "' && milestone = '" +
          milestone +
          "' && referral_type = '" +
          refType +
          "' && active = true && valid_from >= '" +
          CHANGE_DATE +
          "'"
        return app.findRecordsByFilter('reward_rules', f, '', 1, 0).length > 0
      } catch (_) {
        return false
      }
    }

    function createRule(name, catId, catName, milestone, refType, amount, notes) {
      const r = new Record(col)
      r.set('name', name)
      r.set('version', 2)
      r.set('category_id', catId)
      r.set('referral_type', refType)
      r.set('milestone', milestone)
      r.set('beneficiary_type', 'indicador')
      r.set('reward_type', 'valor_fixo')
      r.set('fixed_amount_brl', amount)
      r.set('percentage_value', 0)
      r.set('cap_pct_of_commission', 0)
      r.set('active', true)
      r.set('released_for_use', false)
      r.set('valid_from', CHANGE_DATE)
      r.set('notes', notes)
      app.save(r)
      created.push(catName + ' / ' + name)
    }

    const created = []

    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i]
      const catId = cat.id
      const catName = cat.getString('name')

      // Visita realizada: R$ 150 (substitui a regra de R$ 500, que fica obsoleta)
      if (!ruleExists(catId, 'primeira_visita_realizada', 'comprador')) {
        createRule(
          catName + ' - Comprador (Primeira Visita Realizada) [NOVO MODELO]',
          catId,
          catName,
          'primeira_visita_realizada',
          'comprador',
          150,
          'R$ 150 na primeira visita realizada com corretor credenciado e capacidade financeira demonstrada. Novo modelo 0045 (substitui a regra de R$ 500). Adicional: R$ 2.500 no fechamento da compra, liberado somente após comissão recebida.',
        )
      }

      // Fechamento — compra concretizada: R$ 2.500 para o indicador comprador
      if (!ruleExists(catId, 'fechamento', 'comprador')) {
        createRule(
          catName + ' - Comprador (Fechamento — Compra Concretizada) [NOVO MODELO]',
          catId,
          catName,
          'fechamento',
          'comprador',
          2500,
          'R$ 2.500 adicionais no fechamento da compra, gerados somente quando a comissão do negócio é registrada como recebida; estornada se o negócio for cancelado. Acumula com a recompensa de primeira visita.',
        )
      }

      // Fechamento — venda concretizada: R$ 2.500 para o indicador proprietário (venda)
      if (!ruleExists(catId, 'fechamento', 'proprietario_venda')) {
        createRule(
          catName + ' - Proprietário Venda (Fechamento — Venda Concretizada) [NOVO MODELO]',
          catId,
          catName,
          'fechamento',
          'proprietario_venda',
          2500,
          'R$ 2.500 adicionais no fechamento da venda, gerados somente quando a comissão do negócio é registrada como recebida; estornada se o negócio for cancelado. Acumula com a recompensa de captação (R$ 100).',
        )
      }
    }

    console.log(
      '[0045] Regras obsoletas atualizadas e ' + created.length + ' novas regras criadas.',
    )
  },
  (app) => {
    // down: nada — forward-only; regras obsoletas permanecem no banco
  },
)
