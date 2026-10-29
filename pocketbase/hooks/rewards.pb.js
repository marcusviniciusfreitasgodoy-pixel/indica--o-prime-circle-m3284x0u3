// pocketbase/hooks/rewards.pb.js
// Implementa as regras de negócio, RPCs e automações da Etapa 5 (Recompensas e Pagamentos)
// OBS: Toda a lógica é inlined dentro de cada callback de hook/routerAdd/onRecord por conta da JSVM pool do PocketBase.

/**
 * Ao salvar capture_records com status 'aprovada'
 * Cria a recompensa do marco 'captada'
 */
onRecordAfterCreateSuccess((e) => {
  try {
    const capRec = e.record
    if (!capRec || capRec.getString('status') !== 'aprovada') return

    const referralId = capRec.getString('referral_id')
    if (!referralId) return

    let referral = null
    try {
      referral = $app.findRecordById('referrals', referralId)
    } catch (_) {
      return
    }

    const partId = referral.getString('participant_id')
    if (!partId) return
    let participant = null
    try {
      participant = $app.findRecordById('participants', partId)
    } catch (_) {
      return
    }

    // Janela de atribuição / validade da indicação (90 dias)
    let windowDays = 90
    try {
      const st = $app.findFirstRecordByData('program_settings', 'key', 'referral_validity_days')
      const val = JSON.parse(st.getString('value_json'))
      if (val !== undefined && val !== null) windowDays = Number(val)
    } catch (_) {
      try {
        const st2 = $app.findFirstRecordByData(
          'program_settings',
          'key',
          'capture_attribution_window_days',
        )
        const val2 = JSON.parse(st2.getString('value_json'))
        if (val2 !== undefined && val2 !== null) windowDays = Number(val2)
      } catch (_) {}
    }

    const refCreatedStr = referral.getString('created')
    if (refCreatedStr) {
      const refCreated = new Date(refCreatedStr)
      const diffDays = Math.floor((Date.now() - refCreated.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > windowDays) {
        return
      }
    }

    const categoryId = participant.getString('category_id')

    // Regra C9 / C7: entidade_condominial NUNCA recebe dinheiro
    let isEntidadeCondominial = false
    try {
      const partCat = $app.findRecordById('participant_categories', categoryId)
      if (partCat.getString('slug') === 'entidade_condominial') isEntidadeCondominial = true
    } catch (_) {}
    if (isEntidadeCondominial) return

    // Teto de 8 recompensas por participante por ano civil
    let annualCap = 8
    try {
      const stCap = $app.findFirstRecordByData(
        'program_settings',
        'key',
        'annual_reward_cap_per_participant',
      )
      const capVal = JSON.parse(stCap.getString('value_json'))
      if (typeof capVal === 'number') annualCap = capVal
    } catch (_) {}

    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01 00:00:00.000Z`
    const yearEnd = `${currentYear}-12-31 23:59:59.999Z`

    let isOverAnnualCap = false
    try {
      const countedThisYear = $app.findRecordsByFilter(
        'rewards',
        `participant_id = '${participant.id}' && (status = 'paga' || status = 'aprovada' || status = 'em_lote' || status = 'em_analise' || status = 'pendente_dados') && created >= '${yearStart}' && created <= '${yearEnd}'`,
        '',
        100,
        0,
      )
      if (countedThisYear && countedThisYear.length >= annualCap) {
        isOverAnnualCap = true
      }
    } catch (_) {}

    let refType = referral.getString('referral_type')
    if (!refType || refType === 'proprietario') {
      const rawType = referral.getString('type')
      if (rawType === 'proprietario_locacao') refType = 'proprietario_locacao'
      else refType = 'proprietario_venda'
    }

    const campaignId = referral.getString('campaign_id')
    const condoId = referral.getString('condominium_id')

    // Procura regra de marco 'captada'
    let filter = `category_id = '${categoryId}' && milestone = 'captada' && beneficiary_type = 'indicador' && active = true && (referral_type = '${refType}' || referral_type = 'todos')`
    const rules = $app.findRecordsByFilter('reward_rules', filter, '-version', 50, 0)
    if (!rules || rules.length === 0) return

    const refDate = refCreatedStr ? new Date(refCreatedStr) : new Date()
    const validRules = rules.filter((r) => {
      const vf = r.getString('valid_from')
      const vt = r.getString('valid_to')
      if (vf && new Date(vf) > refDate) return false
      if (vt && new Date(vt) < refDate) return false
      const rc = r.getString('campaign_id')
      const rco = r.getString('condominium_id')
      if (rc && rc !== campaignId) return false
      if (rco && rco !== condoId) return false
      return true
    })
    if (validRules.length === 0) return

    validRules.sort((a, b) => {
      const aScope = (a.getString('campaign_id') ? 2 : 0) + (a.getString('condominium_id') ? 1 : 0)
      const bScope = (b.getString('campaign_id') ? 2 : 0) + (b.getString('condominium_id') ? 1 : 0)
      if (bScope !== aScope) return bScope - aScope
      return (b.getInt('version') || 1) - (a.getInt('version') || 1)
    })
    const rule = validRules[0]

    // Checa duplicidade
    const exist = $app.findRecordsByFilter(
      'rewards',
      `referral_id = '${referral.id}' && milestone = 'captada' && beneficiary_type = 'indicador'`,
      '',
      1,
      0,
    )
    if (exist && exist.length > 0) return

    let amount = 0
    const rType = rule.getString('reward_type')

    // Regra: Se a categoria for de Parceiros ou a regra for beneficio_catalogo, NUNCA gerar valor em dinheiro (rewards)
    let isPartnerFront = false
    try {
      const partCat = $app.findRecordById('participant_categories', categoryId)
      if (partCat.getString('front') === 'parceiros') isPartnerFront = true
    } catch (_) {}

    if (rType === 'beneficio_catalogo' || isPartnerFront) {
      // Cria gratificação em benefício_grants em análise, NUNCA reward em dinheiro
      try {
        const grantsCol = $app.findCollectionByNameOrId('benefit_grants')
        const grant = new Record(grantsCol)
        grant.set('participant_id', participant.id)
        grant.set('referral_id', referral.id)
        grant.set('milestone', 'captada')
        grant.set('status', 'em_analise')
        grant.set(
          'custom_description',
          rule.getString('catalog_benefit_desc') || 'Gratificação por Captação de Parceiro',
        )
        $app.save(grant)

        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('action', 'benefit_grant_created_capture')
        audit.set('resource_type', 'benefit_grants')
        audit.set('resource_id', grant.id)
        audit.set('details', JSON.stringify({ referral_id: referral.id, status: 'em_analise' }))
        $app.save(audit)
      } catch (_) {}
      return
    }

    if (rType === 'valor_fixo') amount = rule.getFloat('fixed_amount_brl') || 0

    const hasCpfPix = !!(
      (participant.getString('pix_key') || '').trim() && (participant.getString('cpf') || '').trim()
    )
    let initialStatus = amount > 0 && !hasCpfPix ? 'pendente_dados' : 'em_analise'
    let adjustmentReason = ''
    if (isOverAnnualCap) {
      initialStatus = 'em_revisao_admin'
      adjustmentReason = 'teto anual'
    }

    const rewardsCol = $app.findCollectionByNameOrId('rewards')
    const rew = new Record(rewardsCol)
    rew.set('referral_id', referral.id)
    rew.set('milestone', 'captada')
    rew.set('beneficiary_type', 'indicador')
    rew.set('participant_id', participant.id)
    rew.set('rule_id', rule.id)
    rew.set('reward_type', rType)
    rew.set('calculated_amount_brl', amount)
    rew.set('final_amount_brl', amount)
    rew.set('via_decline', false)
    rew.set('status', initialStatus)
    if (adjustmentReason) {
      rew.set('adjustment_reason', adjustmentReason)
    }
    $app.save(rew)

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('action', 'reward_created_capture')
      audit.set('resource_type', 'rewards')
      audit.set('resource_id', rew.id)
      audit.set(
        'details',
        JSON.stringify({ referral_id: referral.id, amount, status: initialStatus }),
      )
      $app.save(audit)
    } catch (_) {}
  } catch (_) {
  } finally {
    e.next()
  }
}, 'capture_records')

onRecordAfterUpdateSuccess((e) => {
  try {
    const capRec = e.record
    if (!capRec || capRec.getString('status') !== 'aprovada') return

    const referralId = capRec.getString('referral_id')
    if (!referralId) return

    let referral = null
    try {
      referral = $app.findRecordById('referrals', referralId)
    } catch (_) {
      return
    }

    const partId = referral.getString('participant_id')
    if (!partId) return
    let participant = null
    try {
      participant = $app.findRecordById('participants', partId)
    } catch (_) {
      return
    }

    // Janela de atribuição
    let windowDays = 90
    try {
      const st = $app.findFirstRecordByData(
        'program_settings',
        'key',
        'capture_attribution_window_days',
      )
      const val = JSON.parse(st.getString('value_json'))
      if (val !== undefined && val !== null) windowDays = Number(val)
    } catch (_) {}

    const refCreatedStr = referral.getString('created')
    if (refCreatedStr) {
      const refCreated = new Date(refCreatedStr)
      const diffDays = Math.floor((Date.now() - refCreated.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > windowDays) {
        return
      }
    }

    const categoryId = participant.getString('category_id')

    // Regra C9 / C7: entidade_condominial NUNCA recebe dinheiro
    let isEntidadeCondominial = false
    try {
      const partCat = $app.findRecordById('participant_categories', categoryId)
      if (partCat.getString('slug') === 'entidade_condominial') isEntidadeCondominial = true
    } catch (_) {}
    if (isEntidadeCondominial) return

    // Teto de 8 recompensas por participante por ano civil
    let annualCap = 8
    try {
      const stCap = $app.findFirstRecordByData(
        'program_settings',
        'key',
        'annual_reward_cap_per_participant',
      )
      const capVal = JSON.parse(stCap.getString('value_json'))
      if (typeof capVal === 'number') annualCap = capVal
    } catch (_) {}

    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01 00:00:00.000Z`
    const yearEnd = `${currentYear}-12-31 23:59:59.999Z`

    let isOverAnnualCap = false
    try {
      const countedThisYear = $app.findRecordsByFilter(
        'rewards',
        `participant_id = '${participant.id}' && (status = 'paga' || status = 'aprovada' || status = 'em_lote' || status = 'em_analise' || status = 'pendente_dados') && created >= '${yearStart}' && created <= '${yearEnd}'`,
        '',
        100,
        0,
      )
      if (countedThisYear && countedThisYear.length >= annualCap) {
        isOverAnnualCap = true
      }
    } catch (_) {}

    let refType = referral.getString('referral_type')
    if (!refType || refType === 'proprietario') {
      const rawType = referral.getString('type')
      if (rawType === 'proprietario_locacao') refType = 'proprietario_locacao'
      else refType = 'proprietario_venda'
    }

    const campaignId = referral.getString('campaign_id')
    const condoId = referral.getString('condominium_id')

    let filter = `category_id = '${categoryId}' && milestone = 'captada' && beneficiary_type = 'indicador' && active = true && (referral_type = '${refType}' || referral_type = 'todos')`
    const rules = $app.findRecordsByFilter('reward_rules', filter, '-version', 50, 0)
    if (!rules || rules.length === 0) return

    const refDate = refCreatedStr ? new Date(refCreatedStr) : new Date()
    const validRules = rules.filter((r) => {
      const vf = r.getString('valid_from')
      const vt = r.getString('valid_to')
      if (vf && new Date(vf) > refDate) return false
      if (vt && new Date(vt) < refDate) return false
      const rc = r.getString('campaign_id')
      const rco = r.getString('condominium_id')
      if (rc && rc !== campaignId) return false
      if (rco && rco !== condoId) return false
      return true
    })
    if (validRules.length === 0) return

    validRules.sort((a, b) => {
      const aScope = (a.getString('campaign_id') ? 2 : 0) + (a.getString('condominium_id') ? 1 : 0)
      const bScope = (b.getString('campaign_id') ? 2 : 0) + (b.getString('condominium_id') ? 1 : 0)
      if (bScope !== aScope) return bScope - aScope
      return (b.getInt('version') || 1) - (a.getInt('version') || 1)
    })
    const rule = validRules[0]

    const exist = $app.findRecordsByFilter(
      'rewards',
      `referral_id = '${referral.id}' && milestone = 'captada' && beneficiary_type = 'indicador'`,
      '',
      1,
      0,
    )
    if (exist && exist.length > 0) return

    let amount = 0
    const rType = rule.getString('reward_type')

    let isPartnerFront = false
    try {
      const partCat = $app.findRecordById('participant_categories', categoryId)
      if (partCat.getString('front') === 'parceiros') isPartnerFront = true
    } catch (_) {}

    if (rType === 'beneficio_catalogo' || isPartnerFront) {
      try {
        const grantsCol = $app.findCollectionByNameOrId('benefit_grants')
        const grant = new Record(grantsCol)
        grant.set('participant_id', participant.id)
        grant.set('referral_id', referral.id)
        grant.set('milestone', 'captada')
        grant.set('status', 'em_analise')
        grant.set(
          'custom_description',
          rule.getString('catalog_benefit_desc') || 'Gratificação por Captação de Parceiro',
        )
        $app.save(grant)

        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('action', 'benefit_grant_created_capture')
        audit.set('resource_type', 'benefit_grants')
        audit.set('resource_id', grant.id)
        audit.set('details', JSON.stringify({ referral_id: referral.id, status: 'em_analise' }))
        $app.save(audit)
      } catch (_) {}
      return
    }

    if (rType === 'valor_fixo') amount = rule.getFloat('fixed_amount_brl') || 0

    const hasCpfPix = !!(
      (participant.getString('pix_key') || '').trim() && (participant.getString('cpf') || '').trim()
    )
    let initialStatus = amount > 0 && !hasCpfPix ? 'pendente_dados' : 'em_analise'
    let adjustmentReason = ''
    if (isOverAnnualCap) {
      initialStatus = 'em_revisao_admin'
      adjustmentReason = 'teto anual'
    }

    const rewardsCol = $app.findCollectionByNameOrId('rewards')
    const rew = new Record(rewardsCol)
    rew.set('referral_id', referral.id)
    rew.set('milestone', 'captada')
    rew.set('beneficiary_type', 'indicador')
    rew.set('participant_id', participant.id)
    rew.set('rule_id', rule.id)
    rew.set('reward_type', rType)
    rew.set('calculated_amount_brl', amount)
    rew.set('final_amount_brl', amount)
    rew.set('via_decline', false)
    rew.set('status', initialStatus)
    if (adjustmentReason) {
      rew.set('adjustment_reason', adjustmentReason)
    }
    $app.save(rew)

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('action', 'reward_created_capture')
      audit.set('resource_type', 'rewards')
      audit.set('resource_id', rew.id)
      audit.set(
        'details',
        JSON.stringify({ referral_id: referral.id, amount, status: initialStatus }),
      )
      $app.save(audit)
    } catch (_) {}
  } catch (_) {
  } finally {
    e.next()
  }
}, 'capture_records')

