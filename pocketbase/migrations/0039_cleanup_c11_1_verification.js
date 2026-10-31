// REGRA DAQUI EM DIANTE: migração nunca cria dados de teste; teste é feito pelas rotas reais.
// Migração 0039: Limpeza completa dos dados de teste criados pela 0038_c11_1_verification.js.
//
// 1. Localiza o audit_log com action = 'c11_1_verification_suite'
// 2. Remove vínculos em participant_condominiums dos participantes e condomínios de teste
// 3. Remove participantes e usuários test_part_%@example.com (e aceites vinculados a esses usuários)
// 4. Remove os condomínios "Mar Azul", "Mar Azul II" e "Condomínio Destino X" criados pela 0038
//    (confirmação feita: "Mar Azul II" não existia antes da 0038, seu timestamp de criação é idêntico ao da execução da 0038)
// 5. Remove o audit_log da verificação.

migrate(
  (app) => {
    // 1. Obter detalhes do audit_log se existir
    let cenario1Details = null
    let cenario2Details = null
    let auditLogRec = null
    try {
      auditLogRec = app.findFirstRecordByFilter('audit_logs', "action = 'c11_1_verification_suite'")
      if (auditLogRec) {
        const raw = auditLogRec.getString('details')
        if (raw) {
          const parsed = JSON.parse(raw)
          cenario1Details = parsed.cenario_1 || null
          cenario2Details = parsed.cenario_2 || null
        }
      }
    } catch (_) {}

    // IDs específicos para conferência defensiva
    const condoIdsToDelete = new Set()
    if (cenario1Details && cenario1Details.mar_azul_created_condo_id) {
      condoIdsToDelete.add(cenario1Details.mar_azul_created_condo_id)
    }
    if (
      cenario1Details &&
      cenario1Details.mar_azul_similar_ids &&
      Array.isArray(cenario1Details.mar_azul_similar_ids)
    ) {
      cenario1Details.mar_azul_similar_ids.forEach((id) => condoIdsToDelete.add(id))
    }
    if (cenario2Details && cenario2Details.condo_x_id) {
      condoIdsToDelete.add(cenario2Details.condo_x_id)
    }
    if (cenario2Details && cenario2Details.condo_y_id) {
      condoIdsToDelete.add(cenario2Details.condo_y_id)
    }

    // Também localizar pelos nomes explicitados na tarefa
    const condoNames = [
      'Mar Azul II',
      'Mar Azul',
      'Condomínio Destino X',
      'Condomínio Novo Compartilhado Y',
      'Condomínio Para Recusa Teste',
    ]
    for (let i = 0; i < condoNames.length; i++) {
      try {
        const records = app.findRecordsByFilter('condominiums', `name = {:n}`, '', 100, 0, {
          n: condoNames[i],
        })
        for (let j = 0; j < records.length; j++) {
          condoIdsToDelete.add(records[j].id)
        }
      } catch (_) {}
    }

    // 2. Localizar usuários test_part_%
    const userIdsToDelete = new Set()
    try {
      const testUsers = app.findRecordsByFilter(
        '_pb_users_auth_',
        "email ~ 'test_part_'",
        '',
        500,
        0,
      )
      for (let i = 0; i < testUsers.length; i++) {
        userIdsToDelete.add(testUsers[i].id)
      }
    } catch (_) {}

    // 3. Localizar participantes vinculados aos usuários de teste
    const participantIdsToDelete = new Set()
    userIdsToDelete.forEach((uId) => {
      try {
        const parts = app.findRecordsByFilter('participants', `user_id = {:uid}`, '', 100, 0, {
          uid: uId,
        })
        for (let i = 0; i < parts.length; i++) {
          participantIdsToDelete.add(parts[i].id)
        }
      } catch (_) {}
    })

    // 4. Apagar vínculos em participant_condominiums
    participantIdsToDelete.forEach((pId) => {
      try {
        const links = app.findRecordsByFilter(
          'participant_condominiums',
          `participant_id = {:pid}`,
          '',
          100,
          0,
          { pid: pId },
        )
        for (let i = 0; i < links.length; i++) {
          try {
            app.delete(links[i])
          } catch (_) {}
        }
      } catch (_) {}
    })

    condoIdsToDelete.forEach((cId) => {
      try {
        const links = app.findRecordsByFilter(
          'participant_condominiums',
          `condominium_id = {:cid}`,
          '',
          100,
          0,
          { cid: cId },
        )
        for (let i = 0; i < links.length; i++) {
          try {
            app.delete(links[i])
          } catch (_) {}
        }
      } catch (_) {}
    })

    // 5. Apagar aceites (acceptances) vinculados aos usuários de teste
    userIdsToDelete.forEach((uId) => {
      try {
        const accs = app.findRecordsByFilter('acceptances', `user_id = {:uid}`, '', 200, 0, {
          uid: uId,
        })
        for (let i = 0; i < accs.length; i++) {
          try {
            app.delete(accs[i])
          } catch (_) {}
        }
      } catch (_) {}
    })

    // 6. Apagar participantes de teste
    participantIdsToDelete.forEach((pId) => {
      try {
        const pRec = app.findRecordById('participants', pId)
        app.delete(pRec)
      } catch (_) {}
    })

    // 7. Apagar usuários de teste
    userIdsToDelete.forEach((uId) => {
      try {
        const uRec = app.findRecordById('_pb_users_auth_', uId)
        app.delete(uRec)
      } catch (_) {}
    })

    // 8. Apagar condomínios de teste identificados
    condoIdsToDelete.forEach((cId) => {
      try {
        const cRec = app.findRecordById('condominiums', cId)
        app.delete(cRec)
      } catch (_) {}
    })

    // 9. Apagar o audit_log da verificação
    if (auditLogRec) {
      try {
        app.delete(auditLogRec)
      } catch (_) {}
    }
    try {
      const leftoverLogs = app.findRecordsByFilter(
        'audit_logs',
        "action = 'c11_1_verification_suite'",
        '',
        50,
        0,
      )
      for (let i = 0; i < leftoverLogs.length; i++) {
        try {
          app.delete(leftoverLogs[i])
        } catch (_) {}
      }
    } catch (_) {}
  },
  (app) => {
    // Reversão não necessária para limpeza de dados de teste
  },
)
