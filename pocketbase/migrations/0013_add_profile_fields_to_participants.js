/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const partsCol = app.findCollectionByNameOrId('participants')
    let changed = false
    if (!partsCol.fields.getByName('cpf')) {
      partsCol.fields.add(new TextField({ name: 'cpf' }))
      changed = true
    }
    if (!partsCol.fields.getByName('address')) {
      partsCol.fields.add(new TextField({ name: 'address' }))
      changed = true
    }
    if (!partsCol.fields.getByName('condominium_name')) {
      partsCol.fields.add(new TextField({ name: 'condominium_name' }))
      changed = true
    }
    if (changed) {
      app.save(partsCol)
    }
  },
  (app) => {},
)