/**
 * Ao atualizar indicação para declinada_pela_godoy
 * Cria a mesma regra do marco captada com via_decline verdadeiro
 */
onRecordAfterUpdateSuccess((e) => {
  try {
    const referral = e.record
    if (!referral || referral.getString('status') !== 'declinada_pela_godoy') return

    const partId = referral.getString('participant_id')
    if (!partId) return

    let participant = null
    try {
      participant = $app.findRecordById('participants', partId)
    } catch (_) {
      return
    }

    // Janela de atribuição
    let windowDays = 90
    try {
      const st = $app.findFirstRecordByData(
        'program_settings',
        'key',
        'capture_attribution_window_days',
      )
      const val = JSON.parse(st.getString('value_json'))
      if (val !== undefined && val !== null) windowDays = Number(val)
    } catch (_) {}

    const refCreatedStr = referral.getString('created')
    if (refCreatedStr) {
      const refCreated = new Date(refCreatedStr)
      const diffDays = Math.floor((Date.now() - refCreated.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays > windowDays) {
        return
      }
    }

    // Teto de 8 recompensas por participante por ano civil
    let annualCap = 8
    try {
      const stCap = $app.findFirstRecordByData(
        'program_settings',
        'key',
        'annual_reward_cap_per_participant',
      )
      const capVal = JSON.parse(stCap.getString('value_json'))
      if (typeof capVal === 'number') annualCap = capVal
    } catch (_) {}

    const currentYear = new Date().getFullYear()
    const yearStart = `${currentYear}-01-01 00:00:00.000Z`
    const yearEnd = `${currentYear}-12-31 23:59:59.999Z`

    let isOverAnnualCap = false
    try {
      const countedThisYear = $app.findRecordsByFilter(
        'rewards',
        `participant_id = '${participant.id}' && (status = 'paga' || status = 'aprovada' || status = 'em_lote' || status = 'em_analise' || status = 'pendente_dados') && created >= '${yearStart}' && created <= '${yearEnd}'`,
        '',
        100,
        0,
      )
      if (countedThisYear && countedThisYear.length >= annualCap) {
        isOverAnnualCap = true
      }
    } catch (_) {}

    let refType = referral.getString('referral_type')
    if (!refType || refType === 'proprietario') {
      const rawType = referral.getString('type')
      if (rawType === 'proprietario_locacao') refType = 'proprietario_locacao'
      else refType = 'proprietario_venda'
    }

    const categoryId = participant.getString('category_id')
    const campaignId = referral.getString('campaign_id')
    const condoId = referral.getString('condominium_id')

    let filter = `category_id = '${categoryId}' && milestone = 'captada' && beneficiary_type = 'indicador' && active = true && (referral_type = '${refType}' || referral_type = 'todos')`
    const rules = $app.findRecordsByFilter('reward_rules', filter, '-version', 50, 0)
    if (!rules || rules.length === 0) return

    const refDate = refCreatedStr ? new Date(refCreatedStr) : new Date()
    const validRules = rules.filter((r) => {
      const vf = r.getString('valid_from')
      const vt = r.getString('valid_to')
      if (vf && new Date(vf) > refDate) return false
      if (vt && new Date(vt) < refDate) return false
      const rc = r.getString('campaign_id')
      const rco = r.getString('condominium_id')
      if (rc && rc !== campaignId) return false
      if (rco && rco !== condoId) return false
      return true
    })
    if (validRules.length === 0) return

    validRules.sort((a, b) => {
      const aScope = (a.getString('campaign_id') ? 2 : 0) + (a.getString('condominium_id') ? 1 : 0)
      const bScope = (b.getString('campaign_id') ? 2 : 0) + (b.getString('condominium_id') ? 1 : 0)
      if (bScope !== aScope) return bScope - aScope
      return (b.getInt('version') || 1) - (a.getInt('version') || 1)
    })
    const rule = validRules[0]

    const exist = $app.findRecordsByFilter(
      'rewards',
      `referral_id = '${referral.id}' && milestone = 'captada' && beneficiary_type = 'indicador'`,
      '',
      1,
      0,
    )
    if (exist && exist.length > 0) return

    let amount = 0
    const rType = rule.getString('reward_type')

    let isPartnerFront = false
    try {
      const partCat = $app.findRecordById('participant_categories', categoryId)
      if (partCat.getString('front') === 'parceiros') isPartnerFront = true
    } catch (_) {}

    if (rType === 'beneficio_catalogo' || isPartnerFront) {
      try {
        const grantsCol = $app.findCollectionByNameOrId('benefit_grants')
        const grant = new Record(grantsCol)
        grant.set('participant_id', participant.id)
        grant.set('referral_id', referral.id)
        grant.set('milestone', 'declinada_pela_godoy')
        grant.set('status', 'em_analise')
        grant.set(
          'custom_description',
          rule.getString('catalog_benefit_desc') || 'Gratificação de Reconhecimento pela Indicação',
        )
        $app.save(grant)

        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('action', 'benefit_grant_created_decline')
        audit.set('resource_type', 'benefit_grants')
        audit.set('resource_id', grant.id)
        audit.set(
          'details',
          JSON.stringify({ referral_id: referral.id, status: 'em_analise', via_decline: true }),
        )
        $app.save(audit)
      } catch (_) {}
      return
    }

    if (rType === 'valor_fixo') amount = rule.getFloat('fixed_amount_brl') || 0

    const hasCpfPix = !!(
      (participant.getString('pix_key') || '').trim() && (participant.getString('cpf') || '').trim()
    )
    let initialStatus = amount > 0 && !hasCpfPix ? 'pendente_dados' : 'em_analise'
    let adjustmentReason = ''
    if (isOverAnnualCap) {
      initialStatus = 'em_revisao_admin'
      adjustmentReason = 'teto anual'
    }

    const rewardsCol = $app.findCollectionByNameOrId('rewards')
    const rew = new Record(rewardsCol)
    rew.set('referral_id', referral.id)
    rew.set('milestone', 'captada')
    rew.set('beneficiary_type', 'indicador')
    rew.set('participant_id', participant.id)
    rew.set('rule_id', rule.id)
    rew.set('reward_type', rType)
    rew.set('calculated_amount_brl', amount)
    rew.set('final_amount_brl', amount)
    rew.set('via_decline', true)
    rew.set('status', initialStatus)
    if (adjustmentReason) {
      rew.set('adjustment_reason', adjustmentReason)
    }
    $app.save(rew)

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('action', 'reward_created_decline')
      audit.set('resource_type', 'rewards')
      audit.set('resource_id', rew.id)
      audit.set('details', JSON.stringify({ referral_id: referral.id, amount, via_decline: true }))
      $app.save(audit)
    } catch (_) {}
  } catch (_) {
  } finally {
    e.next()
  }
}, 'referrals')

