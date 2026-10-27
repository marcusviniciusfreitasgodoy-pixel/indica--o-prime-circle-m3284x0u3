// pocketbase/hooks/communication.pb.js
// Implementa as rotas de comunicação e mensageria da Etapa 4
// Regra JSVM do PocketBase: cada callback precisa ser autocontido (inline helpers).

/**
 * 2. POST /backend/v1/communication/send-whatsapp
 */
routerAdd('POST', '/backend/v1/communication/send-whatsapp', (e) => {
  // --- Inline Helpers ---
  function checkAuth() {
    const reqSecret = e.request.header.get('X-Internal-Secret') || e.request.header.get('x-internal-secret')
    const envSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')

    if (envSecret && reqSecret && reqSecret === envSecret) {
      return { ok: true, isAdmin: true }
    }

    const authRecord = e.auth
    if (!authRecord) {
      return { ok: false, error: 'Acesso não autorizado. Cabeçalho de segredo interno ou login de usuário interno é obrigatório.' }
    }

    try {
      const rolesRecords = $app.findRecordsByFilter(
        'user_roles',
        `user_id = '${authRecord.id}'`,
        'created',
        10,
        0,
      )
      const roles = rolesRecords.map((r) => r.getString('role'))
      if (roles.length > 0) {
        return { ok: true, isAdmin: roles.includes('admin') }
      }
    } catch (_) {}

    return { ok: false, error: 'Acesso negado. Usuário sem papel interno na plataforma.' }
  }

  function formatPhone(phone) {
    if (!phone) return ''
    let digits = String(phone).replace(/\D/g, '')
    if (digits.startsWith('0')) digits = digits.substring(1)
    if (!digits.startsWith('55')) digits = '55' + digits
    return digits
  }

  function checkQuietHours() {
    let quietConfig = { start: '21:00', end: '08:00' }
    try {
      const rec = $app.findFirstRecordByData('program_settings', 'key', 'whatsapp_quiet_hours')
      const parsed = JSON.parse(rec.getString('value_json'))
      if (parsed && parsed.start && parsed.end) quietConfig = parsed
    } catch (_) {}

    const now = new Date()
    const utcHours = now.getUTCHours()
    const utcMins = now.getUTCMinutes()
    const brHours = (utcHours - 3 + 24) % 24
    const currentMinutes = brHours * 60 + utcMins

    const [startH, startM] = quietConfig.start.split(':').map(Number)
    const [endH, endM] = quietConfig.end.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  function getQuietEndTime() {
    let endHour = 8
    let endMinute = 0
    try {
      const rec = $app.findFirstRecordByData('program_settings', 'key', 'whatsapp_quiet_hours')
      const parsed = JSON.parse(rec.getString('value_json'))
      if (parsed && parsed.end) {
        const parts = parsed.end.split(':').map(Number)
        endHour = parts[0]
        endMinute = parts[1] || 0
      }
    } catch (_) {}

    const now = new Date()
    const target = new Date(now.getTime())
    const utcHours = now.getUTCHours()
    const brHours = (utcHours - 3 + 24) % 24

    if (brHours >= endHour) {
      target.setUTCDate(target.getUTCDate() + 1)
    }
    target.setUTCHours(endHour + 3, endMinute, 0, 0)
    return target.toISOString()
  }

  function logNotif(data) {
    try {
      const col = $app.findCollectionByNameOrId('notification_logs')
      const rec = new Record(col)
      rec.set('recipient', data.recipient)
      rec.set('channel', data.channel)
      rec.set('event_code', data.event_code)
      rec.set('status', data.status)
      if (data.provider_message_id) rec.set('provider_message_id', data.provider_message_id)
      if (data.error) rec.set('error', String(data.error).substring(0, 1000))
      if (data.entity_id) rec.set('entity_id', data.entity_id)
      rec.set('status_updated_at', new Date().toISOString())
      $app.save(rec)
      return rec
    } catch (err) {
      console.error('[logNotif] Erro:', err)
      return null
    }
  }

  function sendMeta(options) {
    const token = $os.getenv('META_WA_ACCESS_TOKEN')
    const phoneId = $os.getenv('META_WA_PHONE_NUMBER_ID')

    if (!token || token === 'placeholder_meta_wa_access_token' || token.trim() === '') {
      return { ok: false, error: 'Secret META_WA_ACCESS_TOKEN ausente ou não configurado.' }
    }
    if (!phoneId || phoneId === 'placeholder_meta_phone_number_id' || phoneId.trim() === '') {
      return { ok: false, error: 'Secret META_WA_PHONE_NUMBER_ID ausente ou não configurado.' }
    }

    const formattedTo = formatPhone(options.to)
    const components = []

    if (options.parameters && options.parameters.length > 0) {
      components.push({
        type: 'body',
        parameters: options.parameters.map((val) => ({
          type: 'text',
          text: String(val || ''),
        })),
      })
    }

    if (options.button_url_param) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: String(options.button_url_param) }],
      })
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedTo,
      type: 'template',
      template: {
        name: options.template_name,
        language: { code: options.language || 'pt_BR' },
        components: components.length > 0 ? components : undefined,
      },
    }

    let attempt = 0
    let lastError = null
    while (attempt < 3) {
      attempt++
      try {
        const res = $http.send({
          url: `https://graph.facebook.com/v19.0/${phoneId}/messages`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          data: JSON.stringify(payload),
          timeout: 15,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          let respData = {}
          try { respData = JSON.parse(res.rawText) } catch (_) {}
          const providerMsgId = respData.messages && respData.messages[0] ? respData.messages[0].id : null
          return { ok: true, provider_message_id: providerMsgId, data: respData, attempt }
        } else {
          lastError = `Meta API retornou status ${res.statusCode}: ${res.rawText}`
          if (res.statusCode === 400 || res.statusCode === 401 || res.statusCode === 403) break
        }
      } catch (err) {
        lastError = `Falha de rede Meta: ${err.message}`
      }
    }

    return { ok: false, error: lastError || 'Falha no envio Meta WhatsApp Cloud API', attempt }
  }

  // --- Execução da rota ---
  const auth = checkAuth()
  if (!auth.ok) {
    return e.json(403, { message: auth.error })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const to = (body.to || '').trim()
  const templateName = (body.template_name || '').trim()
  const templateId = (body.template_id || '').trim()
  const eventCode = (body.event_code || '').trim()
  const params = body.params || []
  const buttonUrlParam = (body.button_url_param || '').trim()
  const entityId = (body.entity_id || '').trim()
  const forceSend = !!body.force_send

  if (!to) {
    return e.json(400, { message: 'Número de telefone de destino (to) é obrigatório.' })
  }

  const formattedPhone = formatPhone(to)

  let templateRec = null
  if (templateId) {
    try { templateRec = $app.findRecordById('message_templates', templateId) } catch (_) {}
  } else if (templateName) {
    try {
      templateRec = $app.findFirstRecordByFilter('message_templates', `meta_template_name = '${templateName}' && channel = 'whatsapp'`)
    } catch (_) {}
  } else if (eventCode) {
    try {
      templateRec = $app.findFirstRecordByFilter('message_templates', `event_code = '${eventCode}' && channel = 'whatsapp' && active = true`)
    } catch (_) {}
  }

  if (!templateRec) {
    logNotif({
      recipient: formattedPhone,
      channel: 'whatsapp',
      event_code: eventCode || templateName || 'unknown',
      status: 'failed',
      error: 'Modelo de mensagem não encontrado na base.',
      entity_id: entityId,
    })
    return e.json(404, { message: 'Modelo de WhatsApp não encontrado.' })
  }

  const actualTemplateName = templateRec.getString('meta_template_name')
  const metaStatus = templateRec.getString('meta_status')
  const metaCategory = templateRec.getString('meta_category') || 'utility'
  const finalEventCode = templateRec.getString('event_code') || eventCode

  if (metaStatus !== 'approved' && !forceSend) {
    const errorMsg = `Envio bloqueado: modelo '${actualTemplateName}' está '${metaStatus}' (exige 'approved').`
    logNotif({
      recipient: formattedPhone,
      channel: 'whatsapp',
      event_code: finalEventCode,
      status: 'failed',
      error: errorMsg,
      entity_id: entityId,
    })
    return e.json(400, { message: errorMsg })
  }

  let hasOptin = false
  try {
    const optinRec = $app.findFirstRecordByFilter('whatsapp_optins', `phone = '${formattedPhone}' && opted_out_at = ''`)
    if (optinRec) hasOptin = true
  } catch (_) {
    hasOptin = false
  }

  if (!hasOptin && !forceSend) {
    const errorMsg = `Envio bloqueado: número ${formattedPhone} não possui opt-in ativo em whatsapp_optins.`
    logNotif({
      recipient: formattedPhone,
      channel: 'whatsapp',
      event_code: finalEventCode,
      status: 'failed',
      error: errorMsg,
      entity_id: entityId,
    })
    return e.json(400, { message: errorMsg, blocked_reason: 'no_optin' })
  }

  if (metaCategory === 'marketing') {
    let monthlyLimit = 4
    try {
      const st = $app.findFirstRecordByData('program_settings', 'key', 'marketing_messages_monthly_limit')
      const parsedVal = JSON.parse(st.getString('value_json'))
      if (typeof parsedVal === 'number') monthlyLimit = parsedVal
    } catch (_) {}

    const startOfMonth = new Date()
    startOfMonth.setUTCDate(1)
    startOfMonth.setUTCHours(0, 0, 0, 0)
    const startIso = startOfMonth.toISOString()

    try {
      const sentMarketing = $app.findRecordsByFilter(
        'notification_logs',
        `recipient = '${formattedPhone}' && channel = 'whatsapp' && status = 'sent' && created >= '${startIso}'`,
        '-created',
        50,
        0,
      )
      if (sentMarketing.length >= monthlyLimit && !forceSend) {
        const errorMsg = `Envio bloqueado: participante atingiu o teto mensal de ${monthlyLimit} mensagens de marketing.`
        logNotif({
          recipient: formattedPhone,
          channel: 'whatsapp',
          event_code: finalEventCode,
          status: 'failed',
          error: errorMsg,
          entity_id: entityId,
        })
        return e.json(429, { message: errorMsg, blocked_reason: 'marketing_cap_reached' })
      }
    } catch (_) {}
  }

  if (checkQuietHours() && !forceSend) {
    const resumeAt = getQuietEndTime()
    try {
      const qCol = $app.findCollectionByNameOrId('message_queue')
      const qRec = new Record(qCol)
      qRec.set('template_id', templateRec.id)
      qRec.set('channel', 'whatsapp')
      qRec.set('recipient', formattedPhone)
      qRec.set('params', JSON.stringify(params))
      qRec.set('send_after', resumeAt)
      qRec.set('attempts', 0)
      qRec.set('status', 'pending')
      qRec.set('metadata', JSON.stringify({ button_url_param: buttonUrlParam, entity_id: entityId, event_code: finalEventCode }))
      $app.save(qRec)
    } catch (_) {}

    logNotif({
      recipient: formattedPhone,
      channel: 'whatsapp',
      event_code: finalEventCode,
      status: 'queued',
      error: `Em horário de silêncio (21h-08h). Agendado para ${resumeAt}.`,
      entity_id: entityId,
    })

    return e.json(200, {
      success: true,
      queued: true,
      message: 'Mensagem na fila de horário de silêncio (21h às 08h). Saída às 08:00.',
      send_after: resumeAt,
    })
  }

  const sendRes = sendMeta({
    to: formattedPhone,
    template_name: actualTemplateName,
    language: templateRec.getString('meta_language') || 'pt_BR',
    parameters: params,
    button_url_param: buttonUrlParam || templateRec.getString('button_url_param'),
  })

  if (!sendRes.ok) {
    logNotif({
      recipient: formattedPhone,
      channel: 'whatsapp',
      event_code: finalEventCode,
      status: 'failed',
      error: sendRes.error,
      entity_id: entityId,
    })
    return e.json(500, {
      success: false,
      message: 'Erro ao enviar mensagem pelo WhatsApp da Meta.',
      error: sendRes.error,
      attempts: sendRes.attempt,
    })
  }

  logNotif({
    recipient: formattedPhone,
    channel: 'whatsapp',
    event_code: finalEventCode,
    status: 'sent',
    provider_message_id: sendRes.provider_message_id,
    entity_id: entityId,
  })

  return e.json(200, {
    success: true,
    message: 'Mensagem de WhatsApp enviada com sucesso.',
    provider_message_id: sendRes.provider_message_id,
    attempts: sendRes.attempt,
  })
})

