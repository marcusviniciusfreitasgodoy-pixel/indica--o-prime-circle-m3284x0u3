// pocketbase/hooks/partners_levels_benefits.pb.js
// Implementa as rotas e regras de negócio para Parceiros, Níveis, Benefícios e Reciprocidade:
// 1. POST /backend/v1/partners/compute-participant-level (e recomputação interna)
// 2. cronAdd 'recompute_levels' todo dia às 6h de Brasília (09:00 UTC)
// 3. POST /backend/v1/benefits/grant-benefit (admin/financeiro)
// 4. POST /backend/v1/benefits/register-delivery (admin/financeiro)
// 5. POST /backend/v1/partners/register-reciprocal-referral (equipe interna)
// 6. GET /backend/v1/participant/partnership-summary (participante lê suas métricas de parceria sem dados de clientes)
// 7. GET /backend/v1/participant/level-info (nível, progresso, histórico e gratificações)
// 8. GET /backend/v1/participant/entity-summary (números agregados da entidade condominial, sem dados de moradores)

/**
 * Helper interno: Calcula nível do parceiro nos últimos 12 meses
 * Critérios da Seção 2.3:
 * Nível 1: Parceiro (ordem 1) - base inicial
 * Nível 2: Parceiro Prime (ordem 2) - >= 3 indicações qualificadas (captadas/concluídas) ou >= 1 negócio fechado nos últimos 12m
 * Nível 3: Parceiro Signature (ordem 3) - >= 8 indicações qualificadas ou >= 3 negócios fechados ou VGV >= R$ 3.000.000 nos últimos 12m
 */