/**
 * Ao criar negócio (deals), cria regras de fechamento
 */
onRecordAfterCreateSuccess((e) => {
  // modelo v3: sem recompensa no fechamento
  e.next()
}, 'deals')

/**
 * POST /backend/v1/rewards/register-commission-received
 */
routerAdd('POST', '/backend/v1/rewards/register-commission-received', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isAuthorized = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      10,
      0,
    )
    const roleNames = rolesRecords.map((r) => r.getString('role'))
    isAuthorized = roleNames.includes('admin') || roleNames.includes('financeiro')
  } catch (_) {}

  if (!isAuthorized) {
    return e.json(403, {
      message: 'Apenas usuários com papel admin ou financeiro podem registrar comissão recebida.',
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const dealId = (body.deal_id || '').trim()
  const commissionReceivedAt = (body.data || body.commission_received_at || '').trim()
  const valorRecebido = Number(body.valor_recebido || body.commission_received_brl || 0)

  if (!dealId || valorRecebido <= 0 || !commissionReceivedAt) {
    return e.json(400, {
      message: 'deal_id, data e valor_recebido (> 0) são obrigatórios.',
    })
  }

  let deal = null
  try {
    deal = $app.findRecordById('deals', dealId)
  } catch (_) {
    return e.json(404, { message: 'Negócio não encontrado.' })
  }

  deal.set('commission_received_at', commissionReceivedAt)
  deal.set('commission_received_brl', valorRecebido)
  $app.save(deal)

  // Busca recompensas do negócio
  const dealRewards = $app.findRecordsByFilter(
    'rewards',
    `deal_id = '${deal.id}' && milestone = 'fechamento'`,
    'created',
    50,
    0,
  )

  // Checagem de indicador laranja ou mesmo indicador
  let orangeCheck = null
  const ownerRefId = deal.getString('owner_referral_id')
  const buyerRefId = deal.getString('buyer_referral_id')

  if (ownerRefId && buyerRefId) {
    try {
      const ownerRef = $app.findRecordById('referrals', ownerRefId)
      const buyerRef = $app.findRecordById('referrals', buyerRefId)
      const p1Id = ownerRef.getString('participant_id')
      const p2Id = buyerRef.getString('participant_id')

      if (p1Id && p2Id && p1Id === p2Id) {
        orangeCheck = {
          same_indicator: true,
          reason: 'Mesmo indicador trouxe os dois lados do negócio.',
        }
      } else if (p1Id && p2Id) {
        const part1 = $app.findRecordById('participants', p1Id)
        const part2 = $app.findRecordById('participants', p2Id)
        const user1 = $app.findRecordById('users', part1.getString('user_id'))
        const user2 = $app.findRecordById('users', part2.getString('user_id'))

        function norm(s) {
          return s
            ? String(s)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
            : ''
        }

        const matches = []
        if (
          norm(part1.getString('cpf')) &&
          norm(part1.getString('cpf')) === norm(part2.getString('cpf'))
        )
          matches.push('CPF')
        if (
          norm(part1.getString('pix_key')) &&
          norm(part1.getString('pix_key')) === norm(part2.getString('pix_key'))
        )
          matches.push('Chave Pix')
        if (
          norm(user1.getString('phone')) &&
          norm(user1.getString('phone')) === norm(user2.getString('phone'))
        )
          matches.push('Telefone')
        if (
          norm(user1.getString('email')) &&
          norm(user1.getString('email')) === norm(user2.getString('email'))
        )
          matches.push('E-mail')
        if (
          norm(part1.getString('address')) &&
          norm(part1.getString('address')) === norm(part2.getString('address'))
        )
          matches.push('Endereço')
        if (
          norm(part1.getString('condominium_name')) &&
          norm(part1.getString('condominium_name')) === norm(part2.getString('condominium_name'))
        )
          matches.push('Condomínio')

        if (matches.length > 0) {
          orangeCheck = {
            same_indicator: false,
            reason: `Alerta de Indicador Laranja — Coincidência em: ${matches.join(', ')}`,
          }
        }
      }
    } catch (_) {}
  }

  const indicatorRewards = dealRewards.filter(
    (r) => r.getString('beneficiary_type') === 'indicador',
  )
  const isSameIndicator =
    orangeCheck && orangeCheck.same_indicator
      ? true
      : indicatorRewards.length === 2 &&
        indicatorRewards[0].getString('participant_id') ===
          indicatorRewards[1].getString('participant_id')

  if (isSameIndicator && indicatorRewards.length >= 2) {
    let bestRew = indicatorRewards[0]
    let otherRew = indicatorRewards[1]
    const calc0 = bestRew.getFloat('calculated_amount_brl') || 0
    const calc1 = otherRew.getFloat('calculated_amount_brl') || 0
    if (calc1 > calc0) {
      bestRew = indicatorRewards[1]
      otherRew = indicatorRewards[0]
    }

    otherRew.set('status', 'cancelada')
    otherRew.set('adjusted_amount_brl', 0)
    otherRew.set('final_amount_brl', 0)
    otherRew.set(
      'adjustment_reason',
      'Mesmo indicador nos dois lados: cancelada pela regra de indicador único (prevaleceu a maior recompensa).',
    )
    $app.save(otherRew)

    const cap10 = valorRecebido * 0.1
    let finalVal = Math.max(calc0, calc1)
    let reason = 'Mesmo indicador nos dois lados (maior recompensa selecionada).'
    if (finalVal > cap10) {
      finalVal = cap10
      reason += ` Limitada ao teto de 10% da comissão recebida (R$ ${cap10.toFixed(2)}).`
    }
    bestRew.set('adjusted_amount_brl', finalVal)
    bestRew.set('final_amount_brl', finalVal)
    bestRew.set('adjustment_reason', reason)

    let part = null
    try {
      part = $app.findRecordById('participants', bestRew.getString('participant_id'))
    } catch (_) {}
    const hasCpfPix =
      part && !!((part.getString('pix_key') || '').trim() && (part.getString('cpf') || '').trim())
    bestRew.set('status', finalVal > 0 && !hasCpfPix ? 'pendente_dados' : 'em_analise')
    $app.save(bestRew)
  } else {
    const capPerSide = valorRecebido * 0.1

    for (let i = 0; i < dealRewards.length; i++) {
      const rew = dealRewards[i]
      if (rew.getString('status') === 'cancelada') continue

      const calcAmount = rew.getFloat('calculated_amount_brl') || 0
      let finalAmount = calcAmount
      const reasons = []

      if (rew.getString('beneficiary_type') === 'indicador') {
        if (finalAmount > capPerSide) {
          finalAmount = capPerSide
          reasons.push(
            `Ajustado pelo teto de 10% da comissão recebida (de R$ ${calcAmount.toFixed(2)} para R$ ${capPerSide.toFixed(2)}).`,
          )
        }
      }

      rew.set('adjusted_amount_brl', finalAmount)
      rew.set('final_amount_brl', finalAmount)
      if (reasons.length > 0) {
        rew.set('adjustment_reason', reasons.join(' '))
      }

      if (orangeCheck && !orangeCheck.same_indicator) {
        rew.set('status', 'em_revisao_admin')
        rew.set('orange_flag_reason', orangeCheck.reason)
      } else {
        let part = null
        try {
          part = $app.findRecordById('participants', rew.getString('participant_id'))
        } catch (_) {}
        const hasCpfPix =
          part &&
          !!((part.getString('pix_key') || '').trim() && (part.getString('cpf') || '').trim())
        rew.set('status', finalAmount > 0 && !hasCpfPix ? 'pendente_dados' : 'em_analise')
      }

      $app.save(rew)
    }
  }

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'commission_received_registered')
    audit.set('resource_type', 'deals')
    audit.set('resource_id', deal.id)
    audit.set(
      'details',
      JSON.stringify({
        valorRecebido,
        commissionReceivedAt,
        orange_flag: orangeCheck ? orangeCheck.reason : null,
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Comissão recebida registrada e recompensas atualizadas.',
    orange_flag: orangeCheck ? orangeCheck.reason : null,
    is_same_indicator: isSameIndicator,
  })
})

/**
 * POST /backend/v1/rewards/cancel-deal
 */
routerAdd('POST', '/backend/v1/rewards/cancel-deal', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isAdmin = false
  try {
    const check = $app.findFirstRecordByFilter(
      'user_roles',
      `user_id = '${authRecord.id}' && role = 'admin'`,
    )
    isAdmin = !!check
  } catch (_) {}
  if (!isAdmin) return e.json(403, { message: 'Apenas administradores podem cancelar negócios.' })

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const dealId = (body.deal_id || '').trim()
  const motivo = (body.motivo || '').trim()

  if (!dealId || !motivo) return e.json(400, { message: 'deal_id e motivo são obrigatórios.' })

  let deal = null
  try {
    deal = $app.findRecordById('deals', dealId)
  } catch (_) {
    return e.json(404, { message: 'Negócio não encontrado.' })
  }

  deal.set('cancelled_at', new Date().toISOString())
  deal.set('cancel_reason', motivo)
  $app.save(deal)

  const dealRewards = $app.findRecordsByFilter(
    'rewards',
    `deal_id = '${deal.id}' && status != 'paga'`,
    '',
    50,
    0,
  )
  for (let i = 0; i < dealRewards.length; i++) {
    const rew = dealRewards[i]
    rew.set('status', 'cancelada')
    rew.set('adjustment_reason', `Negócio cancelado pelo administrador. Motivo: ${motivo}`)
    $app.save(rew)
  }

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'deal_cancelled')
    audit.set('resource_type', 'deals')
    audit.set('resource_id', deal.id)
    audit.set('details', JSON.stringify({ motivo, rewards_cancelled: dealRewards.length }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Negócio cancelado e recompensas não pagas canceladas.',
  })
})

