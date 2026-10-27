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

/**
 * Manual transfer endpoint for members:
 * Authenticated member transfers one of their referrals to another network member.
 */
routerAdd('POST', '/backend/v1/referrals/{id}/transfer', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado. Faça login para continuar.' })
  }

  const referralId = e.request.pathValue('id')
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const targetMemberId = (body.target_member_id || '').trim()
  const reason = (body.reason || '').trim()

  if (!targetMemberId) {
    return e.json(400, { message: 'Selecione o membro para repasse.' })
  }

  if (targetMemberId === authRecord.id) {
    return e.json(400, { message: 'Você já é o responsável atual desta indicação.' })
  }

  let referral
  try {
    referral = $app.findRecordById('referrals', referralId)
  } catch (_) {
    return e.json(404, { message: 'Indicação não encontrada.' })
  }

  if (referral.getString('current_owner_id') !== authRecord.id) {
    return e.json(403, { message: 'Você não tem permissão para repassar esta indicação.' })
  }

  let targetUser
  try {
    targetUser = $app.findRecordById('users', targetMemberId)
  } catch (_) {
    return e.json(404, { message: 'Membro de destino não encontrado.' })
  }

  // Parse history
  let historyList = []
  try {
    const raw = referral.getString('history')
    if (raw) {
      historyList = JSON.parse(raw) || []
    }
  } catch (_) {
    historyList = []
  }

  const now = new Date().toISOString()
  const historyItem = {
    date: now,
    action: 'repasse_manual',
    description: `Repasse manual de ${authRecord.getString('name') || 'Membro'} para ${targetUser.getString('name') || 'Membro'}${reason ? ' (Motivo: ' + reason + ')' : ''}`,
    from_user_id: authRecord.id,
    from_user_name: authRecord.getString('name') || 'Membro',
    to_user_id: targetUser.id,
    to_user_name: targetUser.getString('name') || 'Membro',
    reason: reason || null,
  }

  historyList.push(historyItem)

  referral.set('current_owner_id', targetUser.id)
  referral.set('status', 'repassada')
  referral.set('history', JSON.stringify(historyList))

  $app.save(referral)

  return e.json(200, {
    success: true,
    message: `Indicação repassada com sucesso para ${targetUser.getString('name')}!`,
    referralId: referral.id,
    newOwnerId: targetUser.id,
    newOwnerName: targetUser.getString('name'),
  })
})

/**
 * Route to trigger auto-transfer check (called on-demand or by frontend)
 */
routerAdd('POST', '/backend/v1/referrals/check-auto-transfers', (e) => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const pendingReferrals = $app.findRecordsByFilter(
    'referrals',
    `status = 'nova' && created <= '${threeDaysAgo}'`,
    'created',
    100,
    0,
  )

  if (!pendingReferrals || pendingReferrals.length === 0) {
    return e.json(200, { success: true, transferredCount: 0 })
  }

  const allUsers = $app.findRecordsByFilter('users', '', 'created', 200, 0)
  if (allUsers.length <= 1) {
    return e.json(200, {
      success: true,
      transferredCount: 0,
      reason: 'Sem outros membros disponíveis na rede',
    })
  }

  let transferredCount = 0

  for (let i = 0; i < pendingReferrals.length; i++) {
    const ref = pendingReferrals[i]
    const currentOwnerId = ref.getString('current_owner_id')
    const originalOwnerId = ref.getString('original_owner_id')

    const eligibleUsers = allUsers.filter((u) => u.id !== currentOwnerId)
    if (eligibleUsers.length === 0) continue

    const nonOriginal = eligibleUsers.filter((u) => u.id !== originalOwnerId)
    const pool = nonOriginal.length > 0 ? nonOriginal : eligibleUsers
    const chosenUser = pool[Math.floor(Math.random() * pool.length)]

    let historyList = []
    try {
      const raw = ref.getString('history')
      if (raw) {
        historyList = JSON.parse(raw) || []
      }
    } catch (_) {
      historyList = []
    }

    let currentOwnerName = 'Dono anterior'
    try {
      const cur = $app.findRecordById('users', currentOwnerId)
      currentOwnerName = cur.getString('name') || currentOwnerName
    } catch (_) {}

    const now = new Date().toISOString()
    const historyItem = {
      date: now,
      action: 'repasse_automatico_3_dias',
      description: `Repasse automático da rede Prime Circle por falta de atendimento em 3 dias (de ${currentOwnerName} para ${chosenUser.getString('name')})`,
      from_user_id: currentOwnerId,
      from_user_name: currentOwnerName,
      to_user_id: chosenUser.id,
      to_user_name: chosenUser.getString('name'),
      reason: 'Sem atendimento após 3 dias da criação',
    }

    historyList.push(historyItem)

    ref.set('current_owner_id', chosenUser.id)
    ref.set('status', 'repassada')
    ref.set('history', JSON.stringify(historyList))

    $app.save(ref)
    transferredCount++
  }

  return e.json(200, { success: true, transferredCount })
})

/**
 * Scheduled job: Runs every 6 hours to check and auto-transfer referrals older than 3 days
 */
cronAdd('auto_transfer_unattended_referrals', '0 */6 * * *', () => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

    const pendingReferrals = $app.findRecordsByFilter(
      'referrals',
      `status = 'nova' && created <= '${threeDaysAgo}'`,
      'created',
      100,
      0,
    )

    if (!pendingReferrals || pendingReferrals.length === 0) {
      return
    }

    const allUsers = $app.findRecordsByFilter('users', '', 'created', 200, 0)
    if (allUsers.length <= 1) {
      return
    }

    let transferredCount = 0

    for (let i = 0; i < pendingReferrals.length; i++) {
      const ref = pendingReferrals[i]
      const currentOwnerId = ref.getString('current_owner_id')
      const originalOwnerId = ref.getString('original_owner_id')

      const eligibleUsers = allUsers.filter((u) => u.id !== currentOwnerId)
      if (eligibleUsers.length === 0) continue

      const nonOriginal = eligibleUsers.filter((u) => u.id !== originalOwnerId)
      const pool = nonOriginal.length > 0 ? nonOriginal : eligibleUsers
      const chosenUser = pool[Math.floor(Math.random() * pool.length)]

      let historyList = []
      try {
        const raw = ref.getString('history')
        if (raw) {
          historyList = JSON.parse(raw) || []
        }
      } catch (_) {
        historyList = []
      }

      let currentOwnerName = 'Dono anterior'
      try {
        const cur = $app.findRecordById('users', currentOwnerId)
        currentOwnerName = cur.getString('name') || currentOwnerName
      } catch (_) {}

      const now = new Date().toISOString()
      const historyItem = {
        date: now,
        action: 'repasse_automatico_3_dias',
        description: `Repasse automático da rede Prime Circle por falta de atendimento em 3 dias (de ${currentOwnerName} para ${chosenUser.getString('name')})`,
        from_user_id: currentOwnerId,
        from_user_name: currentOwnerName,
        to_user_id: chosenUser.id,
        to_user_name: chosenUser.getString('name'),
        reason: 'Sem atendimento após 3 dias da criação',
      }

      historyList.push(historyItem)

      ref.set('current_owner_id', chosenUser.id)
      ref.set('status', 'repassada')
      ref.set('history', JSON.stringify(historyList))

      $app.save(ref)
      transferredCount++
    }

    console.log(`[cron:auto_transfer] Processed: ${transferredCount} referrals transferred.`)
  } catch (err) {
    console.error('[cron:auto_transfer] Error checking auto transfers:', err)
  }
})
