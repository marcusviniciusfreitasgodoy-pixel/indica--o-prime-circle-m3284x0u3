/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Categoria cliente: requires_approval = true durante o piloto
    try {
      const clienteCat = app.findFirstRecordByFilter('participant_categories', 'slug = {:s}', {
        s: 'cliente',
      })
      if (clienteCat) {
        clienteCat.set('requires_approval', true)
        app.save(clienteCat)
      }
    } catch (err) {
      console.warn('[migration 0026] Categoria cliente não encontrada:', err)
    }

    // 2. Categoria entidade_condominial: front = parceiros (estava em comunidade)
    try {
      const entidadeCat = app.findFirstRecordByFilter('participant_categories', 'slug = {:s}', {
        s: 'entidade_condominial',
      })
      if (entidadeCat) {
        entidadeCat.set('front', 'parceiros')
        app.save(entidadeCat)
      }
    } catch (err) {
      console.warn('[migration 0026] Categoria entidade_condominial não encontrada:', err)
    }
  },
  (app) => {
    try {
      const clienteCat = app.findFirstRecordByFilter('participant_categories', 'slug = {:s}', {
        s: 'cliente',
      })
      if (clienteCat) {
        clienteCat.set('requires_approval', false)
        app.save(clienteCat)
      }
    } catch (_) {}

    try {
      const entidadeCat = app.findFirstRecordByFilter('participant_categories', 'slug = {:s}', {
        s: 'entidade_condominial',
      })
      if (entidadeCat) {
        entidadeCat.set('front', 'comunidade')
        app.save(entidadeCat)
      }
    } catch (_) {}
  },
)
