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
 * API: Request Magic Link / OTP / Password Reset
 * POST /backend/v1/auth/request-magic-link
 * Body: { email: "...", redirect_url?: "..." }
 */
routerAdd('POST', '/backend/v1/auth/request-magic-link', (e) => {
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const email = (body.email || '').trim().toLowerCase()

  if (!email) {
    return e.json(400, { message: 'E-mail é obrigatório.' })
  }

  let user
  try {
    user = $app.findAuthRecordByEmail('_pb_users_auth_', email)
  } catch (_) {
    return e.json(200, {
      success: true,
      message:
        'Se este e-mail estiver cadastrado, você receberá um link de acesso ou instruções de recuperação.',
    })
  }

  // Create an OTP / magic link token valid for 15 minutes
  const otpCode = $security.randomString(6).toUpperCase()
  const secretKey = $os.getenv('PB_SUPERUSER_TOKEN') || 'prime_circle_magic_secret_salt'
  const tokenPayload = {
    userId: user.id,
    email: user.getString('email'),
    otp: otpCode,
    exp: Math.floor(Date.now() / 1000) + 15 * 60,
  }
  const token = $security.createJWT(tokenPayload, secretKey, 15 * 60)

  // Try to also trigger PocketBase native verification/reset if desired
  try {
    $app.sendAuthResetPassword(user)
  } catch (_) {}

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', user.id)
    audit.set('actor_email', user.getString('email'))
    audit.set('action', 'magic_link_requested')
    audit.set('resource_type', 'auth')
    audit.set('resource_id', user.id)
    audit.set('details', JSON.stringify({ email, otp_generated: true }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    success: true,
    message: 'Link de acesso seguro gerado com sucesso. Válido por 15 minutos.',
    magic_token: token,
    otp_code: otpCode,
    email: user.getString('email'),
  })
})

/**
 * API: Verify Magic Link
 * POST /backend/v1/auth/verify-magic-link
 * Body: { token: "..." }
 */
routerAdd('POST', '/backend/v1/auth/verify-magic-link', (e) => {
  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const token = (body.token || '').trim()

  if (!token) {
    return e.json(400, { message: 'Token de confirmação não informado.' })
  }

  const secretKey = $os.getenv('PB_SUPERUSER_TOKEN') || 'prime_circle_magic_secret_salt'
  let payload
  try {
    payload = $security.parseJWT(token, secretKey)
  } catch (err) {
    return e.json(400, { message: 'Link mágico inválido ou expirado.' })
  }

  if (!payload || !payload.userId) {
    return e.json(400, { message: 'Token de acesso inválido.' })
  }

  let user
  try {
    user = $app.findRecordById('users', payload.userId)
  } catch (_) {
    return e.json(404, { message: 'Usuário não encontrado.' })
  }

  // Issue real PocketBase auth token for this record
  const authToken = $security.createJWT(
    {
      id: user.id,
      collectionId: user.collection().id,
    },
    $app.settings().recordAuthToken.secret,
    $app.settings().recordAuthToken.duration,
  )

  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(auditCol)
    audit.set('actor_id', user.id)
    audit.set('actor_email', user.getString('email'))
    audit.set('action', 'magic_link_login_success')
    audit.set('resource_type', 'auth')
    audit.set('resource_id', user.id)
    audit.set('details', JSON.stringify({ email: user.getString('email') }))
    audit.set('ip_address', e.request.remoteAddr)
    $app.save(audit)
  } catch (_) {}

  return e.json(200, {
    token: authToken,
    record: {
      id: user.id,
      email: user.getString('email'),
      name: user.getString('name'),
      phone: user.getString('phone'),
      public_slug: user.getString('public_slug'),
      agency: user.getString('agency'),
      verified: user.getBool('verified'),
    },
  })
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
