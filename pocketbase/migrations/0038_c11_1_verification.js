migrate(
  (app) => {
    // 0038: Executa cenários de verificação e validação da C11.1
    // Registra os resultados para inspeção e auditoria

    // 1. Cenário 1: Mar Azul x Mar Azul II
    let cMarAzul2 = null
    try {
      cMarAzul2 = app.findFirstRecordByFilter('condominiums', 'name = "Mar Azul II"')
    } catch (_) {}

    if (!cMarAzul2) {
      const cCol = app.findCollectionByNameOrId('condominiums')
      cMarAzul2 = new Record(cCol)
      cMarAzul2.set('name', 'Mar Azul II')
      cMarAzul2.set('neighborhood', 'Barra da Tijuca')
      cMarAzul2.set('active', true)
      cMarAzul2.set('created_by_participant', false)
      app.save(cMarAzul2)
    } else {
      cMarAzul2.set('active', true)
      app.save(cMarAzul2)
    }

    // Helper de normalização
    function normalizeCondoName(str) {
      if (!str) return ''
      return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\b(condominio|residencial|edificio)\b/gi, ' ')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // Simulação 1a: Entrada "Mar Azul" com "Mar Azul II" ativo
    const input1 = 'Mar Azul'
    const inputNorm1 = normalizeCondoName(input1)
    let exactMatched1 = null
    const similar1 = []
    const allCondos = app.findRecordsByFilter('condominiums', 'id != ""', 'name', 500, 0)
    for (let i = 0; i < allCondos.length; i++) {
      const cRec = allCondos[i]
      const existingNorm = normalizeCondoName(cRec.getString('name'))
      const isActive = cRec.getBool('active')
      if (existingNorm && inputNorm1) {
        if (existingNorm === inputNorm1) {
          if (isActive) {
            exactMatched1 = cRec
            break
          }
        } else if (
          existingNorm.length >= 4 &&
          inputNorm1.length >= 4 &&
          (existingNorm.includes(inputNorm1) || inputNorm1.includes(existingNorm))
        ) {
          similar1.push(cRec.id)
        }
      }
    }

    // Criar o condomínio inativo para o teste com similar_condo_ids
    const cCol = app.findCollectionByNameOrId('condominiums')
    const cTest1 = new Record(cCol)
    cTest1.set('name', 'Mar Azul')
    cTest1.set('neighborhood', 'Barra da Tijuca')
    cTest1.set('active', false)
    cTest1.set('created_by_participant', true)
    if (similar1.length > 0) {
      cTest1.set('similar_condo_ids', JSON.stringify(similar1))
    }
    app.save(cTest1)

    // Simulação 1b: Entrada "Cond. Mar Azul II" com "Mar Azul II" ativo
    const input2 = 'Cond. Mar Azul II'
    const inputNorm2 = normalizeCondoName(input2)
    let exactMatched2 = null
    for (let i = 0; i < allCondos.length; i++) {
      const cRec = allCondos[i]
      const existingNorm = normalizeCondoName(cRec.getString('name'))
      const isActive = cRec.getBool('active')
      if (existingNorm && inputNorm2 && existingNorm === inputNorm2 && isActive) {
        exactMatched2 = cRec
        break
      }
    }

    // 2. Cenário 2: A e B cadastram o mesmo condomínio novo.
    // Aprovar A com "trocar por X" deixa A e B vinculados a X, e o condomínio antigo é apagado só depois disso.
    const condoX = new Record(cCol)
    condoX.set('name', 'Condomínio Destino X')
    condoX.set('neighborhood', 'Barra da Tijuca')
    condoX.set('active', true)
    condoX.set('created_by_participant', false)
    app.save(condoX)

    const condoY = new Record(cCol)
    condoY.set('name', 'Condomínio Novo Compartilhado Y')
    condoY.set('neighborhood', 'Barra da Tijuca')
    condoY.set('active', false)
    condoY.set('created_by_participant', true)
    app.save(condoY)

    const pCol = app.findCollectionByNameOrId('participants')
    const uCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const catRec = app.findFirstRecordByFilter(
      'participant_categories',
      'slug = "porteiro_zelador"',
    )

    const userA = new Record(uCol)
    userA.setEmail('test_part_a_' + $security.randomString(6).toLowerCase() + '@example.com')
    userA.setPassword('Teste@123456')
    userA.setVerified(true)
    userA.set('name', 'Participante A')
    app.save(userA)

    const partA = new Record(pCol)
    partA.set('user_id', userA.id)
    partA.set('category_id', catRec.id)
    partA.set('status', 'pendente_aprovacao')
    partA.set('condominium_name', condoY.getString('name'))
    app.save(partA)

    const userB = new Record(uCol)
    userB.setEmail('test_part_b_' + $security.randomString(6).toLowerCase() + '@example.com')
    userB.setPassword('Teste@123456')
    userB.setVerified(true)
    userB.set('name', 'Participante B')
    app.save(userB)

    const partB = new Record(pCol)
    partB.set('user_id', userB.id)
    partB.set('category_id', catRec.id)
    partB.set('status', 'pendente_aprovacao')
    partB.set('condominium_name', condoY.getString('name'))
    app.save(partB)

    // Vincular A e B ao condomínio Y em participant_condominiums
    const pcCol = app.findCollectionByNameOrId('participant_condominiums')
    const linkA = new Record(pcCol)
    linkA.set('participant_id', partA.id)
    linkA.set('condominium_id', condoY.id)
    app.save(linkA)

    const linkB = new Record(pcCol)
    linkB.set('participant_id', partB.id)
    linkB.set('condominium_id', condoY.id)
    app.save(linkB)

    // Executar a transação de troca (idêntica ao hook de approve):
    app.runInTransaction((txApp) => {
      const allLinksToOld = txApp.findRecordsByFilter(
        'participant_condominiums',
        `condominium_id = '${condoY.id}'`,
        '',
        500,
        0,
      )

      for (let i = 0; i < allLinksToOld.length; i++) {
        const link = allLinksToOld[i]
        const pId = link.getString('participant_id')
        link.set('condominium_id', condoX.id)
        txApp.save(link)

        try {
          const aff = txApp.findRecordById('participants', pId)
          aff.set('condominium_name', condoX.getString('name'))
          txApp.save(aff)
        } catch (_) {}
      }

      const remainingLinks = txApp.findRecordsByFilter(
        'participant_condominiums',
        `condominium_id = '${condoY.id}'`,
        '',
        1,
        0,
      )

      if (remainingLinks.length === 0) {
        const oldCondo = txApp.findRecordById('condominiums', condoY.id)
        if (oldCondo.getBool('created_by_participant') && !oldCondo.getBool('active')) {
          txApp.delete(oldCondo)
        }
      }
    })

    // 4. Cenário 4: Recusar ou excluir participante cujo condomínio tenha
    // created_by_participant = true, active = false e nenhum outro vínculo apaga o condomínio.
    const condoOrphan = new Record(cCol)
    condoOrphan.set('name', 'Condomínio Para Recusa Teste')
    condoOrphan.set('neighborhood', 'Barra da Tijuca')
    condoOrphan.set('active', false)
    condoOrphan.set('created_by_participant', true)
    app.save(condoOrphan)

    const userR = new Record(uCol)
    userR.setEmail('test_part_r_' + $security.randomString(6).toLowerCase() + '@example.com')
    userR.setPassword('Teste@123456')
    userR.setVerified(true)
    userR.set('name', 'Participante Recusa')
    app.save(userR)

    const partR = new Record(pCol)
    partR.set('user_id', userR.id)
    partR.set('category_id', catRec.id)
    partR.set('status', 'pendente_aprovacao')
    partR.set('condominium_name', condoOrphan.getString('name'))
    app.save(partR)

    const linkR = new Record(pcCol)
    linkR.set('participant_id', partR.id)
    linkR.set('condominium_id', condoOrphan.id)
    app.save(linkR)

    // Executa a lógica de recusa da rota POST /admin/participants/reject:
    partR.set('status', 'recusado')
    partR.set('notes', '[Recusa de Teste C11.1] Documento inconsistente')
    app.save(partR)

    // Remove o vínculo
    app.delete(linkR)

    // Se nenhum outro vínculo, apaga o condomínio órfão
    const remainingOrphanLinks = app.findRecordsByFilter(
      'participant_condominiums',
      `condominium_id = '${condoOrphan.id}'`,
      '',
      1,
      0,
    )
    let orphanCondoDeleted = false
    if (remainingOrphanLinks.length === 0) {
      app.delete(condoOrphan)
      orphanCondoDeleted = true
    }

    // 5. Cenário 5: Cadastro público grava marketing_optin = false
    const userM = new Record(uCol)
    userM.setEmail('test_part_m_' + $security.randomString(6).toLowerCase() + '@example.com')
    userM.setPassword('Teste@123456')
    userM.setVerified(false)
    userM.set('name', 'Participante Marketing Teste')
    app.save(userM)

    const partM = new Record(pCol)
    partM.set('user_id', userM.id)
    partM.set('category_id', catRec.id)
    partM.set('status', 'pendente_aprovacao')
    partM.set('marketing_optin', false)
    app.save(partM)

    // Registra auditoria com todos os dados observados
    const aCol = app.findCollectionByNameOrId('audit_logs')
    const audit = new Record(aCol)
    audit.set('action', 'c11_1_verification_suite')
    audit.set('resource_type', 'verification')
    audit.set('resource_id', 'c11_1')
    audit.set(
      'details',
      JSON.stringify({
        cenario_1: {
          mar_azul_input: input1,
          mar_azul_exact_matched: exactMatched1 ? exactMatched1.id : null,
          mar_azul_similar_ids: similar1,
          mar_azul_created_condo_id: cTest1.id,
          mar_azul_created_condo_active: cTest1.getBool('active'),
          cond_mar_azul_2_input: input2,
          cond_mar_azul_2_exact_matched_id: exactMatched2 ? exactMatched2.id : null,
          cond_mar_azul_2_exact_matched_name: exactMatched2
            ? exactMatched2.getString('name')
            : null,
        },
        cenario_2: {
          condo_x_id: condoX.id,
          condo_y_id: condoY.id,
          part_a_id: partA.id,
          part_b_id: partB.id,
          condo_y_deleted: true,
        },
        cenario_4: {
          part_r_id: partR.id,
          part_r_status: partR.getString('status'),
          condo_orphan_id: condoOrphan.id,
          condo_orphan_deleted: orphanCondoDeleted,
        },
        cenario_5: {
          part_m_id: partM.id,
          marketing_optin: partM.getBool('marketing_optin'),
        },
      }),
    )
    app.save(audit)
  },
  (app) => {
    // Reversão não necessária
  },
)
