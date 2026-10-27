// pocketbase/hooks/operations.pb.js
// Implementa as regras de negócio e transições da Etapa 3 do Godoy Prime Indica

/**
 * Hook on referrals create: trigger duplicate check and set initial fields
 */
onRecordCreate((e) => {
  e.next()

  const record = e.record
  if (!record || record.collection().name !== 'referrals') return

  try {
    const curStatus = record.getString('status')
    if (!curStatus || curStatus === 'nova') {
      record.set('status', 'recebida')
      $app.save(record)
    }

    // Grava primeiro referral_event
    const eventsCol = $app.findCollectionByNameOrId('referral_events')
    const ev = new Record(eventsCol)
    ev.set('referral_id', record.id)
    ev.set('from_status', '')
    ev.set('to_status', 'recebida')
    ev.set('actor_name', record.getString('referrer_name') || 'Sistema')
    ev.set('public_label', 'Recebida')
    ev.set('visible_to_participant', true)
    $app.save(ev)

    // Inline check duplicates
    const refId = record.id
    const refType =
      record.getString('referral_type') ||
      (record.getString('type') === 'cliente' ? 'comprador' : 'proprietario')
    const flagsCol = $app.findCollectionByNameOrId('duplicate_flags')

    let precedenceDays = 180
    try {
      const st = $app.findFirstRecordByData(
        'program_settings',
        'key',
        'known_owner_precedence_days',
      )
      const val = JSON.parse(st.getString('value_json'))
      if (typeof val === 'number') precedenceDays = val
    } catch (_) {}

    const cutoffDate = new Date(Date.now() - precedenceDays * 24 * 60 * 60 * 1000).toISOString()
    const flags = []

    function cleanPhone(str) {
      if (!str) return ''
      return String(str).replace(/\D/g, '')
    }

    function cleanAddr(str) {
      if (!str) return ''
      return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    if (refType === 'proprietario') {
      const condoId = record.getString('condominium_id')
      const unit = (record.getString('unit') || '').trim().toLowerCase()
      const normAddr = cleanAddr(
        record.getString('normalized_address') || record.getString('description'),
      )
      const normPhone = cleanPhone(
        record.getString('owner_phone') || record.getString('referrer_phone'),
      )

      const activeStates =
        "status != 'recusada' && status != 'cancelada' && status != 'vendida' && status != 'alugada' && status != 'perdida' && status != 'retirada' && status != 'declinada_pela_godoy'"
      const activeRefs = $app.findRecordsByFilter(
        'referrals',
        `id != '${refId}' && ${activeStates}`,
        '-created',
        100,
        0,
      )

      for (let i = 0; i < activeRefs.length; i++) {
        const other = activeRefs[i]
        const otherType =
          other.getString('referral_type') ||
          (other.getString('type') === 'cliente' ? 'comprador' : 'proprietario')
        if (otherType !== 'proprietario') continue

        const otherPhone = cleanPhone(
          other.getString('owner_phone') || other.getString('referrer_phone'),
        )
        const otherCondo = other.getString('condominium_id')
        const otherUnit = (other.getString('unit') || '').trim().toLowerCase()
        const otherAddr = cleanAddr(
          other.getString('normalized_address') || other.getString('description'),
        )

        if (normPhone && otherPhone && normPhone === otherPhone) {
          flags.push({
            conflicting_referral_id: other.id,
            conflict_type: 'phone',
            conflict_details: `Mesmo telefone de proprietário (${normPhone}) já cadastrado na indicação #${other.id.substring(0, 6)} (${other.getString('status')}).`,
          })
        }

        if (
          condoId &&
          otherCondo &&
          condoId === otherCondo &&
          unit &&
          otherUnit &&
          unit === otherUnit
        ) {
          flags.push({
            conflicting_referral_id: other.id,
            conflict_type: 'condo_unit',
            conflict_details: `Mesmo condomínio e mesma unidade (${unit}) já ativos na indicação #${other.id.substring(0, 6)}.`,
          })
        }

        if (
          normAddr &&
          otherAddr &&
          unit &&
          otherUnit &&
          unit === otherUnit &&
          (normAddr.includes(otherAddr) || otherAddr.includes(normAddr))
        ) {
          flags.push({
            conflicting_referral_id: other.id,
            conflict_type: 'address_unit',
            conflict_details: `Endereço e unidade compatíveis com a indicação ativa #${other.id.substring(0, 6)}.`,
          })
        }
      }

      if (normPhone) {
        const knownOwners = $app.findRecordsByFilter(
          'known_owner_base',
          `normalized_phone = '${normPhone}' && (last_real_contact_at >= '${cutoffDate}' || created >= '${cutoffDate}')`,
          '-created',
          5,
          0,
        )
        if (knownOwners.length > 0) {
          flags.push({
            conflicting_referral_id: null,
            conflict_type: 'known_base',
            conflict_details: `Proprietário já constante na base conhecida da Godoy Prime com contato nos últimos ${precedenceDays} dias.`,
          })
        }
      }
    } else {
      // Comprador
      const normPhone = cleanPhone(
        record.getString('buyer_phone') || record.getString('referrer_phone'),
      )
      const email = (record.getString('buyer_email') || record.getString('return_contact') || '')
        .trim()
        .toLowerCase()

      const activeStates =
        "status != 'recusada' && status != 'cancelada' && status != 'comprou' && status != 'alugou' && status != 'perdida'"
      const activeBuyers = $app.findRecordsByFilter(
        'referrals',
        `id != '${refId}' && ${activeStates}`,
        '-created',
        100,
        0,
      )

      for (let i = 0; i < activeBuyers.length; i++) {
        const other = activeBuyers[i]
        const otherPhone = cleanPhone(
          other.getString('buyer_phone') || other.getString('referrer_phone'),
        )
        const otherEmail = (
          other.getString('buyer_email') ||
          other.getString('return_contact') ||
          ''
        )
          .trim()
          .toLowerCase()

        if (normPhone && otherPhone && normPhone === otherPhone) {
          flags.push({
            conflicting_referral_id: other.id,
            conflict_type: 'phone',
            conflict_details: `Mesmo telefone de interessado/comprador (${normPhone}) já cadastrado na indicação #${other.id.substring(0, 6)} (${other.getString('status')}).`,
          })
        }
        if (email && otherEmail && email === otherEmail) {
          flags.push({
            conflicting_referral_id: other.id,
            conflict_type: 'email',
            conflict_details: `Mesmo e-mail de interessado/comprador (${email}) já cadastrado na indicação #${other.id.substring(0, 6)}.`,
          })
        }
      }

      if (normPhone || email) {
        let filter = ''
        if (normPhone && email) filter = `(normalized_phone = '${normPhone}' || email = '${email}')`
        else if (normPhone) filter = `normalized_phone = '${normPhone}'`
        else filter = `email = '${email}'`

        filter += ` && (last_real_contact_at >= '${cutoffDate}' || created >= '${cutoffDate}')`
        const knownBuyers = $app.findRecordsByFilter('known_buyer_base', filter, '-created', 5, 0)
        if (knownBuyers.length > 0) {
          flags.push({
            conflicting_referral_id: null,
            conflict_type: 'known_base',
            conflict_details: `Comprador/inquilino já constante na base conhecida da Godoy Prime nos últimos ${precedenceDays} dias.`,
          })
        }
      }
    }

    for (let f = 0; f < flags.length; f++) {
      const item = flags[f]
      const rec = new Record(flagsCol)
      rec.set('referral_id', refId)
      if (item.conflicting_referral_id)
        rec.set('conflicting_referral_id', item.conflicting_referral_id)
      rec.set('conflict_type', item.conflict_type)
      rec.set('conflict_details', item.conflict_details)
      rec.set('is_resolved', false)
      $app.save(rec)
    }
  } catch (err) {
    console.error('[onRecordCreate:referrals] Erro:', err)
  }
}, 'referrals')

/**
 * POST /backend/v1/referrals/change-status
 */
routerAdd('POST', '/backend/v1/referrals/change-status', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado.' })
  }

  let roles = []
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      50,
      0,
    )
    roles = rolesRecords.map((r) => r.getString('role'))
  } catch (_) {
    roles = []
  }

  if (roles.length === 0) {
    return e.json(403, {
      message: 'Apenas operadores, financeiros ou administradores podem mudar status operacionais.',
    })
  }

  const isAdmin = roles.includes('admin')
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}

  const referralId = (body.referral_id || '').trim()
  const targetStatus = (body.target_status || '').trim()
  const statusReason = (body.status_reason || '').trim()
  const publicReasonCode = (body.public_reason_code || '').trim()
  const lossResponsibility = (body.loss_responsibility || '').trim()
  const dealValueBrl = body.deal_value_brl ? Number(body.deal_value_brl) : null
  const dealDate = body.deal_date ? body.deal_date + '' : null
  const dealPropDesc = (body.deal_property_description || '').trim()

  if (!referralId || !targetStatus) {
    return e.json(400, { message: 'ID da indicação e status de destino são obrigatórios.' })
  }

  let referral
  try {
    referral = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação não encontrada.' })
  }

  const currentStatus = referral.getString('status') || 'recebida'
  let refType = referral.getString('referral_type')
  if (!refType) {
    refType = referral.getString('type') === 'cliente' ? 'comprador' : 'proprietario'
  }

  let validTransition = false
  if (refType === 'proprietario' || refType === 'imovel') {
    const nonFinalProp = [
      'recebida',
      'em_triagem',
      'aceita',
      'em_contato',
      'qualificada',
      'em_negociacao',
      'captacao_solicitada',
      'captada',
      'em_divulgacao',
      'nova',
      'em_atendimento',
    ]
    if (targetStatus === 'cancelada') {
      validTransition = nonFinalProp.includes(currentStatus)
    } else {
      const propMap = {
        recebida: ['em_triagem'],
        nova: ['em_triagem', 'em_atendimento'],
        em_triagem: ['aceita', 'recusada', 'duplicada'],
        aceita: ['em_contato', 'perdida'],
        em_contato: ['qualificada', 'perdida'],
        qualificada: ['em_negociacao', 'perdida'],
        em_negociacao: ['captacao_solicitada', 'perdida'],
        captacao_solicitada: ['captada', 'em_negociacao'],
        captada: ['em_divulgacao', 'retirada'],
        em_divulgacao: ['vendida', 'alugada', 'retirada'],
      }
      const allowed = propMap[currentStatus] || []
      validTransition = allowed.includes(targetStatus)
    }
  } else {
    // Comprador
    const nonFinalBuyer = [
      'recebida',
      'em_triagem',
      'aceita',
      'em_atendimento',
      'visitando',
      'proposta',
      'nova',
    ]
    if (targetStatus === 'cancelada') {
      validTransition = nonFinalBuyer.includes(currentStatus)
    } else {
      const buyerMap = {
        recebida: ['em_triagem'],
        nova: ['em_triagem', 'em_atendimento'],
        em_triagem: ['aceita', 'recusada', 'duplicada'],
        aceita: ['em_atendimento', 'perdida'],
        em_atendimento: ['visitando', 'perdida'],
        visitando: ['proposta', 'perdida'],
        proposta: ['comprou', 'alugou', 'visitando', 'perdida'],
      }
      const allowed = buyerMap[currentStatus] || []
      validTransition = allowed.includes(targetStatus)
    }
  }

  if (!validTransition) {
    return e.json(400, {
      message: `Transição inválida para indicação de ${refType}: não é permitido mover de '${currentStatus}' para '${targetStatus}'.`,
    })
  }

  const requiresReason = ['recusada', 'duplicada', 'perdida', 'retirada', 'cancelada']
  if (
    requiresReason.includes(targetStatus) ||
    (currentStatus === 'captacao_solicitada' && targetStatus === 'em_negociacao')
  ) {
    if (!statusReason) {
      return e.json(400, { message: `Motivo é obrigatório para transição para '${targetStatus}'.` })
    }
    if (!publicReasonCode) {
      return e.json(400, {
        message:
          'Código de motivo público (public_reason_code) é obrigatório para comunicar ao indicador.',
      })
    }
  }

  if (targetStatus === 'perdida') {
    if (lossResponsibility !== 'proprietario' && lossResponsibility !== 'indicacao_invalida') {
      return e.json(400, {
        message:
          "Para marcar como perdida é obrigatório informar a responsabilidade: 'proprietario' ou 'indicacao_invalida'.",
      })
    }
  }

  const dealStatuses = ['vendida', 'alugada', 'comprou', 'alugou']
  if (dealStatuses.includes(targetStatus)) {
    if (!isAdmin) {
      return e.json(403, { message: `Apenas administradores podem mover para '${targetStatus}'.` })
    }
    if (!dealValueBrl || dealValueBrl <= 0) {
      return e.json(400, { message: 'Valor do negócio em BRL é obrigatório.' })
    }
    if (!dealDate) {
      return e.json(400, { message: 'Data do fechamento do negócio é obrigatória.' })
    }
  }

  referral.set('status', targetStatus)
  if (statusReason) referral.set('status_reason', statusReason)
  if (publicReasonCode) referral.set('public_reason_code', publicReasonCode)
  if (lossResponsibility) referral.set('loss_responsibility', lossResponsibility)
  if (dealValueBrl) referral.set('deal_value_brl', dealValueBrl)
  if (dealDate) referral.set('deal_date', dealDate)
  if (dealPropDesc) referral.set('deal_property_description', dealPropDesc)
  $app.save(referral)

  let publicLabel = 'Em andamento'
  if (refType === 'proprietario' || refType === 'imovel') {
    if (targetStatus === 'recebida') publicLabel = 'Recebida'
    else if (targetStatus === 'em_triagem' || targetStatus === 'aceita') publicLabel = 'Em análise'
    else if (
      targetStatus === 'em_contato' ||
      targetStatus === 'qualificada' ||
      targetStatus === 'em_negociacao' ||
      targetStatus === 'captacao_solicitada'
    )
      publicLabel = 'Em contato'
    else if (targetStatus === 'captada') publicLabel = 'Captado'
    else if (targetStatus === 'em_divulgacao') publicLabel = 'Em divulgação'
    else if (targetStatus === 'vendida') publicLabel = 'Vendido'
    else if (targetStatus === 'alugada') publicLabel = 'Alugado'
    else if (targetStatus === 'declinada_pela_godoy') publicLabel = 'Reconhecida'
    else if (
      targetStatus === 'recusada' ||
      targetStatus === 'duplicada' ||
      targetStatus === 'perdida' ||
      targetStatus === 'retirada' ||
      targetStatus === 'cancelada'
    )
      publicLabel = 'Não aproveitada'
  } else {
    if (targetStatus === 'recebida') publicLabel = 'Recebida'
    else if (targetStatus === 'em_triagem' || targetStatus === 'aceita') publicLabel = 'Em análise'
    else if (targetStatus === 'em_atendimento') publicLabel = 'Em atendimento'
    else if (targetStatus === 'visitando') publicLabel = 'Visitando imóveis'
    else if (targetStatus === 'proposta') publicLabel = 'Proposta'
    else if (targetStatus === 'comprou') publicLabel = 'Comprou'
    else if (targetStatus === 'alugou') publicLabel = 'Alugou'
    else if (
      targetStatus === 'recusada' ||
      targetStatus === 'duplicada' ||
      targetStatus === 'perdida' ||
      targetStatus === 'cancelada'
    )
      publicLabel = 'Não aproveitada'
  }

  const eventsCol = $app.findCollectionByNameOrId('referral_events')
  const ev = new Record(eventsCol)
  ev.set('referral_id', referral.id)
  ev.set('from_status', currentStatus)
  ev.set('to_status', targetStatus)
  ev.set('actor_id', authRecord.id)
  ev.set('actor_name', authRecord.getString('name') || authRecord.getString('email'))
  if (statusReason) ev.set('reason', statusReason)
  if (publicReasonCode) ev.set('public_reason_code', publicReasonCode)
  ev.set('public_label', publicLabel)
  ev.set('visible_to_participant', true)
  ev.set('metadata', JSON.stringify({ lossResponsibility, dealValueBrl, dealDate }))
  $app.save(ev)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'referral_status_changed')
    audit.set('resource_type', 'referrals')
    audit.set('resource_id', referral.id)
    audit.set(
      'details',
      JSON.stringify({
        from_status: currentStatus,
        to_status: targetStatus,
        referral_type: refType,
        reason: statusReason,
        public_reason_code: publicReasonCode,
        loss_responsibility: lossResponsibility,
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: `Status atualizado com sucesso para '${targetStatus}'.`,
    referral_id: referral.id,
    status: targetStatus,
    public_label: publicLabel,
  })
})

