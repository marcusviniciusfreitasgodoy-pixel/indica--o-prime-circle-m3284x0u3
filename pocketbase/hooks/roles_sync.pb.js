/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de segurança e sincronização de papéis internos.
 * - Sincroniza user_roles -> users.is_admin, users.is_operador, users.is_financeiro
 * - Impede que requisições de clientes alterem is_admin, is_operador e is_financeiro diretamente em users
 */

// Ao criar um papel, sincroniza o usuário
onRecordAfterCreateSuccess((e) => {
  const userId = e.record.getString('user_id')
  if (userId) {
    try {
      const user = $app.findRecordById('users', userId)
      if (user) {
        const roles = $app.findRecordsByFilter(
          'user_roles',
          `user_id = '${userId}'`,
          'created',
          50,
          0,
        )
        const roleNames = roles.map((r) => r.getString('role'))
        const isAdmin = roleNames.includes('admin')
        const isOperador = roleNames.includes('operador')
        const isFinanceiro = roleNames.includes('financeiro')

        let changed = false
        if (user.getBool('is_admin') !== isAdmin) {
          user.set('is_admin', isAdmin)
          changed = true
        }
        if (user.getBool('is_operador') !== isOperador) {
          user.set('is_operador', isOperador)
          changed = true
        }
        if (user.getBool('is_financeiro') !== isFinanceiro) {
          user.set('is_financeiro', isFinanceiro)
          changed = true
        }

        if (changed) {
          $app.save(user)
        }
      }
    } catch (err) {
      console.error(
        `[roles_sync] Erro ao sincronizar criação de papel para usuário ${userId}:`,
        err,
      )
    }
  }
  e.next()
}, 'user_roles')

// Ao deletar um papel, sincroniza o usuário
onRecordAfterDeleteSuccess((e) => {
  const userId = e.record.getString('user_id')
  if (userId) {
    try {
      const user = $app.findRecordById('users', userId)
      if (user) {
        const roles = $app.findRecordsByFilter(
          'user_roles',
          `user_id = '${userId}'`,
          'created',
          50,
          0,
        )
        const roleNames = roles.map((r) => r.getString('role'))
        const isAdmin = roleNames.includes('admin')
        const isOperador = roleNames.includes('operador')
        const isFinanceiro = roleNames.includes('financeiro')

        let changed = false
        if (user.getBool('is_admin') !== isAdmin) {
          user.set('is_admin', isAdmin)
          changed = true
        }
        if (user.getBool('is_operador') !== isOperador) {
          user.set('is_operador', isOperador)
          changed = true
        }
        if (user.getBool('is_financeiro') !== isFinanceiro) {
          user.set('is_financeiro', isFinanceiro)
          changed = true
        }

        if (changed) {
          $app.save(user)
        }
      }
    } catch (err) {
      console.error(
        `[roles_sync] Erro ao sincronizar deleção de papel para usuário ${userId}:`,
        err,
      )
    }
  }
  e.next()
}, 'user_roles')

// (a) Bloqueia qualquer alteração de is_admin, is_operador e is_financeiro via requisição HTTP se quem chama não for superuser
onRecordUpdateRequest((e) => {
  const isSuperuser = e.hasSuperuserAuth ? e.hasSuperuserAuth() : false
  if (!isSuperuser) {
    const originalRecord = e.record.original()
    const origAdmin = originalRecord ? originalRecord.getBool('is_admin') : false
    const origOperador = originalRecord ? originalRecord.getBool('is_operador') : false
    const origFinanceiro = originalRecord ? originalRecord.getBool('is_financeiro') : false

    const newAdmin = e.record.getBool('is_admin')
    const newOperador = e.record.getBool('is_operador')
    const newFinanceiro = e.record.getBool('is_financeiro')

    if (
      newAdmin !== origAdmin ||
      newOperador !== origOperador ||
      newFinanceiro !== origFinanceiro
    ) {
      throw new ForbiddenError(
        'Alteração de privilégios internos (is_admin, is_operador, is_financeiro) não permitida pela API de usuários.',
      )
    }
  }

  e.next()
}, 'users')

// (b) Força is_admin, is_operador e is_financeiro = false em todo cadastro vindo da API
onRecordCreateRequest((e) => {
  const isSuperuser = e.hasSuperuserAuth ? e.hasSuperuserAuth() : false
  if (!isSuperuser) {
    e.record.set('is_admin', false)
    e.record.set('is_operador', false)
    e.record.set('is_financeiro', false)
  }

  e.next()
}, 'users')
