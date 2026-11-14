// pocketbase/hooks/qa_probe.pb.js
//
// ARQUIVO TEMPORÁRIO DE TESTE — DEVE SER APAGADO NO MESMO RUN.
// Executa os 5 testes HTTP reais da rota POST /backend/v1/referrals/assign-operator.
// A rota auxiliar exige o cabeçalho X-Internal-Secret (INTERNAL_FUNCTION_SECRET).
// O cron cria os dados de teste via superusuário ($app) e dispara as chamadas
// HTTP reais contra a rota. Resultados gravados em audit_logs (marcador único).
// Nenhuma declaração top-level é referenciada dentro de callbacks (regra JSVM).

routerAdd('POST', '/backend/v1/qa/test-assign-operator', (e) => {
  const reqSecret =
    e.request.header.get('X-Internal-Secret') || e.request.header.get('x-internal-secret') || ''
  const envSecret = $os.getenv('INTERNAL_FUNCTION_SECRET') || ''
  if (!envSecret || !reqSecret || reqSecret !== envSecret) {
    return e.json(403, { message: 'Acesso negado: X-Internal-Secret obrigatório.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const email = String(body.email || '')
  const referralId = String(body.referral_id || '')
  const hasOperatorId = body.operator_id !== undefined
  const operatorId = hasOperatorId ? body.operator_id : undefined

  let user
  try {
    user = $app.findAuthRecordByEmail('_pb_users_auth_', email)
  } catch (_) {
    return e.json(404, { message: 'Usuário de teste não encontrado: ' + email })
  }

  let token = ''
  try {
    token = user.newAuthToken()
  } catch (errTok) {
    return e.json(500, { probe_error: 'Falha ao gerar token: ' + errTok.message })
  }

  const payload = { referral_id: referralId }
  if (hasOperatorId) payload.operator_id = operatorId

  const baseUrl = ($os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8080') + ''
  try {
    const res = $http.send({
      url: baseUrl + '/backend/v1/referrals/assign-operator',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify(payload),
      timeout: 15,
    })
    return e.json(res.statusCode, { probe_status: res.statusCode, probe_body: res.rawText })
  } catch (errHttp) {
    return e.json(500, { probe_error: errHttp.message })
  }
})

cronAdd('qa_probe_assign_operator', '* * * * *', () => {
  // Marcador: roda uma única vez
  try {
    $app.findFirstRecordByFilter('audit_logs', "action = 'qa_assign_operator_probe_v1'")
    console.log('[qa_probe] Marcador já presente — pulando execução.')
    return
  } catch (_) {}

  const results = []

  try {
    // --- 1. CRIAR DADOS DE TESTE (superusuário) ---
    const suffix = $security.randomString(6).toLowerCase()
    const password = 'QaProbe!Test2026'
    const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
    const rolesCol = $app.findCollectionByNameOrId('user_roles')
    const referralsCol = $app.findCollectionByNameOrId('referrals')

    function makeTestUser(email) {
      const u = new Record(usersCol)
      u.set('email', email)
      u.setPassword(password)
      u.set('name', 'QA Probe ' + suffix)
      $app.save(u)
      return u
    }

    const adminUser = makeTestUser('qa.probe.admin.' + suffix + '@qa-teste.local')
    const operatorUser = makeTestUser('qa.probe.operator.' + suffix + '@qa-teste.local')
    const noRoleUser = makeTestUser('qa.probe.norole.' + suffix + '@qa-teste.local')

    const adminRole = new Record(rolesCol)
    adminRole.set('user_id', adminUser.id)
    adminRole.set('role', 'admin')
    $app.save(adminRole)

    const operatorRole = new Record(rolesCol)
    operatorRole.set('user_id', operatorUser.id)
    operatorRole.set('role', 'operador')
    $app.save(operatorRole)

    // Referral de teste: original_owner_id obrigatório (no-role user)
    const testReferral = new Record(referralsCol)
    testReferral.set('description', 'Indicação criada por qa_probe para teste de assign-operator')
    testReferral.set('original_owner_id', noRoleUser.id)
    testReferral.set('current_owner_id', noRoleUser.id)
    testReferral.set('type', 'proprietario')
    testReferral.set('referral_type', 'proprietario')
    testReferral.set('status', 'recebida')
    testReferral.set('channel', 'manual')
    testReferral.set('referrer_name', 'QA Indicador Probe')
    testReferral.set('referrer_phone', '55119000000999')
    testReferral.set('return_contact', 'qa.probe.return@qa-teste.local')
    $app.save(testReferral)

    const refId = testReferral.id

    // --- 2. ROTA AUXILIAR (com X-Internal-Secret) ---
    const probeSecret = $os.getenv('INTERNAL_FUNCTION_SECRET') || ''
    const baseUrl = ($os.getenv('PB_INSTANCE_URL') || 'http://127.0.0.1:8080') + ''
    const probeUrl = baseUrl + '/backend/v1/qa/test-assign-operator'

    function currentOwner() {
      try {
        const r = $app.findRecordById('referrals', refId)
        return r.getString('current_owner_id') || '(vazio)'
      } catch (_) {
        return '(erro ao ler)'
      }
    }

    function callProbe(callerEmail, operatorIdParam) {
      const payload = { email: callerEmail, referral_id: refId }
      if (operatorIdParam !== undefined) payload.operator_id = operatorIdParam
      try {
        const res = $http.send({
          url: probeUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': probeSecret,
          },
          body: JSON.stringify(payload),
          timeout: 15,
        })
        return { status: res.statusCode, body: res.rawText, owner_apos: currentOwner() }
      } catch (err) {
        return { status: 0, body: 'probe_transport_error: ' + err.message }
      }
    }

    // Teste 1: admin com operator_id válido
    results.push({
      test: '1_admin_com_operador_valido',
      expected: '200 + current_owner_id atualizado + audit_logs',
      result: callProbe('qa.probe.admin.' + suffix + '@qa-teste.local', operatorUser.id),
    })

    // Teste 2: anônimo (sem token) → rota de probe não aceita sem email/token válido
    // Para o teste anônimo real, chamamos a rota final DIRETO sem Authorization:
    let anonResult
    try {
      const resAnon = $http.send({
        url: baseUrl + '/backend/v1/referrals/assign-operator',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referral_id: refId, operator_id: operatorUser.id }),
        timeout: 15,
      })
      anonResult = { status: resAnon.statusCode, body: resAnon.rawText }
    } catch (errAnon) {
      anonResult = { status: 0, body: 'transport_error: ' + errAnon.message }
    }
    results.push({
      test: '2_anonimo_sem_token',
      expected: '401',
      result: anonResult,
    })

    // Teste 3: participante sem papel
    results.push({
      test: '3_participante_sem_papel',
      expected: '403 "Acesso negado."',
      result: callProbe('qa.probe.norole.' + suffix + '@qa-teste.local', operatorUser.id),
    })

    // Teste 4: operator_id de usuário sem papel de equipe
    results.push({
      test: '4_operator_sem_papel_de_equipe',
      expected: 'erro de validação + current_owner_id intacto',
      result: callProbe('qa.probe.admin.' + suffix + '@qa-teste.local', noRoleUser.id),
    })

    // Teste 5: operator_id null
    results.push({
      test: '5_operator_null',
      expected: '200 + current_owner_id limpo',
      result: callProbe('qa.probe.admin.' + suffix + '@qa-teste.local', null),
    })

    // Prova do banco: estado final da referral + audit_logs
    let refAfter = null
    try {
      const r = $app.findRecordById('referrals', refId)
      refAfter = { current_owner_id: r.getString('current_owner_id') }
    } catch (_) {}

    let auditAfter = []
    try {
      const audits = $app.findRecordsByFilter(
        'audit_logs',
        "resource_type = 'referrals' && resource_id = {:rid}",
        '-created',
        10,
        0,
        { rid: refId },
      )
      auditAfter = audits.map((a) => ({
        action: a.getString('action'),
        actor_email: a.getString('actor_email'),
      }))
    } catch (_) {}

    // --- 3. MARCADOR COM RESULTADOS ---
    const markerCol = $app.findCollectionByNameOrId('audit_logs')
    const marker = new Record(markerCol)
    marker.set('action', 'qa_assign_operator_probe_v1')
    marker.set('resource_type', 'qa_probe')
    marker.set(
      'details',
      JSON.stringify({
        suffix,
        test_referral_id: refId,
        test_users: {
          admin: adminUser.id,
          operator: operatorUser.id,
          norole: noRoleUser.id,
        },
        ref_after: refAfter,
        audit_logs_on_referral: auditAfter,
        results,
      }),
    )
    $app.save(marker)
    console.log('[qa_probe] Testes concluídos. Resultados no marcador audit_logs.')
    console.log(
      '[qa_probe_results] ' +
        JSON.stringify({
          suffix,
          refId,
          users: { admin: adminUser.id, operator: operatorUser.id, norole: noRoleUser.id },
          ref_after: refAfter,
          audit_logs_on_referral: auditAfter,
          results,
        }),
    )
  } catch (errSetup) {
    console.error('[qa_probe] Erro na execução dos testes:', errSetup.message, errSetup.stack || '')
  }
})