/**
 * POST /backend/v1/referrals/decline-by-godoy
 */
routerAdd('POST', '/backend/v1/referrals/decline-by-godoy', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado.' })
  }

  let isAdmin = false
  try {
    const check = $app.findFirstRecordByFilter(
      'user_roles',
      `user_id = '${authRecord.id}' && role = 'admin'`,
    )
    isAdmin = !!check
  } catch (_) {
    isAdmin = false
  }

  if (!isAdmin) {
    return e.json(403, { message: 'Apenas administradores podem declinar pela Godoy Prime.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const referralId = (body.referral_id || '').trim()
  const declinedReason = (body.declined_reason || '').trim()

  if (!referralId) return e.json(400, { message: 'ID da indicação é obrigatório.' })
  if (!declinedReason)
    return e.json(400, { message: 'Motivo do declínio pela Godoy é obrigatório.' })

  let referral
  try {
    referral = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação não encontrada.' })
  }

  const curStatus = referral.getString('status')
  const allowed = ['qualificada', 'em_negociacao', 'captacao_solicitada']
  if (!allowed.includes(curStatus)) {
    return e.json(400, {
      message: `Apenas indicações em 'qualificada', 'em_negociacao' ou 'captacao_solicitada' podem ser declinadas pela Godoy. Status atual: '${curStatus}'.`,
    })
  }

  referral.set('status', 'declinada_pela_godoy')
  referral.set('declined_reason', declinedReason)
  referral.set('declined_by', authRecord.id)
  $app.save(referral)

  const eventsCol = $app.findCollectionByNameOrId('referral_events')
  const ev = new Record(eventsCol)
  ev.set('referral_id', referral.id)
  ev.set('from_status', curStatus)
  ev.set('to_status', 'declinada_pela_godoy')
  ev.set('actor_id', authRecord.id)
  ev.set('actor_name', authRecord.getString('name') || 'Admin')
  ev.set('reason', declinedReason)
  ev.set('public_label', 'Reconhecida')
  ev.set('visible_to_participant', true)
  $app.save(ev)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'referral_declined_by_godoy')
    audit.set('resource_type', 'referrals')
    audit.set('resource_id', referral.id)
    audit.set(
      'details',
      JSON.stringify({
        from_status: curStatus,
        declined_reason: declinedReason,
        declined_by: authRecord.id,
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message:
      "Indicação declinada pela Godoy Prime. No painel do participante constará como 'Reconhecida'.",
    referral_id: referral.id,
    status: 'declinada_pela_godoy',
  })
})

/**
 * POST /backend/v1/referrals/request-capture
 */
routerAdd('POST', '/backend/v1/referrals/request-capture', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isInternal = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      5,
      0,
    )
    isInternal = rolesRecords.length > 0
  } catch (_) {}

  if (!isInternal) return e.json(403, { message: 'Acesso negado.' })

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const referralId = (body.referral_id || '').trim()
  const documentId = (body.document_id || '').trim()
  const instrumentType = (body.instrument_type || '').trim()

  if (!referralId || !documentId || !instrumentType) {
    return e.json(400, {
      message:
        'Indicação, documento anexado e tipo de instrumento são obrigatórios para solicitar formalização.',
    })
  }

  let referral
  try {
    referral = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação não encontrada.' })
  }

  let doc
  try {
    doc = $app.findRecordById('documents', documentId)
  } catch (_) {
    return e.json(404, { message: 'Documento informado não encontrado.' })
  }

  const capCol = $app.findCollectionByNameOrId('capture_records')
  const capRec = new Record(capCol)
  capRec.set('referral_id', referral.id)
  capRec.set('instrument_type', instrumentType)
  capRec.set('document_id', doc.id)
  capRec.set('requested_by', authRecord.id)
  capRec.set('requested_at', new Date().toISOString())
  capRec.set('status', 'solicitada')
  $app.save(capRec)

  const curStatus = referral.getString('status')
  referral.set('status', 'captacao_solicitada')
  $app.save(referral)

  const eventsCol = $app.findCollectionByNameOrId('referral_events')
  const ev = new Record(eventsCol)
  ev.set('referral_id', referral.id)
  ev.set('from_status', curStatus)
  ev.set('to_status', 'captacao_solicitada')
  ev.set('actor_id', authRecord.id)
  ev.set('actor_name', authRecord.getString('name') || 'Operador')
  ev.set('public_label', 'Em formalização')
  ev.set('visible_to_participant', true)
  $app.save(ev)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'capture_requested')
    audit.set('resource_type', 'capture_records')
    audit.set('resource_id', capRec.id)
    audit.set(
      'details',
      JSON.stringify({
        referral_id: referral.id,
        instrument_type: instrumentType,
        document_id: doc.id,
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Formalização de captação solicitada com sucesso.',
    capture_id: capRec.id,
  })
})

