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

  const now = new Date().toISOString()
  const historyItem = {
    date: now,
    action: 'criada_link_publico',
    description: `Indicação enviada pelo link público de ${targetUser.getString('name') || 'Membro'}`,
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
  record.set('channel', 'link_publico')
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

  return e.json(200, {
    id: user.id,
    name: user.getString('name'),
    agency: user.getString('agency'),
    phone: user.getString('phone'),
    public_slug: user.getString('public_slug'),
  })
})
