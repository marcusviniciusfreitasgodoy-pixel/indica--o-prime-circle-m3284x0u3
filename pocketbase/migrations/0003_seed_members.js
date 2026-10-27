migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Seed initial user if not exists
    const initialEmail = 'marcusviniciusfreitasgodoy@gmail.com'
    let firstUser
    try {
      firstUser = app.findAuthRecordByEmail('_pb_users_auth_', initialEmail)
    } catch (_) {
      firstUser = new Record(users)
      firstUser.setEmail(initialEmail)
      firstUser.setPassword('Skip@Pass')
      firstUser.setVerified(true)
      firstUser.set('name', 'Marcus Godoy')
      firstUser.set('agency', 'Prime Circle Imóveis')
      firstUser.set('phone', '(11) 98765-4321')
      firstUser.set('public_slug', 'marcus-godoy')
      app.save(firstUser)
    }

    // Seed a second broker member so that transfers (repasse) can be tested right away
    const secondEmail = 'corretor.parceiro@primecircle.com.br'
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', secondEmail)
    } catch (_) {
      const secondUser = new Record(users)
      secondUser.setEmail(secondEmail)
      secondUser.setPassword('Skip@Pass')
      secondUser.setVerified(true)
      secondUser.set('name', 'Ana Carolina Silva')
      secondUser.set('agency', 'Silva & Associados Prime')
      secondUser.set('phone', '(11) 99123-4567')
      secondUser.set('public_slug', 'ana-silva')
      app.save(secondUser)
    }
  },
  (app) => {
    // down: optionally remove seeded users
    try {
      const u1 = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'marcusviniciusfreitasgodoy@gmail.com',
      )
      app.delete(u1)
    } catch (_) {}
    try {
      const u2 = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'corretor.parceiro@primecircle.com.br',
      )
      app.delete(u2)
    } catch (_) {}
  },
)