/**
 * POST /backend/v1/referrals/approve-capture
 */
routerAdd('POST', '/backend/v1/referrals/approve-capture', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let canApprove = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      5,
      0,
    )
    const roleNames = rolesRecords.map((r) => r.getString('role'))
    canApprove = roleNames.includes('admin') || roleNames.includes('operador')
  } catch (_) {}

  if (!canApprove) {
    return e.json(403, {
      message: 'Apenas admin ou operadores aprovadores podem aprovar formalizações.',
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const captureId = (body.capture_id || '').trim()

  if (!captureId) {
    return e.json(400, { message: 'ID da solicitação de captação é obrigatório.' })
  }

  let capRec
  try {
    capRec = $app.findRecordById('capture_records', captureId)
  } catch (_) {
    return e.json(404, { message: 'Registro de captação não encontrado.' })
  }

  const requestedBy = capRec.getString('requested_by')
  if (requestedBy === authRecord.id) {
    return e.json(403, {
      message:
        'Regra de conformidade violada: o operador que solicitou a formalização NÃO pode aprová-la. A aprovação exige um usuário diferente.',
    })
  }

  const referralId = capRec.getString('referral_id')
  let referral
  try {
    referral = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação vinculada não encontrada.' })
  }

  capRec.set('status', 'aprovada')
  capRec.set('approved_by', authRecord.id)
  capRec.set('approved_at', new Date().toISOString())
  $app.save(capRec)

  referral.set('status', 'captada')
  $app.save(referral)

  const eventsCol = $app.findCollectionByNameOrId('referral_events')
  const ev = new Record(eventsCol)
  ev.set('referral_id', referral.id)
  ev.set('from_status', 'captacao_solicitada')
  ev.set('to_status', 'captada')
  ev.set('actor_id', authRecord.id)
  ev.set('actor_name', authRecord.getString('name') || 'Aprovador')
  ev.set('public_label', 'Captado')
  ev.set('visible_to_participant', true)
  $app.save(ev)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'capture_approved')
    audit.set('resource_type', 'capture_records')
    audit.set('resource_id', capRec.id)
    audit.set('details', JSON.stringify({ referral_id: referral.id, approved_by: authRecord.id }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Captação aprovada com sucesso! Indicação movida para o estado Captada.',
    referral_id: referral.id,
  })
})