function evaluatePartnerLevel(appInstance, participantId, forceNotify) {
  const part = appInstance.findRecordById('participants', participantId)
  if (!part) return null

  // Verifica se a categoria pertence à frente 'parceiros'
  let isPartner = false
  try {
    const cat = appInstance.findRecordById('participant_categories', part.getString('category_id'))
    if (cat && cat.getString('front') === 'parceiros') isPartner = true
  } catch (_) {}

  if (!isPartner) return null

  // Janela dos últimos 12 meses
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()

  // Busca indicações do participante nos últimos 12 meses
  const refs = appInstance.findRecordsByFilter(
    'referrals',
    `participant_id = '${participantId}' && created >= '${twelveMonthsAgo}'`,
    '-created',
    500,
    0,
  )

  let qualCount = 0
  let dealsCount = 0
  let vgvTotal = 0

  const qualifiedStatuses = [
    'captada',
    'em_divulgacao',
    'vendida',
    'alugada',
    'comprou',
    'alugou',
    'declinada_pela_godoy',
  ]
  const closedStatuses = ['vendida', 'alugada', 'comprou', 'alugou']

  for (let i = 0; i < refs.length; i++) {
    const r = refs[i]
    const st = r.getString('status')
    if (qualifiedStatuses.includes(st)) {
      qualCount++
    }
    if (closedStatuses.includes(st)) {
      dealsCount++
      const dealVal = r.getFloat('deal_value_brl') || 0
      vgvTotal += dealVal
    }
  }

  // Busca todos os níveis de parceiros ordenados por order asc
  const allLevels = appInstance.findRecordsByFilter('program_levels', '', 'order', 10, 0)
  if (allLevels.length === 0) return null

  let lvl1 = allLevels[0]
  let lvl2 = allLevels.length > 1 ? allLevels[1] : allLevels[0]
  let lvl3 = allLevels.length > 2 ? allLevels[2] : lvl2

  // Níveis específicos pelo slug
  for (let i = 0; i < allLevels.length; i++) {
    const s = allLevels[i].getString('slug')
    if (s === 'parceiro') lvl1 = allLevels[i]
    else if (s === 'parceiro_prime') lvl2 = allLevels[i]
    else if (s === 'parceiro_signature') lvl3 = allLevels[i]
  }

  let determinedLevel = lvl1
  let reason = 'Critério base de entrada de parceiro cadastrado'

  // Checa Nível 3 (Signature)
  if (qualCount >= 8 || dealsCount >= 3 || vgvTotal >= 3000000) {
    determinedLevel = lvl3
    reason = `Critério Signature atingido nos últimos 12m (${qualCount} captações qualificadas, ${dealsCount} fechamentos, VGV R$ ${vgvTotal.toLocaleString('pt-BR')})`
  } else if (qualCount >= 3 || dealsCount >= 1) {
    determinedLevel = lvl2
    reason = `Critério Prime atingido nos últimos 12m (${qualCount} captações qualificadas, ${dealsCount} fechamentos)`
  }

  const currentLevelId = part.getString('level_id')
  const isChanged = currentLevelId !== determinedLevel.id

  if (isChanged || forceNotify) {
    const oldLevelId = currentLevelId
    part.set('level_id', determinedLevel.id)
    appInstance.save(part)

    // Grava histórico de nível
    try {
      const histCol = appInstance.findCollectionByNameOrId('participant_level_history')
      const hist = new Record(histCol)
      hist.set('participant_id', part.id)
      if (oldLevelId) hist.set('previous_level_id', oldLevelId)
      hist.set('new_level_id', determinedLevel.id)
      hist.set('changed_at', now.toISOString())
      hist.set('reason', reason)
      hist.set('qualifying_referrals_count', qualCount)
      hist.set('deals_count', dealsCount)
      hist.set('vgv_total_brl', vgvTotal)
      appInstance.save(hist)
    } catch (err) {
      console.error('[evaluatePartnerLevel] Erro ao salvar histórico:', err)
    }

    // Grava audit log
    try {
      const auditCol = appInstance.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      audit.set('action', 'participant_level_changed')
      audit.set('resource_type', 'participants')
      audit.set('resource_id', part.id)
      audit.set(
        'details',
        JSON.stringify({
          previous_level_id: oldLevelId,
          new_level_id: determinedLevel.id,
          new_level_name: determinedLevel.getString('name'),
          reason,
        }),
      )
      appInstance.save(audit)
    } catch (_) {}

    // Notificação: WhatsApp e E-mail de mudança de nível (registrado em notification_logs)
    try {
      const user = appInstance.findRecordById('users', part.getString('user_id'))
      const internalSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')

      $http.send({
        url: 'http://127.0.0.1:8090/backend/v1/communication/notify-event',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret || '',
        },
        data: JSON.stringify({
          event_code: 'parceiro_mudou_nivel',
          participant_id: part.id,
          entity_id: part.id,
          params: {
            nome: user.getString('name') || 'Parceiro',
            novo_nivel: determinedLevel.getString('name'),
            percentual: determinedLevel.getFloat('reward_percentage') || 10,
            recipient_email: user.getString('email'),
            recipient_phone: user.getString('phone'),
            link: 'https://indicacao.godoyprime.com.br/painel/nivel',
          },
        }),
        timeout: 5,
      })
    } catch (notifErr) {
      console.error('[evaluatePartnerLevel] Erro ao disparar notificação:', notifErr)
    }
  }

  return {
    participant_id: part.id,
    previous_level_id: currentLevelId,
    new_level_id: determinedLevel.id,
    new_level_name: determinedLevel.getString('name'),
    changed: isChanged,
    reason,
    stats: {
      qualifying_referrals: qualCount,
      deals_count: dealsCount,
      vgv_total_brl: vgvTotal,
    },
  }
}

/**
 * 1. POST /backend/v1/partners/compute-participant-level
 * Rota para acionar manualmente ou via rotina interna
 */