/**
 * POST /backend/v1/rewards/resolve-related-indicators
 */
routerAdd('POST', '/backend/v1/rewards/resolve-related-indicators', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isAdmin = false
  try {
    const check = $app.findFirstRecordByFilter(
      'user_roles',
      `user_id = '${authRecord.id}' && role = 'admin'`,
    )
    isAdmin = !!check
  } catch (_) {}
  if (!isAdmin)
    return e.json(403, { message: 'Apenas administradores podem resolver indicador laranja.' })

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const dealId = (body.deal_id || '').trim()
  const decisao = (body.decisao || '').trim()
  const motivo = (body.motivo || '').trim()

  if (!dealId || !decisao || !motivo)
    return e.json(400, { message: 'deal_id, decisao e motivo são obrigatórios.' })

  const rewards = $app.findRecordsByFilter(
    'rewards',
    `deal_id = '${dealId}' && status = 'em_revisao_admin'`,
    '',
    10,
    0,
  )
  if (rewards.length === 0) {
    return e.json(400, {
      message: 'Nenhuma recompensa em revisão admin encontrada para este negócio.',
    })
  }

  const nowIso = new Date().toISOString()

  if (decisao === 'confirmar_independencia') {
    for (let i = 0; i < rewards.length; i++) {
      const rew = rewards[i]
      rew.set('orange_flag_resolved_at', nowIso)
      rew.set('orange_flag_resolved_by', authRecord.id)
      rew.set('adjustment_reason', `Independência confirmada pelo admin: ${motivo}`)

      let part = null
      try {
        part = $app.findRecordById('participants', rew.getString('participant_id'))
      } catch (_) {}
      const hasCpfPix =
        part && !!((part.getString('pix_key') || '').trim() && (part.getString('cpf') || '').trim())
      rew.set(
        'status',
        rew.getFloat('final_amount_brl') > 0 && !hasCpfPix ? 'pendente_dados' : 'em_analise',
      )
      $app.save(rew)
    }
  } else if (decisao === 'aplicar_indicador_unico') {
    let bestRew = rewards[0]
    let otherRew = rewards[1]
    if (
      rewards.length > 1 &&
      (otherRew.getFloat('final_amount_brl') || 0) > (bestRew.getFloat('final_amount_brl') || 0)
    ) {
      bestRew = rewards[1]
      otherRew = rewards[0]
    }

    if (otherRew) {
      otherRew.set('status', 'cancelada')
      otherRew.set('adjusted_amount_brl', 0)
      otherRew.set('final_amount_brl', 0)
      otherRew.set(
        'adjustment_reason',
        `Alerta laranja resolvido: regra de indicador único aplicada (${motivo}).`,
      )
      otherRew.set('orange_flag_resolved_at', nowIso)
      otherRew.set('orange_flag_resolved_by', authRecord.id)
      $app.save(otherRew)
    }

    bestRew.set('orange_flag_resolved_at', nowIso)
    bestRew.set('orange_flag_resolved_by', authRecord.id)
    bestRew.set(
      'adjustment_reason',
      `Alerta laranja resolvido como indicador único pelo admin: ${motivo}`,
    )

    let part = null
    try {
      part = $app.findRecordById('participants', bestRew.getString('participant_id'))
    } catch (_) {}
    const hasCpfPix =
      part && !!((part.getString('pix_key') || '').trim() && (part.getString('cpf') || '').trim())
    bestRew.set(
      'status',
      bestRew.getFloat('final_amount_brl') > 0 && !hasCpfPix ? 'pendente_dados' : 'em_analise',
    )
    $app.save(bestRew)
  } else {
    return e.json(400, {
      message: "Decisão inválida. Use 'confirmar_independencia' ou 'aplicar_indicador_unico'.",
    })
  }

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'orange_flag_resolved')
    audit.set('resource_type', 'deals')
    audit.set('resource_id', dealId)
    audit.set('details', JSON.stringify({ decisao, motivo }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Alerta de indicador laranja resolvido com sucesso.',
  })
})