/**
 * POST /backend/v1/referrals/return-capture
 */
routerAdd('POST', '/backend/v1/referrals/return-capture', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isInternal = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      5,
      0,
    )
    isInternal = rolesRecords.length > 0
  } catch (_) {}

  if (!isInternal) return e.json(403, { message: 'Acesso negado.' })

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const captureId = (body.capture_id || '').trim()
  const returnReason = (body.return_reason || '').trim()

  if (!captureId || !returnReason) {
    return e.json(400, { message: 'ID da formalização e motivo da devolução são obrigatórios.' })
  }

  let capRec
  try {
    capRec = $app.findRecordById('capture_records', captureId)
  } catch (_) {
    return e.json(404, { message: 'Registro de captação não encontrado.' })
  }

  const referralId = capRec.getString('referral_id')
  let referral
  try {
    referral = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação vinculada não encontrada.' })
  }

  capRec.set('status', 'devolvida')
  capRec.set('return_reason', returnReason)
  $app.save(capRec)

  referral.set('status', 'em_negociacao')
  referral.set('status_reason', returnReason)
  $app.save(referral)

  const eventsCol = $app.findCollectionByNameOrId('referral_events')
  const ev = new Record(eventsCol)
  ev.set('referral_id', referral.id)
  ev.set('from_status', 'captacao_solicitada')
  ev.set('to_status', 'em_negociacao')
  ev.set('actor_id', authRecord.id)
  ev.set('actor_name', authRecord.getString('name') || 'Revisor')
  ev.set('reason', returnReason)
  ev.set('public_label', 'Em negociação (ajustes necessários)')
  ev.set('visible_to_participant', false)
  $app.save(ev)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'capture_returned')
    audit.set('resource_type', 'capture_records')
    audit.set('resource_id', capRec.id)
    audit.set('details', JSON.stringify({ referral_id: referral.id, return_reason: returnReason }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Formalização devolvida para ajustes. Indicação retornou para o status Em Negociação.',
    referral_id: referral.id,
  })
})

