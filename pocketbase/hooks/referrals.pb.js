// pocketbase/hooks/referrals.pb.js

/**
 * Public route to submit a referral through a member's public link.
 * Does NOT require authentication.
 * Resolves the member by public_slug or user id.
 */
routerAdd('POST', '/backend/v1/public-referrals', (e) => {
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}

  const memberIdentifier = (body.memberIdentifier || '').trim()
  const type = (body.type || '').trim()
  const referrerName = (body.referrer_name || '').trim()
  const referrerPhone = (body.referrer_phone || '').trim()
  const description = (body.description || '').trim()
  const returnContact = (body.return_contact || '').trim()
  const campaignCode = (body.campaign_code || '').trim()

  if (!memberIdentifier) {
    return e.json(400, { message: 'Identificador do membro não informado.' })
  }

  if (!type || (type !== 'imovel' && type !== 'cliente')) {
    return e.json(400, { message: "Tipo de indicação inválido. Deve ser 'imovel' ou 'cliente'." })
  }

  if (!referrerName) {
    return e.json(400, { message: 'Nome do indicador é obrigatório.' })
  }

  if (!referrerPhone) {
    return e.json(400, { message: 'Telefone do indicador é obrigatório.' })
  }

  if (!description) {
    return e.json(400, { message: 'Descrição do imóvel ou cliente é obrigatória.' })
  }

  if (!returnContact) {
    return e.json(400, { message: 'Contato de retorno é obrigatório.' })
  }

  // Find the target member by public_slug or id
  let targetUser = null
  try {
    targetUser = $app.findFirstRecordByFilter('users', 'public_slug = {:slug}', {
      slug: memberIdentifier,
    })
  } catch (_) {
    try {
      targetUser = $app.findRecordById('users', memberIdentifier)
    } catch (_) {
      return e.json(404, { message: 'Membro da rede Prime Circle não encontrado.' })
    }
  }

  if (!targetUser) {
    return e.json(404, { message: 'Membro da rede Prime Circle não encontrado.' })
  }

  const referralsCol = $app.findCollectionByNameOrId('referrals')
  const record = new Record(referralsCol)

  const channel = body.channel === 'manual' ? 'manual' : 'link_publico'
  const action = channel === 'manual' ? 'criada_manual' : 'criada_link_publico'
  const historyDesc =
    channel === 'manual'
      ? `Indicação cadastrada manualmente por ${targetUser.getString('name') || 'Membro'}`
      : `Indicação enviada pelo link público de ${targetUser.getString('name') || 'Membro'}`

  const now = new Date().toISOString()
  const historyItem = {
    date: now,
    action: action,
    description: historyDesc,
    actor: referrerName,
    to_user_id: targetUser.id,
    to_user_name: targetUser.getString('name') || 'Membro',
  }

  record.set('type', type)
  record.set('referrer_name', referrerName)
  record.set('referrer_phone', referrerPhone)
  record.set('description', description)
  record.set('return_contact', returnContact)
  record.set('status', 'nova')
  record.set('channel', channel)
  record.set('current_owner_id', targetUser.id)
  record.set('original_owner_id', targetUser.id)
  record.set('history', JSON.stringify([historyItem]))

  if (campaignCode) {
    try {
      const camp = $app.findFirstRecordByFilter('campaigns', 'code = {:c}', { c: campaignCode })
      if (camp) {
        record.set('campaign_id', camp.id)
      }
    } catch (_) {}
  }

  $app.save(record)

  return e.json(200, {
    success: true,
    message: 'Indicação enviada com sucesso!',
    id: record.id,
    memberName: targetUser.getString('name'),
    agency: targetUser.getString('agency'),
  })
})

/**
 * Public route to resolve member info for the public capture page.
 * Returns public display fields only (no password, emails, tokens, etc.)
 */
routerAdd('GET', '/backend/v1/public-member/{slugOrId}', (e) => {
  const param = e.request.pathValue('slugOrId')
  if (!param) {
    return e.json(400, { message: 'Slug ou ID não informado.' })
  }

  let user = null
  try {
    user = $app.findFirstRecordByFilter('users', 'public_slug = {:slug}', { slug: param })
  } catch (_) {
    try {
      user = $app.findRecordById('users', param)
    } catch (_) {
      return e.json(404, { message: 'Membro não encontrado.' })
    }
  }

  if (!user) {
    return e.json(404, { message: 'Membro não encontrado.' })
  }

  const fullName = user.getString('name') || ''
  const firstName = fullName.trim().split(/\s+/)[0] || 'Membro'

  return e.json(200, {
    id: user.id,
    name: firstName,
    first_name: firstName,
    agency: user.getString('agency'),
    phone: '',
    public_slug: user.getString('public_slug'),
  })
})

/**
 * Route: Update participant's own profile data (phone, address, pix_key, pix_key_type, condominium_name)
 * Ignores status, category, level, referral_code, notes, approved_at, approved_by.
 * POST /backend/v1/participant/update-profile
 */
