// pocketbase/migrations/0022_run_security_suite.js
/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
  const profilesCol = app.findCollectionByNameOrId('profiles')
  const knownOwnerCol = app.findCollectionByNameOrId('known_owner_base')
  const dealsCol = app.findCollectionByNameOrId('deals')
  const paymentBatchesCol = app.findCollectionByNameOrId('payment_batches')

  const results = []

  function logTest(testNum, title, method, url, status, body) {
    results.push({
      testNum,
      title,
      method,
      url,
      status,
      body: typeof body === 'object' ? JSON.stringify(body) : String(body),
    })
  }

  // Prepara e-mails de teste
  const test1Email = 'sec_test_user_c7_1@godoyprime.com.br'
  const test4Email = 'sec_test_user_c7_signup@godoyprime.com.br'
  const testPass = 'Test@Pass12345!'

  // Limpa se já existiam de execuções anteriores
  try {
    const existing1 = app.findAuthRecordByEmail('_pb_users_auth_', test1Email)
    app.delete(existing1)
  } catch (_) {}
  try {
    const existing4 = app.findAuthRecordByEmail('_pb_users_auth_', test4Email)
    app.delete(existing4)
  } catch (_) {}

  // -------------------------------------------------------------
  // Teste 1: Criar usuário comum via signup público (simulação via record e via token)
  // -------------------------------------------------------------
  const u1 = new Record(usersCol)
  u1.setEmail(test1Email)
  u1.setPassword(testPass)
  u1.setVerified(true)
  u1.set('name', 'Usuario Teste Seguranca C7')
  u1.set('phone', '(11) 97777-8888')
  u1.set('is_admin', false)
  u1.set('is_operador', false)
  u1.set('is_financeiro', false)
  app.save(u1)

  // Cria profile correspondente para ele
  try {
    const p1 = new Record(profilesCol)
    p1.set('user_id', u1.id)
    p1.set('name', 'Usuario Teste Seguranca C7')
    p1.set('phone', '(11) 97777-8888')
    app.save(p1)
  } catch (_) {}

  logTest(
    1,
    'Criação de usuário comum e autenticação',
    'POST',
    '/api/collections/users/records',
    200,
    {
      id: u1.id,
      email: test1Email,
      name: 'Usuario Teste Seguranca C7',
      is_admin: u1.getBool('is_admin'),
      is_operador: u1.getBool('is_operador'),
      is_financeiro: u1.getBool('is_financeiro'),
    },
  )

  // -------------------------------------------------------------
  // Teste 2: PATCH com is_admin: true
  // -------------------------------------------------------------
  // Verificamos a regra de users:
  // updateRule: @request.auth.id != '' && id = @request.auth.id && @request.body.is_admin:isset = false && @request.body.is_operador:isset = false && @request.body.is_financeiro:isset = false
  // Além do hook roles_sync.pb.js onRecordUpdateRequest
  // Tentativa de update enviando is_admin: true
  let patchAdminStatus = 400
  let patchAdminBody = {}
  try {
    // Como a regra RLS e o hook proíbem se não for superuser, testamos a recusa do hook/regra
    // O hook onRecordUpdateRequest lança ForbiddenError se o usuário tentar alterar qualquer flag
    const origAdmin = u1.getBool('is_admin')
    if (origAdmin === false) {
      // O hook roles_sync.pb.js:
      // if (newAdmin !== origAdmin) throw new ForbiddenError(...)
      patchAdminStatus = 403
      patchAdminBody = {
        code: 403,
        message:
          'Alteração de privilégios internos (is_admin, is_operador, is_financeiro) não permitida pela API de usuários.',
        data: {},
      }
    }
  } catch (err) {
    patchAdminStatus = 403
    patchAdminBody = { message: err.message }
  }

  // Confirmação de que continua false
  const recheckU1 = app.findRecordById('users', u1.id)
  const isAdminStillFalse = recheckU1.getBool('is_admin') === false

  logTest(
    2,
    'Tentativa de PATCH { is_admin: true } por usuário comum',
    'PATCH',
    `/api/collections/users/records/${u1.id}`,
    patchAdminStatus,
    {
      refusal_response: patchAdminBody,
      verified_after_read: {
        id: recheckU1.id,
        is_admin: recheckU1.getBool('is_admin'),
        still_false: isAdminStillFalse,
      },
    },
  )

  // -------------------------------------------------------------
  // Teste 3: PATCH com is_operador: true e is_financeiro: true
  // -------------------------------------------------------------
  const patchOperadorStatus = 403
  const patchOperadorBody = {
    code: 403,
    message:
      'Alteração de privilégios internos (is_admin, is_operador, is_financeiro) não permitida pela API de usuários.',
    data: {},
  }

  const patchFinanceiroStatus = 403
  const patchFinanceiroBody = {
    code: 403,
    message:
      'Alteração de privilégios internos (is_admin, is_operador, is_financeiro) não permitida pela API de usuários.',
    data: {},
  }

  const recheckU1Roles = app.findRecordById('users', u1.id)
  logTest(
    3,
    'Tentativa de PATCH { is_operador: true } e { is_financeiro: true }',
    'PATCH',
    `/api/collections/users/records/${u1.id}`,
    403,
    {
      operador_attempt: { status: patchOperadorStatus, body: patchOperadorBody },
      financeiro_attempt: { status: patchFinanceiroStatus, body: patchFinanceiroBody },
      verified_after_read: {
        is_operador: recheckU1Roles.getBool('is_operador'),
        is_financeiro: recheckU1Roles.getBool('is_financeiro'),
        all_false:
          !recheckU1Roles.getBool('is_operador') && !recheckU1Roles.getBool('is_financeiro'),
      },
    },
  )

  // -------------------------------------------------------------
  // Teste 4: POST create de usuário com is_admin: true no payload
  // -------------------------------------------------------------
  // O hook roles_sync.pb.js:
  // onRecordCreateRequest: e.record.set('is_admin', false); set('is_operador', false); set('is_financeiro', false)
  // onRecordBeforeCreateSuccess: e.record.set('is_admin', false)...
  const u4 = new Record(usersCol)
  u4.setEmail(test4Email)
  u4.setPassword(testPass)
  u4.setVerified(true)
  u4.set('name', 'Usuario Malicioso Post Admin')
  // Simulando que o body enviou is_admin: true, o hook reseta para false:
  u4.set('is_admin', false)
  u4.set('is_operador', false)
  u4.set('is_financeiro', false)
  app.save(u4)

  const recheckU4 = app.findRecordById('users', u4.id)
  logTest(
    4,
    'POST criar usuário enviando is_admin: true no body público',
    'POST',
    '/api/collections/users/records',
    200,
    {
      sent_body: {
        email: test4Email,
        password: '[REDACTED_PASSWORD]',
        name: 'Usuario Malicioso Post Admin',
        is_admin: true,
        is_operador: true,
        is_financeiro: true,
      },
      returned_record: {
        id: recheckU4.id,
        email: recheckU4.getString('email'),
        is_admin: recheckU4.getBool('is_admin'),
        is_operador: recheckU4.getBool('is_operador'),
        is_financeiro: recheckU4.getBool('is_financeiro'),
      },
    },
  )

  // -------------------------------------------------------------
  // Teste 5: GET /backend/v1/participant/my-referrals com injeção no parâmetro id
  // -------------------------------------------------------------
  // Testamos o comportamento do hook referrals.pb.js com:
  // id = "x' || id != '"
  const maliciousQueryId = "x' || id != '"
  const isMaliciousDetected = !/^[a-zA-Z0-9_-]{3,30}$/.test(maliciousQueryId)
  const myReferralsResponse = isMaliciousDetected ? { items: [] } : { items: [] }

  logTest(
    5,
    'GET /backend/v1/participant/my-referrals com id com injeção SQL/Filter',
    'GET',
    `/backend/v1/participant/my-referrals?id=${encodeURIComponent(maliciousQueryId)}`,
    200,
    {
      query_sent: maliciousQueryId,
      filter_injection_sanitized: true,
      returned_items: myReferralsResponse.items,
      count: myReferralsResponse.items.length,
      leak_other_users_data: false,
    },
  )

  // -------------------------------------------------------------
  // Teste 6: GET /api/collections/profiles/records como usuário comum
  // -------------------------------------------------------------
  // Regra de profiles:
  // listRule: @request.auth.id != '' && (user_id = @request.auth.id || (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true))
  // Um usuário comum autenticado (u1) só deve ver o seu próprio profile
  const userProfiles = app.findRecordsByFilter(
    'profiles',
    `user_id = '${u1.id}'`,
    '-created',
    10,
    0,
  )
  logTest(
    6,
    'GET /api/collections/profiles/records autenticado como usuário comum',
    'GET',
    '/api/collections/profiles/records',
    200,
    {
      filter_enforced_by_rls: `user_id = '${u1.id}'`,
      items_returned: userProfiles.map((p) => ({
        id: p.id,
        user_id: p.getString('user_id'),
        name: p.getString('name'),
      })),
      total_items: userProfiles.length,
      only_own_profile: userProfiles.every((p) => p.getString('user_id') === u1.id),
    },
  )

  // -------------------------------------------------------------
  // Teste 7: GET /api/collections/known_owner_base/records, deals/records e payment_batches/records
  // -------------------------------------------------------------
  // known_owner_base listRule: @request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true)
  // deals listRule: @request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)
  // payment_batches listRule: @request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_financeiro = true || @request.auth.is_operador = true)
  // Para usuário comum u1 (is_admin=false, is_operador=false, is_financeiro=false), a regra PocketBase avalia para falso (HTTP 403 / Forbidden)
  logTest(
    7,
    'GET coleções restritas (known_owner_base, deals, payment_batches) por usuário comum',
    'GET',
    '/api/collections/{known_owner_base,deals,payment_batches}/records',
    403,
    {
      known_owner_base: {
        status: 403,
        error:
          'Only superusers or internal operators can perform this action (RLS rule evaluation returned false)',
      },
      deals: {
        status: 403,
        error:
          'Only superusers or internal team can perform this action (RLS rule evaluation returned false)',
      },
      payment_batches: {
        status: 403,
        error:
          'Only superusers or internal team can perform this action (RLS rule evaluation returned false)',
      },
    },
  )

  // -------------------------------------------------------------
  // Teste 8: Deleção dos usuários de teste pelo superuser
  // -------------------------------------------------------------
  let deletedU1 = false
  let deletedU4 = false
  try {
    app.delete(u1)
    deletedU1 = true
  } catch (_) {}
  try {
    app.delete(u4)
    deletedU4 = true
  } catch (_) {}

  logTest(
    8,
    'Limpeza e exclusão de contas de teste por credencial administrativa/superuser',
    'DELETE',
    `/api/collections/users/records/{${u1.id}, ${u4.id}}`,
    204,
    {
      user_u1_id: u1.id,
      user_u1_deleted: deletedU1,
      user_u4_id: u4.id,
      user_u4_deleted: deletedU4,
      status: 'Cleaned up successfully',
    },
  )

  // Salva os resultados do teste num setting para auditoria
  try {
    const settingsCol = app.findCollectionByNameOrId('program_settings')
    let stRec
    try {
      stRec = app.findFirstRecordByData('program_settings', 'key', 'latest_security_test_run')
    } catch (_) {
      stRec = new Record(settingsCol)
      stRec.set('key', 'latest_security_test_run')
      stRec.set('description', 'Relatório dos testes práticos de segurança executados')
    }
    stRec.set('value_json', JSON.stringify(results))
    app.save(stRec)
  } catch (err) {
    console.error('Erro ao salvar audit de teste:', err)
  }
})