/**
 * POST /backend/v1/referrals/register-listing
 */
routerAdd('POST', '/backend/v1/referrals/register-listing', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isInternal = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      5,
      0,
    )
    isInternal = rolesRecords.length > 0
  } catch (_) {}

  if (!isInternal) return e.json(403, { message: 'Acesso negado.' })

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const referralId = (body.referral_id || '').trim()
  const listingLink = (body.listing_link || '').trim()
  const isReservedListing = !!body.is_reserved_listing
  const publicSummary = (body.public_summary || '').trim()
  const publicPhotos = body.public_photos || []

  if (!referralId) return e.json(400, { message: 'ID da indicação é obrigatório.' })

  if (!isReservedListing && !listingLink) {
    return e.json(400, {
      message: 'Informe o link do anúncio ou selecione o modo de divulgação reservada.',
    })
  }

  if (!publicSummary) {
    return e.json(400, { message: 'Resumo público do imóvel é obrigatório para vitrine.' })
  }

  let referral
  try {
    referral = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação não encontrada.' })
  }

  const curStatus = referral.getString('status')
  if (curStatus !== 'captada') {
    return e.json(400, {
      message: `A indicação precisa estar no status 'captada' para ser colocada em divulgação. Status atual: '${curStatus}'.`,
    })
  }

  referral.set('status', 'em_divulgacao')
  referral.set('listing_link', listingLink)
  referral.set('is_reserved_listing', isReservedListing)
  referral.set('public_summary', publicSummary)
  referral.set('public_photos', JSON.stringify(publicPhotos))
  $app.save(referral)

  const eventsCol = $app.findCollectionByNameOrId('referral_events')
  const ev = new Record(eventsCol)
  ev.set('referral_id', referral.id)
  ev.set('from_status', curStatus)
  ev.set('to_status', 'em_divulgacao')
  ev.set('actor_id', authRecord.id)
  ev.set('actor_name', authRecord.getString('name') || 'Operador')
  ev.set('public_label', 'Em divulgação')
  ev.set('visible_to_participant', true)
  ev.set('metadata', JSON.stringify({ listing_link: listingLink, is_reserved: isReservedListing }))
  $app.save(ev)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'listing_registered')
    audit.set('resource_type', 'referrals')
    audit.set('resource_id', referral.id)
    audit.set(
      'details',
      JSON.stringify({ listing_link: listingLink, is_reserved: isReservedListing }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Imóvel registrado em divulgação com sucesso!',
    referral_id: referral.id,
  })
})