routerAdd('POST', '/backend/v1/participant/update-profile', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}

  let participant = null
  try {
    participant = $app.findFirstRecordByFilter('participants', 'user_id = {:uid}', {
      uid: authRecord.id,
    })
  } catch (_) {}

  // Update user record (phone, name, agency, public_slug)
  if (body.name !== undefined) authRecord.set('name', String(body.name).trim())
  if (body.phone !== undefined) authRecord.set('phone', String(body.phone).trim())
  if (body.agency !== undefined) authRecord.set('agency', String(body.agency).trim())
  if (body.public_slug !== undefined) authRecord.set('public_slug', String(body.public_slug).trim())
  $app.save(authRecord)

  // Helper to mask PIX key for audit logs and security notifications
  function maskPixKey(key) {
    if (!key) return ''
    const str = String(key).trim()
    if (str.length <= 4) return '***'
    // CPF/CNPJ or phone or random string: keep first 3 and last 2 characters
    const start = str.substring(0, 3)
    const end = str.substring(str.length - 2)
    return `${start}***${end}`
  }

  // Update participant record (only personal details)
  if (participant) {
    const oldPixKey = participant.getString('pix_key') || ''
    const oldPixKeyType = participant.getString('pix_key_type') || ''
    const newPixKey = body.pix_key !== undefined ? String(body.pix_key).trim() : oldPixKey
    const newPixKeyType =
      body.pix_key_type !== undefined
        ? String(body.pix_key_type).trim().toLowerCase()
        : oldPixKeyType
    const pixChanged = body.pix_key !== undefined && newPixKey !== oldPixKey

    const declarouTitularidade = !!(
      body.pix_ownership_declared === true ||
      body.declarou_titularidade === true ||
      body.declarouTitularidade === true
    )

    // Escopo C3a-fix2d (ELEGIBILIDADE):
    // A chave Pix precisa ser do CPF do próprio participante; se a chave for de outro tipo (e-mail, telefone, aleatória),
    // exigir a declaração "A chave é de minha titularidade" marcada, e gravar essa declaração em audit_logs (quem declarou, quando, IP).
    // Recusar com 400 se não vier a declaração com chave de outro tipo.
    if (newPixKey && newPixKeyType !== 'cpf') {
      if (!declarouTitularidade) {
        return e.json(400, {
          message:
            'Para chaves Pix que não sejam CPF, é obrigatório marcar a declaração "A chave é de minha titularidade".',
        })
      }

      // Gravar a declaração de titularidade em audit_logs
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor_id', authRecord.id)
        audit.set('actor_email', authRecord.getString('email'))
        audit.set('action', 'pix_ownership_declared')
        audit.set('resource_type', 'participants')
        audit.set('resource_id', participant.id)
        audit.set(
          'details',
          JSON.stringify({
            pix_key_type: newPixKeyType,
            pix_key_masked: maskPixKey(newPixKey),
            declaration: 'A chave é de minha titularidade',
            declared_at: new Date().toISOString(),
          }),
        )
        audit.set('ip_address', e.request.remoteAddr)
        $app.save(audit)
      } catch (errAuditTitular) {
        console.error(
          '[update-profile] Erro ao gravar audit log de titularidade Pix:',
          errAuditTitular,
        )
      }
    }

    if (body.phone !== undefined) participant.set('phone', String(body.phone).trim())
    if (body.address !== undefined) participant.set('address', String(body.address).trim())
    if (body.pix_key !== undefined) participant.set('pix_key', newPixKey)
    if (body.pix_key_type !== undefined) participant.set('pix_key_type', newPixKeyType)
    if (body.condominium_name !== undefined)
      participant.set('condominium_name', String(body.condominium_name).trim())
    $app.save(participant)

    // Item 6: Gravar audit_logs com o valor antigo e novo MASCARADOS e notificar por e-mail e WhatsApp
    if (pixChanged) {
      const maskedOld = maskPixKey(oldPixKey)
      const maskedNew = maskPixKey(newPixKey)

      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor_id', authRecord.id)
        audit.set('actor_email', authRecord.getString('email'))
        audit.set('action', 'pix_key_updated')
        audit.set('resource_type', 'participants')
        audit.set('resource_id', participant.id)
        audit.set(
          'details',
          JSON.stringify({
            participant_id: participant.id,
            old_pix_key_masked: maskedOld,
            new_pix_key_masked: maskedNew,
            old_pix_key_type: oldPixKeyType,
            new_pix_key_type: newPixKeyType,
          }),
        )
        audit.set('ip_address', e.request.remoteAddr)
        $app.save(audit)
      } catch (errAudit) {
        console.error('[update-profile] Erro ao gravar audit_logs para troca de PIX:', errAudit)
      }

      // Notificar o participante via e-mail e WhatsApp pelos canais existentes
      try {
        const participantName = authRecord.getString('name') || 'Parceiro'
        const participantEmail = authRecord.getString('email')
        const participantPhone = authRecord.getString('phone') || participant.getString('phone')

        // 1. Notificação por Email via Resend se configurado
        const resendKey = $os.getenv('RESEND_API_KEY')
        if (resendKey && participantEmail) {
          try {
            $http.send({
              url: 'https://api.resend.com/emails',
              method: 'POST',
              headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              data: JSON.stringify({
                from: 'Godoy Prime Indica <contato@godoyprime.com.br>',
                to: [participantEmail],
                subject: 'Alerta de Segurança: Chave PIX alterada — Godoy Prime Indica',
                text: `Olá, ${participantName}!\n\nConfirmamos que sua chave PIX de recebimento no Godoy Prime Indica foi atualizada.\n\nChave anterior: ${maskedOld || '(nenhuma)'}\nNova chave: ${maskedNew}\n\nSe você não realizou essa alteração, entre em contato imediatamente com nossa equipe de atendimento para proteger sua conta.`,
              }),
              timeout: 10,
            })
          } catch (errEmail) {
            console.error('[update-profile] Erro ao enviar email de aviso PIX:', errEmail)
          }
        }

        // 2. Notificação por WhatsApp via Meta Cloud API se configurado
        const metaToken = $os.getenv('META_WA_ACCESS_TOKEN')
        const phoneId = $os.getenv('META_WA_PHONE_NUMBER_ID')
        if (metaToken && phoneId && participantPhone) {
          try {
            let digits = String(participantPhone).replace(/\D/g, '')
            if (digits.startsWith('0')) digits = digits.substring(1)
            if (!digits.startsWith('55')) digits = '55' + digits

            $http.send({
              url: `https://graph.facebook.com/v19.0/${phoneId}/messages`,
              method: 'POST',
              headers: { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
              data: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: digits,
                type: 'text',
                text: {
                  body: `Olá, ${participantName}! Sua chave PIX de recebimento no Godoy Prime Indica foi alterada para a chave terminada em ${maskedNew}. Se você não reconhece esta alteração, contate o suporte imediatamente.`,
                },
              }),
              timeout: 10,
            })
          } catch (errWa) {
            console.error('[update-profile] Erro ao enviar WhatsApp de aviso PIX:', errWa)
          }
        }

        // 3. Gravar logs em notification_logs para rastreabilidade
        if (participantEmail) {
          try {
            const notifCol = $app.findCollectionByNameOrId('notification_logs')
            const nlog = new Record(notifCol)
            nlog.set('channel', 'email')
            nlog.set('recipient', participantEmail)
            nlog.set('event_code', 'pix_key_updated_alert')
            nlog.set('entity_id', participant.id)
            nlog.set('status', resendKey ? 'sent' : 'queued')
            $app.save(nlog)
          } catch (_) {}
        }
        if (participantPhone) {
          try {
            const notifCol = $app.findCollectionByNameOrId('notification_logs')
            const nlogWa = new Record(notifCol)
            nlogWa.set('channel', 'whatsapp')
            nlogWa.set('recipient', participantPhone)
            nlogWa.set('event_code', 'pix_key_updated_alert')
            nlogWa.set('entity_id', participant.id)
            nlogWa.set('status', metaToken && phoneId ? 'sent' : 'queued')
            $app.save(nlogWa)
          } catch (_) {}
        }
      } catch (errNotify) {
        console.error('[update-profile] Erro no fluxo de notificação PIX:', errNotify)
      }
    }
  }

  return e.json(200, {
    success: true,
    message: 'Dados atualizados com sucesso.',
    user: {
      id: authRecord.id,
      name: authRecord.getString('name'),
      phone: authRecord.getString('phone'),
      agency: authRecord.getString('agency'),
      public_slug: authRecord.getString('public_slug'),
    },
    participant: participant
      ? {
          id: participant.id,
          address: participant.getString('address'),
          pix_key: participant.getString('pix_key'),
          pix_key_type: participant.getString('pix_key_type'),
          condominium_name: participant.getString('condominium_name'),
        }
      : null,
  })
})