routerAdd('POST', '/backend/v1/partners/compute-participant-level', (e) => {
  const authRecord = e.auth
  const reqSecret =
    e.request.header.get('X-Internal-Secret') || e.request.header.get('x-internal-secret')
  const envSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')
  let isAuthorized = envSecret && reqSecret && reqSecret === envSecret

  if (!isAuthorized && authRecord) {
    if (
      authRecord.getBool('is_admin') ||
      authRecord.getBool('is_operador') ||
      authRecord.getBool('is_financeiro')
    ) {
      isAuthorized = true
    }
  }

  if (!isAuthorized) {
    return e.json(403, { message: 'Acesso negado. Apenas equipe interna autorizada.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const participantId = (body.participant_id || '').trim()

  if (participantId) {
    try {
      const result = evaluatePartnerLevel($app, participantId, !!body.force_notify)
      if (!result) {
        return e.json(404, { message: 'Participante parceiro não encontrado.' })
      }
      return e.json(200, { success: true, result })
    } catch (err) {
      return e.json(500, { success: false, message: err.message })
    }
  }

  // Se não informou participant_id, recalcula todos os parceiros ativos
  try {
    const partnerCategories = $app.findRecordsByFilter(
      'participant_categories',
      "front = 'parceiros'",
      '',
      50,
      0,
    )
    const catIds = partnerCategories.map((c) => c.id)

    const participants = $app.findRecordsByFilter(
      'participants',
      "status = 'ativo'",
      '-created',
      500,
      0,
    )
    const results = []

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i]
      if (catIds.includes(p.getString('category_id'))) {
        const res = evaluatePartnerLevel($app, p.id, false)
        if (res) results.push(res)
      }
    }

    return e.json(200, {
      success: true,
      evaluated_count: results.length,
      changed_count: results.filter((r) => r.changed).length,
      results,
    })
  } catch (err) {
    return e.json(500, { success: false, message: err.message })
  }
})

/**
 * 2. Tarefa agendada: recompute-levels todo dia às 6h de Brasília (09:00 UTC)
 */
cronAdd('recompute_levels', '0 9 * * *', () => {
  try {
    console.log(
      '[cron:recompute_levels] Iniciando recálculo diário de níveis dos parceiros (6h Brasília)...',
    )
    const partnerCategories = $app.findRecordsByFilter(
      'participant_categories',
      "front = 'parceiros'",
      '',
      50,
      0,
    )
    const catIds = partnerCategories.map((c) => c.id)

    const participants = $app.findRecordsByFilter(
      'participants',
      "status = 'ativo'",
      '-created',
      500,
      0,
    )
    let evaluated = 0
    let changed = 0

    for (let i = 0; i < participants.length; i++) {
      const p = participants[i]
      if (catIds.includes(p.getString('category_id'))) {
        evaluated++
        const res = evaluatePartnerLevel($app, p.id, false)
        if (res && res.changed) changed++
      }
    }
    console.log(
      `[cron:recompute_levels] Concluído. Avaliados: ${evaluated}, Promovidos/Alterados: ${changed}`,
    )
  } catch (err) {
    console.error('[cron:recompute_levels] Falha no recálculo diário:', err)
  }
})

/**
 * 3. POST /backend/v1/benefits/grant-benefit
 * Apenas admin ou financeiro. O benefício escolhido PRECISA ser compatível com o nível do parceiro.
 */
routerAdd('POST', '/backend/v1/benefits/grant-benefit', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autenticado.' })

  const isAdmin = authRecord.getBool('is_admin')
  const isFinanceiro = authRecord.getBool('is_financeiro')

  if (!isAdmin && !isFinanceiro) {
    return e.json(403, {
      message: 'Apenas administradores e financeiro podem conceder benefícios.',
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const participantId = (body.participant_id || '').trim()
  const benefitId = (body.benefit_id || '').trim()
  const referralId = (body.referral_id || '').trim()
  const customDescription = (body.custom_description || '').trim()
  const estimatedValue = Number(body.estimated_value_brl || 0)
  const grantId = (body.grant_id || '').trim() // Se estiver atualizando uma gratificação existente em análise

  if (!participantId && !grantId) {
    return e.json(400, { message: 'participant_id ou grant_id é obrigatório.' })
  }

  let grantRec = null
  let part = null

  if (grantId) {
    try {
      grantRec = $app.findRecordById('benefit_grants', grantId)
      part = $app.findRecordById('participants', grantRec.getString('participant_id'))
    } catch (_) {
      return e.json(404, { message: 'Gratificação não encontrada.' })
    }
  } else {
    try {
      part = $app.findRecordById('participants', participantId)
    } catch (_) {
      return e.json(404, { message: 'Participante não encontrado.' })
    }
  }

  // Determina a ordem do nível atual do participante
  let partnerLevelOrder = 1
  const partLevelId = part.getString('level_id')
  if (partLevelId) {
    try {
      const lvlRec = $app.findRecordById('program_levels', partLevelId)
      partnerLevelOrder = lvlRec.getInt('order') || 1
    } catch (_) {}
  }

  let benefitRec = null
  if (benefitId) {
    try {
      benefitRec = $app.findRecordById('benefit_catalog', benefitId)
    } catch (_) {
      return e.json(404, { message: 'Benefício de catálogo não encontrado.' })
    }

    const minLevelOrder = benefitRec.getInt('min_level_order') || 1
    if (minLevelOrder > partnerLevelOrder) {
      return e.json(400, {
        success: false,
        message: `Benefício incompatível: exige nível de ordem ${minLevelOrder}, mas o parceiro possui nível ordem ${partnerLevelOrder}. Benefício acima do nível do parceiro recusado.`,
      })
    }
  }

  const grantsCol = $app.findCollectionByNameOrId('benefit_grants')
  if (!grantRec) {
    grantRec = new Record(grantsCol)
    grantRec.set('participant_id', part.id)
    if (referralId) grantRec.set('referral_id', referralId)
    grantRec.set('status', 'aprovado')
  } else {
    grantRec.set('status', 'aprovado')
  }

  if (benefitRec) {
    grantRec.set('benefit_id', benefitRec.id)
    grantRec.set('custom_description', benefitRec.getString('title'))
    if (!estimatedValue && benefitRec.getFloat('estimated_value_brl')) {
      grantRec.set('estimated_value_brl', benefitRec.getFloat('estimated_value_brl'))
    }
  }
  if (customDescription) grantRec.set('custom_description', customDescription)
  if (estimatedValue > 0) grantRec.set('estimated_value_brl', estimatedValue)
  if (body.notes) grantRec.set('notes', body.notes)

  $app.save(grantRec)

  // Grava auditoria
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'benefit_granted')
    audit.set('resource_type', 'benefit_grants')
    audit.set('resource_id', grantRec.id)
    audit.set(
      'details',
      JSON.stringify({
        participant_id: part.id,
        benefit_id: benefitId || null,
        description: grantRec.getString('custom_description'),
        estimated_value: grantRec.getFloat('estimated_value_brl'),
      }),
    )
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Benefício concedido com sucesso.',
    grant: grantRec,
  })
})