/**
 * POST /backend/v1/rewards/approve-reward
 */
routerAdd('POST', '/backend/v1/rewards/approve-reward', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isAuthorized = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      10,
      0,
    )
    const roleNames = rolesRecords.map((r) => r.getString('role'))
    isAuthorized = roleNames.includes('admin') || roleNames.includes('financeiro')
  } catch (_) {}

  if (!isAuthorized) {
    return e.json(403, {
      message: 'Apenas administradores ou financeiro podem aprovar recompensas.',
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const rewardId = (body.reward_id || '').trim()
  const justificativa = (body.justificativa || '').trim()

  if (!rewardId) return e.json(400, { message: 'reward_id é obrigatório.' })
  if (!justificativa) return e.json(400, { message: 'Justificativa de aprovação é obrigatória.' })

  let rew = null
  try {
    rew = $app.findRecordById('rewards', rewardId)
  } catch (_) {
    return e.json(404, { message: 'Recompensa não encontrada.' })
  }

  const curStatus = rew.getString('status')
  if (curStatus !== 'em_analise') {
    return e.json(400, {
      message: `Apenas recompensas em 'em_analise' podem ser aprovadas. Status atual: '${curStatus}'.`,
    })
  }

  // Checa regra liberada para uso (released_for_use)
  const ruleId = rew.getString('rule_id')
  let rule = null
  try {
    rule = $app.findRecordById('reward_rules', ruleId)
  } catch (_) {
    return e.json(404, { message: 'Regra vinculada não encontrada.' })
  }

  if (!rule.getBool('released_for_use')) {
    return e.json(400, {
      message:
        'Não é possível aprovar recompensa vinculada a regra NÃO liberada para uso (released_for_use = false).',
    })
  }

  // Conferir o teto anual de novo antes de aprovar
  const partId = rew.getString('participant_id')
  if (partId) {
    let annualCap = 8
    try {
      const stCap = $app.findFirstRecordByData(
        'program_settings',
        'key',
        'annual_reward_cap_per_participant',
      )
      const capVal = JSON.parse(stCap.getString('value_json'))
      if (typeof capVal === 'number') annualCap = capVal
    } catch (_) {}

    const curYear = new Date().getFullYear()
    const yearStart = `${curYear}-01-01 00:00:00.000Z`
    const yearEnd = `${curYear}-12-31 23:59:59.999Z`

    try {
      // Contar outras recompensas pagas, aprovadas ou em lote no mesmo ano civil
      const approvedOrPaidThisYear = $app.findRecordsByFilter(
        'rewards',
        `participant_id = '${partId}' && id != '${rew.id}' && (status = 'paga' || status = 'aprovada' || status = 'em_lote') && created >= '${yearStart}' && created <= '${yearEnd}'`,
        '',
        100,
        0,
      )
      if (approvedOrPaidThisYear && approvedOrPaidThisYear.length >= annualCap) {
        return e.json(400, {
          message: `Aprovação bloqueada: participante já atingiu o teto anual de ${annualCap} recompensas aprovadas/pagas no ano civil.`,
        })
      }
    } catch (_) {}
  }

  rew.set('status', 'aprovada')
  rew.set('approved_at', new Date().toISOString())
  rew.set('approved_by', authRecord.id)
  rew.set('approval_justification', justificativa)
  $app.save(rew)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'reward_approved')
    audit.set('resource_type', 'rewards')
    audit.set('resource_id', rew.id)
    audit.set('details', JSON.stringify({ justificativa, rule_id: rule.id }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Recompensa aprovada com sucesso!',
    reward_id: rew.id,
  })
})

