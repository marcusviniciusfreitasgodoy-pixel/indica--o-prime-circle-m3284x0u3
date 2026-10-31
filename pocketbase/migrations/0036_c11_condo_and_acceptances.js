migrate(
  (app) => {
    // 1. Adicionar created_by_participant em condominiums
    const condoCol = app.findCollectionByNameOrId('condominiums')
    if (!condoCol.fields.getByName('created_by_participant')) {
      condoCol.fields.add(new BoolField({ name: 'created_by_participant' }))
      app.save(condoCol)
    }

    // 2. Adicionar details em acceptances
    const accCol = app.findCollectionByNameOrId('acceptances')
    if (!accCol.fields.getByName('details')) {
      accCol.fields.add(new TextField({ name: 'details' }))
      app.save(accCol)
    }
  },
  (app) => {
    try {
      const condoCol = app.findCollectionByNameOrId('condominiums')
      const field1 = condoCol.fields.getByName('created_by_participant')
      if (field1) {
        condoCol.fields.removeById(field1.id)
        app.save(condoCol)
      }
    } catch (_) {}

    try {
      const accCol = app.findCollectionByNameOrId('acceptances')
      const field2 = accCol.fields.getByName('details')
      if (field2) {
        accCol.fields.removeById(field2.id)
        app.save(accCol)
      }
    } catch (_) {}
  },
)