/**
 * POST /backend/v1/referrals/register-deal
 */
routerAdd('POST', '/backend/v1/referrals/register-deal', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isAdmin = false
  try {
    const check = $app.findFirstRecordByFilter(
      'user_roles',
      `user_id = '${authRecord.id}' && role = 'admin'`,
    )
    isAdmin = !!check
  } catch (_) {
    isAdmin = false
  }

  if (!isAdmin) {
    return e.json(403, {
      message: 'Apenas administradores podem registrar fechamento de negócios.',
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const ownerReferralId = (body.owner_referral_id || '').trim()
  const buyerReferralId = (body.buyer_referral_id || '').trim()
  const dealType = (body.deal_type || 'venda').trim()
  const valueBrl = Number(body.value_brl || 0)
  const dealDate = (body.deal_date || '').trim()
  const propertyDescription = (body.property_description || '').trim()

  if (!ownerReferralId && !buyerReferralId) {
    return e.json(400, {
      message:
        'Informe ao menos uma indicação (proprietário ou interessado) para registrar o negócio.',
    })
  }

  if (valueBrl <= 0 || !dealDate) {
    return e.json(400, { message: 'Valor do negócio e data são obrigatórios.' })
  }

  let ownerRef = null
  let buyerRef = null

  if (ownerReferralId) {
    try {
      ownerRef = $app.findRecordById('referrals', ownerReferralId)
    } catch (_) {
      return e.json(404, { message: 'Indicação do proprietário não encontrada.' })
    }
  }

  if (buyerReferralId) {
    try {
      buyerRef = $app.findRecordById('referrals', buyerReferralId)
    } catch (_) {
      return e.json(404, { message: 'Indicação do interessado não encontrada.' })
    }
  }

  const dealsCol = $app.findCollectionByNameOrId('deals')
  const deal = new Record(dealsCol)
  if (ownerRef) deal.set('owner_referral_id', ownerRef.id)
  if (buyerRef) deal.set('buyer_referral_id', buyerRef.id)
  deal.set('deal_type', dealType)
  deal.set('value_brl', valueBrl)
  deal.set('deal_date', dealDate)
  deal.set('property_description', propertyDescription)
  deal.set('registered_by', authRecord.id)
  $app.save(deal)

  const eventsCol = $app.findCollectionByNameOrId('referral_events')

  if (ownerRef) {
    const targetOwnerStatus = dealType === 'locacao' ? 'alugada' : 'vendida'
    const curOwnerStatus = ownerRef.getString('status')
    ownerRef.set('status', targetOwnerStatus)
    ownerRef.set('deal_value_brl', valueBrl)
    ownerRef.set('deal_date', dealDate)
    $app.save(ownerRef)

    const ev1 = new Record(eventsCol)
    ev1.set('referral_id', ownerRef.id)
    ev1.set('from_status', curOwnerStatus)
    ev1.set('to_status', targetOwnerStatus)
    ev1.set('actor_id', authRecord.id)
    ev1.set('actor_name', authRecord.getString('name') || 'Admin')
    ev1.set('public_label', targetOwnerStatus === 'alugada' ? 'Alugado' : 'Vendido')
    ev1.set('visible_to_participant', true)
    $app.save(ev1)
  }

  if (buyerRef) {
    const targetBuyerStatus = dealType === 'locacao' ? 'alugou' : 'comprou'
    const curBuyerStatus = buyerRef.getString('status')
    buyerRef.set('status', targetBuyerStatus)
    buyerRef.set('deal_value_brl', valueBrl)
    buyerRef.set('deal_date', dealDate)
    $app.save(buyerRef)

    const ev2 = new Record(eventsCol)
    ev2.set('referral_id', buyerRef.id)
    ev2.set('from_status', curBuyerStatus)
    ev2.set('to_status', targetBuyerStatus)
    ev2.set('actor_id', authRecord.id)
    ev2.set('actor_name', authRecord.getString('name') || 'Admin')
    ev2.set('public_label', targetBuyerStatus === 'alugou' ? 'Alugou' : 'Comprou')
    ev2.set('visible_to_participant', true)
    $app.save(ev2)
  }

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'deal_registered')
    audit.set('resource_type', 'deals')
    audit.set('resource_id', deal.id)
    audit.set(
      'details',
      JSON.stringify({
        owner_referral_id: ownerReferralId,
        buyer_referral_id: buyerReferralId,
        deal_type: dealType,
        value_brl: valueBrl,
        deal_date: dealDate,
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Negócio registrado com sucesso!',
    deal_id: deal.id,
  })
})

/**
 * GET /backend/v1/public/vitrine/{imovelId}
 * Retorna dados públicos do imóvel em divulgação (sem unidade nem endereço completo)
 */
routerAdd('GET', '/backend/v1/public/vitrine/{imovelId}', (e) => {
  const imovelId = e.request.pathValue('imovelId')
  if (!imovelId) return e.json(400, { message: 'ID do imóvel não informado.' })

  let referral
  try {
    referral = $app.findRecordById('referrals', imovelId)
  } catch (_) {
    return e.json(404, { message: 'Imóvel não encontrado.' })
  }

  const curStatus = referral.getString('status')
  if (curStatus !== 'em_divulgacao') {
    return e.json(404, { message: 'Imóvel não disponível na vitrine pública.' })
  }

  let condoName = 'Condomínio de Alto Padrão'
  let condoNeighborhood = referral.getString('target_neighborhood') || ''
  const condoId = referral.getString('condominium_id')
  if (condoId) {
    try {
      const condo = $app.findRecordById('condominiums', condoId)
      condoName = condo.getString('name') || condoName
      if (!condoNeighborhood) condoNeighborhood = condo.getString('neighborhood') || ''
    } catch (_) {}
  }

  let publicPhotos = []
  try {
    const rawPhotos = referral.getString('public_photos')
    if (rawPhotos) publicPhotos = JSON.parse(rawPhotos)
  } catch (_) {}

  return e.json(200, {
    id: referral.id,
    condo_name: condoName,
    neighborhood: condoNeighborhood || 'Barra da Tijuca / Recreio',
    public_summary: referral.getString('public_summary') || referral.getString('description') || '',
    public_photos: publicPhotos,
    listing_link: referral.getString('is_reserved_listing')
      ? ''
      : referral.getString('listing_link'),
    is_reserved_listing: referral.getBool('is_reserved_listing'),
  })
})

/**
 * POST /backend/v1/public/submit-buyer-lead
 */
routerAdd('POST', '/backend/v1/public/submit-buyer-lead', (e) => {
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}

  const code = (body.referral_code || body.code || '').trim()
  const propertyReferralId = (body.property_referral_id || '').trim()
  const name = (body.name || '').trim()
  const phone = (body.phone || '').trim()
  const email = (body.email || '').trim()
  const notes = (body.notes || '').trim()

  if (!code) {
    return e.json(400, { message: 'Código do indicador não informado.' })
  }

  if (!name || !phone) {
    return e.json(400, { message: 'Nome e telefone para contato são obrigatórios.' })
  }

  let memberUser = null
  let participantRec = null

  try {
    participantRec = $app.findFirstRecordByFilter('participants', `referral_code = '${code}'`)
    if (participantRec) {
      memberUser = $app.findRecordById('users', participantRec.getString('user_id'))
    }
  } catch (_) {}

  if (!memberUser) {
    try {
      memberUser = $app.findFirstRecordByFilter('users', `public_slug = '${code}'`)
    } catch (_) {}
  }

  if (!memberUser) {
    return e.json(404, { message: 'Código de indicação de parceiro não localizado.' })
  }

  let propInfo = ''
  if (propertyReferralId) {
    try {
      const p = $app.findRecordById('referrals', propertyReferralId)
      propInfo = `Interesse no imóvel #${propertyReferralId.substring(0, 6)} - ${p.getString('public_summary') || ''}`
    } catch (_) {}
  }

  const referralsCol = $app.findCollectionByNameOrId('referrals')
  const newRef = new Record(referralsCol)

  newRef.set('type', 'cliente')
  newRef.set('referral_type', 'comprador')
  newRef.set('referrer_name', memberUser.getString('name') || 'Membro Vitrine')
  newRef.set('referrer_phone', memberUser.getString('phone') || '')
  newRef.set(
    'description',
    `${propInfo ? propInfo + '\n\n' : ''}Lead interessado: ${name}. Contato: ${phone} / ${email}. ${notes ? 'Observações: ' + notes : ''}`,
  )
  newRef.set('return_contact', `${email} / ${phone}`)
  newRef.set('status', 'recebida')
  newRef.set('channel', 'link_publico')
  newRef.set('source_origin', 'vitrine')
  newRef.set('buyer_name', name)
  newRef.set('buyer_phone', phone)
  newRef.set('buyer_email', email)
  newRef.set('current_owner_id', memberUser.id)
  newRef.set('original_owner_id', memberUser.id)
  if (participantRec) newRef.set('participant_id', participantRec.id)

  $app.save(newRef)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('action', 'buyer_lead_submitted_vitrine')
    audit.set('resource_type', 'referrals')
    audit.set('resource_id', newRef.id)
    audit.set(
      'details',
      JSON.stringify({
        member_user_id: memberUser.id,
        code,
        property_referral_id: propertyReferralId,
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message:
      'Seu interesse foi registrado com sucesso! Em breve um consultor Godoy Prime entrará em contato.',
    lead_id: newRef.id,
  })
})

/**
 * POST /backend/v1/referrals/resolve-attribution-hint
 */
routerAdd('POST', '/backend/v1/referrals/resolve-attribution-hint', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isInternal = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      5,
      0,
    )
    isInternal = rolesRecords.length > 0
  } catch (_) {}

  if (!isInternal) return e.json(403, { message: 'Acesso negado.' })

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const referralId = (body.referral_id || '').trim()
  const action = (body.action || '').trim()
  const targetMemberId = (body.target_member_id || '').trim()

  if (!referralId || !action) {
    return e.json(400, { message: 'ID da indicação e ação são obrigatórios.' })
  }

  let referral
  try {
    referral = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação não encontrada.' })
  }

  if (action === 'confirmar') {
    if (!targetMemberId) {
      return e.json(400, { message: 'Selecione o membro para confirmar a atribuição.' })
    }
    referral.set('attribution_status', 'atribuida')
    referral.set('original_owner_id', targetMemberId)
    referral.set('current_owner_id', targetMemberId)
  } else {
    referral.set('attribution_status', 'recusada')
  }

  $app.save(referral)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'attribution_hint_resolved')
    audit.set('resource_type', 'referrals')
    audit.set('resource_id', referral.id)
    audit.set('details', JSON.stringify({ action, target_member_id: targetMemberId }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: action === 'confirmar' ? 'Vínculo confirmado com sucesso.' : 'Vínculo recusado.',
    referral_id: referral.id,
  })
})