/**
 * POST /backend/v1/rewards/register-payment
 */
routerAdd('POST', '/backend/v1/rewards/register-payment', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isAuthorized = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      10,
      0,
    )
    const roleNames = rolesRecords.map((r) => r.getString('role'))
    isAuthorized = roleNames.includes('admin') || roleNames.includes('financeiro')
  } catch (_) {}

  if (!isAuthorized) {
    return e.json(403, {
      message: 'Apenas administradores ou financeiro podem registrar pagamentos.',
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const rewardId = (body.reward_id || '').trim()
  const paymentMethod = (body.payment_method || '').trim()
  const paidAt = (body.paid_at || '').trim()
  const paymentReference = (body.payment_reference || '').trim()
  const paymentNotes = (body.payment_notes || '').trim()

  if (!rewardId || !paymentMethod || !paidAt) {
    return e.json(400, { message: 'reward_id, payment_method e paid_at são obrigatórios.' })
  }

  const validMethods = [
    'pix',
    'transferencia',
    'cartao_premiacao',
    'cartao_presente',
    'benfeitoria',
    'desconto_comissao',
  ]
  if (!validMethods.includes(paymentMethod)) {
    return e.json(400, { message: `Método de pagamento '${paymentMethod}' inválido.` })
  }

  let rew = null
  try {
    rew = $app.findRecordById('rewards', rewardId)
  } catch (_) {
    return e.json(404, { message: 'Recompensa não encontrada.' })
  }

  const uploadedFiles = e.findUploadedFiles('payment_proof_file')
  if ((!uploadedFiles || uploadedFiles.length === 0) && !rew.getString('payment_proof_file')) {
    return e.json(400, {
      message: 'Comprovante de pagamento é obrigatório para registrar pagamento.',
    })
  }

  rew.set('status', 'paga')
  rew.set('payment_method', paymentMethod)
  rew.set('paid_at', paidAt)
  if (paymentReference) rew.set('payment_reference', paymentReference)
  if (paymentNotes) rew.set('payment_notes', paymentNotes)
  rew.set('registered_payment_by', authRecord.id)

  if (uploadedFiles && uploadedFiles.length > 0) {
    rew.set('payment_proof_file', uploadedFiles[0])
  }

  $app.save(rew)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'reward_payment_registered')
    audit.set('resource_type', 'rewards')
    audit.set('resource_id', rew.id)
    audit.set('details', JSON.stringify({ payment_method: paymentMethod, paid_at: paidAt }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Pagamento registrado com sucesso!',
    reward_id: rew.id,
  })
})

