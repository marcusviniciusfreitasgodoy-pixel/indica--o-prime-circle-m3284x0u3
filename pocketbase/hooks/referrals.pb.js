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