/**
 * 2a. GET /backend/v1/communication/whatsapp-webhook
 */
routerAdd('GET', '/backend/v1/communication/whatsapp-webhook', (e) => {
  const query = e.request.url.query()
  const mode = query['hub.mode']
  const token = query['hub.verify_token']
  const challenge = query['hub.challenge']

  const verifyToken = $os.getenv('META_WEBHOOK_VERIFY_TOKEN')
  if (!verifyToken || verifyToken === 'placeholder_meta_webhook_verify_token' || verifyToken.trim() === '') {
    return e.string(500, 'Secret META_WEBHOOK_VERIFY_TOKEN não configurado no servidor.')
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return e.string(200, challenge || '')
  }

  return e.string(403, 'Falha na verificação do Webhook Meta. Token incorreto.')
})

/**
 * 2a. POST /backend/v1/communication/whatsapp-webhook
 */
routerAdd('POST', '/backend/v1/communication/whatsapp-webhook', (e) => {
  function formatPhone(phone) {
    if (!phone) return ''
    let digits = String(phone).replace(/\D/g, '')
    if (digits.startsWith('0')) digits = digits.substring(1)
    if (!digits.startsWith('55')) digits = '55' + digits
    return digits
  }

  function sendResendEmail(options) {
    const apiKey = $os.getenv('RESEND_API_KEY')
    if (!apiKey || apiKey === 'placeholder_resend_api_key' || apiKey.trim() === '') return { ok: false }
    try {
      $http.send({
        url: 'https://api.resend.com/emails',
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        data: JSON.stringify({
          from: 'Godoy Prime Indica <contato@godoyprime.com.br>',
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          text: options.text,
        }),
        timeout: 10,
      })
      return { ok: true }
    } catch (_) {
      return { ok: false }
    }
  }

  const appSecret = $os.getenv('META_APP_SECRET')
  if (!appSecret || appSecret === 'placeholder_meta_app_secret' || appSecret.trim() === '') {
    return e.json(500, { error: 'Secret META_APP_SECRET não configurado.' })
  }

  const rawBody = e.request.rawBody || ''
  const hubSig = e.request.header.get('X-Hub-Signature-256') || e.request.header.get('x-hub-signature-256') || ''

  if (!hubSig.startsWith('sha256=')) {
    return e.json(401, { error: 'Assinatura X-Hub-Signature-256 ausente ou formato inválido.' })
  }

  const expectedHash = $security.hs256(rawBody, appSecret)
  const receivedHash = hubSig.replace('sha256=', '').trim()

  if (expectedHash !== receivedHash) {
    return e.json(403, { error: 'Assinatura inválida.' })
  }

  let body = {}
  try {
    body = JSON.parse(rawBody)
  } catch (_) {
    return e.json(400, { error: 'JSON malformatado.' })
  }

  if (body.object !== 'whatsapp_business_account') {
    return e.json(200, { status: 'ignored' })
  }

  const entries = body.entry || []
  for (let i = 0; i < entries.length; i++) {
    const changes = entries[i].changes || []
    for (let j = 0; j < changes.length; j++) {
      const val = changes[j].value || {}

      const statuses = val.statuses || []
      for (let k = 0; k < statuses.length; k++) {
        const s = statuses[k]
        const wamid = s.id
        const st = s.status

        if (wamid) {
          try {
            const logs = $app.findRecordsByFilter('notification_logs', `provider_message_id = '${wamid}'`, '-created', 1, 0)
            if (logs.length > 0) {
              const logRec = logs[0]
              logRec.set('status', st)
              logRec.set('status_updated_at', new Date().toISOString())
              if (s.errors && s.errors.length > 0) {
                logRec.set('error', JSON.stringify(s.errors))
              }
              $app.save(logRec)
            }
          } catch (err) {
            console.error('[webhook:statusUpdate] Erro:', err)
          }
        }
      }

      const messages = val.messages || []
      for (let m = 0; m < messages.length; m++) {
        const msg = messages[m]
        const fromNumber = formatPhone(msg.from)
        const textBody = (msg.text && msg.text.body ? msg.text.body : '').trim().toUpperCase()

        if (textBody === 'SAIR' || textBody === 'PARAR' || textBody === 'STOP') {
          try {
            const optins = $app.findRecordsByFilter('whatsapp_optins', `phone = '${fromNumber}' && opted_out_at = ''`, '-created', 10, 0)
            for (let o = 0; o < optins.length; o++) {
              const opt = optins[o]
              opt.set('opted_out_at', new Date().toISOString())
              $app.save(opt)
            }
          } catch (err) {
            console.error('[webhook:optout] Erro:', err)
          }
        } else {
          try {
            const recentRefs = $app.findRecordsByFilter(
              'referrals',
              `owner_phone ~ '${fromNumber}' || buyer_phone ~ '${fromNumber}' || referrer_phone ~ '${fromNumber}'`,
              '-updated',
              1,
              0,
            )

            let operatorEmail = 'contato@godoyprime.com.br'
            let refInfo = 'Geral'
            if (recentRefs.length > 0) {
              const ref = recentRefs[0]
              refInfo = `Indicação #${ref.id.substring(0, 6)} (${ref.getString('status')})`
              const opId = ref.getString('assigned_operator_id')
              if (opId) {
                try {
                  const op = $app.findRecordById('users', opId)
                  operatorEmail = op.getString('email') || operatorEmail
                } catch (_) {}
              }
            }

            sendResendEmail({
              to: operatorEmail,
              subject: `[WhatsApp] Resposta recebida de ${fromNumber}`,
              text: `Mensagem recebida no WhatsApp (${fromNumber}) referente a ${refInfo}:\n\n"${msg.text ? msg.text.body : '[Mídia/Anexo]'}"\n\nAcesse o sistema: https://indicacao.godoyprime.com.br/admin`,
            })
          } catch (_) {}
        }
      }
    }
  }

  return e.json(200, { success: true })
})