/**
 * POST /backend/v1/rewards/build-payment-batch
 */
routerAdd('POST', '/backend/v1/rewards/build-payment-batch', (e) => {
  const authRecord = e.auth
  const isUserAuthorized =
    authRecord && (authRecord.getBool('is_admin') || authRecord.getBool('is_financeiro'))

  const reqSecret =
    e.request.header.get('X-Internal-Secret') || e.request.header.get('x-internal-secret')
  const envSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')
  const isSecretMatch = envSecret && reqSecret && reqSecret === envSecret

  if (!isUserAuthorized && !isSecretMatch) {
    return e.json(401, {
      message:
        'Não autorizado. Usuário logado com perfil de administrador/financeiro ou cabeçalho interno X-Internal-Secret é obrigatório.',
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const now = new Date()
  const rawMonthRef = (body.month_ref || '').trim()
  const monthRef =
    rawMonthRef || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  if (!/^\d{4}-\d{2}$/.test(monthRef)) {
    return e.json(400, {
      message: 'Formato inválido para month_ref. Esperado AAAA-MM (ex: 2025-03).',
    })
  }

  let reckoningDay = 10
  let dueDay = 25
  try {
    const s1 = $app.findFirstRecordByData('program_settings', 'key', 'monthly_reckoning_day')
    const v1 = JSON.parse(s1.getString('value_json'))
    if (v1) reckoningDay = Number(v1)
  } catch (_) {}
  try {
    const s2 = $app.findFirstRecordByData('program_settings', 'key', 'batch_payment_due_day')
    const v2 = JSON.parse(s2.getString('value_json'))
    if (v2) dueDay = Number(v2)
  } catch (_) {}

  const batchesCol = $app.findCollectionByNameOrId('payment_batches')
  let batch = null
  const existBatches = $app.findRecordsByFilter(
    'payment_batches',
    'month_ref = {:month}',
    '',
    1,
    0,
    { month: monthRef },
  )

  const reckoningDate = `${monthRef}-${String(reckoningDay).padStart(2, '0')} 00:00:00.000Z`
  const dueDate = `${monthRef}-${String(dueDay).padStart(2, '0')} 00:00:00.000Z`

  if (existBatches && existBatches.length > 0) {
    batch = existBatches[0]
    if (batch.getString('status') === 'fechado') {
      return e.json(400, {
        message: `O lote de ${monthRef} já está fechado e não pode ser alterado.`,
      })
    }
  } else {
    batch = new Record(batchesCol)
    batch.set('month_ref', monthRef)
    batch.set('status', 'aberto')
    batch.set('reckoning_date', reckoningDate)
    batch.set('due_date', dueDate)
    batch.set('total_amount_brl', 0)
    batch.set('item_count', 0)
    $app.save(batch)
  }

  const approvedRewards = $app.findRecordsByFilter(
    'rewards',
    `status = 'aprovada' && batch_id = ''`,
    'approved_at',
    500,
    0,
  )
  let addedCount = 0
  let totalBrl = batch.getFloat('total_amount_brl') || 0
  let currentItems = batch.getInt('item_count') || 0

  for (let i = 0; i < approvedRewards.length; i++) {
    const rew = approvedRewards[i]
    rew.set('batch_id', batch.id)
    rew.set('status', 'em_lote')
    $app.save(rew)
    addedCount++
    currentItems++
    totalBrl += rew.getFloat('final_amount_brl') || 0
  }

  batch.set('item_count', currentItems)
  batch.set('total_amount_brl', totalBrl)
  $app.save(batch)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord ? authRecord.id : '')
    audit.set('actor_email', authRecord ? authRecord.getString('email') : 'cron')
    audit.set('action', 'payment_batch_built')
    audit.set('resource_type', 'payment_batches')
    audit.set('resource_id', batch.id)
    audit.set(
      'details',
      JSON.stringify({ month_ref: monthRef, added_rewards: addedCount, total_brl: totalBrl }),
    )
    audit.set('ip_address', e.request ? e.request.remoteAddr : '')
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: `Lote de ${monthRef} atualizado com sucesso. ${addedCount} recompensas adicionadas.`,
    batch_id: batch.id,
    month_ref: monthRef,
    item_count: currentItems,
    total_amount_brl: totalBrl,
  })
})

