// pocketbase/hooks/foundation.pb.js

/**
 * Trigger on users creation: automatically creates associated profiles record
 * Equivalent to PostgreSQL trigger on auth.users -> public.profiles
 */
onRecordCreate((e) => {
  e.next()

  const record = e.record
  if (!record || record.collection().name !== 'users') {
    return
  }

  try {
    const profilesCol = $app.findCollectionByNameOrId('profiles')
    let existing
    try {
      existing = $app.findFirstRecordByData('profiles', 'user_id', record.id)
    } catch (_) {}

    if (!existing) {
      const p = new Record(profilesCol)
      p.set('user_id', record.id)
      p.set('name', record.getString('name') || record.getString('email') || 'Novo Usuário')
      p.set('phone', record.getString('phone') || '')
      $app.save(p)

      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const audit = new Record(auditCol)
        audit.set('actor_id', record.id)
        audit.set('actor_email', record.getString('email'))
        audit.set('action', 'profile_created_auto')
        audit.set('resource_type', 'profiles')
        audit.set('resource_id', p.id)
        audit.set(
          'details',
          JSON.stringify({ user_id: record.id, email: record.getString('email') }),
        )
        $app.save(audit)
      } catch (_) {}
    }
  } catch (err) {
    console.error('[onRecordCreate:users] Erro ao criar perfil do usuário:', err)
  }
}, 'users')

/**
 * API: Request OTP / Access Code
 * POST /backend/v1/auth/request-magic-link
 * Body: { email: "..." }
 * Resposta NUNCA devolve token ou código; sempre a mesma mensagem genérica.
 * Limita pedidos de código por e-mail e por IP: máx 5 por hora via audit_logs.
 */
routerAdd('POST', '/backend/v1/auth/request-magic-link', (e) => {
  const genericResponse = {
    success: true,
    message:
      'Se este e-mail estiver cadastrado, você receberá um código de acesso de 6 dígitos válido por 15 minutos.',
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const email = (body.email || '').trim().toLowerCase()
  const clientIp = (e.request && e.request.remoteAddr) || 'unknown'

  if (!email) {
    return e.json(400, { message: 'E-mail é obrigatório.' })
  }

  // Rate limiting usando audit_logs na última 1 hora (máx 5 por email ou por IP)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString().replace('T', ' ')
  try {
    const recentEmailAttempts = $app.findRecordsByFilter(
      'audit_logs',
      "action = 'otp_requested' && actor_email = {:email} && created >= {:since}",
      '-created',
      10,
      0,
      { email: email, since: oneHourAgo },
    )
    if (recentEmailAttempts.length >= 5) {
      return e.json(429, {
        message:
          'Muitas solicitações de código para este e-mail. Por favor, aguarde alguns minutos antes de tentar novamente.',
      })
    }
  } catch (_) {}

  if (clientIp && clientIp !== 'unknown') {
    try {
      const recentIpAttempts = $app.findRecordsByFilter(
        'audit_logs',
        "action = 'otp_requested' && ip_address = {:ip} && created >= {:since}",
        '-created',
        10,
        0,
        { ip: clientIp, since: oneHourAgo },
      )
      if (recentIpAttempts.length >= 5) {
        return e.json(429, {
          message:
            'Muitas solicitações de código a partir deste endereço de IP. Por favor, aguarde alguns minutos.',
        })
      }
    } catch (_) {}
  }

  let user
  try {
    user = $app.findAuthRecordByEmail('_pb_users_auth_', email)
  } catch (_) {
    // Retorno idêntico para e-mails inexistentes (evita enumeração)
    return e.json(200, genericResponse)
  }

  // Enviar OTP nativo do PocketBase por e-mail (gerado pelo PocketBase)
  try {
    $app.sendAuthOTP(user)
  } catch (err) {
    console.error('[request-otp] Erro ao disparar sendAuthOTP nativo:', err)
  }

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', user.id)
    audit.set('actor_email', user.getString('email'))
    audit.set('action', 'otp_requested')
    audit.set('resource_type', 'auth')
    audit.set('resource_id', user.id)
    audit.set('details', JSON.stringify({ email, method: 'native_otp' }))
    audit.set('ip_address', clientIp)
    $app.save(audit)
  } catch (_) {}

  // RESPOSTA SEGURA: NUNCA DEVOLVER magic_token, otp_code NEM QUALQUER CÓDIGO
  return e.json(200, genericResponse)
})

/**
 * API: List Internal Team Members and their Roles
 * GET /backend/v1/admin/team
 */
routerAdd('GET', '/backend/v1/admin/team', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado.' })
  }

  // Check admin role
  let isAdmin = false
  try {
    const adminCheck = $app.findFirstRecordByFilter(
      'user_roles',
      `user_id = '${authRecord.id}' && role = 'admin'`,
    )
    isAdmin = !!adminCheck
  } catch (_) {
    isAdmin = false
  }

  if (!isAdmin) {
    return e.json(403, {
      message: 'Acesso negado. Apenas administradores podem gerenciar a equipe.',
    })
  }

  const usersList = $app.findRecordsByFilter('users', '', '-created', 100, 0)
  const rolesList = $app.findRecordsByFilter('user_roles', '', '-created', 200, 0)

  const rolesByUser = {}
  rolesList.forEach((r) => {
    const uid = r.getString('user_id')
    if (!rolesByUser[uid]) rolesByUser[uid] = []
    rolesByUser[uid].push({
      id: r.id,
      role: r.getString('role'),
      created: r.getString('created'),
    })
  })

  const team = usersList.map((u) => ({
    id: u.id,
    name: u.getString('name') || 'Sem Nome',
    email: u.getString('email'),
    phone: u.getString('phone') || '',
    agency: u.getString('agency') || '',
    created: u.getString('created'),
    roles: rolesByUser[u.id] || [],
  }))

  return e.json(200, { team })
})

