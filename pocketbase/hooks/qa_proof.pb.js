/**
 * PROVA 1 — Rodada de fechamento 0.0.83/0044.
 * Rota auxiliar TEMPORÁRIA com gate X-Internal-Secret (padrão do projeto):
 * cria convite de teste via superusuário, executa POST real em
 * /backend/v1/public/register-participant via $http.send e devolve a resposta real.
 * SERÁ APAGADA E REDEPLOYADA NO MESMO RUN.
 */
routerAdd('POST', '/backend/v1/qa-proof/register-participant', (e) => {
  const secret = $os.getenv('INTERNAL_FUNCTION_SECRET') || ''
  const provided = e.request.header.get('x-internal-secret') || ''
  if (!secret || provided !== secret) {
    return e.json(403, { message: 'Acesso restrito (rota auxiliar de prova).' })
  }

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}
  const base = (body.base || 'http://127.0.0.1:8090').replace(/\/$/, '')
  const results = {}

  // 1. Criar convite de teste diretamente (superusuário)
  const code = 'QATEST44XX'
  let invitationId = ''
  try {
    try {
      const existing = $app.findFirstRecordByFilter('invitations', 'code = {:c}', { c: code })
      if (existing && existing.getString('used_by')) {
        return e.json(409, {
          message: 'Convite QATEST44XX já foi usado em prova anterior. Limpe primeiro.',
        })
      }
      invitationId = existing.id
    } catch (_) {
      const now = new Date()
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const invCol = $app.findCollectionByNameOrId('invitations')
      const inv = new Record(invCol)
      inv.set('code', code)
      inv.set('category_id', 'rxw2vl6ewvm4axh') // categoria "cliente", pilot_enabled=true
      inv.set('expires_at', expires.toISOString().replace('T', ' '))
      $app.save(inv)
      invitationId = inv.id
    }
  } catch (errInv) {
    return e.json(500, {
      step: 'criar_convite',
      error: String((errInv && errInv.message) || errInv),
    })
  }
  results.step_criar_convite = 'ok'
  results.invitation_id = invitationId

  // 2. POST HTTP REAL na rota pública de cadastro
  const payload = {
    invitation_code: code,
    category_id: 'rxw2vl6ewvm4axh',
    nome: 'QA Prova 0044',
    email: 'teste.prova.0044@qa-teste.local',
    senha: 'Prova0044!SenhaForte',
    telefone: '21999990001',
    cpf: '11144477735',
    declarou_maioridade: true,
    accepted_documents: [
      { slug: 'termos_de_uso', version: 2 },
      { slug: 'politica_de_privacidade', version: 2 },
      { slug: 'regulamento_do_programa', version: 4 },
      { slug: 'declaracao_ausencia_impedimento', version: 4 },
    ],
  }
  let httpRes = null
  try {
    httpRes = $http.send({
      url: base + '/backend/v1/public/register-participant',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify(payload),
      timeout: 15,
    })
  } catch (errHttp) {
    return e.json(500, {
      step: 'http_post_register',
      error: String((errHttp && errHttp.message) || errHttp),
      before_failure: results,
    })
  }
  results.http_status = httpRes.statusCode || httpRes.status
  results.http_response = httpRes.json

  // 3. Ler via superusuário o que a transação realmente gravou
  try {
    const created = $app.findAuthRecordByEmail('_pb_users_auth_', 'teste.prova.0044@qa-teste.local')
    results.db_check = {
      user: {
        id: created.id,
        email: created.getString('email'),
        verified: created.getBool('verified'),
      },
      participant_id: '',
      acceptances: 0,
      invitation_used_by: '',
    }
    try {
      const part = $app.findFirstRecordByFilter('participants', "user_id = '" + created.id + "'")
      results.db_check.participant_id = part.id
      results.db_check.participant_status = part.getString('status')
      results.db_check.participant_invitation_code = part.getString('invitation_code')
    } catch (_) {}
    try {
      const accs = $app.findRecordsByFilter(
        'acceptances',
        "user_id = '" + created.id + "'",
        'created',
        50,
        0,
      )
      results.db_check.acceptances = accs.length
      const docIds = []
      for (let i = 0; i < accs.length; i++) docIds.push(accs[i].getString('document_id'))
      results.db_check.acceptance_document_ids = docIds
    } catch (_) {}
    try {
      const inv2 = $app.findFirstRecordByFilter('invitations', 'code = {:c}', { c: code })
      results.db_check.invitation_used_by = inv2.getString('used_by')
    } catch (_) {}
  } catch (errUser) {
    results.db_check = { user: null, error: String((errUser && errUser.message) || errUser) }
  }

  return e.json(200, results)
})
