/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const bracketsVenda = [
      { min: 0, max: 1000000, amount: 2500 },
      { min: 1000000, max: 2000000, amount: 5000 },
      { min: 2000000, max: 3000000, amount: 10000 },
      { min: 3000000, max: 5000000, amount: 15000 },
      { min: 5000000, max: 999999999, amount: 25000 },
    ]

    const bracketsLocacao = [
      { min: 0, max: 8000, amount: 500 },
      { min: 8000, max: 15000, amount: 800 },
      { min: 15000, max: 25000, amount: 1500 },
      { min: 25000, max: 999999999, amount: 2500 },
    ]

    const rules = app.findRecordsByFilter(
      'reward_rules',
      `reward_type = 'tabela_faixas'`,
      '',
      100,
      0,
    )

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      const bracketBasis = rule.getString('bracket_basis')
      const refType = rule.getString('referral_type')

      if (bracketBasis === 'aluguel_mensal' || refType === 'proprietario_locacao') {
        rule.set('bracket_basis', 'aluguel_mensal')
        rule.set('brackets', JSON.stringify(bracketsLocacao))
      } else {
        rule.set('bracket_basis', 'valor_venda')
        rule.set('brackets', JSON.stringify(bracketsVenda))
      }

      rule.set('cap_pct_of_commission', 10)
      rule.set('released_for_use', false)
      app.save(rule)
    }
  },
  (app) => {
    // Revert logic
  },
)
