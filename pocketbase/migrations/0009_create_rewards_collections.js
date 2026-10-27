/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const usersCol = app.findCollectionByNameOrId('users')
  const categoriesCol = app.findCollectionByNameOrId('participant_categories')
  const participantsCol = app.findCollectionByNameOrId('participants')
  const referralsCol = app.findCollectionByNameOrId('referrals')
  const dealsCol = app.findCollectionByNameOrId('deals')
  const campaignsCol = app.findCollectionByNameOrId('campaigns')
  const condominiumsCol = app.findCollectionByNameOrId('condominiums')

  // 1. payment_batches collection
  // month_ref (e.g. '2026-11'), status: aberto, em_conferencia, fechado, pago
  let paymentBatchesCol
  try {
    paymentBatchesCol = app.findCollectionByNameOrId('payment_batches')
  } catch (_) {
    paymentBatchesCol = new Collection({
      name: 'payment_batches',
      type: 'base',
      listRule: "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id",
      viewRule: "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id",
      createRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && (@collection.user_roles.role ?= 'admin' || @collection.user_roles.role ?= 'financeiro')",
      updateRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && (@collection.user_roles.role ?= 'admin' || @collection.user_roles.role ?= 'financeiro')",
      deleteRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && @collection.user_roles.role ?= 'admin'",
      fields: [
        { name: 'month_ref', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['aberto', 'em_conferencia', 'fechado', 'pago'],
        },
        { name: 'reckoning_date', type: 'date', required: true },
        { name: 'due_date', type: 'date', required: true },
        { name: 'total_amount_brl', type: 'number' },
        { name: 'item_count', type: 'number' },
        { name: 'closed_at', type: 'date' },
        { name: 'closed_by', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
        { name: 'notes', type: 'text' },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_payment_batches_month ON payment_batches (month_ref)',
        'CREATE INDEX idx_payment_batches_status ON payment_batches (status)',
      ],
    })
    app.save(paymentBatchesCol)
  }

  // 2. reward_rules collection
  let rewardRulesCol
  try {
    rewardRulesCol = app.findCollectionByNameOrId('reward_rules')
  } catch (_) {
    rewardRulesCol = new Collection({
      name: 'reward_rules',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && @collection.user_roles.role ?= 'admin'",
      updateRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && @collection.user_roles.role ?= 'admin'",
      deleteRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && @collection.user_roles.role ?= 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'version', type: 'number', required: true },
        {
          name: 'category_id',
          type: 'relation',
          collectionId: categoriesCol.id,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'referral_type',
          type: 'select',
          required: true,
          values: ['proprietario_venda', 'proprietario_locacao', 'comprador', 'todos'],
        },
        {
          name: 'milestone',
          type: 'select',
          required: true,
          values: ['captada', 'fechamento'],
        },
        {
          name: 'beneficiary_type',
          type: 'select',
          required: true,
          values: ['indicador', 'cliente'],
        },
        {
          name: 'reward_type',
          type: 'select',
          required: true,
          values: [
            'nenhuma',
            'nao_monetaria',
            'valor_fixo',
            'tabela_faixas',
            'beneficio_catalogo',
            'percentual_comissao',
          ],
        },
        { name: 'fixed_amount_brl', type: 'number' },
        { name: 'percentage_value', type: 'number' },
        { name: 'bracket_basis', type: 'select', values: ['valor_venda', 'aluguel_mensal'] },
        { name: 'brackets', type: 'json' },
        { name: 'cap_pct_of_commission', type: 'number' },
        { name: 'catalog_benefit_desc', type: 'text' },
        { name: 'campaign_id', type: 'relation', collectionId: campaignsCol.id, maxSelect: 1 },
        {
          name: 'condominium_id',
          type: 'relation',
          collectionId: condominiumsCol.id,
          maxSelect: 1,
        },
        { name: 'active', type: 'bool' },
        { name: 'released_for_use', type: 'bool' },
        { name: 'released_at', type: 'date' },
        { name: 'released_by', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
        { name: 'valid_from', type: 'date', required: true },
        { name: 'valid_to', type: 'date' },
        { name: 'notes', type: 'text' },
      ],
      indexes: [
        'CREATE INDEX idx_reward_rules_cat_milestone ON reward_rules (category_id, milestone, referral_type)',
        'CREATE INDEX idx_reward_rules_released ON reward_rules (released_for_use, active)',
      ],
    })
    app.save(rewardRulesCol)
  }

  // 3. rewards collection
  let rewardsCol
  try {
    rewardsCol = app.findCollectionByNameOrId('rewards')
  } catch (_) {
    rewardsCol = new Collection({
      name: 'rewards',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (participant_id.user_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (participant_id.user_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      createRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && (@collection.user_roles.role ?= 'admin' || @collection.user_roles.role ?= 'financeiro')",
      updateRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && (@collection.user_roles.role ?= 'admin' || @collection.user_roles.role ?= 'financeiro')",
      deleteRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && @collection.user_roles.role ?= 'admin'",
      fields: [
        {
          name: 'referral_id',
          type: 'relation',
          collectionId: referralsCol.id,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'milestone',
          type: 'select',
          required: true,
          values: ['captada', 'fechamento'],
        },
        {
          name: 'beneficiary_type',
          type: 'select',
          required: true,
          values: ['indicador', 'cliente'],
        },
        {
          name: 'participant_id',
          type: 'relation',
          collectionId: participantsCol.id,
          maxSelect: 1,
          required: true,
        },
        { name: 'deal_id', type: 'relation', collectionId: dealsCol.id, maxSelect: 1 },
        {
          name: 'rule_id',
          type: 'relation',
          collectionId: rewardRulesCol.id,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'aguardando_comissao',
            'em_analise',
            'em_revisao_admin',
            'pendente_dados',
            'aprovada',
            'em_lote',
            'paga',
            'cancelada',
          ],
        },
        {
          name: 'reward_type',
          type: 'select',
          required: true,
          values: [
            'nenhuma',
            'nao_monetaria',
            'valor_fixo',
            'tabela_faixas',
            'beneficio_catalogo',
            'percentual_comissao',
          ],
        },
        { name: 'calculated_amount_brl', type: 'number' },
        { name: 'adjusted_amount_brl', type: 'number' },
        { name: 'final_amount_brl', type: 'number' },
        { name: 'adjustment_reason', type: 'text' },
        { name: 'via_decline', type: 'bool' },
        { name: 'orange_flag_reason', type: 'text' },
        { name: 'orange_flag_resolved_at', type: 'date' },
        {
          name: 'orange_flag_resolved_by',
          type: 'relation',
          collectionId: usersCol.id,
          maxSelect: 1,
        },
        { name: 'approved_at', type: 'date' },
        { name: 'approved_by', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
        { name: 'approval_justification', type: 'text' },
        { name: 'batch_id', type: 'relation', collectionId: paymentBatchesCol.id, maxSelect: 1 },
        {
          name: 'payment_method',
          type: 'select',
          values: [
            'pix',
            'transferencia',
            'cartao_premiacao',
            'cartao_presente',
            'benfeitoria',
            'desconto_comissao',
          ],
        },
        { name: 'paid_at', type: 'date' },
        { name: 'payment_proof_file', type: 'file', maxSelect: 1 },
        { name: 'payment_reference', type: 'text' },
        { name: 'payment_notes', type: 'text' },
        {
          name: 'registered_payment_by',
          type: 'relation',
          collectionId: usersCol.id,
          maxSelect: 1,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_rewards_unique_milestone ON rewards (referral_id, milestone, beneficiary_type)',
        'CREATE INDEX idx_rewards_participant ON rewards (participant_id)',
        'CREATE INDEX idx_rewards_status ON rewards (status)',
        'CREATE INDEX idx_rewards_batch ON rewards (batch_id)',
        'CREATE INDEX idx_rewards_deal ON rewards (deal_id)',
      ],
    })
    app.save(rewardsCol)
  }

  // 4. Create private file bucket for payment proofs if needed
  // In PocketBase, file fields live directly on collection records, with storage protected by collection access rules.
  // The 'payment_proof_file' field on 'rewards' collection is protected by the rewards list/view rule:
  // only the participant or users with internal roles can access.
})