/**
 * 4. POST /backend/v1/benefits/register-delivery
 * Apenas admin ou financeiro. Registra entrega com valor estimado e notifica o participante via WhatsApp e E-mail.
 */
routerAdd('POST', '/backend/v1/benefits/register-delivery', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autenticado.' })

  const isAdmin = authRecord.getBool('is_admin')
  const isFinanceiro = authRecord.getBool('is_financeiro')

  if (!isAdmin && !isFinanceiro) {
    return e.json(403, {
      message: 'Apenas administradores e financeiro podem registrar entrega de benefícios.',
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const grantId = (body.grant_id || '').trim()
  const deliveredAt = (body.delivered_at || new Date().toISOString()).trim()
  const estimatedValue = Number(body.estimated_value_brl || 0)
  const deliveryProof = (body.delivery_proof || '').trim()
  const notes = (body.notes || '').trim()

  if (!grantId) {
    return e.json(400, { message: 'grant_id é obrigatório.' })
  }

  let grantRec = null
  try {
    grantRec = $app.findRecordById('benefit_grants', grantId)
  } catch (_) {
    return e.json(404, { message: 'Gratificação não encontrada.' })
  }

  grantRec.set('status', 'entregue')
  grantRec.set('delivered_at', deliveredAt)
  grantRec.set('delivered_by', authRecord.id)
  if (estimatedValue > 0) grantRec.set('estimated_value_brl', estimatedValue)
  if (deliveryProof) grantRec.set('delivery_proof', deliveryProof)
  if (notes) grantRec.set('notes', notes)

  $app.save(grantRec)

  // Notificação gratificacao_entregue
  try {
    const part = $app.findRecordById('participants', grantRec.getString('participant_id'))
    const user = $app.findRecordById('users', part.getString('user_id'))
    const desc = grantRec.getString('custom_description') || 'Gratificação Especial Prime Circle'

    const internalSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')
    $http.send({
      url: 'http://127.0.0.1:8090/backend/v1/communication/notify-event',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': internalSecret || '',
      },
      data: JSON.stringify({
        event_code: 'gratificacao_entregue',
        participant_id: part.id,
        entity_id: grantRec.id,
        params: {
          nome: user.getString('name') || 'Parceiro',
          descricao_gratificacao: desc,
          recipient_email: user.getString('email'),
          recipient_phone: user.getString('phone'),
          link: 'https://indicacao.godoyprime.com.br/painel/nivel',
        },
      }),
      timeout: 5,
    })
  } catch (err) {
    console.error('[register-delivery] Erro ao notificar entrega:', err)
  }

  // Audit
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'benefit_delivery_registered')
    audit.set('resource_type', 'benefit_grants')
    audit.set('resource_id', grantRec.id)
    audit.set(
      'details',
      JSON.stringify({
        estimated_value_brl: grantRec.getFloat('estimated_value_brl'),
        delivered_at: deliveredAt,
        delivery_proof: deliveryProof,
      }),
    )
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Entrega de gratificação registrada com sucesso.',
    grant: grantRec,
  })
})