/**
 * POST /backend/v1/referrals/confirm-consent
 */
routerAdd('POST', '/backend/v1/referrals/confirm-consent', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isInternal = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      5,
      0,
    )
    isInternal = rolesRecords.length > 0
  } catch (_) {}

  if (!isInternal) return e.json(403, { message: 'Acesso negado.' })

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const referralId = (body.referral_id || '').trim()

  if (!referralId) return e.json(400, { message: 'ID da indicação é obrigatório.' })

  let referral
  try {
    referral = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação não encontrada.' })
  }

  referral.set('consent_confirmed_by_operator', true)
  $app.save(referral)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'referral_consent_confirmed_operator')
    audit.set('resource_type', 'referrals')
    audit.set('resource_id', referral.id)
    audit.set('details', '{}')
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Consentimento confirmado pelo operador com sucesso.',
  })
})

/**
 * POST /backend/v1/admin/participants/approve
 */
routerAdd('POST', '/backend/v1/admin/participants/approve', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isInternal = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      5,
      0,
    )
    isInternal = rolesRecords.length > 0
  } catch (_) {}

  if (!isInternal) return e.json(403, { message: 'Acesso negado.' })

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const participantId = (body.participant_id || '').trim()

  if (!participantId) return e.json(400, { message: 'ID do participante é obrigatório.' })

  let part
  try {
    part = $app.findRecordById('participants', participantId)
  } catch (_) {
    return e.json(404, { message: 'Participante não encontrado.' })
  }

  part.set('status', 'ativo')
  part.set('approved_at', new Date().toISOString())
  part.set('approved_by', authRecord.id)
  $app.save(part)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'participant_approved')
    audit.set('resource_type', 'participants')
    audit.set('resource_id', part.id)
    audit.set('details', JSON.stringify({ user_id: part.getString('user_id') }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, { success: true, message: 'Cadastro do participante aprovado com sucesso!' })
})

