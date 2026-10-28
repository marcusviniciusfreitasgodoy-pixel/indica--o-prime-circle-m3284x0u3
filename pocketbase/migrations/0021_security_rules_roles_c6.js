/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // 1. users: updateRule com defesa em profundidade contra escalada de privilégios
  try {
    const users = app.findCollectionByNameOrId('users')
    users.updateRule =
      "@request.auth.id != '' && id = @request.auth.id && @request.body.is_admin:isset = false && @request.body.is_operador:isset = false && @request.body.is_financeiro:isset = false"
    app.save(users)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar users.updateRule:', err)
  }

  // Helper de checagem interna
  const isInternal =
    '(@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)'
  const isAdminOrOp = '(@request.auth.is_admin = true || @request.auth.is_operador = true)'
  const isAdminOnly = '@request.auth.is_admin = true'

  // 2. profiles: listRule e viewRule: o próprio dono ou equipe interna (is_admin, is_operador ou is_financeiro)
  try {
    const profiles = app.findCollectionByNameOrId('profiles')
    profiles.listRule = `@request.auth.id != '' && (user_id = @request.auth.id || ${isInternal})`
    profiles.viewRule = `@request.auth.id != '' && (user_id = @request.auth.id || ${isInternal})`
    profiles.createRule = "@request.auth.id != ''"
    profiles.updateRule = `@request.auth.id != '' && (user_id = @request.auth.id || ${isAdminOnly})`
    app.save(profiles)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar profiles:', err)
  }

  // 3. participant_condominiums: createRule só para admin ou operador
  try {
    const pc = app.findCollectionByNameOrId('participant_condominiums')
    pc.listRule = `@request.auth.id != '' && (participant_id.user_id = @request.auth.id || ${isInternal})`
    pc.viewRule = `@request.auth.id != '' && (participant_id.user_id = @request.auth.id || ${isInternal})`
    pc.createRule = `@request.auth.id != '' && ${isAdminOrOp}`
    pc.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(pc)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar participant_condominiums:', err)
  }

  // 4. acceptances
  try {
    const acc = app.findCollectionByNameOrId('acceptances')
    acc.listRule = `@request.auth.id != '' && (user_id = @request.auth.id || ${isInternal})`
    acc.viewRule = `@request.auth.id != '' && (user_id = @request.auth.id || ${isInternal})`
    acc.createRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(acc)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar acceptances:', err)
  }

  // 5. duplicate_flags
  try {
    const df = app.findCollectionByNameOrId('duplicate_flags')
    df.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    df.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    df.updateRule = `@request.auth.id != '' && ${isAdminOrOp}`
    df.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(df)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar duplicate_flags:', err)
  }

  // 6. known_owner_base
  try {
    const kob = app.findCollectionByNameOrId('known_owner_base')
    kob.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    kob.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    kob.createRule = `@request.auth.id != '' && ${isAdminOrOp}`
    kob.updateRule = `@request.auth.id != '' && ${isAdminOrOp}`
    kob.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(kob)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar known_owner_base:', err)
  }

  // 7. known_buyer_base
  try {
    const kbb = app.findCollectionByNameOrId('known_buyer_base')
    kbb.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    kbb.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    kbb.createRule = `@request.auth.id != '' && ${isAdminOrOp}`
    kbb.updateRule = `@request.auth.id != '' && ${isAdminOrOp}`
    kbb.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(kbb)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar known_buyer_base:', err)
  }

  // 8. contact_attempts
  try {
    const ca = app.findCollectionByNameOrId('contact_attempts')
    ca.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    ca.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    ca.createRule = `@request.auth.id != '' && ${isAdminOrOp}`
    ca.updateRule = `@request.auth.id != '' && ${isAdminOrOp}`
    ca.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(ca)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar contact_attempts:', err)
  }

  // 9. referral_notes
  try {
    const rn = app.findCollectionByNameOrId('referral_notes')
    rn.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    rn.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    rn.createRule = `@request.auth.id != '' && ${isAdminOrOp}`
    rn.updateRule = `@request.auth.id != '' && ${isAdminOrOp}`
    rn.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(rn)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar referral_notes:', err)
  }

  // 10. referral_tasks
  try {
    const rt = app.findCollectionByNameOrId('referral_tasks')
    rt.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    rt.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    rt.createRule = `@request.auth.id != '' && ${isAdminOrOp}`
    rt.updateRule = `@request.auth.id != '' && ${isAdminOrOp}`
    rt.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(rt)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar referral_tasks:', err)
  }

  // 11. documents
  try {
    const doc = app.findCollectionByNameOrId('documents')
    doc.listRule = `@request.auth.id != '' && (participant_id.user_id = @request.auth.id || ${isAdminOrOp})`
    doc.viewRule = `@request.auth.id != '' && (participant_id.user_id = @request.auth.id || ${isAdminOrOp})`
    doc.createRule = `@request.auth.id != '' && ${isAdminOrOp}`
    doc.updateRule = `@request.auth.id != '' && ${isAdminOrOp}`
    doc.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(doc)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar documents:', err)
  }

  // 12. capture_records
  try {
    const cr = app.findCollectionByNameOrId('capture_records')
    cr.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    cr.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    cr.createRule = `@request.auth.id != '' && ${isAdminOrOp}`
    cr.updateRule = `@request.auth.id != '' && ${isAdminOrOp}`
    cr.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(cr)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar capture_records:', err)
  }

  // 13. deals
  try {
    const dl = app.findCollectionByNameOrId('deals')
    dl.listRule = `@request.auth.id != '' && ${isInternal}`
    dl.viewRule = `@request.auth.id != '' && ${isInternal}`
    dl.createRule = `@request.auth.id != '' && ${isAdminOnly}`
    dl.updateRule = `@request.auth.id != '' && ${isAdminOnly}`
    dl.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(dl)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar deals:', err)
  }

  // 14. public_reason_codes
  try {
    const prc = app.findCollectionByNameOrId('public_reason_codes')
    prc.listRule = "@request.auth.id != ''"
    prc.viewRule = "@request.auth.id != ''"
    prc.createRule = `@request.auth.id != '' && ${isAdminOnly}`
    prc.updateRule = `@request.auth.id != '' && ${isAdminOnly}`
    prc.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(prc)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar public_reason_codes:', err)
  }

  // 15. whatsapp_optins
  try {
    const wo = app.findCollectionByNameOrId('whatsapp_optins')
    wo.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    wo.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    wo.createRule = "@request.auth.id != ''"
    wo.updateRule = `@request.auth.id != '' && ${isAdminOrOp}`
    wo.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(wo)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar whatsapp_optins:', err)
  }

  // 16. message_templates
  try {
    const mt = app.findCollectionByNameOrId('message_templates')
    mt.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    mt.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    mt.createRule = `@request.auth.id != '' && ${isAdminOnly}`
    mt.updateRule = `@request.auth.id != '' && ${isAdminOnly}`
    mt.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(mt)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar message_templates:', err)
  }

  // 17. message_queue
  try {
    const mq = app.findCollectionByNameOrId('message_queue')
    mq.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    mq.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    mq.createRule = `@request.auth.id != '' && ${isAdminOrOp}`
    mq.updateRule = `@request.auth.id != '' && ${isAdminOrOp}`
    mq.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(mq)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar message_queue:', err)
  }

  // 18. notification_logs
  try {
    const nl = app.findCollectionByNameOrId('notification_logs')
    nl.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    nl.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    nl.createRule = "@request.auth.id != ''"
    nl.updateRule = `@request.auth.id != '' && ${isAdminOnly}`
    nl.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(nl)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar notification_logs:', err)
  }

  // 19. activation_log
  try {
    const al = app.findCollectionByNameOrId('activation_log')
    al.listRule = `@request.auth.id != '' && ${isAdminOrOp}`
    al.viewRule = `@request.auth.id != '' && ${isAdminOrOp}`
    al.createRule = `@request.auth.id != '' && ${isAdminOnly}`
    al.updateRule = `@request.auth.id != '' && ${isAdminOnly}`
    al.deleteRule = `@request.auth.id != '' && ${isAdminOnly}`
    app.save(al)
  } catch (err) {
    console.error('[0021_security_rules_roles_c6] Erro ao atualizar activation_log:', err)
  }
})