/**
 * 5. POST /backend/v1/partners/register-reciprocal-referral
 * Apenas equipe interna (admin, operador, financeiro). Registra os clientes que a Godoy Prime envia ao parceiro.
 * Dispara aviso WhatsApp 'godoy_enviou_indicacao'.
 */
routerAdd('POST', '/backend/v1/partners/register-reciprocal-referral', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autenticado.' })

  const isInternal =
    authRecord.getBool('is_admin') ||
    authRecord.getBool('is_operador') ||
    authRecord.getBool('is_financeiro')

  if (!isInternal) {
    return e.json(403, { message: 'Acesso restrito à equipe interna.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const participantId = (body.participant_id || '').trim()
  const clientName = (body.client_name || '').trim()
  const clientPhone = (body.client_phone || '').trim()
  const clientEmail = (body.client_email || '').trim()
  const opportunitySummary = (body.opportunity_summary || '').trim()
  const sentDate = (body.sent_date || new Date().toISOString()).trim()
  const notes = (body.notes || '').trim()

  if (!participantId || !clientName || !opportunitySummary) {
    return e.json(400, {
      message: 'participant_id, client_name e opportunity_summary são obrigatórios.',
    })
  }

  let part = null
  try {
    part = $app.findRecordById('participants', participantId)
  } catch (_) {
    return e.json(404, { message: 'Participante não encontrado.' })
  }

  const recCol = $app.findCollectionByNameOrId('reciprocal_referrals')
  const rec = new Record(recCol)
  rec.set('participant_id', part.id)
  rec.set('client_name', clientName)
  if (clientPhone) rec.set('client_phone', clientPhone)
  if (clientEmail) rec.set('client_email', clientEmail)
  rec.set('opportunity_summary', opportunitySummary)
  rec.set('sent_date', sentDate)
  rec.set('status', 'enviada')
  if (notes) rec.set('notes', notes)
  rec.set('registered_by', authRecord.id)

  $app.save(rec)

  // Notificação godoy_enviou_indicacao
  try {
    const user = $app.findRecordById('users', part.getString('user_id'))
    const internalSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')
    $http.send({
      url: 'http://127.0.0.1:8090/backend/v1/communication/notify-event',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': internalSecret || '',
      },
      data: JSON.stringify({
        event_code: 'godoy_enviou_indicacao',
        participant_id: part.id,
        entity_id: rec.id,
        params: {
          nome: user.getString('name') || 'Parceiro',
          resumo: opportunitySummary,
          recipient_email: user.getString('email'),
          recipient_phone: user.getString('phone'),
          link: 'https://indicacao.godoyprime.com.br/painel/parceria',
        },
      }),
      timeout: 5,
    })
  } catch (err) {
    console.error('[register-reciprocal-referral] Erro ao notificar parceiro:', err)
  }

  // Audit
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'reciprocal_referral_registered')
    audit.set('resource_type', 'reciprocal_referrals')
    audit.set('resource_id', rec.id)
    audit.set(
      'details',
      JSON.stringify({ participant_id: part.id, opportunity_summary: opportunitySummary }),
    )
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Indicação recíproca enviada e registrada.',
    id: rec.id,
  })
})