/**
 * POST /backend/v1/admin/participants/suspend
 */
routerAdd('POST', '/backend/v1/admin/participants/suspend', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isAdmin = false
  try {
    const check = $app.findFirstRecordByFilter(
      'user_roles',
      `user_id = '${authRecord.id}' && role = 'admin'`,
    )
    isAdmin = !!check
  } catch (_) {
    isAdmin = false
  }

  if (!isAdmin) {
    return e.json(403, { message: 'Apenas administradores podem suspender participantes.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const participantId = (body.participant_id || '').trim()
  const reason = (body.reason || '').trim()

  if (!participantId || !reason) {
    return e.json(400, { message: 'ID do participante e motivo da suspensão são obrigatórios.' })
  }

  let part
  try {
    part = $app.findRecordById('participants', participantId)
  } catch (_) {
    return e.json(404, { message: 'Participante não encontrado.' })
  }

  part.set('status', 'suspenso')
  part.set(
    'notes',
    `[Suspensão em ${new Date().toLocaleDateString('pt-BR')}] ${reason}\n` +
      (part.getString('notes') || ''),
  )
  $app.save(part)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'participant_suspended')
    audit.set('resource_type', 'participants')
    audit.set('resource_id', part.id)
    audit.set('details', JSON.stringify({ reason }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, { success: true, message: 'Participante suspenso com sucesso.' })
})

/**
 * GET /backend/v1/documents/{id}/download-url
 */
routerAdd('GET', '/backend/v1/documents/{id}/download-url', (e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { message: 'Não autorizado.' })

  let isInternal = false
  try {
    const rolesRecords = $app.findRecordsByFilter(
      'user_roles',
      `user_id = '${authRecord.id}'`,
      'created',
      5,
      0,
    )
    isInternal = rolesRecords.length > 0
  } catch (_) {}

  if (!isInternal) return e.json(403, { message: 'Acesso restrito à equipe interna.' })

  const docId = e.request.pathValue('id')
  if (!docId) return e.json(400, { message: 'ID do documento não informado.' })

  let doc
  try {
    doc = $app.findRecordById('documents', docId)
  } catch (_) {
    return e.json(404, { message: 'Documento não encontrado.' })
  }

  const fileName = doc.getString('file')
  if (!fileName) {
    return e.json(400, { message: 'Arquivo inexistente neste registro.' })
  }

  const fileToken = $security.createJWT(
    {
      id: doc.id,
      collectionId: doc.collection().id,
      fileName,
    },
    $app.settings().recordAuthToken.secret,
    5 * 60,
  )

  const downloadUrl = `/api/files/${doc.collection().id}/${doc.id}/${fileName}?token=${fileToken}`

  return e.json(200, {
    success: true,
    file_name: fileName,
    title: doc.getString('title'),
    bucket_type: doc.getString('bucket_type'),
    url: downloadUrl,
    expires_in_seconds: 300,
  })
})
