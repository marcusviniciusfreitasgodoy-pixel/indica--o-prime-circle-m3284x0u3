// pocketbase/migrations/0044_close_users_create.js
//
// Fecha a criação direta de usuários pela API pública do PocketBase.
// Estado anterior: users.createRule = "" (vazio = público, qualquer anônimo
// conseguia POST em /api/collections/users/records e criar conta).
// Estado alvo: createRule = null (valor nulo de verdade — somente superusuário).
// A rota /backend/v1/public/register-participant NÃO é afetada: ela cria o
// usuário via txApp.save() no hook, que ignora regras de API.
// Login por código (requestOTP/authWithOTP) também não é afetado.
//
// Idempotente: se createRule já for null, a migração é no-op.
// down: volta createRule para string vazia "" (estado anterior).

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (users.createRule === null) {
      console.log('[0044] users.createRule já é null (no-op).')
      return
    }
    users.createRule = null
    app.save(users)
    console.log('[0044] users.createRule fechado para superusuário (null).')
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    app.save(users)
    console.log('[0044 down] users.createRule restaurado para público ("").')
  },
)
