/// <reference path="../pb_data/types.d.ts" />

/**
 * [TEMPORARY] QA test harness hook — REMOVED BEFORE COMMIT.
 * Routes under /backend/v1/qa- ... used only during this QA round.
 * Every route here uses superuser via $os.getenv('PB_SUPERUSER_TOKEN').
 */

routerAdd('GET', '/backend/v1/qa/echo', (e) => {
  const origin = e.request.header.get('Origin') || ''
  const referer = e.request.header.get('Referer') || ''
  const host = e.request.host
  const realIp = e.request.header.get('X-Forwarded-For') || ''
  const proto = e.request.header.get('X-Forwarded-Proto') || ''
  const url = e.request.url
  const appUrl = $app.settings().meta.appUrl || ''
  return e.json(200, { origin, referer, host, realIp, proto, url, appUrl })
})

routerAdd('POST', '/backend/v1/qa/setup', async (e) => {
  const QA_URL = $os.getenv('PB_INSTANCE_URL') || ''
  const QA_TOKEN = $os.getenv('PB_SUPERUSER_TOKEN') || ''
  const headers = {
    Authorization: QA_TOKEN,
    'Content-Type': 'application/json',
  }

  const body = e.requestInfo().body || {}
  const email = body.email || 'qauser+default@test.local'
  const name = body.name || 'QA Test User'
  const role = body.role || ''

  try {
    const res = await $http.send(`${QA_URL}/api/collections/users/records`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password: 'QaTeste!2026', passwordConfirm: 'QaTeste!2026', name }),
    })
    const user = res.json
    console.log('[qa-harness] user created', user.id, email)
    let roleId = null
    if (role) {
      const resRole = await $http.send(`${QA_URL}/api/collections/user_roles/records`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: user.id, role }),
      })
      roleId = resRole.json ? resRole.json.id : null
      console.log('[qa-harness] role created', role, roleId)
    }
    return e.json(200, { user_id: user.id, email, role: role || null, role_id: roleId })
  } catch (err) {
    return e.json(500, { error: String(err) })
  }
})

routerAdd('POST', '/backend/v1/qa/cleanup', (e) => {
  const body = e.requestInfo().body || {}
  const domain = body.domain || 'test.local'

  const results = {
    users: [],
    participants: [],
    user_roles: [],
    acceptances: [],
    referrals: [],
    condominiums: [],
  }

  // users (and everything referencing them)
  const users = $app.findRecordsByFilter('users', `email ~ '${domain}'`, 'created', 200, 0)
  for (const u of users) {
    const uid = u.id
    results.users.push(u.getString('email'))

    // participants
    try {
      for (const p of $app.findRecordsByFilter('participants', `user_id = '${uid}'`, 'created', 200, 0)) {
        results.participants.push(p.id)
        $app.delete(p)
      }
    } catch (_) {}

    // user_roles
    try {
      for (const r of $app.findRecordsByFilter('user_roles', `user_id = '${uid}'`, 'created', 200, 0)) {
        results.user_roles.push(r.id)
        $app.delete(r)
      }
    } catch (_) {}

    // acceptances
    try {
      for (const a of $app.findRecordsByFilter('acceptances', `user_id = '${uid}'`, 'created', 200, 0)) {
        results.acceptances.push(a.id)
        $app.delete(a)
      }
    } catch (_) {}

    // referrals (as referrer or owner via known fields)
    try {
      for (const r of $app.findRecordsByFilter('referrals', `referrer_user_id = '${uid}'`, 'created', 200, 0)) {
        results.referrals.push(r.id)
        $app.delete(r)
      }
    } catch (_) {}
    try {
      for (const r of $app.findRecordsByFilter('referrals', `owner_user_id = '${uid}'`, 'created', 200, 0)) {
        results.referrals.push(r.id)
        $app.delete(r)
      }
    } catch (_) {}

    // the user itself
    try {
      const full = $app.findRecordById('users', uid)
      $app.delete(full)
    } catch (_) {}
  }

  // condominiums created for the tests (marker in name)
  try {
    for (const c of $app.findRecordsByFilter('condominiums', `name ~ 'QA-TEST'`, 'created', 200, 0)) {
      results.condominiums.push(c.id)
      $app.delete(c)
    }
  } catch (_) {}

  console.log('[qa-harness] cleanup done', JSON.stringify(results))
  return e.json(200, results)
})
