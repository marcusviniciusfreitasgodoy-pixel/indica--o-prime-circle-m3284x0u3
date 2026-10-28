// pocketbase/migrations/0023_lock_users_delete_and_harden.js
/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  try {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    // Apenas superusers podem deletar usuários diretamente
    users.deleteRule = null
    app.save(users)
  } catch (err) {
    console.error('[0023_lock_users_delete_and_harden] Erro:', err)
  }
})