/**
 * Route: List caller's referrals with sanitized public view (LGPD compliant).
 * Returns: id, protocol, type, referral_type, first name of indicated party, neighborhood, visible stage, dates, and public reason code.
 * Never returns: phone, email, CPF, full address, unit or internal notes.
 * Also includes referral_events where visible_to_participant = true for caller's referrals.
 * GET /backend/v1/participant/my-referrals
 */
routerAdd('GET', '/backend/v1/participant/my-referrals', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado.' })
  }

  // Find participant record for auth user if any
  let participantId = ''
  try {
    const partRec = $app.findFirstRecordByFilter('participants', 'user_id = {:uid}', {
      uid: authRecord.id,
    })
    if (partRec) participantId = partRec.id
  } catch (_) {}

  const reqInfo = e.requestInfo()
  const queryId = (reqInfo.query && reqInfo.query.id ? reqInfo.query.id : '').trim()

  // Se o usuário passou queryId, valida se o formato é alfanumérico padrão do PocketBase (15 chars)
  // Caso contenha caracteres suspeitos (aspas, operadores, injeção), rejeita ou restringe a busca de forma 100% segura
  if (queryId && !/^[a-zA-Z0-9_-]{3,30}$/.test(queryId)) {
    // ID inválido ou tentativa de injeção: retorna lista vazia imediatamente
    return e.json(200, { items: [] })
  }

  const filterParams = { uid: authRecord.id }
  let filter = '(current_owner_id = {:uid} || original_owner_id = {:uid}'
  if (participantId) {
    filterParams.pid = participantId
    filter += ' || participant_id = {:pid}'
  }
  filter += ')'

  if (queryId) {
    filterParams.qid = queryId
    filter += ' && id = {:qid}'
  }

  const records = $app.findRecordsByFilter('referrals', filter, '-created', 500, 0, filterParams)

  function mapPublicStage(status, refType) {
    if (refType === 'proprietario' || refType === 'imovel') {
      if (status === 'recebida') return 'Recebida'
      if (status === 'em_triagem' || status === 'aceita') return 'Em análise'
      if (
        status === 'em_contato' ||
        status === 'qualificada' ||
        status === 'em_negociacao' ||
        status === 'captacao_solicitada'
      )
        return 'Em contato'
      if (status === 'captada') return 'Captado'
      if (status === 'em_divulgacao') return 'Em divulgação'
      if (status === 'vendida') return 'Vendido'
      if (status === 'alugada') return 'Alugado'
      if (status === 'declinada_pela_godoy') return 'Reconhecida'
      if (
        status === 'recusada' ||
        status === 'duplicada' ||
        status === 'perdida' ||
        status === 'retirada' ||
        status === 'cancelada'
      )
        return 'Não aproveitada'
      return 'Em andamento'
    } else {
      if (status === 'recebida') return 'Recebida'
      if (status === 'em_triagem' || status === 'aceita') return 'Em análise'
      if (status === 'em_atendimento') return 'Em atendimento'
      if (status === 'visitando') return 'Visitando imóveis'
      if (status === 'proposta') return 'Proposta'
      if (status === 'comprou') return 'Comprou'
      if (status === 'alugou') return 'Alugou'
      if (
        status === 'recusada' ||
        status === 'duplicada' ||
        status === 'perdida' ||
        status === 'cancelada'
      )
        return 'Não aproveitada'
      return 'Em andamento'
    }
  }

  const items = []
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const status = r.getString('status') || 'recebida'
    const type = r.getString('type')
    let refType = r.getString('referral_type')
    if (!refType) {
      refType = type === 'cliente' ? 'comprador' : 'proprietario'
    }

    const rawFullName =
      r.getString('owner_name') || r.getString('buyer_name') || r.getString('referrer_name') || ''
    const indicatedFirstName = rawFullName.trim().split(/\s+/)[0] || 'Indicado'

    let neighborhood = r.getString('target_neighborhood') || ''
    const condoId = r.getString('condominium_id')
    if (condoId && !neighborhood) {
      try {
        const c = $app.findRecordById('condominiums', condoId)
        if (c) neighborhood = c.getString('neighborhood') || ''
      } catch (_) {}
    }

    const publicStage = mapPublicStage(status, refType)

    // Monta public_summary seguro (tipo, bairro, contexto geral — sem endereço, unidade, telefone, email, CPF ou notas internas)
    let summary = (r.getString('public_summary') || '').trim()
    if (!summary) {
      const typeLabel =
        refType === 'proprietario'
          ? type === 'proprietario_locacao'
            ? 'Imóvel para Locação'
            : 'Imóvel para Venda'
          : refType === 'inquilino'
            ? 'Interesse em Locação'
            : 'Interesse em Compra'
      const targetPlace = neighborhood || 'Rio de Janeiro'
      summary = `${typeLabel} em ${targetPlace}`
    }

    // Fetch visible events for this referral
    let events = []
    try {
      const evRecords = $app.findRecordsByFilter(
        'referral_events',
        `referral_id = '${r.id}' && visible_to_participant = true`,
        'created',
        50,
        0,
      )
      events = evRecords.map((ev) => ({
        id: ev.id,
        created: ev.getString('created'),
        public_label: ev.getString('public_label') || ev.getString('to_status'),
        reason: ev.getString('public_reason_code') || '',
      }))
    } catch (_) {}

    items.push({
      id: r.id,
      protocol: '#' + r.id.substring(0, 8).toUpperCase(),
      type: type,
      referral_type: refType,
      indicated_first_name: indicatedFirstName,
      neighborhood: neighborhood || 'Rio de Janeiro',
      status: status,
      public_stage: publicStage,
      created: r.getString('created'),
      updated: r.getString('updated'),
      attended_at: r.getString('attended_at') || null,
      deal_date: r.getString('deal_date') || null,
      public_reason_code: r.getString('public_reason_code') || '',
      status_reason: r.getString('public_reason_code') ? r.getString('status_reason') : '',
      channel: r.getString('channel') || 'manual',
      public_summary: summary,
      events: events,
    })
  }

  return e.json(200, { items })
})

