// pocketbase/migrations/0024_cleanup_simulated_security_suite.js
/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Limpa as linhas de audit_logs geradas pelo teste simulado (migração 0022)
    try {
      const logs = app.findRecordsByFilter(
        'audit_logs',
        "actor_email = 'sec_test_user_c7_1@godoyprime.com.br' || actor_email = 'sec_test_user_c7_signup@godoyprime.com.br'",
        '-created',
        100,
        0,
      )
      for (let i = 0; i < logs.length; i++) {
        try {
          app.delete(logs[i])
        } catch (_) {}
      }
    } catch (_) {}

    // Limpa também o setting gravado pelo teste simulado da 0022
    try {
      const stRec = app.findFirstRecordByData('program_settings', 'key', 'latest_security_test_run')
      if (stRec) {
        app.delete(stRec)
      }
    } catch (_) {}
  },
  () => {},
)
