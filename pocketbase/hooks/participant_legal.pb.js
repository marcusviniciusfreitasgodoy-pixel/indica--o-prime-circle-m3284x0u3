// Endpoints de re-aceite por versão dos documentos jurídicos (PASSO 3).
//
// GET  /backend/v1/participant/pending-acceptances  (exige login)
// POST /backend/v1/participant/accept-documents     (exige login)
//
// Regras desta rodada: nenhum valor usado dentro do callback é declarado
// apenas no topo do arquivo — todo o cálculo é feito com literais dentro do
// escopo do callback, que é o único que o PocketBase expõe por requisição.

routerAdd('GET', '/backend/v1/participant/pending-acceptances', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado. Faça login para consultar pendências.' })
  }

  // Equipe interna (admin, operador, financeiro) não passa pela tela de aceite.
  let isInternal = false
  if (
    authRecord.getBool('is_admin') ||
    authRecord.getBool('is_operador') ||
    authRecord.getBool('is_financeiro')
  ) {
    isInternal = true
  }
  if (!isInternal) {
    try {
      const roleRecs = $app.findRecordsByFilter(
        'user_roles',
        'user_id = {:uid}',
        'created',
        20,
        0,
        {
          uid: authRecord.id,
        },
      )
      for (let i = 0; i < roleRecs.length; i++) {
        const r = roleRecs[i].getString('role')
        if (r === 'admin' || r === 'operador' || r === 'financeiro') {
          isInternal = true
          break
        }
      }
    } catch (_) {}
  }

  if (isInternal) {
    return e.json(200, { has_pending: false, pending: [] })
  }

  // Participante: documentos ATIVOS obrigatórios (iguais aos do cadastro).
  const requiredSlugs = [
    'termos_de_uso',
    'politica_de_privacidade',
    'regulamento_do_programa',
    'declaracao_ausencia_impedimento',
  ]

  let activeDocs = []
  try {
    activeDocs = $app.findRecordsByFilter('legal_documents', 'is_active = true', '-version', 100, 0)
  } catch (_) {
    activeDocs = []
  }

  const requiredDocs = activeDocs.filter((d) => requiredSlugs.indexOf(d.getString('slug')) !== -1)

  let acceptedDocIds = []
  try {
    const accRecords = $app.findRecordsByFilter(
      'acceptances',
      'user_id = {:uid}',
      'created',
      200,
      0,
      { uid: authRecord.id },
    )
    acceptedDocIds = accRecords.map((r) => r.getString('document_id'))
  } catch (_) {
    acceptedDocIds = []
  }

  const pending = []
  for (let i = 0; i < requiredDocs.length; i++) {
    const doc = requiredDocs[i]
    if (acceptedDocIds.indexOf(doc.id) === -1) {
      pending.push({
        document_id: doc.id,
        slug: doc.getString('slug'),
        title: doc.getString('title'),
        version: doc.getInt('version'),
        is_provisional: doc.getBool('is_provisional'),
        is_required: true,
      })
    }
  }

  return e.json(200, { has_pending: pending.length > 0, pending })
})

routerAdd('POST', '/backend/v1/participant/accept-documents', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { message: 'Não autorizado. Faça login para aceitar documentos.' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const rawList = Array.isArray(body.document_ids) ? body.document_ids : []

  if (rawList.length === 0) {
    return e.json(400, { message: 'Nenhum documento informado para aceite.' })
  }

  const requestedIds = []
  for (let i = 0; i < rawList.length; i++) {
    const id = String(rawList[i] || '').trim()
    if (id) requestedIds.push(id)
  }
  if (requestedIds.length === 0) {
    return e.json(400, { message: 'Nenhum documento informado para aceite.' })
  }

  const requiredSlugs = [
    'termos_de_uso',
    'politica_de_privacidade',
    'regulamento_do_programa',
    'declaracao_ausencia_impedimento',
  ]

  let activeDocs = []
  try {
    activeDocs = $app.findRecordsByFilter('legal_documents', 'is_active = true', '-version', 100, 0)
  } catch (_) {
    activeDocs = []
  }

  const requiredDocs = activeDocs.filter((d) => requiredSlugs.indexOf(d.getString('slug')) !== -1)
  const requiredIds = requiredDocs.map((d) => d.id)

  for (let i = 0; i < requestedIds.length; i++) {
    if (requiredIds.indexOf(requestedIds[i]) === -1) {
      return e.json(400, {
        message: 'Documento informado não é a versão vigente de um documento obrigatório.',
        document_id: requestedIds[i],
      })
    }
  }

  let acceptedDocIds = []
  try {
    const accRecords = $app.findRecordsByFilter(
      'acceptances',
      'user_id = {:uid}',
      'created',
      200,
      0,
      { uid: authRecord.id },
    )
    acceptedDocIds = accRecords.map((r) => r.getString('document_id'))
  } catch (_) {
    acceptedDocIds = []
  }

  const missing = requiredDocs.filter((d) => acceptedDocIds.indexOf(d.id) === -1)

  for (let i = 0; i < missing.length; i++) {
    if (requestedIds.indexOf(missing[i].id) === -1) {
      return e.json(400, {
        message:
          'Aceite incompleto: é obrigatório aceitar todos os documentos pendentes na versão vigente.',
        missing: missing.map((m) => m.id),
      })
    }
  }

  const nowIso = new Date().toISOString()
  let ip = ''
  try {
    ip = e.request.remoteAddr || ''
  } catch (_) {}
  let userAgent = ''
  try {
    userAgent = e.request.header.get('User-Agent') || ''
  } catch (_) {}

  const acceptancesCol = $app.findCollectionByNameOrId('acceptances')

  let saved = 0
  for (let i = 0; i < requestedIds.length; i++) {
    const docId = requestedIds[i]
    if (acceptedDocIds.indexOf(docId) !== -1) continue

    try {
      const accRec = new Record(acceptancesCol)
      accRec.set('user_id', authRecord.id)
      accRec.set('document_id', docId)
      accRec.set('ip_address', ip)
      accRec.set('user_agent', userAgent)
      accRec.set('accepted_at', nowIso)
      accRec.set('details', 'Re-aceite por versão vigente via /participant/accept-documents')
      $app.save(accRec)
      saved++
    } catch (errSave) {
      console.error('[accept-documents] Erro ao gravar aceite:', errSave)
      return e.json(500, { message: 'Não foi possível gravar o aceite. Tente novamente.' })
    }
  }

  const stillPending = missing.filter((d) => requestedIds.indexOf(d.id) === -1).map((d) => d.id)

  return e.json(200, {
    success: true,
    accepted_count: saved,
    remaining: stillPending,
  })
})
