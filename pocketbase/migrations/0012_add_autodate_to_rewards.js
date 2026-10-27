/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collections = ['payment_batches', 'reward_rules', 'rewards']
    for (let i = 0; i < collections.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(collections[i])
        let modified = false
        if (!col.fields.getByName('created')) {
          col.fields.add(
            new AutodateField({
              name: 'created',
              onCreate: true,
              onUpdate: false,
            }),
          )
          modified = true
        }
        if (!col.fields.getByName('updated')) {
          col.fields.add(
            new AutodateField({
              name: 'updated',
              onCreate: true,
              onUpdate: true,
            }),
          )
          modified = true
        }
        if (modified) {
          app.save(col)
        }
      } catch (_) {}
    }
  },
  (app) => {},
)
