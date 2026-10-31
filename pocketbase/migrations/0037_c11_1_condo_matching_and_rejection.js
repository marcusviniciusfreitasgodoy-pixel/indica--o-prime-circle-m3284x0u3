migrate(
  (app) => {
    // 1. Adicionar similar_condo_ids em condominiums
    const condoCol = app.findCollectionByNameOrId('condominiums')
    if (!condoCol.fields.getByName('similar_condo_ids')) {
      condoCol.fields.add(new JSONField({ name: 'similar_condo_ids' }))
      app.save(condoCol)
    }

    // 2. Garantir que o campo status de participants permita 'recusado'
    try {
      const partCol = app.findCollectionByNameOrId('participants')
      const statusField = partCol.fields.getByName('status')
      if (statusField && statusField.values) {
        if (!statusField.values.includes('recusado')) {
          statusField.values = [...statusField.values, 'recusado']
          app.save(partCol)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const condoCol = app.findCollectionByNameOrId('condominiums')
      const field1 = condoCol.fields.getByName('similar_condo_ids')
      if (field1) {
        condoCol.fields.removeById(field1.id)
        app.save(condoCol)
      }
    } catch (_) {}
  },
)