/**
 * Route: POST or GET /backend/v1/referrals/my-referrals
 * Standard endpoint as required by C3b
 */
function handleMyReferrals(e) {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado.' })
  }

  let participantId = ''
  let participantRec = null
  try {
    participantRec = $app.findFirstRecordByFilter('participants', 'user_id = {:uid}', {
      uid: authRecord.id,
    })
    if (participantRec) participantId = participantRec.id
  } catch (_) {}

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const query = reqInfo.query || {}
  const queryId = (body.id || query.id || '').trim()

  if (queryId && !/^[a-zA-Z0-9_-]{3,30}$/.test(queryId)) {
    return e.json(200, { items: [], participant: null })
  }

  const filterParams = { uid: authRecord.id }
  let filter = '(current_owner_id = {:uid} || original_owner_id = {:uid}'
  if (participantId) {
    filterParams.pid = participantId
    filter += ' || participant_id = {:pid}'
  }
  filter += ')'

  if (queryId) {
    filterParams.qid = queryId
    filter += ' && id = {:qid}'
  }

  const records = $app.findRecordsByFilter('referrals', filter, '-created', 500, 0, filterParams)

  function mapTimelineStage(status, refType, primeiraVisitaAt) {
    if (primeiraVisitaAt) {
      if (status === 'comprou' || status === 'alugou' || status === 'concluida') return 'Concluída'
      return 'Atendimento realizado'
    }
    if (status === 'recebida' || status === 'nova') return 'Nova'
    if (status === 'em_triagem' || status === 'aceita') return 'Em análise'
    if (
      status === 'em_atendimento' ||
      status === 'em_contato' ||
      status === 'qualificada' ||
      status === 'visitando' ||
      status === 'proposta' ||
      status === 'em_negociacao' ||
      status === 'captacao_solicitada'
    ) {
      return 'Em atendimento'
    }
    if (status === 'captada' || status === 'em_divulgacao') return 'Imóvel disponível'
    if (
      status === 'vendida' ||
      status === 'alugada' ||
      status === 'comprou' ||
      status === 'concluida'
    ) {
      return 'Concluída'
    }
    if (status === 'declinada_pela_godoy') return 'Reconhecida'
    if (
      status === 'recusada' ||
      status === 'duplicada' ||
      status === 'perdida' ||
      status === 'retirada' ||
      status === 'cancelada'
    ) {
      return 'Não aproveitada'
    }
    return 'Em atendimento'
  }

  const items = []
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const status = r.getString('status') || 'nova'
    const type = r.getString('type')
    let refType = r.getString('referral_type')
    if (!refType) {
      refType = type === 'cliente' ? 'comprador' : 'proprietario'
    }

    const rawFullName =
      r.getString('owner_name') || r.getString('buyer_name') || r.getString('referrer_name') || ''
    const indicatedFirstName = rawFullName.trim().split(/\s+/)[0] || 'Indicado'

    let neighborhood = r.getString('target_neighborhood') || ''
    const condoId = r.getString('condominium_id')
    if (condoId && !neighborhood) {
      try {
        const c = $app.findRecordById('condominiums', condoId)
        if (c) neighborhood = c.getString('neighborhood') || ''
      } catch (_) {}
    }

    const primeiraVisitaAt = r.getString('primeira_visita_at') || null
    const timelineStage = mapTimelineStage(status, refType, primeiraVisitaAt)

    let summary = (r.getString('public_summary') || '').trim()
    if (!summary) {
      const typeLabel =
        refType === 'proprietario'
          ? type === 'proprietario_locacao'
            ? 'Imóvel para Locação'
            : 'Imóvel para Venda'
          : 'Interesse em Compra'
      summary = `${typeLabel} em ${neighborhood || 'Barra da Tijuca / Recreio'}`
    }

    let events = []
    try {
      const evRecords = $app.findRecordsByFilter(
        'referral_events',
        `referral_id = '${r.id}' && visible_to_participant = true`,
        'created',
        50,
        0,
      )
      events = evRecords.map((ev) => ({
        id: ev.id,
        created: ev.getString('created'),
        public_label: ev.getString('public_label') || ev.getString('to_status'),
        reason: ev.getString('public_reason_code') || '',
      }))
    } catch (_) {}

    items.push({
      id: r.id,
      protocol: '#' + r.id.substring(0, 8).toUpperCase(),
      type: type,
      referral_type: refType,
      indicated_first_name: indicatedFirstName,
      neighborhood: neighborhood || 'Barra da Tijuca / Recreio',
      status: status,
      timeline_stage: timelineStage,
      public_stage: timelineStage,
      created: r.getString('created'),
      updated: r.getString('updated'),
      attended_at: r.getString('attended_at') || null,
      primeira_visita_at: primeiraVisitaAt,
      deal_date: r.getString('deal_date') || null,
      public_reason_code: r.getString('public_reason_code') || '',
      status_reason: r.getString('public_reason_code') ? r.getString('status_reason') : '',
      channel: r.getString('channel') || 'painel_direto',
      public_summary: summary,
      events: events,
    })
  }

  return e.json(200, {
    items,
    participant: participantRec
      ? {
          id: participantRec.id,
          referral_code: participantRec.getString('referral_code'),
          status: participantRec.getString('status'),
        }
      : null,
  })
}