/**
 * 2b. POST /backend/v1/communication/sync-whatsapp-templates
 */
routerAdd('POST', '/backend/v1/communication/sync-whatsapp-templates', (e) => {
  const authRecord = e.auth
  let isAdmin = false

  if (authRecord) {
    try {
      const check = $app.findFirstRecordByFilter('user_roles', `user_id = '${authRecord.id}' && role = 'admin'`)
      isAdmin = !!check
    } catch (_) {
      isAdmin = false
    }
  }

  const reqSecret = e.request.header.get('X-Internal-Secret') || e.request.header.get('x-internal-secret')
  const envSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')
  if (envSecret && reqSecret && reqSecret === envSecret) {
    isAdmin = true
  }

  if (!isAdmin) {
    return e.json(403, { message: 'Acesso negado. Apenas administradores podem sincronizar modelos.' })
  }

  const token = $os.getenv('META_WA_ACCESS_TOKEN')
  const wabaId = $os.getenv('META_WA_BUSINESS_ACCOUNT_ID')

  if (!token || token === 'placeholder_meta_wa_access_token' || token.trim() === '') {
    return e.json(400, { message: 'Secret META_WA_ACCESS_TOKEN não configurado no servidor.' })
  }
  if (!wabaId || wabaId === 'placeholder_meta_waba_id' || wabaId.trim() === '') {
    return e.json(400, { message: 'Secret META_WA_BUSINESS_ACCOUNT_ID não configurado no servidor.' })
  }

  try {
    const res = $http.send({
      url: `https://graph.facebook.com/v19.0/${wabaId}/message_templates?limit=100`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15,
    })

    if (res.statusCode < 200 || res.statusCode >= 300) {
      return e.json(500, { message: `Falha na Meta Graph API (${res.statusCode}): ${res.rawText}` })
    }

    const data = JSON.parse(res.rawText)
    const remoteTemplates = data.data || []
    let updatedCount = 0

    for (let i = 0; i < remoteTemplates.length; i++) {
      const t = remoteTemplates[i]
      const name = t.name
      const status = String(t.status || '').toLowerCase()
      const category = String(t.category || '').toLowerCase()

      try {
        const localTpls = $app.findRecordsByFilter('message_templates', `meta_template_name = '${name}' && channel = 'whatsapp'`, '-created', 5, 0)
        for (let j = 0; j < localTpls.length; j++) {
          const local = localTpls[j]
          local.set('meta_status', status)
          if (category === 'utility' || category === 'marketing') {
            local.set('meta_category', category)
          }
          $app.save(local)
          updatedCount++
        }
      } catch (_) {}
    }

    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const audit = new Record(auditCol)
      if (authRecord) {
        audit.set('actor_id', authRecord.id)
        audit.set('actor_email', authRecord.getString('email'))
      }
      audit.set('action', 'whatsapp_templates_synced')
      audit.set('resource_type', 'message_templates')
      audit.set('details', JSON.stringify({ templates_received: remoteTemplates.length, templates_updated: updatedCount }))
      $app.save(audit)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: `Modelos sincronizados com a Meta: ${remoteTemplates.length} remotos, ${updatedCount} atualizados localmente.`,
      remote_count: remoteTemplates.length,
      updated_count: updatedCount,
    })
  } catch (err) {
    return e.json(500, { message: `Erro ao sincronizar com a Meta: ${err.message}` })
  }
})

