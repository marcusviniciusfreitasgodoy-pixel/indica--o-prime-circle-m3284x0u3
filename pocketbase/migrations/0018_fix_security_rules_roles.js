/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const users = app.findCollectionByNameOrId('users')

  if (!users.fields.getByName('is_admin')) {
    users.fields.add(
      new BoolField({
        name: 'is_admin',
        required: false,
      }),
    )
  }

  if (!users.fields.getByName('is_operador')) {
    users.fields.add(
      new BoolField({
        name: 'is_operador',
        required: false,
      }),
    )
  }

  if (!users.fields.getByName('is_financeiro')) {
    users.fields.add(
      new BoolField({
        name: 'is_financeiro',
        required: false,
      }),
    )
  }

  // users: list and view rule - only self or internal team
  users.listRule =
    "@request.auth.id != '' && (id = @request.auth.id || @request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
  users.viewRule =
    "@request.auth.id != '' && (id = @request.auth.id || @request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
  users.updateRule = "@request.auth.id != '' && id = @request.auth.id"
  app.save(users)

  // Backfill existing user_roles to users boolean flags
  try {
    const roles = app.findRecordsByFilter('user_roles', '', '', 500, 0)
    for (let i = 0; i < roles.length; i++) {
      const r = roles[i]
      const uid = r.getString('user_id')
      const role = r.getString('role')
      try {
        const u = app.findRecordById('users', uid)
        if (role === 'admin') u.set('is_admin', true)
        if (role === 'operador') u.set('is_operador', true)
        if (role === 'financeiro') u.set('is_financeiro', true)
        app.save(u)
      } catch (_) {}
    }
  } catch (_) {}

  // 2. user_roles collection rules
  try {
    const userRoles = app.findCollectionByNameOrId('user_roles')
    userRoles.listRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.is_admin = true)"
    userRoles.viewRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.is_admin = true)"
    userRoles.createRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    userRoles.updateRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    userRoles.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(userRoles)
  } catch (_) {}

  // 3. participants collection rules
  try {
    const participants = app.findCollectionByNameOrId('participants')
    participants.listRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    participants.viewRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    participants.createRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    participants.updateRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    participants.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(participants)
  } catch (_) {}

  // 4. referrals collection rules
  try {
    const referrals = app.findCollectionByNameOrId('referrals')
    referrals.listRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    referrals.viewRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    referrals.createRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    referrals.updateRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    referrals.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(referrals)
  } catch (_) {}

  // 5. referral_events collection rules
  try {
    const referralEvents = app.findCollectionByNameOrId('referral_events')
    referralEvents.listRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    referralEvents.viewRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    referralEvents.createRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    referralEvents.updateRule = null
    referralEvents.deleteRule = null
    app.save(referralEvents)
  } catch (_) {}

  // 6. Demais coleções
  try {
    const campaigns = app.findCollectionByNameOrId('campaigns')
    campaigns.listRule = "@request.auth.id != ''"
    campaigns.viewRule = "@request.auth.id != ''"
    campaigns.createRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true)"
    campaigns.updateRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true)"
    campaigns.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(campaigns)
  } catch (_) {}

  try {
    const cond = app.findCollectionByNameOrId('condominiums')
    cond.listRule = "@request.auth.id != ''"
    cond.viewRule = "@request.auth.id != ''"
    cond.createRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true)"
    cond.updateRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true)"
    cond.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(cond)
  } catch (_) {}

  try {
    const cat = app.findCollectionByNameOrId('participant_categories')
    cat.listRule = "@request.auth.id != ''"
    cat.viewRule = "@request.auth.id != ''"
    cat.createRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    cat.updateRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    cat.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(cat)
  } catch (_) {}

  try {
    const lvl = app.findCollectionByNameOrId('program_levels')
    lvl.listRule = "@request.auth.id != ''"
    lvl.viewRule = "@request.auth.id != ''"
    lvl.createRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    lvl.updateRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    lvl.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(lvl)
  } catch (_) {}

  try {
    const prog = app.findCollectionByNameOrId('programs')
    prog.listRule = "@request.auth.id != ''"
    prog.viewRule = "@request.auth.id != ''"
    prog.createRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    prog.updateRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    prog.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(prog)
  } catch (_) {}

  try {
    const pset = app.findCollectionByNameOrId('program_settings')
    pset.listRule = "@request.auth.id != ''"
    pset.viewRule = "@request.auth.id != ''"
    pset.createRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    pset.updateRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    pset.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(pset)
  } catch (_) {}

  try {
    const ldoc = app.findCollectionByNameOrId('legal_documents')
    ldoc.listRule = "@request.auth.id != ''"
    ldoc.viewRule = "@request.auth.id != ''"
    ldoc.createRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    ldoc.updateRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    ldoc.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(ldoc)
  } catch (_) {}

  try {
    const rrules = app.findCollectionByNameOrId('reward_rules')
    rrules.listRule = "@request.auth.id != ''"
    rrules.viewRule = "@request.auth.id != ''"
    rrules.createRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    rrules.updateRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    rrules.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(rrules)
  } catch (_) {}

  try {
    const rew = app.findCollectionByNameOrId('rewards')
    rew.listRule =
      "@request.auth.id != '' && (participant_id.user_id = @request.auth.id || @request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    rew.viewRule =
      "@request.auth.id != '' && (participant_id.user_id = @request.auth.id || @request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"
    rew.createRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_financeiro = true)"
    rew.updateRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_financeiro = true)"
    rew.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(rew)
  } catch (_) {}

  try {
    const pbatches = app.findCollectionByNameOrId('payment_batches')
    pbatches.listRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_financeiro = true || @request.auth.is_operador = true)"
    pbatches.viewRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_financeiro = true || @request.auth.is_operador = true)"
    pbatches.createRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_financeiro = true)"
    pbatches.updateRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_financeiro = true)"
    pbatches.deleteRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    app.save(pbatches)
  } catch (_) {}

  try {
    const alogs = app.findCollectionByNameOrId('audit_logs')
    alogs.listRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    alogs.viewRule = "@request.auth.id != '' && @request.auth.is_admin = true"
    alogs.createRule = null
    alogs.updateRule = null
    alogs.deleteRule = null
    app.save(alogs)
  } catch (_) {}
})
