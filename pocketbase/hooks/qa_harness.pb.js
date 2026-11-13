/// <reference path="../pb_data/types.d.ts" />
//
// QA HARNESS TEMPORÁRIO (rodada 2026-11-14) — NÃO É ROTA HTTP.
// Cron de uso único, disparado a cada minuto, com marcador em program_settings
// para rodar UMA única vez. Executa os testes (a)-(d) contra o próprio processo
// publicado via $http.send em 127.0.0.1:8090, limpa os dados de teste e loga
// cada status/resposta em [qa_harness]. DEVE SER APAGADO E REDEPLOYADO no mesmo
// run — nunca ficar publicado.

cronAdd('qa_harness_once', '* * * * *', () => {
  const MARKER_KEY = 'qa_harness_ran_2026_11_14'

  // ---- Marcador anti-reexecução (gravado ANTES de tudo) ----
  try {
    const existing = $app.findFirstRecordByData('program_settings', 'key', MARKER_KEY)
    if (existing) {
      console.log('[qa_harness] Marcador já presente — pulando execução.')
      return
    }
  } catch (_) {}

  try {
    const settingsCol = $app.findCollectionByNameOrId('program_settings')
    const marker = new Record(settingsCol)
    marker.set('key', MARKER_KEY)
    marker.set('value_json', JSON.stringify({ started_at: new Date().toISOString() }))
    $app.save(marker)
  } catch (err) {
    console.error('[qa_harness] Falha ao gravar marcador:', err)
    return
  }

  console.log('[qa_harness] ===== INÍCIO =====')

  function logResult(label, res) {
    console.log('[qa_harness] ' + label + ' => status=' + res.status + ' body=' + res.body)
  }

  function httpCall(method, url, token, bodyObj) {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = token
    const payload = bodyObj ? JSON.stringify(bodyObj) : undefined
    const res = $http.send({
      url: url,
      method: method,
      headers: headers,
      body: payload,
      data: payload,
      timeout: 20,
    })
    let bodyText = ''
    let statusCode = 0
    try {
      if (res && typeof res === 'object' && res.status_code !== undefined) {
        statusCode = res.status_code
        bodyText = res.body ? String(res.body) : JSON.stringify(res)
      } else {
        statusCode = -1
        bodyText = JSON.stringify(res)
      }
    } catch (e2) {
      bodyText = String((res && res.body) || res || '')
    }
    return { status: statusCode, body: bodyText }
  }

  const BASE = 'http://127.0.0.1:8090'
  const runId = String(Date.now())

  const created = {
    userIds: [],
    profileIds: [],
    roleIds: [],
    participantId: '',
    referralId: '',
    documentId: '',
    captureIds: [],
    eventIds: [],
    acceptanceIds: [],
    categoryFound: null,
  }

  function cleanup() {
    console.log('[qa_harness] ===== LIMPEZA =====')
    function delAll(col, filter, list) {
      try {
        const recs = $app.findRecordsByFilter(col, filter, '', 200, 0)
        for (let i = 0; i < recs.length; i++) {
          try {
            $app.delete(recs[i])
          } catch (e3) {
            console.error('[qa_harness] limpeza ' + col + ' id=' + recs[i].id + ':', e3)
          }
        }
        console.log('[qa_harness] limpeza ' + col + ' filter=' + filter + ' -> ' + recs.length)
      } catch (e4) {
        console.error('[qa_harness] limpeza busca ' + col + ':', e4)
      }
    }

    if (created.referralId) {
      delAll('capture_records', "referral_id = '" + created.referralId + "'")
      delAll('duplicate_flags', "referral_id = '" + created.referralId + "'")
      delAll('referral_events', "referral_id = '" + created.referralId + "'")
      delAll('documents', "referral_id = '" + created.referralId + "'")
    }
    if (created.participantId) {
      delAll('acceptances', "user_id = '" + created.userIds[2] + "'")
      delAll('documents', "participant_id = '" + created.participantId + "'")
      delAll('participants', "id = '" + created.participantId + "'")
    }
    for (let i = 0; i < created.userIds.length; i++) {
      delAll('profiles', "user_id = '" + created.userIds[i] + "'")
      delAll('user_roles', "user_id = '" + created.userIds[i] + "'")
    }
    for (let i = 0; i < created.userIds.length; i++) {
      try {
        const u = $app.findRecordById('users', created.userIds[i])
        $app.delete(u)
        console.log('[qa_harness] usuário de teste apagado: ' + created.userIds[i])
      } catch (e5) {
        console.error('[qa_harness] falha ao apagar usuário ' + created.userIds[i] + ':', e5)
      }
    }
    try {
      const m = $app.findFirstRecordByData('program_settings', 'key', MARKER_KEY)
      if (m) $app.delete(m)
      console.log('[qa_harness] marcador apagado.')
    } catch (_) {}
  }

  // ================= PASSO 1 — TESTE (a): rotas removidas =================
  try {
    console.log('[qa_harness] ===== TESTE (a): rotas removidas =====')
    const r1 = httpCall('POST', BASE + '/backend/v1/referrals/refuse-contact', null, {})
    logResult('(a) POST /backend/v1/referrals/refuse-contact', r1)
    const r2 = httpCall('POST', BASE + '/backend/v1/public-referrals', null, {})
    logResult('(a) POST /backend/v1/public-referrals', r2)
    if (Number(r1.status) !== 404 || Number(r2.status) !== 404) {
      console.error('[qa_harness] FALHA no teste (a): esperado 404 em ambos.')
    } else {
      console.log('[qa_harness] TESTE (a) OK: ambas 404.')
    }
  } catch (errA) {
    console.error('[qa_harness] Erro no teste (a):', errA)
  }

  // ================= PASSO 2 — usuários, indicação e documento de teste =================
  let financeiroToken = ''
  let operadorToken = ''

  try {
    console.log('[qa_harness] ===== CRIAÇÃO DOS DADOS DE TESTE =====')
    const usersCol = $app.findCollectionByNameOrId('users')
    const rolesCol = $app.findCollectionByNameOrId('user_roles')

    function createTestUser(email, name) {
      const u = new Record(usersCol)
      u.set('email', email)
      u.set('password', 'QaTeste!2026x')
      u.set('name', name)
      $app.save(u)
      created.userIds.push(u.id)
      console.log('[qa_harness] usuário criado: ' + email + ' id=' + u.id)
      return u
    }

    function createRole(userId, role) {
      const r = new Record(rolesCol)
      r.set('user_id', userId)
      r.set('role', role)
      $app.save(r)
      created.roleIds.push(r.id)
    }

    const finUser = createTestUser('qa.financeiro.' + runId + '@qa-teste.local', 'QA Financeiro')
    const opUser = createTestUser('qa.operador.' + runId + '@qa-teste.local', 'QA Operador')

    createRole(finUser.id, 'financeiro')
    createRole(opUser.id, 'operador')

    financeiroToken = finUser.newAuthToken()
    operadorToken = opUser.newAuthToken()
    console.log('[qa_harness] tokens de teste gerados (financeiro/operador).')

    // Indicação de teste (pertence ao operador, sem efeito colateral real)
    const refCol = $app.findCollectionByNameOrId('referrals')
    const ref = new Record(refCol)
    ref.set('type', 'proprietario')
    ref.set('referral_type', 'proprietario')
    ref.set('referrer_name', 'QA Indicador Teste')
    ref.set('referrer_phone', '551190000000' + runId.slice(-2))
    ref.set('description', 'Indicação criada por qa_harness para teste de papéis.')
    ref.set('return_contact', 'qa.teste@qa-teste.local')
    ref.set('status', 'recebida')
    ref.set('channel', 'manual')
    ref.set('current_owner_id', opUser.id)
    ref.set('original_owner_id', opUser.id)
    ref.set('owner_name', 'QA Proprietário Teste')
    ref.set('owner_phone', '551190000000' + runId.slice(-2))
    $app.save(ref)
    created.referralId = ref.id
    console.log('[qa_harness] indicação de teste criada: id=' + ref.id)

    // Documento de teste vinculado à indicação
    const docsCol = $app.findCollectionByNameOrId('documents')
    const doc = new Record(docsCol)
    doc.set('referral_id', ref.id)
    doc.set('bucket_type', 'capture-documents')
    doc.set('title', 'QA Documento Teste ' + runId)
    doc.set(
      'file',
      $filesystem.fileFromBytes('conteudo de teste qa_harness', 'qa-teste-' + runId + '.txt'),
    )
    doc.set('uploaded_by', opUser.id)
    doc.set('file_type', 'txt')
    $app.save(doc)
    created.documentId = doc.id
    console.log('[qa_harness] documento de teste criado: id=' + doc.id)
  } catch (errSetup) {
    console.error('[qa_harness] Erro ao criar dados de teste:', errSetup)
    cleanup()
    return
  }

  // ================= TESTE (b): financeiro NÃO opera =================
  try {
    console.log('[qa_harness] ===== TESTE (b): financeiro =====')
    const b1 = httpCall('POST', BASE + '/backend/v1/referrals/request-capture', financeiroToken, {
      referral_id: created.referralId,
      document_id: created.documentId,
      instrument_type: 'procuracao',
    })
    logResult('(b) financeiro POST request-capture', b1)

    const b2 = httpCall(
      'GET',
      BASE + '/backend/v1/documents/' + created.documentId + '/download-url',
      financeiroToken,
      null,
    )
    logResult('(b) financeiro GET download-url', b2)

    if (b1.status === 403 && b1.body.indexOf('Acesso negado') !== -1 && b2.status === 403) {
      console.log('[qa_harness] TESTE (b) OK: financeiro recebeu 403 nas duas.')
    } else {
      console.error('[qa_harness] FALHA no teste (b).')
    }
  } catch (errB) {
    console.error('[qa_harness] Erro no teste (b):', errB)
  }

  // ================= TESTE (c): operador opera =================
  try {
    console.log('[qa_harness] ===== TESTE (c): operador =====')
    const c1 = httpCall('POST', BASE + '/backend/v1/referrals/request-capture', operadorToken, {
      referral_id: created.referralId,
      document_id: created.documentId,
      instrument_type: 'procuracao',
    })
    logResult('(c) operador POST request-capture', c1)
    if (c1.status === 200) {
      try {
        const parsed = JSON.parse(c1.body)
        if (parsed.capture_id) created.captureIds.push(parsed.capture_id)
      } catch (_) {}
    }

    const c2 = httpCall(
      'GET',
      BASE + '/backend/v1/documents/' + created.documentId + '/download-url',
      operadorToken,
      null,
    )
    logResult('(c) operador GET download-url', c2)

    if (c1.status === 200 && c2.status === 200) {
      console.log('[qa_harness] TESTE (c) OK: operador obteve sucesso nas duas.')
    } else {
      console.error('[qa_harness] FALHA no teste (c).')
    }
  } catch (errC) {
    console.error('[qa_harness] Erro no teste (c):', errC)
  }

  // ================= PASSO 3 — TESTE (d): re-aceite por versão =================
  try {
    console.log('[qa_harness] ===== TESTE (d): re-aceite =====')
    const usersCol = $app.findCollectionByNameOrId('users')

    // categoria existente (seed de produção)
    const cats = $app.findRecordsByFilter('participant_categories', '', '', 1, 0)
    if (cats.length === 0) {
      console.error(
        '[qa_harness] FALHA: nenhuma participant_categories encontrada; teste (d) abortado.',
      )
      cleanup()
      return
    }
    created.categoryFound = cats[0].id

    const partUser = new Record(usersCol)
    partUser.set('email', 'qa.participante.' + runId + '@qa-teste.local')
    partUser.set('password', 'QaTeste!2026x')
    partUser.set('name', 'QA Participante Teste')
    $app.save(partUser)
    created.userIds.push(partUser.id)
    console.log('[qa_harness] usuário participante criado: id=' + partUser.id)

    const partCol = $app.findCollectionByNameOrId('participants')
    const part = new Record(partCol)
    part.set('user_id', partUser.id)
    part.set('category_id', created.categoryFound)
    part.set('status', 'ativo')
    part.set('referral_code', 'QAHARNESS' + runId.slice(-6))
    $app.save(part)
    created.participantId = part.id
    console.log('[qa_harness] participante de teste criado: id=' + part.id)

    // aceite registrado na versão ANTERIOR (v3, inativa) do Regulamento
    const v3recs = $app.findRecordsByFilter(
      'legal_documents',
      "slug = 'regulamento_do_programa' && version = 3",
      '',
      1,
      0,
    )
    if (v3recs.length === 0) {
      console.error('[qa_harness] FALHA: Regulamento v3 não encontrado.')
      cleanup()
      return
    }
    const v3Id = v3recs[0].id

    const accCol = $app.findCollectionByNameOrId('acceptances')
    const acc = new Record(accCol)
    acc.set('user_id', partUser.id)
    acc.set('document_id', v3Id)
    acc.set('accepted_at', new Date().toISOString())
    acc.set('details', 'Aceite antigo (v3) simulado por qa_harness')
    $app.save(acc)
    created.acceptanceIds.push(acc.id)
    console.log('[qa_harness] aceite v3 registrado: id=' + acc.id + ' doc=' + v3Id)

    const partToken = partUser.newAuthToken()

    const d1 = httpCall(
      'GET',
      BASE + '/backend/v1/participant/pending-acceptances',
      partToken,
      null,
    )
    logResult('(d) GET pending-acceptances (antes do aceite)', d1)

    let pendingIds = []
    try {
      const parsed = JSON.parse(d1.body)
      if (parsed && Array.isArray(parsed.pending)) {
        pendingIds = parsed.pending.map(function (p) {
          return p.document_id
        })
      }
    } catch (_) {}

    if (d1.status === 200 && pendingIds.length > 0) {
      console.log(
        '[qa_harness] TESTE (d) parte 1 OK: pendências encontradas (' + pendingIds.length + ').',
      )
    } else {
      console.error('[qa_harness] FALHA no teste (d) parte 1.')
    }

    const d2 = httpCall('POST', BASE + '/backend/v1/participant/accept-documents', partToken, {
      document_ids: pendingIds,
    })
    logResult('(d) POST accept-documents', d2)

    const d3 = httpCall(
      'GET',
      BASE + '/backend/v1/participant/pending-acceptances',
      partToken,
      null,
    )
    logResult('(d) GET pending-acceptances (depois do aceite)', d3)

    let emptyAfter = false
    try {
      const parsed3 = JSON.parse(d3.body)
      emptyAfter = parsed3 && Array.isArray(parsed3.pending) && parsed3.pending.length === 0
    } catch (_) {}

    if (d2.status === 200 && d3.status === 200 && emptyAfter) {
      console.log('[qa_harness] TESTE (d) OK: lista ficou vazia após aceite.')
    } else {
      console.error('[qa_harness] FALHA no teste (d) partes 2-3.')
    }
  } catch (errD) {
    console.error('[qa_harness] Erro no teste (d):', errD)
  }

  // ================= PASSO 4 — LIMPEZA =================
  cleanup()

  let usersCount = -1
  try {
    const allUsers = $app.findRecordsByFilter('users', 'id != ""', '', 500, 0)
    usersCount = allUsers.length
  } catch (e6) {
    console.error('[qa_harness] falha ao contar usuários:', e6)
  }
  console.log('[qa_harness] ===== FIM ===== contagem final de users = ' + usersCount)
})
