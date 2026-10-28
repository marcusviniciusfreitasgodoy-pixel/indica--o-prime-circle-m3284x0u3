// pocketbase/migrations/0015_security_fix_passwords_and_remove_test_account.js

migrate(
  (app) => {
    // 1. Remove the test account corretor.parceiro@primecircle.com.br if it exists
    const secondEmail = 'corretor.parceiro@primecircle.com.br'
    try {
      const secondUser = app.findAuthRecordByEmail('_pb_users_auth_', secondEmail)
      // Also delete any profile linked to this user
      try {
        const profile = app.findFirstRecordByData('profiles', 'user_id', secondUser.id)
        app.delete(profile)
      } catch (_) {}
      app.delete(secondUser)
    } catch (_) {
      // already deleted or does not exist
    }

    // 2. Change password of marcusviniciusfreitasgodoy@gmail.com to a long random string
    // The owner enters later via email code / OTP or password recovery
    const adminEmail = 'marcusviniciusfreitasgodoy@gmail.com'
    try {
      const adminUser = app.findAuthRecordByEmail('_pb_users_auth_', adminEmail)
      const randomPassword = $security.randomString(32) + '!A9'
      adminUser.setPassword(randomPassword)
      app.save(adminUser)
    } catch (_) {
      // not found
    }
  },
  (app) => {
    // down migration
  },
)
