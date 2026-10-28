/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar campos adicionais na coleção participants (cnpj, role_title, creci, marketing_optin)
    const partCol = app.findCollectionByNameOrId('participants')
    if (!partCol.fields.getByName('cnpj')) {
      partCol.fields.add(new TextField({ name: 'cnpj' }))
    }
    if (!partCol.fields.getByName('role_title')) {
      partCol.fields.add(new TextField({ name: 'role_title' }))
    }
    if (!partCol.fields.getByName('creci')) {
      partCol.fields.add(new TextField({ name: 'creci' }))
    }
    if (!partCol.fields.getByName('marketing_optin')) {
      partCol.fields.add(new BoolField({ name: 'marketing_optin' }))
    }

    try {
      partCol.addIndex('idx_participants_referral_code', false, 'referral_code', '')
    } catch (_) {}

    app.save(partCol)

    // 2. Atualizar reward_rules para permitir 'inquilino' no referral_type
    const rulesCol = app.findCollectionByNameOrId('reward_rules')
    const refTypeField = rulesCol.fields.getByName('referral_type')
    if (refTypeField && refTypeField.values) {
      if (!refTypeField.values.includes('inquilino')) {
        refTypeField.values.push('inquilino')
        app.save(rulesCol)
      }
    }

    // 3. Cadastrar regras de recompensa para Inquilino (seção 5.3 com released_for_use = false)
    const bracketsLocacao = [
      { min: 0, max: 8000, amount: 500 },
      { min: 8000, max: 15000, amount: 800 },
      { min: 15000, max: 25000, amount: 1500 },
      { min: 25000, max: 999999999, amount: 2500 },
    ]

    const getCatId = (slug) => {
      try {
        const rec = app.findFirstRecordByFilter('participant_categories', 'slug = {:s}', {
          s: slug,
        })
        return rec ? rec.id : null
      } catch (_) {
        return null
      }
    }

    const porteiroId = getCatId('porteiro_zelador')
    const prestadorId = getCatId('prestador_residencial')
    const clienteId = getCatId('cliente')
    const parceiroProfId = getCatId('parceiro_profissional')
    const empresaParceiraId = getCatId('empresa_parceira')
    const admId = getCatId('administradora')
    const sindicoId = getCatId('sindico')
    const entidadeId = getCatId('entidade_condominial')
    const corretorId = getCatId('corretor_parceiro')

    const tenantSeeds = [
      {
        name: 'Porteiro - Fechamento Locação (Lado Inquilino)',
        category_id: porteiroId,
        referral_type: 'inquilino',
        milestone: 'fechamento',
        beneficiary_type: 'indicador',
        reward_type: 'tabela_faixas',
        bracket_basis: 'aluguel_mensal',
        brackets: bracketsLocacao,
        cap_pct_of_commission: 10,
      },
      {
        name: 'Prestador - Fechamento Locação (Lado Inquilino)',
        category_id: prestadorId,
        referral_type: 'inquilino',
        milestone: 'fechamento',
        beneficiary_type: 'indicador',
        reward_type: 'tabela_faixas',
        bracket_basis: 'aluguel_mensal',
        brackets: bracketsLocacao,
        cap_pct_of_commission: 10,
      },
      {
        name: 'Cliente - Fechamento Locação (Lado Inquilino)',
        category_id: clienteId,
        referral_type: 'inquilino',
        milestone: 'fechamento',
        beneficiary_type: 'indicador',
        reward_type: 'tabela_faixas',
        bracket_basis: 'aluguel_mensal',
        brackets: bracketsLocacao,
        cap_pct_of_commission: 10,
      },
      {
        name: 'Parceiro Profissional - Fechamento Locação (Inquilino)',
        category_id: parceiroProfId,
        referral_type: 'inquilino',
        milestone: 'fechamento',
        beneficiary_type: 'indicador',
        reward_type: 'tabela_faixas',
        bracket_basis: 'aluguel_mensal',
        brackets: bracketsLocacao,
        cap_pct_of_commission: 10,
      },
      {
        name: 'Empresa Parceira - Fechamento Locação (Inquilino)',
        category_id: empresaParceiraId,
        referral_type: 'inquilino',
        milestone: 'fechamento',
        beneficiary_type: 'indicador',
        reward_type: 'tabela_faixas',
        bracket_basis: 'aluguel_mensal',
        brackets: bracketsLocacao,
        cap_pct_of_commission: 10,
      },
      {
        name: 'Administradora - Fechamento Locação (Inquilino)',
        category_id: admId,
        referral_type: 'inquilino',
        milestone: 'fechamento',
        beneficiary_type: 'indicador',
        reward_type: 'tabela_faixas',
        bracket_basis: 'aluguel_mensal',
        brackets: bracketsLocacao,
        cap_pct_of_commission: 10,
      },
      {
        name: 'Síndico - Fechamento Locação (Inquilino)',
        category_id: sindicoId,
        referral_type: 'inquilino',
        milestone: 'fechamento',
        beneficiary_type: 'indicador',
        reward_type: 'tabela_faixas',
        bracket_basis: 'aluguel_mensal',
        brackets: bracketsLocacao,
        cap_pct_of_commission: 10,
      },
      {
        name: 'Entidade Condominial - Fechamento Locação (Inquilino)',
        category_id: entidadeId,
        referral_type: 'inquilino',
        milestone: 'fechamento',
        beneficiary_type: 'indicador',
        reward_type: 'tabela_faixas',
        bracket_basis: 'aluguel_mensal',
        brackets: bracketsLocacao,
        cap_pct_of_commission: 10,
      },
      {
        name: 'Corretor Parceiro - Repasse Comissão Inquilino',
        category_id: corretorId,
        referral_type: 'inquilino',
        milestone: 'fechamento',
        beneficiary_type: 'indicador',
        reward_type: 'percentual_comissao',
        percentage_value: 10,
        cap_pct_of_commission: 10,
      },
    ]

    tenantSeeds.forEach((s) => {
      if (!s.category_id) return
      const existing = app.findRecordsByFilter('reward_rules', 'name = {:n}', '', 1, 0, {
        n: s.name,
      })
      if (existing && existing.length > 0) return

      const r = new Record(rulesCol)
      r.set('name', s.name)
      r.set('version', 1)
      r.set('category_id', s.category_id)
      r.set('referral_type', s.referral_type)
      r.set('milestone', s.milestone)
      r.set('beneficiary_type', s.beneficiary_type)
      r.set('reward_type', s.reward_type)
      if (s.percentage_value !== undefined) r.set('percentage_value', s.percentage_value)
      if (s.bracket_basis) r.set('bracket_basis', s.bracket_basis)
      if (s.brackets) r.set('brackets', JSON.stringify(s.brackets))
      if (s.cap_pct_of_commission !== undefined)
        r.set('cap_pct_of_commission', s.cap_pct_of_commission)
      r.set('active', true)
      r.set('released_for_use', false)
      r.set('valid_from', '2026-01-01 00:00:00.000Z')
      app.save(r)
    })
  },
  (app) => {
    // down logic
  },
)
