// pocketbase/migrations/0016_enable_users_otp.js

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.otp.enabled = true
    users.otp.duration = 900 // 15 minutos
    users.otp.length = 6
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.otp.enabled = false
    app.save(users)
  },
)