/**
 * 6. GET /backend/v1/participant/partnership-summary
 * Rota para o participante ver suas métricas de parceria:
 * - contagem de indicações enviadas (pelo parceiro à Godoy)
 * - contagem e datas das indicações que a Godoy Prime enviou a ele (NUNCA expor nome, contato ou dados do cliente!)
 * - dados do termo/contrato de parceria
 */
routerAdd('GET', '/backend/v1/participant/partnership-summary', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autenticado.' })

  let part = null
  try {
    part = $app.findFirstRecordByFilter('participants', `user_id = '${authRecord.id}'`)
  } catch (_) {
    return e.json(404, { message: 'Perfil de participante não encontrado.' })
  }

  // Indicações enviadas pelo parceiro
  let sentCount = 0
  let qualifiedSentCount = 0
  let closedSentCount = 0

  try {
    const myRefs = $app.findRecordsByFilter(
      'referrals',
      `participant_id = '${part.id}'`,
      '-created',
      500,
      0,
    )
    sentCount = myRefs.length
    const qualified = [
      'captada',
      'em_divulgacao',
      'vendida',
      'alugada',
      'comprou',
      'alugou',
      'declinada_pela_godoy',
    ]
    const closed = ['vendida', 'alugada', 'comprou', 'alugou']
    for (let i = 0; i < myRefs.length; i++) {
      const st = myRefs[i].getString('status')
      if (qualified.includes(st)) qualifiedSentCount++
      if (closed.includes(st)) closedSentCount++
    }
  } catch (_) {}

  // Indicações recebidas da Godoy Prime
  // REGRA CRÍTICA DE PRIVACIDADE: O participante NUNCA vê dados do cliente (nome, telefone, email), só a contagem e as datas.
  let receivedCount = 0
  const receivedDates = []

  try {
    const recs = $app.findRecordsByFilter(
      'reciprocal_referrals',
      `participant_id = '${part.id}'`,
      '-sent_date',
      500,
      0,
    )
    receivedCount = recs.length
    for (let i = 0; i < recs.length; i++) {
      receivedDates.push({
        id: recs[i].id,
        sent_date: recs[i].getString('sent_date'),
        status: recs[i].getString('status'),
        opportunity_summary: recs[i].getString('opportunity_summary'),
        // NENHUM client_name, client_phone, client_email aqui!
      })
    }
  } catch (_) {}

  // Contrato de parceria anexado em documents (bucket partner-contracts)
  let contractInfo = null
  try {
    const doc = $app.findFirstRecordByFilter(
      'documents',
      `participant_id = '${part.id}' && bucket_type = 'partner-contracts'`,
      '-created',
    )
    if (doc) {
      contractInfo = {
        id: doc.id,
        title: doc.getString('title'),
        created: doc.getString('created'),
      }
    }
  } catch (_) {}

  return e.json(200, {
    success: true,
    partnership: {
      participant_id: part.id,
      sent_referrals_count: sentCount,
      qualified_sent_count: qualifiedSentCount,
      closed_sent_count: closedSentCount,
      received_from_godoy_count: receivedCount,
      received_opportunities: receivedDates, // Apenas datas, status e resumo genérico da oportunidade
      contract: contractInfo,
      approved_at: part.getString('approved_at'),
    },
  })
})

/**
 * 7. GET /backend/v1/participant/level-info
 * Nível atual, progresso para o próximo nível, benefícios de cada nível e gratificações recebidas
 */