routerAdd('GET', '/backend/v1/referrals/my-referrals', handleMyReferrals)
routerAdd('POST', '/backend/v1/referrals/my-referrals', handleMyReferrals)

/**
 * Route: GET /backend/v1/participant/clube-beneficios
 * Devolve APENAS a URL do Clube de benefícios Godoy Prime cadastrada em program_settings.
 * Acesso não depende de ter indicado; liberado para participante ativo autenticado.
 */
routerAdd('GET', '/backend/v1/participant/clube-beneficios', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado.' })
  }

  // Verifica se o participante existe e está ativo (ou usuário admin)
  let isActive = false
  try {
    const part = $app.findFirstRecordByFilter(
      'participants',
      'user_id = {:uid} && status = "ativo"',
      { uid: authRecord.id },
    )
    if (part) isActive = true
  } catch (_) {}

  if (!isActive) {
    try {
      const role = $app.findFirstRecordByFilter(
        'user_roles',
        'user_id = {:uid} && role = "admin"',
        { uid: authRecord.id },
      )
      if (role) isActive = true
    } catch (_) {}
  }

  if (!isActive) {
    return e.json(403, {
      message: 'Apenas participantes com status ativo têm acesso ao Clube de Benefícios.',
    })
  }

  let url = ''
  try {
    const stRec = $app.findFirstRecordByData('program_settings', 'key', 'clube_beneficios_url')
    if (stRec) {
      const valJson = stRec.getString('value_json')
      if (valJson) {
        try {
          const parsed = JSON.parse(valJson)
          if (typeof parsed === 'string') url = parsed.trim()
          else if (parsed && typeof parsed === 'object' && parsed.url) {
            url = String(parsed.url).trim()
          }
        } catch (_) {
          url = valJson.replace(/^["']|["']$/g, '').trim()
        }
      }
    }
  } catch (_) {}

  return e.json(200, {
    url: url || '',
  })
})

/**
 * Route: POST /backend/v1/referrals/submit-direct-referral
 * Authorized only for categories that allow direct panel submissions (allowed_channels != 'link_only')
 */