/**
 * 3. POST /backend/v1/communication/send-email
 */
routerAdd('POST', '/backend/v1/communication/send-email', (e) => {
  const reqSecret = e.request.header.get('X-Internal-Secret') || e.request.header.get('x-internal-secret')
  const envSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')
  let isAuthorized = envSecret && reqSecret && reqSecret === envSecret

  if (!isAuthorized && e.auth) {
    try {
      const roles = $app.findRecordsByFilter('user_roles', `user_id = '${e.auth.id}'`, 'created', 5, 0)
      if (roles.length > 0) isAuthorized = true
    } catch (_) {}
  }

  if (!isAuthorized) {
    return e.json(403, { message: 'Acesso negado. Segredo interno ou autenticação de equipe obrigatória.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const to = (body.to || '').trim()
  const subject = (body.subject || '').trim()
  const text = (body.text || body.body || '').trim()
  const html = body.html || ''
  const eventCode = (body.event_code || 'manual_email').trim()
  const entityId = (body.entity_id || '').trim()

  if (!to || !subject || !text) {
    return e.json(400, { message: 'Destinatário (to), assunto (subject) e corpo (text) são obrigatórios.' })
  }

  const apiKey = $os.getenv('RESEND_API_KEY')
  if (!apiKey || apiKey === 'placeholder_resend_api_key' || apiKey.trim() === '') {
    return e.json(500, { success: false, message: 'Secret RESEND_API_KEY ausente ou não configurado.' })
  }

  try {
    const res = $http.send({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        from: 'Godoy Prime Indica <contato@godoyprime.com.br>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || text.replace(/\n/g, '<br/>'),
        text,
      }),
      timeout: 15,
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      let data = {}
      try { data = JSON.parse(res.rawText) } catch (_) {}
      const msgId = data.id || 'resend_ok'

      try {
        const col = $app.findCollectionByNameOrId('notification_logs')
        const rec = new Record(col)
        rec.set('recipient', to)
        rec.set('channel', 'email')
        rec.set('event_code', eventCode)
        rec.set('status', 'sent')
        rec.set('provider_message_id', msgId)
        if (entityId) rec.set('entity_id', entityId)
        rec.set('status_updated_at', new Date().toISOString())
        $app.save(rec)
      } catch (_) {}

      return e.json(200, { success: true, message: 'E-mail enviado com sucesso.', id: msgId })
    } else {
      return e.json(500, { success: false, message: `Resend erro (${res.statusCode}): ${res.rawText}` })
    }
  } catch (err) {
    return e.json(500, { success: false, message: `Erro ao enviar e-mail: ${err.message}` })
  }
})

/**
 * 4. POST /backend/v1/communication/notify-event
 */
routerAdd('POST', '/backend/v1/communication/notify-event', (e) => {
  const reqSecret = e.request.header.get('X-Internal-Secret') || e.request.header.get('x-internal-secret')
  const envSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')
  let isAuthorized = envSecret && reqSecret && reqSecret === envSecret

  if (!isAuthorized && e.auth) {
    try {
      const roles = $app.findRecordsByFilter('user_roles', `user_id = '${e.auth.id}'`, 'created', 5, 0)
      if (roles.length > 0) isAuthorized = true
    } catch (_) {}
  }

  if (!isAuthorized) {
    return e.json(403, { message: 'Acesso negado.' })
  }

  function formatPhone(phone) {
    if (!phone) return ''
    let digits = String(phone).replace(/\D/g, '')
    if (digits.startsWith('0')) digits = digits.substring(1)
    if (!digits.startsWith('55')) digits = '55' + digits
    return digits
  }

  const reqInfo = e.requestInfo()
  const payload = reqInfo.body || {}
  const eventCode = (payload.event_code || '').trim()
  const entityId = payload.entity_id || ''
  const extraParams = payload.params || {}

  if (!eventCode) {
    return e.json(400, { message: 'event_code é obrigatório.' })
  }

  const templates = $app.findRecordsByFilter('message_templates', `event_code = '${eventCode}' && active = true`, 'channel', 20, 0)
  const results = []

  for (let i = 0; i < templates.length; i++) {
    const tpl = templates[i]
    const channel = tpl.getString('channel')
    const audience = tpl.getString('audience')

    let recipientPhone = extraParams.recipient_phone || ''
    let recipientEmail = extraParams.recipient_email || ''
    let recipientName = extraParams.nome || 'Parceiro'

    if (payload.referral_id) {
      try {
        const ref = $app.findRecordById('referrals', payload.referral_id)
        extraParams.protocolo = extraParams.protocolo || `#REF-${ref.id.substring(0, 6)}`
        extraParams.link = `https://indicacao.godoyprime.com.br/painel/indicacoes/${ref.id}`

        if (audience === 'participante') {
          const ownerId = ref.getString('original_owner_id') || ref.getString('current_owner_id')
          if (ownerId) {
            const user = $app.findRecordById('users', ownerId)
            recipientEmail = user.getString('email')
            recipientPhone = user.getString('phone')
            recipientName = user.getString('name') || recipientName
          }
        } else if (audience === 'proprietario') {
          recipientName = ref.getString('owner_name') || recipientName
          recipientPhone = ref.getString('owner_phone') || recipientPhone
          recipientEmail = ref.getString('owner_email') || recipientEmail
        } else if (audience === 'interessado') {
          recipientName = ref.getString('buyer_name') || recipientName
          recipientPhone = ref.getString('buyer_phone') || recipientPhone
          recipientEmail = ref.getString('buyer_email') || recipientEmail
        } else if (audience === 'equipe') {
          recipientEmail = 'contato@godoyprime.com.br'
        } else if (audience === 'financeiro') {
          recipientEmail = 'financeiro@godoyprime.com.br'
        }
      } catch (_) {}
    }

    if (payload.participant_id && audience === 'participante') {
      try {
        const part = $app.findRecordById('participants', payload.participant_id)
        const u = $app.findRecordById('users', part.getString('user_id'))
        recipientEmail = u.getString('email') || recipientEmail
        recipientPhone = u.getString('phone') || recipientPhone
        recipientName = u.getString('name') || recipientName
      } catch (_) {}
    }

    if (channel === 'whatsapp' && recipientPhone) {
      const formattedTo = formatPhone(recipientPhone)
      const isApproved = tpl.getString('meta_status') === 'approved'

      let hasOptin = false
      try {
        const opt = $app.findFirstRecordByFilter('whatsapp_optins', `phone = '${formattedTo}' && opted_out_at = ''`)
        if (opt) hasOptin = true
      } catch (_) {}

      if (!isApproved || !hasOptin) {
        results.push({ channel: 'whatsapp', status: 'skipped', reason: !isApproved ? 'template_not_approved' : 'no_optin' })
        continue
      }

      const metaToken = $os.getenv('META_WA_ACCESS_TOKEN')
      const phoneId = $os.getenv('META_WA_PHONE_NUMBER_ID')

      if (metaToken && phoneId && metaToken !== 'placeholder_meta_wa_access_token') {
        const metaParams = []
        let rawParams = []
        try { rawParams = JSON.parse(tpl.getString('meta_params')) || [] } catch (_) {}
        for (let p = 0; p < rawParams.length; p++) {
          const key = rawParams[p]
          metaParams.push(extraParams[key] || recipientName || '')
        }

        const components = []
        if (metaParams.length > 0) {
          components.push({
            type: 'body',
            parameters: metaParams.map((val) => ({ type: 'text', text: String(val || '') })),
          })
        }
        if (extraParams.link || tpl.getString('button_url_param')) {
          components.push({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: String(extraParams.link || tpl.getString('button_url_param')) }],
          })
        }

        try {
          const res = $http.send({
            url: `https://graph.facebook.com/v19.0/${phoneId}/messages`,
            method: 'POST',
            headers: { Authorization: `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
            data: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: formattedTo,
              type: 'template',
              template: {
                name: tpl.getString('meta_template_name'),
                language: { code: tpl.getString('meta_language') || 'pt_BR' },
                components: components.length > 0 ? components : undefined,
              },
            }),
            timeout: 10,
          })

          if (res.statusCode >= 200 && res.statusCode < 300) {
            results.push({ channel: 'whatsapp', status: 'sent' })
          } else {
            results.push({ channel: 'whatsapp', status: 'failed', error: res.rawText })
          }
        } catch (err) {
          results.push({ channel: 'whatsapp', status: 'failed', error: err.message })
        }
      }
    } else if (channel === 'email' && recipientEmail) {
      const resendKey = $os.getenv('RESEND_API_KEY')
      if (resendKey && resendKey !== 'placeholder_resend_api_key') {
        let subject = tpl.getString('subject') || 'Godoy Prime Indica'
        let bodyText = tpl.getString('body')

        const allKeys = Object.keys(extraParams)
        for (let k = 0; k < allKeys.length; k++) {
          const key = allKeys[k]
          subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), String(extraParams[key]))
          bodyText = bodyText.replace(new RegExp(`{{${key}}}`, 'g'), String(extraParams[key]))
        }
        subject = subject.replace(/{{nome}}/g, recipientName)
        bodyText = bodyText.replace(/{{nome}}/g, recipientName)

        try {
          $http.send({
            url: 'https://api.resend.com/emails',
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            data: JSON.stringify({
              from: 'Godoy Prime Indica <contato@godoyprime.com.br>',
              to: [recipientEmail],
              subject,
              text: bodyText,
            }),
            timeout: 10,
          })
          results.push({ channel: 'email', status: 'sent' })
        } catch (err) {
          results.push({ channel: 'email', status: 'failed', error: err.message })
        }
      }
    }
  }

  return e.json(200, { success: true, event_code: eventCode, results })
})

/**
 * 5a. onRecordCreate: referrals
 */
onRecordCreate((e) => {
  e.next()
  const record = e.record
  if (!record || record.collection().name !== 'referrals') return

  try {
    const internalSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')
    $http.send({
      url: 'http://127.0.0.1:8090/backend/v1/communication/notify-event',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': internalSecret || '',
      },
      data: JSON.stringify({
        event_code: 'indicacao_recebida_indicador',
        referral_id: record.id,
        entity_id: record.id,
      }),
      timeout: 5,
    })
  } catch (err) {
    console.error('[onRecordCreate:referrals] Erro ao notificar:', err)
  }
}, 'referrals')

/**
 * 5b. onRecordUpdate: referrals
 */
onRecordUpdate((e) => {
  e.next()
  const record = e.record
  if (!record || record.collection().name !== 'referrals') return

  try {
    const oldStatus = record.original().getString('status')
    const newStatus = record.getString('status')
    if (!newStatus || oldStatus === newStatus) return

    function getVisibleStage(status) {
      if (status === 'recebida') return 'recebida'
      if (status === 'em_triagem' || status === 'aceita') return 'em_analise'
      if (status === 'em_contato' || status === 'qualificada' || status === 'em_negociacao' || status === 'captacao_solicitada' || status === 'em_atendimento') return 'em_contato'
      if (status === 'captada') return 'captada'
      if (status === 'em_divulgacao') return 'em_divulgacao'
      if (status === 'visitando' || status === 'proposta') return 'visitando_proposta'
      if (status === 'vendida' || status === 'alugada' || status === 'comprou' || status === 'alugou') return 'concluida'
      if (status === 'recusada' || status === 'duplicada' || status === 'perdida' || status === 'retirada' || status === 'cancelada') return 'nao_aproveitada'
      return status
    }

    const oldStage = getVisibleStage(oldStatus)
    const newStage = getVisibleStage(newStatus)
    if (oldStage === newStage) return

    let eventCode = ''
    if (newStage === 'em_analise') eventCode = 'em_analise'
    else if (newStage === 'em_contato') eventCode = 'em_contato'
    else if (newStage === 'captada') eventCode = 'captado'
    else if (newStage === 'em_divulgacao') eventCode = 'em_divulgacao'
    else if (newStage === 'visitando_proposta') eventCode = 'visitando_imoveis_proposta'
    else if (newStage === 'concluida') eventCode = 'negocio_concluido'
    else if (newStage === 'nao_aproveitada') eventCode = 'nao_aproveitada'

    if (eventCode) {
      const internalSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')
      $http.send({
        url: 'http://127.0.0.1:8090/backend/v1/communication/notify-event',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret || '',
        },
        data: JSON.stringify({
          event_code: eventCode,
          referral_id: record.id,
          entity_id: record.id,
        }),
        timeout: 5,
      })
    }
  } catch (err) {
    console.error('[onRecordUpdate:referrals] Erro ao notificar:', err)
  }
}, 'referrals')

/**
 * 5c. onRecordUpdate: participants
 */
onRecordUpdate((e) => {
  e.next()
  const record = e.record
  if (!record || record.collection().name !== 'participants') return

  try {
    const oldStatus = record.original().getString('status')
    const newStatus = record.getString('status')

    if (oldStatus !== newStatus) {
      let eventCode = ''
      if (newStatus === 'ativo') eventCode = 'cadastro_aprovado'
      else if (newStatus === 'suspenso') eventCode = 'cadastro_suspenso'

      if (eventCode) {
        const internalSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')
        $http.send({
          url: 'http://127.0.0.1:8090/backend/v1/communication/notify-event',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': internalSecret || '',
          },
          data: JSON.stringify({
            event_code: eventCode,
            participant_id: record.id,
            entity_id: record.id,
          }),
          timeout: 5,
        })
      }
    }
  } catch (err) {
    console.error('[onRecordUpdate:participants] Erro ao notificar:', err)
  }
}, 'participants')

/**
 * 6. cronAdd: flush_message_queue (a cada 15 min)
 */
cronAdd('flush_message_queue', '*/15 * * * *', () => {
  try {
    const now = new Date()
    const utcHours = now.getUTCHours()
    const utcMins = now.getUTCMinutes()
    const brHours = (utcHours - 3 + 24) % 24
    const currentMinutes = brHours * 60 + utcMins

    // Silêncio entre 21h (1260 min) e 08h (480 min)
    if (currentMinutes >= 1260 || currentMinutes < 480) return

    const nowIso = now.toISOString()
    const pendingQueue = $app.findRecordsByFilter('message_queue', `status = 'pending' && send_after <= '${nowIso}'`, 'send_after', 50, 0)
    if (pendingQueue.length === 0) return

    const internalSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')

    for (let i = 0; i < pendingQueue.length; i++) {
      const q = pendingQueue[i]
      const attempts = (q.getInt('attempts') || 0) + 1
      q.set('attempts', attempts)

      let params = []
      try { params = JSON.parse(q.getString('params')) || [] } catch (_) {}
      let metadata = {}
      try { metadata = JSON.parse(q.getString('metadata')) || {} } catch (_) {}

      const res = $http.send({
        url: 'http://127.0.0.1:8090/backend/v1/communication/send-whatsapp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': internalSecret || '',
        },
        data: JSON.stringify({
          to: q.getString('recipient'),
          template_id: q.getString('template_id'),
          params: params,
          button_url_param: metadata.button_url_param,
          entity_id: metadata.entity_id,
          event_code: metadata.event_code,
        }),
        timeout: 10,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        q.set('status', 'sent')
        $app.save(q)
      } else {
        if (attempts >= 3) q.set('status', 'failed')
        q.set('last_error', res.rawText)
        $app.save(q)
      }
    }
  } catch (err) {
    console.error('[cron:flush_message_queue] Erro:', err)
  }
})

/**
 * 7. cronAdd: check_stalled_referrals (todo dia às 8h de Brasília = 11:00 UTC)
 */
cronAdd('check_stalled_referrals', '0 11 * * *', () => {
  try {
    let triageDays = 5
    let activeDays = 10
    try {
      const st = $app.findFirstRecordByData('program_settings', 'key', 'stalled_referral_thresholds_days')
      const val = JSON.parse(st.getString('value_json'))
      if (val.triage_days) triageDays = val.triage_days
      if (val.active_states_days) activeDays = val.active_states_days
    } catch (_) {}

    const now = Date.now()
    const finalStatuses = ['vendida', 'alugada', 'comprou', 'alugou', 'recusada', 'duplicada', 'perdida', 'retirada', 'cancelada', 'declinada_pela_godoy']
    const filter = finalStatuses.map((s) => `status != '${s}'`).join(' && ')

    const activeRefs = $app.findRecordsByFilter('referrals', filter, '-created', 200, 0)
    const internalSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')

    for (let i = 0; i < activeRefs.length; i++) {
      const ref = activeRefs[i]
      const status = ref.getString('status')
      const updatedAt = new Date(ref.getString('updated') || ref.getString('created')).getTime()
      const daysSince = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24))

      const isStalled = (status === 'em_triagem' || status === 'recebida') ? daysSince >= triageDays : daysSince >= activeDays

      if (isStalled) {
        $http.send({
          url: 'http://127.0.0.1:8090/backend/v1/communication/notify-event',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': internalSecret || '',
          },
          data: JSON.stringify({
            event_code: 'indicacao_parada_responsavel',
            referral_id: ref.id,
            entity_id: ref.id,
            params: {
              protocolo: `#REF-${ref.id.substring(0, 6)}`,
              etapa: status,
              dias: daysSince,
            },
          }),
          timeout: 5,
        })
      }
    }
  } catch (err) {
    console.error('[cron:check_stalled_referrals] Erro:', err)
  }
})