routerAdd('GET', '/backend/v1/participant/level-info', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autenticado.' })

  let part = null
  try {
    part = $app.findFirstRecordByFilter('participants', `user_id = '${authRecord.id}'`)
  } catch (_) {
    return e.json(404, { message: 'Perfil de participante não encontrado.' })
  }

  // Busca níveis
  const allLevels = $app.findRecordsByFilter('program_levels', '', 'order', 10, 0)
  const currentLvlId = part.getString('level_id')
  let currentLevel = null
  for (let i = 0; i < allLevels.length; i++) {
    if (allLevels[i].id === currentLvlId) {
      currentLevel = allLevels[i]
      break
    }
  }
  if (!currentLevel && allLevels.length > 0) currentLevel = allLevels[0]

  // Contabiliza progresso nos últimos 12m
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
  let qualCount = 0
  let dealsCount = 0
  let vgvTotal = 0

  try {
    const refs = $app.findRecordsByFilter(
      'referrals',
      `participant_id = '${part.id}' && created >= '${twelveMonthsAgo}'`,
      '-created',
      500,
      0,
    )
    const qualifiedStatuses = [
      'captada',
      'em_divulgacao',
      'vendida',
      'alugada',
      'comprou',
      'alugou',
      'declinada_pela_godoy',
    ]
    const closedStatuses = ['vendida', 'alugada', 'comprou', 'alugou']
    for (let i = 0; i < refs.length; i++) {
      const st = refs[i].getString('status')
      if (qualifiedStatuses.includes(st)) qualCount++
      if (closedStatuses.includes(st)) {
        dealsCount++
        vgvTotal += refs[i].getFloat('deal_value_brl') || 0
      }
    }
  } catch (_) {}

  // Próximo nível
  const currentOrder = currentLevel ? currentLevel.getInt('order') || 1 : 1
  let nextLevel = null
  for (let i = 0; i < allLevels.length; i++) {
    if ((allLevels[i].getInt('order') || 1) === currentOrder + 1) {
      nextLevel = allLevels[i]
      break
    }
  }

  // Histórico de níveis
  const history = []
  try {
    const histRecords = $app.findRecordsByFilter(
      'participant_level_history',
      `participant_id = '${part.id}'`,
      '-changed_at',
      20,
      0,
    )
    for (let i = 0; i < histRecords.length; i++) {
      const h = histRecords[i]
      history.push({
        id: h.id,
        changed_at: h.getString('changed_at'),
        reason: h.getString('reason'),
        previous_level_id: h.getString('previous_level_id'),
        new_level_id: h.getString('new_level_id'),
      })
    }
  } catch (_) {}

  // Gratificações do participante
  const grants = []
  try {
    const grantRecords = $app.findRecordsByFilter(
      'benefit_grants',
      `participant_id = '${part.id}'`,
      '-created',
      50,
      0,
    )
    for (let i = 0; i < grantRecords.length; i++) {
      const g = grantRecords[i]
      grants.push({
        id: g.id,
        status: g.getString('status'),
        custom_description: g.getString('custom_description'),
        estimated_value_brl: g.getFloat('estimated_value_brl'),
        delivered_at: g.getString('delivered_at'),
        created: g.getString('created'),
      })
    }
  } catch (_) {}

  // Catálogo de benefícios ativos
  const catalog = []
  try {
    const benefits = $app.findRecordsByFilter(
      'benefit_catalog',
      'is_active = true',
      'min_level_order',
      50,
      0,
    )
    for (let i = 0; i < benefits.length; i++) {
      const b = benefits[i]
      catalog.push({
        id: b.id,
        slug: b.getString('slug'),
        title: b.getString('title'),
        description: b.getString('description'),
        min_level_order: b.getInt('min_level_order') || 1,
        estimated_value_brl: b.getFloat('estimated_value_brl'),
        category: b.getString('category'),
      })
    }
  } catch (_) {}

  return e.json(200, {
    success: true,
    current_level: currentLevel,
    next_level: nextLevel,
    stats_12m: {
      qualifying_referrals: qualCount,
      deals_count: dealsCount,
      vgv_total_brl: vgvTotal,
    },
    all_levels: allLevels,
    history,
    grants,
    catalog,
  })
})

/**
 * 8. GET /backend/v1/participant/entity-summary
 * Visível apenas para entidades condominiais. Retorna apenas números agregados:
 * - números por etapa
 * - captações
 * - negócios
 * - benefícios gerados para o condomínio
 * - vigência do termo de parceria
 * REGRA CRÍTICA DE PRIVACIDADE: NENHUM dado de morador (sem nome, unidade, telefone ou qualquer contato).
 */
