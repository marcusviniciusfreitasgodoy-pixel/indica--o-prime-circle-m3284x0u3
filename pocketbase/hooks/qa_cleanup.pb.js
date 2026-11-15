// TRANSITÓRIO — hook de segurança, NUNCA commitado (apagado antes do commit).
//
// Cleanup dos 12 usuários @qa-teste.local e TODOS os vínculos.
// audit_logs NUNCA é tocado (regra expressa do usuário).
// Sem ?execute=1: só consulta (DRY RUN). Com ?secret=...&execute=1: apaga.
// Depois de usar, o arquivo é apagado e o backend redeployado.
//
// Padrão do projeto: nada declarado no topo do arquivo é visível dentro dos
// callbacks do PocketBase — toda constante é redeclarada dentro do callback.

console.log('[qa-cleanup] hook carregado')
routerAdd('GET', '/backend/v1/admin/qa-cleanup', (e) => {
  const EXPECTED_SECRET = 'qa-cleanup-2026-11-15-t0ken'
  console.log('[qa-cleanup] secret len=', EXPECTED_SECRET.length)

  const QA_USER_IDS = [
    'gn7tey5gywjt3t8',
    's1af106i982y2cg',
    '10m1veg9l19gijb',
    'fyybo3foc0usof7',
    'num3njt14zltzcm',
    'bw9k5f4abbqh9t8',
    '7bhkt1pkznbrr9d',
    'iga0w7eradud1up',
    'yoyb6dfi5q6hc5h',
    'qcbzwmb69yoa3el',
    'ik50mo2eqy2ajfk',
    'fhmipzkje1y2dga',
  ]

  // Coleções que referenciam users (audit_logs é EXCLUÍDO de propósito).
  const LINKED = [
    ['user_roles', ['user_id']],
    ['profiles', ['user_id']],
    ['participants', ['user_id', 'approved_by']],
    ['acceptances', ['user_id']],
    ['invitations', ['created_by', 'used_by']],
    [
      'referrals',
      [
        'current_owner_id',
        'original_owner_id',
        'assigned_operator_id',
        'declined_by',
        'first_contact_by',
      ],
    ],
    ['deals', ['registered_by']],
    ['documents', ['uploaded_by']],
    ['rewards', ['approved_by', 'orange_flag_resolved_by', 'registered_payment_by']],
    ['payment_batches', ['closed_by']],
    ['referral_events', ['actor_id']],
  ]

  let secret = ''
  try {
    secret = $os.getenv('QA_CLEANUP_QUERY_SECRET') || ''
  } catch (errSecret) {
    secret = ''
  }
  if (secret !== EXPECTED_SECRET) {
    return e.json(403, { error: 'forbidden' })
  }

  const execute = (e.request.url().query().get('execute') || '') === '1'

  const plan = {}
  let totalPlan = 0
  const deleted = {}

  for (const entry of LINKED) {
    const name = entry[0]
    const fields = entry[1]
    const list = []
    let del = 0
    for (const f of fields) {
      for (const id of QA_USER_IDS) {
        let rows = []
        try {
          rows = $app.findRecordsByFilter(name, f + " = '" + id + "'", '', 250, 0)
        } catch (errFilter) {
          // campo/coleção inexistente: registra e segue
          list.push({ id: '__ERR__' + String(errFilter), field: f })
          continue
        }
        for (const row of rows) {
          list.push({ id: row.id, field: f })
          if (execute) {
            try {
              $app.delete(row)
              del++
            } catch (errDel) {
              list.push({ id: row.id, field: f, delError: String(errDel) })
            }
          }
        }
      }
    }
    plan[name] = list
    deleted[name] = del
    totalPlan += list.length
  }

  // users dos 12 ids (vínculos primeiro, usuários depois)
  const usersFound = []
  let usersDeleted = 0
  for (const id of QA_USER_IDS) {
    try {
      const u = $app.findRecordById('users', id)
      usersFound.push({ id: u.id, email: u.getString('email') })
      if (execute) {
        try {
          $app.delete(u)
          usersDeleted++
        } catch (errDelUser) {
          usersFound.push({ id: u.id, email: u.getString('email'), delError: String(errDelUser) })
        }
      }
    } catch (_) {
      // usuário já não existe (idempotente)
    }
  }

  // usuários restantes na coleção users
  const remainingUsers = []
  try {
    const all = $app.findRecordsByFilter('users', "id != ''", 'created', 250, 0)
    for (const u of all) {
      remainingUsers.push({ id: u.id, email: u.getString('email') })
    }
  } catch (errUsers) {
    remainingUsers.push({ id: '__ERR__', email: String(errUsers) })
  }

  return e.json(200, {
    ok: true,
    dry_run: !execute,
    totalPlan,
    plan,
    deleted,
    usersFound,
    usersDeleted,
    remainingUsers,
    remainingUsersCount: remainingUsers.length,
  })
})