/**
 * 8. cronAdd: process_activation (todo dia às 10h de Brasília = 13:00 UTC)
 */
cronAdd('process_activation', '0 13 * * *', () => {
  try {
    const activeParticipants = $app.findRecordsByFilter('participants', "status = 'ativo'", '-created', 300, 0)
    const now = Date.now()
    const internalSecret = $os.getenv('INTERNAL_FUNCTION_SECRET')

    for (let i = 0; i < activeParticipants.length; i++) {
      const part = activeParticipants[i]
      const approvedAt = new Date(part.getString('approved_at') || part.getString('created')).getTime()
      const daysActive = Math.floor((now - approvedAt) / (1000 * 60 * 60 * 24))

      const stepsToCheck = [
        { step: 0, targetDays: 0, event: 'ativacao_passo_0' },
        { step: 3, targetDays: 3, event: 'ativacao_passo_3', requiresZeroReferrals: true },
        { step: 10, targetDays: 10, event: 'ativacao_passo_10' },
        { step: 30, targetDays: 30, event: 'ativacao_passo_30' },
      ]

      for (let s = 0; s < stepsToCheck.length; s++) {
        const stepDef = stepsToCheck[s]
        if (daysActive >= stepDef.targetDays) {
          let alreadySent = false
          try {
            const check = $app.findFirstRecordByFilter('activation_log', `participant_id = '${part.id}' && step = ${stepDef.step}`)
            if (check) alreadySent = true
          } catch (_) {
            alreadySent = false
          }

          if (alreadySent) continue

          if (stepDef.requiresZeroReferrals) {
            let refCount = 0
            try {
              refCount = $app.countRecords('referrals', `participant_id = '${part.id}' || original_owner_id = '${part.getString('user_id')}'`)
            } catch (_) {}
            if (refCount > 0) {
              const actCol = $app.findCollectionByNameOrId('activation_log')
              const actRec = new Record(actCol)
              actRec.set('participant_id', part.id)
              actRec.set('step', stepDef.step)
              actRec.set('sent_at', new Date().toISOString())
              $app.save(actRec)
              continue
            }
          }

          $http.send({
            url: 'http://127.0.0.1:8090/backend/v1/communication/notify-event',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': internalSecret || '',
            },
            data: JSON.stringify({
              event_code: stepDef.event,
              participant_id: part.id,
              entity_id: part.id,
            }),
            timeout: 5,
          })

          const actCol = $app.findCollectionByNameOrId('activation_log')
          const actRec = new Record(actCol)
          actRec.set('participant_id', part.id)
          actRec.set('step', stepDef.step)
          actRec.set('sent_at', new Date().toISOString())
          $app.save(actRec)
        }
      }
    }
  } catch (err) {
    console.error('[cron:process_activation] Erro:', err)
  }
})

/**
 * 9. GET /backend/v1/communication/qr-code
 */
routerAdd('GET', '/backend/v1/communication/qr-code', (e) => {
  const url = e.request.url.query()['text'] || e.request.url.query()['url'] || 'https://indicacao.godoyprime.com.br'
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`

  return e.json(200, {
    success: true,
    url: qrSvgUrl,
    target: url,
  })
})