/**
 * POST /backend/v1/rewards/close-batch
 */
routerAdd('POST', '/backend/v1/rewards/close-batch', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isAuthorized = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      10,
      0,
    )
    const roleNames = rolesRecords.map((r) => r.getString('role'))
    isAuthorized = roleNames.includes('admin') || roleNames.includes('financeiro')
  } catch (_) {}

  if (!isAuthorized) {
    return e.json(403, { message: 'Apenas admin ou financeiro podem fechar lotes de pagamento.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const batchId = (body.batch_id || '').trim()

  if (!batchId) return e.json(400, { message: 'batch_id é obrigatório.' })

  let batch = null
  try {
    batch = $app.findRecordById('payment_batches', batchId)
  } catch (_) {
    return e.json(404, { message: 'Lote não encontrado.' })
  }

  const items = $app.findRecordsByFilter('rewards', 'batch_id = {:bid}', '', 500, 0, {
    bid: batch.id,
  })
  if (items.length === 0) {
    return e.json(400, { message: 'O lote não possui itens para fechamento.' })
  }

  const unverified = items.filter(
    (r) => r.getString('status') !== 'paga' || !r.getString('payment_proof_file'),
  )

  if (unverified.length > 0) {
    return e.json(400, {
      message: `O lote não pode ser fechado pois existem ${unverified.length} item(ns) sem pagamento registrado ou sem comprovante anexado.`,
    })
  }

  batch.set('status', 'fechado')
  batch.set('closed_at', new Date().toISOString())
  batch.set('closed_by', authRecord.id)
  $app.save(batch)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'payment_batch_closed')
    audit.set('resource_type', 'payment_batches')
    audit.set('resource_id', batch.id)
    audit.set(
      'details',
      JSON.stringify({ month_ref: batch.getString('month_ref'), item_count: items.length }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Lote de pagamento fechado com sucesso!',
    batch_id: batch.id,
  })
})

/**
 * Cron diário para apuração mensal
 */
cronAdd('build_monthly_payment_batch', '0 6 * * *', () => {
  try {
    let reckoningDay = 10
    let dueDay = 25
    try {
      const s1 = $app.findFirstRecordByData('program_settings', 'key', 'monthly_reckoning_day')
      const v1 = JSON.parse(s1.getString('value_json'))
      if (v1) reckoningDay = Number(v1)
    } catch (_) {}
    try {
      const s2 = $app.findFirstRecordByData('program_settings', 'key', 'batch_payment_due_day')
      const v2 = JSON.parse(s2.getString('value_json'))
      if (v2) dueDay = Number(v2)
    } catch (_) {}

    const today = new Date().getDate()
    if (today === Number(reckoningDay)) {
      const now = new Date()
      const monthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      const batchesCol = $app.findCollectionByNameOrId('payment_batches')
      let batch = null
      const existBatches = $app.findRecordsByFilter(
        'payment_batches',
        `month_ref = '${monthRef}'`,
        '',
        1,
        0,
      )

      const reckoningDate = `${monthRef}-${String(reckoningDay).padStart(2, '0')} 00:00:00.000Z`
      const dueDate = `${monthRef}-${String(dueDay).padStart(2, '0')} 00:00:00.000Z`

      if (existBatches && existBatches.length > 0) {
        batch = existBatches[0]
      } else {
        batch = new Record(batchesCol)
        batch.set('month_ref', monthRef)
        batch.set('status', 'aberto')
        batch.set('reckoning_date', reckoningDate)
        batch.set('due_date', dueDate)
        batch.set('total_amount_brl', 0)
        batch.set('item_count', 0)
        $app.save(batch)
      }

      if (
        batch.getString('status') === 'aberto' ||
        batch.getString('status') === 'em_conferencia'
      ) {
        const approvedRewards = $app.findRecordsByFilter(
          'rewards',
          `status = 'aprovada' && batch_id = ''`,
          'approved_at',
          500,
          0,
        )
        let addedCount = 0
        let totalBrl = batch.getFloat('total_amount_brl') || 0
        let currentItems = batch.getInt('item_count') || 0

        for (let i = 0; i < approvedRewards.length; i++) {
          const rew = approvedRewards[i]
          rew.set('batch_id', batch.id)
          rew.set('status', 'em_lote')
          $app.save(rew)
          addedCount++
          currentItems++
          totalBrl += rew.getFloat('final_amount_brl') || 0
        }

        batch.set('item_count', currentItems)
        batch.set('total_amount_brl', totalBrl)
        $app.save(batch)
      }
    }
  } catch (err) {
    console.error('[cron:build_monthly_payment_batch] Erro:', err)
  }
})