/**
 * API: Assign a role to a user
 * POST /backend/v1/admin/team/assign-role
 */
routerAdd('POST', '/backend/v1/admin/team/assign-role', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado.' })
  }

  let isAdmin = false
  try {
    const adminCheck = $app.findFirstRecordByFilter(
      'user_roles',
      `user_id = '${authRecord.id}' && role = 'admin'`,
    )
    isAdmin = !!adminCheck
  } catch (_) {
    isAdmin = false
  }

  if (!isAdmin) {
    return e.json(403, { message: 'Acesso negado. Apenas administradores podem atribuir papéis.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const targetUserId = (body.target_user_id || '').trim()
  const role = (body.role || '').trim()

  if (!targetUserId) {
    return e.json(400, { message: 'Usuário de destino não informado.' })
  }

  const validRoles = ['admin', 'operador', 'financeiro']
  if (!validRoles.includes(role)) {
    return e.json(400, { message: 'Papel inválido. Opções: admin, operador, financeiro.' })
  }

  let targetUser
  try {
    targetUser = $app.findRecordById('users', targetUserId)
  } catch (_) {
    return e.json(404, { message: 'Usuário não encontrado.' })
  }

  let existing
  try {
    existing = $app.findFirstRecordByFilter(
      'user_roles',
      `user_id = '${targetUserId}' && role = '${role}'`,
    )
  } catch (_) {}

  if (existing) {
    return e.json(200, {
      success: true,
      message: 'O usuário já possui este papel.',
      roleId: existing.id,
    })
  }

  const userRolesCol = $app.findCollectionByNameOrId('user_roles')
  const newRole = new Record(userRolesCol)
  newRole.set('user_id', targetUserId)
  newRole.set('role', role)
  $app.save(newRole)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'role_assigned')
    audit.set('resource_type', 'user_roles')
    audit.set('resource_id', newRole.id)
    audit.set(
      'details',
      JSON.stringify({
        target_user_id: targetUserId,
        target_user_email: targetUser.getString('email'),
        role,
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: `Papel '${role}' atribuído com sucesso a ${targetUser.getString('name') || targetUser.getString('email')}.`,
    roleId: newRole.id,
  })
})

/**
 * API: Remove a role from a user
 * POST /backend/v1/admin/team/remove-role
 */
routerAdd('POST', '/backend/v1/admin/team/remove-role', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado.' })
  }

  let isAdmin = false
  try {
    const adminCheck = $app.findFirstRecordByFilter(
      'user_roles',
      `user_id = '${authRecord.id}' && role = 'admin'`,
    )
    isAdmin = !!adminCheck
  } catch (_) {
    isAdmin = false
  }

  if (!isAdmin) {
    return e.json(403, { message: 'Acesso negado. Apenas administradores podem remover papéis.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const targetUserId = (body.target_user_id || '').trim()
  const role = (body.role || '').trim()

  if (!targetUserId || !role) {
    return e.json(400, { message: 'Usuário e papel são obrigatórios.' })
  }

  if (targetUserId === authRecord.id && role === 'admin') {
    return e.json(400, { message: 'Você não pode remover seu próprio papel de administrador.' })
  }

  let roleRec
  try {
    roleRec = $app.findFirstRecordByFilter(
      'user_roles',
      `user_id = '${targetUserId}' && role = '${role}'`,
    )
  } catch (_) {
    return e.json(404, { message: 'Atribuição de papel não encontrada.' })
  }

  let targetUser
  try {
    targetUser = $app.findRecordById('users', targetUserId)
  } catch (_) {}

  $app.delete(roleRec)

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', authRecord.id)
    audit.set('actor_email', authRecord.getString('email'))
    audit.set('action', 'role_removed')
    audit.set('resource_type', 'user_roles')
    audit.set('resource_id', roleRec.id)
    audit.set(
      'details',
      JSON.stringify({
        target_user_id: targetUserId,
        target_user_email: targetUser ? targetUser.getString('email') : '',
        role,
      }),
    )
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: `Papel '${role}' removido com sucesso.`,
  })
})

/**
 * API: Check caller internal roles
 * GET /backend/v1/auth/my-roles
 */
routerAdd('GET', '/backend/v1/auth/my-roles', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado.' })
  }

  const userRoles = $app.findRecordsByFilter(
    'user_roles',
    `user_id = '${authRecord.id}'`,
    'created',
    50,
    0,
  )

  const roles = userRoles.map((r) => r.getString('role'))
  const isAdmin = roles.includes('admin')
  const isOperator = roles.includes('operador')
  const isFinance = roles.includes('financeiro')
  const isInternal = roles.length > 0

  return e.json(200, {
    userId: authRecord.id,
    roles,
    isAdmin,
    isOperator,
    isFinance,
    isInternal,
  })
})