routerAdd('GET', '/backend/v1/participant/entity-summary', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autenticado.' })

  let part = null
  let isEntity = false
  try {
    part = $app.findFirstRecordByFilter('participants', `user_id = '${authRecord.id}'`)
    if (part) {
      const cat = $app.findRecordById('participant_categories', part.getString('category_id'))
      if (cat.getString('slug') === 'entidade_condominial') isEntity = true
    }
  } catch (_) {
    return e.json(404, { message: 'Perfil não encontrado.' })
  }

  // Também permite equipe interna consultar
  const isInternal =
    authRecord.getBool('is_admin') ||
    authRecord.getBool('is_operador') ||
    authRecord.getBool('is_financeiro')

  if (!isEntity && !isInternal) {
    return e.json(403, { message: 'Acesso exclusivo para perfis de Entidade Condominial.' })
  }

  const queryPartId =
    e.request.url.query()['participant_id'] && isInternal
      ? String(e.request.url.query()['participant_id']).trim()
      : part.id

  const stageCounts = {
    total: 0,
    recebidas: 0,
    em_analise: 0,
    em_contato: 0,
    captadas: 0,
    em_divulgacao: 0,
    concluidas: 0,
    nao_aproveitadas: 0,
  }

  let totalDealsCount = 0
  let totalDealsVgv = 0

  try {
    const refs = $app.findRecordsByFilter(
      'referrals',
      'participant_id = {:pid}',
      '-created',
      1000,
      0,
      { pid: queryPartId },
    )
    stageCounts.total = refs.length

    for (let i = 0; i < refs.length; i++) {
      const st = refs[i].getString('status')
      if (st === 'recebida') stageCounts.recebidas++
      else if (st === 'em_triagem' || st === 'aceita') stageCounts.em_analise++
      else if (
        st === 'em_contato' ||
        st === 'qualificada' ||
        st === 'em_negociacao' ||
        st === 'captacao_solicitada' ||
        st === 'em_atendimento'
      )
        stageCounts.em_contato++
      else if (st === 'captada') stageCounts.captadas++
      else if (st === 'em_divulgacao') stageCounts.em_divulgacao++
      else if (st === 'vendida' || st === 'alugada' || st === 'comprou' || st === 'alugou') {
        stageCounts.concluidas++
        totalDealsCount++
        totalDealsVgv += refs[i].getFloat('deal_value_brl') || 0
      } else if (
        st === 'recusada' ||
        st === 'duplicada' ||
        st === 'perdida' ||
        st === 'retirada' ||
        st === 'cancelada'
      )
        stageCounts.nao_aproveitadas++
    }
  } catch (_) {}

  // Benefícios gerados para o condomínio (recompensas e benefit_grants)
  let totalBenefitsValueBrl = 0
  let benefitsDeliveredCount = 0
  try {
    const grants = $app.findRecordsByFilter(
      'benefit_grants',
      'participant_id = {:pid}',
      '',
      100,
      0,
      { pid: queryPartId },
    )
    for (let i = 0; i < grants.length; i++) {
      const val = grants[i].getFloat('estimated_value_brl') || 0
      totalBenefitsValueBrl += val
      if (grants[i].getString('status') === 'entregue') benefitsDeliveredCount++
    }
  } catch (_) {}

  try {
    const rewards = $app.findRecordsByFilter('rewards', 'participant_id = {:pid}', '', 100, 0, {
      pid: queryPartId,
    })
    for (let i = 0; i < rewards.length; i++) {
      const r = rewards[i]
      if (r.getString('status') === 'paga' || r.getString('status') === 'agendada') {
        totalBenefitsValueBrl += r.getFloat('final_amount_brl') || 0
      }
    }
  } catch (_) {}

  // Vigência do termo de parceria (approved_at até 12 meses)
  const approvedAt = part.getString('approved_at') || part.getString('created')
  let termExpiresAt = ''
  if (approvedAt) {
    const exp = new Date(new Date(approvedAt).getTime() + 365 * 24 * 60 * 60 * 1000)
    termExpiresAt = exp.toISOString()
  }

  return e.json(200, {
    success: true,
    entity_metrics: {
      stages: stageCounts,
      captures_count: stageCounts.captadas + stageCounts.em_divulgacao + stageCounts.concluidas,
      deals_count: totalDealsCount,
      deals_vgv_brl: totalDealsVgv,
      benefits_total_value_brl: totalBenefitsValueBrl,
      benefits_delivered_count: benefitsDeliveredCount,
      partnership_term: {
        starts_at: approvedAt,
        expires_at: termExpiresAt,
        status: 'vigente',
      },
    },
  })
})