routerAdd('POST', '/backend/v1/referrals/submit-direct-referral', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado. Faça login para enviar indicação.' })
  }

  // 1. Obter o participante do usuário logado
  let participantRec = null
  try {
    participantRec = $app.findFirstRecordByFilter('participants', 'user_id = {:uid}', {
      uid: authRecord.id,
    })
  } catch (_) {
    return e.json(400, {
      message:
        'Cadastro de participante não encontrado para este usuário. Complete seu cadastro primeiro.',
    })
  }

  if (participantRec.getString('status') !== 'ativo') {
    return e.json(403, {
      message: 'Seu cadastro de indicador ainda não está ativo. Aguarde a aprovação.',
    })
  }

  // 2. Verificar se a categoria permite indicação direta pelo painel (allowed_channels != 'link_only')
  const categoryId = participantRec.getString('category_id')
  if (!categoryId) {
    return e.json(400, { message: 'Categoria do participante não definida.' })
  }

  let catRec = null
  try {
    catRec = $app.findRecordById('participant_categories', categoryId)
  } catch (_) {
    return e.json(400, { message: 'Categoria inválida.' })
  }

  const allowedChannels = catRec.getString('allowed_channels') || 'link_only'
  if (allowedChannels === 'link_only') {
    return e.json(403, {
      message: `A sua categoria (${catRec.getString('name')}) permite indicações exclusivamente pelo seu link pessoal ou cartão com QR entregue em mãos ao indicado. Não é permitido envio direto pelo painel.`,
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}

  // 3. Validação dos campos da indicação
  const indicatedType = (body.referral_type || body.type || 'proprietario').trim()
  const indicatedName = (body.indicated_name || body.name || '').trim()
  const indicatedPhone = (body.indicated_phone || body.phone || '').trim()
  const indicatedEmail = (body.indicated_email || body.email || '').trim()
  const neighborhood = (
    body.target_neighborhood ||
    body.neighborhood ||
    'Barra da Tijuca / Recreio'
  ).trim()
  const notes = (body.notes || body.description || '').trim()

  if (!indicatedName) {
    return e.json(400, { message: 'Nome da pessoa indicada é obrigatório.' })
  }
  if (!indicatedPhone) {
    return e.json(400, { message: 'Telefone da pessoa indicada é obrigatório.' })
  }

  // Declaração de consentimento obrigatória
  if (body.consent_declared !== true && body.consent_status !== 'declarado_indicador') {
    return e.json(400, {
      message:
        'Você deve declarar que a pessoa indicada concordou previamente em ser contatada pela Godoy Prime Realty.',
    })
  }

  // Normalização do tipo
  let refType = 'proprietario'
  let dbType = 'proprietario_venda'
  if (indicatedType === 'comprador' || indicatedType === 'cliente') {
    refType = 'comprador'
    dbType = 'cliente'
  } else if (indicatedType === 'proprietario_locacao') {
    refType = 'proprietario'
    dbType = 'proprietario_locacao'
  }

  const referralsCol = $app.findCollectionByNameOrId('referrals')
  const newRef = new Record(referralsCol)

  newRef.set('channel', 'manual')
  newRef.set('type', dbType)
  newRef.set('referral_type', refType)
  newRef.set('participant_id', participantRec.id)
  newRef.set('current_owner_id', authRecord.id)
  newRef.set('original_owner_id', authRecord.id)
  newRef.set('status', 'nova')
  newRef.set('attribution_status', 'atribuida')
  newRef.set('consent_declared', true)
  newRef.set('consent_status', 'declarado_indicador')
  newRef.set('target_neighborhood', neighborhood)

  if (refType === 'proprietario') {
    newRef.set('owner_name', indicatedName)
    newRef.set('owner_phone', indicatedPhone)
    if (indicatedEmail) newRef.set('owner_email', indicatedEmail)
  } else {
    newRef.set('buyer_name', indicatedName)
    newRef.set('buyer_phone', indicatedPhone)
    if (indicatedEmail) newRef.set('buyer_email', indicatedEmail)
  }

  newRef.set('referrer_name', authRecord.getString('name') || 'Indicador')
  newRef.set('referrer_phone', authRecord.getString('phone') || '')
  newRef.set('return_contact', 'Painel do Indicador')
  newRef.set('description', notes || `Indicação direta registrada pelo indicador.`)
  newRef.set(
    'public_summary',
    `${refType === 'proprietario' ? 'Proprietário' : 'Comprador'} em ${neighborhood}`,
  )

  $app.save(newRef)

  // Registrar evento inicial visível
  try {
    const eventsCol = $app.findCollectionByNameOrId('referral_events')
    const ev = new Record(eventsCol)
    ev.set('referral_id', newRef.id)
    ev.set('from_status', '')
    ev.set('to_status', 'nova')
    ev.set('actor_id', authRecord.id)
    ev.set('actor_name', authRecord.getString('name') || 'Indicador')
    ev.set('public_label', 'Indicação recebida pelo painel')
    ev.set('visible_to_participant', true)
    $app.save(ev)
  } catch (_) {}

  // Auditoria
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'direct_referral_submitted')
    audit.set('resource_type', 'referrals')
    audit.set('resource_id', newRef.id)
    audit.set(
      'details',
      JSON.stringify({
        participant_id: participantRec.id,
        category: catRec.getString('name'),
        consent_status: 'declarado_indicador',
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Indicação enviada com sucesso! Acompanhe o andamento pelo seu painel.',
    id: newRef.id,
    protocol: '#' + newRef.id.substring(0, 8).toUpperCase(),
  })
})

/**
 * Route: POST /backend/v1/referrals/first-contact-done
 * C10b — Grava first_contact_at e first_contact_by na indicação e registra evento interno
 * Exige admin ou operador e consent_status = 'declarado_indicador'
 */
