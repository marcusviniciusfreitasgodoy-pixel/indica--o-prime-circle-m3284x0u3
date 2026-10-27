/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const rulesCol = app.findCollectionByNameOrId('reward_rules')
  const categoriesCol = app.findCollectionByNameOrId('participant_categories')

  // Find all category records by slug
  const getCatId = (slug) => {
    try {
      const rec = app.findFirstRecordByFilter('participant_categories', `slug = '${slug}'`)
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

  // Faixas padrão de venda:
  // até 1,5M -> 5.000
  // 1,5M a 3M -> 10.000
  // 3M a 5M -> 15.000
  // acima de 5M -> 20.000
  const bracketsVenda = [
    { min: 0, max: 1500000, amount: 5000 },
    { min: 1500000, max: 3000000, amount: 10000 },
    { min: 3000000, max: 5000000, amount: 15000 },
    { min: 5000000, max: 999999999, amount: 20000 },
  ]

  // Faixas padrão de locação:
  // até 5k -> 500
  // 5k a 10k -> 1.000
  // acima de 10k -> 2.000
  const bracketsLocacao = [
    { min: 0, max: 5000, amount: 500 },
    { min: 5000, max: 10000, amount: 1000 },
    { min: 10000, max: 999999999, amount: 2000 },
  ]

  const validFrom = '2026-01-01 00:00:00.000Z'

  const seeds = [
    // 1. Porteiro / Zelador - Captação: R$ 100
    {
      name: 'Porteiro - Captação de Imóvel',
      category_id: porteiroId,
      referral_type: 'proprietario_venda',
      milestone: 'captada',
      beneficiary_type: 'indicador',
      reward_type: 'valor_fixo',
      fixed_amount_brl: 100,
      cap_pct_of_commission: null,
      bracket_basis: null,
      brackets: null,
    },
    {
      name: 'Porteiro - Captação Locação',
      category_id: porteiroId,
      referral_type: 'proprietario_locacao',
      milestone: 'captada',
      beneficiary_type: 'indicador',
      reward_type: 'valor_fixo',
      fixed_amount_brl: 100,
      cap_pct_of_commission: null,
      bracket_basis: null,
      brackets: null,
    },
    // 2. Porteiro - Fechamento Venda (tabela faixas)
    {
      name: 'Porteiro - Fechamento Venda (Lado Proprietário)',
      category_id: porteiroId,
      referral_type: 'proprietario_venda',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'valor_venda',
      brackets: bracketsVenda,
      cap_pct_of_commission: 10,
    },
    {
      name: 'Porteiro - Fechamento Venda (Lado Comprador)',
      category_id: porteiroId,
      referral_type: 'comprador',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'valor_venda',
      brackets: bracketsVenda,
      cap_pct_of_commission: 10,
    },
    // 3. Porteiro - Fechamento Locação
    {
      name: 'Porteiro - Fechamento Locação (Lado Proprietário)',
      category_id: porteiroId,
      referral_type: 'proprietario_locacao',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'aluguel_mensal',
      brackets: bracketsLocacao,
      cap_pct_of_commission: 10,
    },

    // 4. Prestador Residencial
    {
      name: 'Prestador - Captação de Imóvel',
      category_id: prestadorId,
      referral_type: 'proprietario_venda',
      milestone: 'captada',
      beneficiary_type: 'indicador',
      reward_type: 'valor_fixo',
      fixed_amount_brl: 100,
    },
    {
      name: 'Prestador - Captação Locação',
      category_id: prestadorId,
      referral_type: 'proprietario_locacao',
      milestone: 'captada',
      beneficiary_type: 'indicador',
      reward_type: 'valor_fixo',
      fixed_amount_brl: 100,
    },
    {
      name: 'Prestador - Fechamento Venda (Proprietário)',
      category_id: prestadorId,
      referral_type: 'proprietario_venda',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'valor_venda',
      brackets: bracketsVenda,
      cap_pct_of_commission: 10,
    },
    {
      name: 'Prestador - Fechamento Venda (Comprador)',
      category_id: prestadorId,
      referral_type: 'comprador',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'valor_venda',
      brackets: bracketsVenda,
      cap_pct_of_commission: 10,
    },

    // 5. Cliente (Comunidade) - Sem captação monetária, cashback no fechamento ou faixas
    {
      name: 'Cliente - Fechamento Venda (Lado Proprietário Indicado)',
      category_id: clienteId,
      referral_type: 'proprietario_venda',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'valor_venda',
      brackets: bracketsVenda,
      cap_pct_of_commission: 10,
    },
    {
      name: 'Cliente - Fechamento Venda (Lado Comprador Indicado)',
      category_id: clienteId,
      referral_type: 'comprador',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'valor_venda',
      brackets: bracketsVenda,
      cap_pct_of_commission: 10,
    },
    {
      name: 'Cliente Final - Cashback / Benefício no Fechamento',
      category_id: clienteId,
      referral_type: 'proprietario_venda',
      milestone: 'fechamento',
      beneficiary_type: 'cliente',
      reward_type: 'beneficio_catalogo',
      catalog_benefit_desc:
        'Kit de Boas-Vindas Prime Circle & Voo Panorâmico ou Voucher de Decoração',
    },

    // 6. Parceiro Profissional (Advogado, Contador)
    {
      name: 'Parceiro Profissional - Fechamento Venda (Proprietário)',
      category_id: parceiroProfId,
      referral_type: 'proprietario_venda',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'valor_venda',
      brackets: bracketsVenda,
      cap_pct_of_commission: 10,
    },
    {
      name: 'Parceiro Profissional - Fechamento Venda (Comprador)',
      category_id: parceiroProfId,
      referral_type: 'comprador',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'valor_venda',
      brackets: bracketsVenda,
      cap_pct_of_commission: 10,
    },

    // 7. Entidade Condominial (Associação / Fundo do Prédio)
    {
      name: 'Entidade Condominial - Fechamento Venda',
      category_id: entidadeId,
      referral_type: 'proprietario_venda',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'valor_venda',
      brackets: bracketsVenda,
      cap_pct_of_commission: 10,
      notes: 'Benfeitoria ou doação para fundo de melhoria do condomínio',
    },

    // 8. Síndico
    {
      name: 'Síndico - Fechamento Venda',
      category_id: sindicoId,
      referral_type: 'proprietario_venda',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'tabela_faixas',
      bracket_basis: 'valor_venda',
      brackets: bracketsVenda,
      cap_pct_of_commission: 10,
    },

    // 9. Corretor Parceiro (CRECI) - pode receber percentual_comissao ou faixas
    {
      name: 'Corretor Parceiro - Repasse Comissão Venda',
      category_id: corretorId,
      referral_type: 'proprietario_venda',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'percentual_comissao',
      percentage_value: 10,
      cap_pct_of_commission: 10,
    },
    {
      name: 'Corretor Parceiro - Repasse Comissão Comprador',
      category_id: corretorId,
      referral_type: 'comprador',
      milestone: 'fechamento',
      beneficiary_type: 'indicador',
      reward_type: 'percentual_comissao',
      percentage_value: 10,
      cap_pct_of_commission: 10,
    },
  ]

  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i]
    if (!s.category_id) continue

    // Check if already seeded
    const existing = app.findRecordsByFilter('reward_rules', `name = {:name}`, '', 1, 0, {
      name: s.name,
    })
    if (existing && existing.length > 0) continue

    const rec = new Record(rulesCol)
    rec.set('name', s.name)
    rec.set('version', 1)
    rec.set('category_id', s.category_id)
    rec.set('referral_type', s.referral_type)
    rec.set('milestone', s.milestone)
    rec.set('beneficiary_type', s.beneficiary_type)
    rec.set('reward_type', s.reward_type)
    if (s.fixed_amount_brl !== undefined) rec.set('fixed_amount_brl', s.fixed_amount_brl)
    if (s.percentage_value !== undefined) rec.set('percentage_value', s.percentage_value)
    if (s.bracket_basis) rec.set('bracket_basis', s.bracket_basis)
    if (s.brackets) rec.set('brackets', JSON.stringify(s.brackets))
    if (s.cap_pct_of_commission !== undefined)
      rec.set('cap_pct_of_commission', s.cap_pct_of_commission)
    if (s.catalog_benefit_desc) rec.set('catalog_benefit_desc', s.catalog_benefit_desc)
    rec.set('active', true)
    // Regra da especificação: TODAS com released_for_use = false
    rec.set('released_for_use', false)
    rec.set('valid_from', validFrom)
    if (s.notes) rec.set('notes', s.notes)

    app.save(rec)
  }
})
