#!/usr/bin/env node
/**
 * Limpeza de dados de segurança — apaga os 12 usuários de teste @qa-teste.local
 * e TODOS os vínculos deles (user_roles, profiles, referrals). audit_logs NÃO é tocado.
 *
 * Uso (rode na raiz do projeto, Node 18+):
 *   PB_SUPERUSER_EMAIL=... PB_SUPERUSER_PASSWORD=... node scripts/cleanup-qa-users.mjs
 *   (adicione DRY_RUN=1 para só listar o que seria apagado)
 *
 * Base URL: usa PB_URL se definida; senão https://<instancia>.pocketbase.goskip.app
 * (confira no painel Skip Cloud antes de rodar).
 */

const BASE_URL =
  process.env.PB_URL || 'https://indicacao-prime-circle-1ba22.shrd01.internal.goskip.dev'
const TOKEN = process.env.PB_SUPERUSER_TOKEN
const DRY_RUN = process.env.DRY_RUN === '1'

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

// Campos que referenciam users em cada coleção (audit_logs é EXCLUÍDO de propósito).
const LINKED_COLLECTIONS = [
  { name: 'user_roles', fields: ['user_id'] },
  { name: 'profiles', fields: ['user_id'] },
  { name: 'participants', fields: ['user_id', 'approved_by'] },
  { name: 'acceptances', fields: ['user_id'] },
  { name: 'invitations', fields: ['created_by', 'used_by'] },
  {
    name: 'referrals',
    fields: [
      'current_owner_id',
      'original_owner_id',
      'assigned_operator_id',
      'declined_by',
      'first_contact_by',
    ],
  },
  { name: 'deals', fields: ['registered_by'] },
  { name: 'documents', fields: ['uploaded_by'] },
  { name: 'rewards', fields: ['approved_by', 'orange_flag_resolved_by', 'registered_payment_by'] },
  { name: 'payment_batches', fields: ['closed_by'] },
  { name: 'referral_events', fields: ['actor_id'] },
]

if (!TOKEN) {
  console.error('Defina PB_SUPERUSER_TOKEN no ambiente (token de superusuário pronto).')
  process.exit(1)
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${options.method || 'GET'} ${path} -> ${res.status}: ${body.slice(0, 500)}`)
  }
  return res.status === 204 ? null : res.json()
}

async function main() {
  console.log(`Base: ${BASE_URL}${DRY_RUN ? ' (DRY RUN)' : ''}`)
  // Valida a autenticação por token ANTES de qualquer operação destrutiva.
  const probe = await api(
    '/api/collections/users/records?perPage=1&filter=' + encodeURIComponent("email~'qa.probe'"),
    {
      headers: { Authorization: TOKEN },
    },
  )
  console.log(`Auth por token OK (probe encontrou ${probe.totalItems} usuários qa.probe).`)
  const headers = { Authorization: TOKEN }

  const deleted = {}

  // 1) Vínculos primeiro, depois os usuários (ordem exigida pela tarefa).
  for (const { name, fields } of LINKED_COLLECTIONS) {
    deleted[name] = 0
    const or = QA_USER_IDS.flatMap((id) => fields.map((f) => `${f}="${id}"`)).join(' || ')
    const found = await api(
      `/api/collections/${name}/records?perPage=200&filter=${encodeURIComponent(or)}`,
      { headers },
    )
    for (const item of found.items || []) {
      console.log(
        `  ${name}/${item.id} (via ${fields.filter((f) => item[f] && QA_USER_IDS.includes(item[f])).join('+')})`,
      )
      if (!DRY_RUN) {
        await api(`/api/collections/${name}/records/${item.id}`, { method: 'DELETE', headers })
        deleted[name]++
      } else {
        deleted[name]++
      }
    }
  }

  // 2) Usuários por id exato.
  deleted.users = 0
  for (const id of QA_USER_IDS) {
    console.log(`  users/${id}`)
    if (!DRY_RUN) {
      await api(`/api/collections/users/records/${id}`, { method: 'DELETE', headers })
      deleted.users++
    } else {
      deleted.users++
    }
  }

  // 3) Verificação final: users restantes + nenhuma referência residual.
  if (!DRY_RUN) {
    const users = await api('/api/collections/users/records?perPage=50&sort=email', { headers })
    console.log('\n=== users restantes ===')
    for (const u of users.items) console.log(`  ${u.id}  ${u.email}`)
    console.log(`Total users: ${users.totalItems}`)

    console.log('\n=== referências residuais aos 12 ids (deve ser 0 em tudo) ===')
    for (const { name, fields } of LINKED_COLLECTIONS) {
      const or = QA_USER_IDS.flatMap((id) => fields.map((f) => `${f}="${id}"`)).join(' || ')
      const check = await api(
        `/api/collections/${name}/records?perPage=1&filter=${encodeURIComponent(or)}`,
        { headers },
      )
      console.log(`  ${name}: ${check.totalItems}`)
    }
  }

  console.log('\n=== apagados por coleção ===')
  for (const [name, n] of Object.entries(deleted)) console.log(`  ${name}: ${n}`)
  console.log(`\naudit_logs: NÃO tocado (proibido pelo usuário).`)
}

main().catch((err) => {
  console.error('ERRO:', err.message)
  process.exit(1)
})