routerAdd('POST', '/backend/v1/referrals/first-contact-done', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado. Faça login como operador ou administrador.' })
  }

  let isAllowed = false
  if (authRecord.getBool('is_admin') || authRecord.getBool('is_operador')) {
    isAllowed = true
  } else {
    try {
      const roles = $app.findRecordsByFilter(
        'user_roles',
        'user_id = {:uid} && (role = "admin" || role = "operador")',
        'created',
        5,
        0,
        { uid: authRecord.id },
      )
      isAllowed = roles.length > 0
    } catch (_) {
      isAllowed = false
    }
  }

  if (!isAllowed) {
    return e.json(403, {
      message: 'Acesso restrito a corretores operadores ou administradores.',
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const referralId = (body.referral_id || '').trim()

  if (!referralId) {
    return e.json(400, { message: 'ID da indicação é obrigatório.' })
  }

  let ref = null
  try {
    ref = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação não encontrada.' })
  }

  // Validação estrita: apenas indicações com consent_status = 'declarado_indicador'
  const consentStatus = ref.getString('consent_status')
  if (consentStatus !== 'declarado_indicador') {
    return e.json(400, {
      message:
        'Operação permitida apenas para indicações diretas com consentimento declarado pelo indicador (consent_status = declarado_indicador).',
    })
  }

  const nowIso = new Date().toISOString()
  ref.set('first_contact_at', nowIso)
  ref.set('first_contact_by', authRecord.id)
  $app.save(ref)

  // Registra evento interno NÃO visível ao indicador
  try {
    const eventsCol = $app.findCollectionByNameOrId('referral_events')
    const ev = new Record(eventsCol)
    ev.set('referral_id', ref.id)
    ev.set('from_status', ref.getString('status'))
    ev.set('to_status', ref.getString('status'))
    ev.set('actor_id', authRecord.id)
    ev.set('actor_name', authRecord.getString('name') || authRecord.getString('email'))
    ev.set(
      'reason',
      'Primeiro contato realizado pelo corretor com informação de origem da indicação.',
    )
    ev.set('public_label', 'Primeiro contato realizado')
    ev.set('visible_to_participant', false)
    ev.set(
      'metadata',
      JSON.stringify({
        action: 'first_contact_done',
        first_contact_at: nowIso,
        first_contact_by: authRecord.id,
      }),
    )
    $app.save(ev)
  } catch (_) {}

  // Auditoria
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'referral_first_contact_done')
    audit.set('resource_type', 'referrals')
    audit.set('resource_id', ref.id)
    audit.set(
      'details',
      JSON.stringify({
        first_contact_at: nowIso,
        first_contact_by: authRecord.id,
        first_contact_by_name: authRecord.getString('name'),
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Primeiro contato registrado com sucesso.',
    referral_id: ref.id,
    first_contact_at: nowIso,
    first_contact_by: authRecord.id,
  })
})

/**
 * Route: POST /backend/v1/referrals/contact-refused
 * C10b — Indicado não quer ser contatado.
 * Anonimiza os dados do indicado (nome, telefone, e-mail, CPF, endereço e descrição),
 * muda status para 'cancelada' com motivo público 'Não aproveitada',
 * cancela recompensas/gratificações ainda não pagas dessa indicação
 * e grava em audit_logs quem fez e quando.
 * Exige admin ou operador e consent_status = 'declarado_indicador'
 */
routerAdd('POST', '/backend/v1/referrals/contact-refused', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado. Faça login como operador ou administrador.' })
  }

  let isAllowed = false
  if (authRecord.getBool('is_admin') || authRecord.getBool('is_operador')) {
    isAllowed = true
  } else {
    try {
      const roles = $app.findRecordsByFilter(
        'user_roles',
        'user_id = {:uid} && (role = "admin" || role = "operador")',
        'created',
        5,
        0,
        { uid: authRecord.id },
      )
      isAllowed = roles.length > 0
    } catch (_) {
      isAllowed = false
    }
  }

  if (!isAllowed) {
    return e.json(403, {
      message: 'Acesso restrito a corretores operadores ou administradores.',
    })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const referralId = (body.referral_id || '').trim()
  const reason = (body.reason || 'Indicado não quer ser contatado').trim()

  if (!referralId) {
    return e.json(400, { message: 'ID da indicação é obrigatório.' })
  }

  let ref = null
  try {
    ref = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação não encontrada.' })
  }

  // Validação estrita: apenas indicações com consent_status = 'declarado_indicador'
  const consentStatus = ref.getString('consent_status')
  if (consentStatus !== 'declarado_indicador') {
    return e.json(400, {
      message:
        'Operação permitida apenas para indicações diretas com consentimento declarado pelo indicador (consent_status = declarado_indicador).',
    })
  }

  const nowIso = new Date().toISOString()
  const previousStatus = ref.getString('status')
  const maskedLabel = '[DADOS APAGADOS - CONTATO RECUSADO]'

  // 1. Anonimizar dados do indicado e limpar contato residual em referrals
  let cleanedReferralsCount = 0
  ref.set('status', 'cancelada')
  ref.set('status_reason', reason)
  ref.set('public_reason_code', 'recusada')
  ref.set('owner_name', maskedLabel)
  ref.set('owner_phone', '')
  ref.set('owner_email', '')
  ref.set('owner_cpf', '')
  ref.set('buyer_name', maskedLabel)
  ref.set('buyer_phone', '')
  ref.set('buyer_email', '')
  ref.set('return_contact', '')
  ref.set('unit', '')
  ref.set('normalized_address', '')
  ref.set('description', `[Dados do indicado excluídos: ${reason}]`)
  ref.set('anonymized_at', nowIso)
  ref.set('anonymized_reason', reason)
  $app.save(ref)
  cleanedReferralsCount = 1

  // Limpeza de contato residual do indicado em duplicate_flags
  let cleanedDuplicateFlagsCount = 0
  try {
    const dupFlags = $app.findRecordsByFilter(
      'duplicate_flags',
      'referral_id = {:refId} || conflicting_referral_id = {:refId}',
      'created',
      100,
      0,
      { refId: ref.id },
    )
    for (let i = 0; i < dupFlags.length; i++) {
      const flag = dupFlags[i]
      flag.set('conflict_details', '[dados excluídos]')
      $app.save(flag)
      cleanedDuplicateFlagsCount++
    }
  } catch (errDup) {
    console.error('[contact-refused] Erro ao limpar duplicate_flags:', errDup)
  }

  // Limpeza de contato residual do indicado em message_queue
  let cleanedMessageQueueCount = 0
  try {
    const queueRecords = $app.findRecordsByFilter(
      'message_queue',
      'metadata ~ {:refId}',
      'created',
      100,
      0,
      { refId: ref.id },
    )
    for (let i = 0; i < queueRecords.length; i++) {
      const q = queueRecords[i]
      q.set('recipient', '[dados excluídos]')
      q.set('params', '[]')
      q.set('last_error', '')
      if (q.getString('status') === 'pending') {
        q.set('status', 'cancelled')
      }
      try {
        const meta = JSON.parse(q.getString('metadata')) || {}
        meta.button_url_param = ''
        q.set('metadata', JSON.stringify(meta))
      } catch (_) {
        q.set('metadata', '{}')
      }
      $app.save(q)
      cleanedMessageQueueCount++
    }
  } catch (errMq) {
    console.error('[contact-refused] Erro ao limpar message_queue:', errMq)
  }

  // Limpeza de contato residual do indicado em notification_logs
  let cleanedNotificationLogsCount = 0
  try {
    const notifRecords = $app.findRecordsByFilter(
      'notification_logs',
      'entity_id = {:refId}',
      'created',
      100,
      0,
      { refId: ref.id },
    )
    for (let i = 0; i < notifRecords.length; i++) {
      const nl = notifRecords[i]
      nl.set('recipient', '[dados excluídos]')
      nl.set('error', '')
      $app.save(nl)
      cleanedNotificationLogsCount++
    }
  } catch (errNl) {
    console.error('[contact-refused] Erro ao limpar notification_logs:', errNl)
  }

  // 2. Cancelar recompensas e gratificações ainda não pagas
  // (status: em_analise, pendente_dados, aprovada, em_lote não pagas, aguardando_comissao, em_revisao_admin)
  let cancelledRewardsCount = 0
  try {
    const unpaidRewards = $app.findRecordsByFilter(
      'rewards',
      'referral_id = {:refId} && status != "paga" && status != "cancelada"',
      'created',
      100,
      0,
      { refId: ref.id },
    )
    for (let i = 0; i < unpaidRewards.length; i++) {
      const rw = unpaidRewards[i]
      rw.set('status', 'cancelada')
      rw.set(
        'adjustment_reason',
        `Cancelada automaticamente por recusa de contato do indicado na indicação #${ref.id}`,
      )
      $app.save(rw)
      cancelledRewardsCount++
    }
  } catch (errRw) {
    console.error('[contact-refused] Erro ao cancelar recompensas:', errRw)
  }

  // Cancelar também benefit_grants (gratificações de catálogo) não entregues
  let cancelledGrantsCount = 0
  try {
    const unpaidGrants = $app.findRecordsByFilter(
      'benefit_grants',
      'referral_id = {:refId} && status != "entregue" && status != "cancelado"',
      'created',
      50,
      0,
      { refId: ref.id },
    )
    for (let j = 0; j < unpaidGrants.length; j++) {
      const bg = unpaidGrants[j]
      bg.set('status', 'cancelado')
      bg.set('notes', `Cancelado por recusa de contato do indicado na indicação #${ref.id}`)
      $app.save(bg)
      cancelledGrantsCount++
    }
  } catch (errBg) {
    console.error('[contact-refused] Erro ao cancelar gratificações de catálogo:', errBg)
  }

  // 3. Registrar evento de cancelamento com rótulo público "Não aproveitada"
  try {
    const eventsCol = $app.findCollectionByNameOrId('referral_events')
    const ev = new Record(eventsCol)
    ev.set('referral_id', ref.id)
    ev.set('from_status', previousStatus)
    ev.set('to_status', 'cancelada')
    ev.set('actor_id', authRecord.id)
    ev.set('actor_name', authRecord.getString('name') || authRecord.getString('email'))
    ev.set('reason', reason)
    ev.set('public_reason_code', 'recusada')
    ev.set('public_label', 'Não aproveitada')
    ev.set('visible_to_participant', true)
    ev.set(
      'metadata',
      JSON.stringify({
        action: 'contact_refused',
        cancelled_rewards_count: cancelledRewardsCount,
        cancelled_grants_count: cancelledGrantsCount,
      }),
    )
    $app.save(ev)
  } catch (_) {}

  // 4. Gravar em audit_logs quem fez e quando (incluindo contagem de registros limpos por coleção)
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'referral_contact_refused')
    audit.set('resource_type', 'referrals')
    audit.set('resource_id', ref.id)
    audit.set(
      'details',
      JSON.stringify({
        reason: reason,
        anonymized_at: nowIso,
        cancelled_rewards_count: cancelledRewardsCount,
        cancelled_grants_count: cancelledGrantsCount,
        cleaned_counts: {
          referrals: cleanedReferralsCount,
          duplicate_flags: cleanedDuplicateFlagsCount,
          message_queue: cleanedMessageQueueCount,
          notification_logs: cleanedNotificationLogsCount,
        },
        cleaned_referrals_count: cleanedReferralsCount,
        cleaned_duplicate_flags_count: cleanedDuplicateFlagsCount,
        cleaned_message_queue_count: cleanedMessageQueueCount,
        cleaned_notification_logs_count: cleanedNotificationLogsCount,
        actor_name: authRecord.getString('name'),
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (errAudit) {
    console.error('[contact-refused] Erro ao gravar audit log:', errAudit)
  }

  return e.json(200, {
    success: true,
    message: 'Contato recusado. Dados pessoais do indicado anonimizados e recompensas canceladas.',
    referral_id: ref.id,
    cancelled_rewards_count: cancelledRewardsCount,
    cancelled_grants_count: cancelledGrantsCount,
    cleaned_counts: {
      referrals: cleanedReferralsCount,
      duplicate_flags: cleanedDuplicateFlagsCount,
      message_queue: cleanedMessageQueueCount,
      notification_logs: cleanedNotificationLogsCount,
    },
  })
})

/**
 * Route: POST /backend/v1/referrals/refuse-contact (compatibilidade legada)
 */
routerAdd('POST', '/backend/v1/referrals/refuse-contact', (e) => {
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const referralId = (body.referral_id || '').trim()
  const reason = (body.reason || 'Indicado recusou contato no primeiro atendimento').trim()

  if (!referralId) {
    return e.json(400, { message: 'ID da indicação é obrigatório.' })
  }

  let ref = null
  try {
    ref = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação não encontrada.' })
  }

  const nowIso = new Date().toISOString()
  const maskedLabel = '[DADOS APAGADOS - CONTATO RECUSADO]'

  ref.set('status', 'cancelada')
  ref.set('status_reason', reason)
  ref.set('public_reason_code', 'recusada')
  ref.set('owner_name', maskedLabel)
  ref.set('owner_phone', '')
  ref.set('owner_email', '')
  ref.set('owner_cpf', '')
  ref.set('buyer_name', maskedLabel)
  ref.set('buyer_phone', '')
  ref.set('buyer_email', '')
  ref.set('unit', '')
  ref.set('normalized_address', '')
  ref.set('description', `[Dados do indicado excluídos sob recusa de contato: ${reason}]`)
  ref.set('anonymized_at', nowIso)
  ref.set('anonymized_reason', reason)

  $app.save(ref)

  try {
    const eventsCol = $app.findCollectionByNameOrId('referral_events')
    const ev = new Record(eventsCol)
    ev.set('referral_id', ref.id)
    ev.set('from_status', ref.original().getString('status'))
    ev.set('to_status', 'cancelada')
    ev.set('public_label', 'Não aproveitada')
    ev.set('reason', 'recusada')
    ev.set('visible_to_participant', true)
    $app.save(ev)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Contato recusado. Dados pessoais do indicado foram apagados com sucesso.',
  })
})
