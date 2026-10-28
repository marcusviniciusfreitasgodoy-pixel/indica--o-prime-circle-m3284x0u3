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

// Bloqueia qualquer alteração de is_admin, is_operador e is_financeiro que venha por requisição de API
onRecordUpdate((e) => {
  if (e.httpContext) {
    const originalRecord = e.record.original()
    const isAdminChanged =
      e.record.getBool('is_admin') !== (originalRecord ? originalRecord.getBool('is_admin') : false)
    const isOperadorChanged =
      e.record.getBool('is_operador') !==
      (originalRecord ? originalRecord.getBool('is_operador') : false)
    const isFinanceiroChanged =
      e.record.getBool('is_financeiro') !==
      (originalRecord ? originalRecord.getBool('is_financeiro') : false)

    if (isAdminChanged || isOperadorChanged || isFinanceiroChanged) {
      throw new BadRequestError(
        'Alteração de permissões internas (is_admin, is_operador, is_financeiro) não permitida diretamente pela API de usuários.',
      )
    }
  }

  e.next()
}, 'users')
