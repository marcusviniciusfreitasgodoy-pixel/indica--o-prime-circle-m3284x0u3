/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Campo creci na coleção users
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('creci')) {
      users.fields.add(
        new TextField({
          name: 'creci',
          required: false,
        }),
      )
      app.save(users)
    }

    // 2. Campos auxiliares em referrals (consent_status, first_contact_at, first_contact_by)
    const referrals = app.findCollectionByNameOrId('referrals')
    let refChanged = false

    if (!referrals.fields.getByName('consent_status')) {
      referrals.fields.add(
        new TextField({
          name: 'consent_status',
          required: false,
        }),
      )
      refChanged = true
    }

    if (!referrals.fields.getByName('first_contact_at')) {
      referrals.fields.add(
        new DateField({
          name: 'first_contact_at',
          required: false,
        }),
      )
      refChanged = true
    }

    if (!referrals.fields.getByName('first_contact_by')) {
      referrals.fields.add(
        new RelationField({
          name: 'first_contact_by',
          collectionId: users.id,
          maxSelect: 1,
          required: false,
        }),
      )
      refChanged = true
    }

    if (refChanged) {
      app.save(referrals)
    }

    // 3. Backfill defensivo: indicações diretas existentes
    try {
      app
        .db()
        .newQuery(
          "UPDATE referrals SET consent_status = 'declarado_indicador' WHERE consent_declared = 1 AND (channel = 'manual' OR consent_status IS NULL OR consent_status = '')",
        )
        .execute()
    } catch (_) {}
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users.fields.getByName('creci')) {
      users.fields.removeByName('creci')
      app.save(users)
    }

    const referrals = app.findCollectionByNameOrId('referrals')
    if (referrals.fields.getByName('consent_status')) {
      referrals.fields.removeByName('consent_status')
    }
    if (referrals.fields.getByName('first_contact_at')) {
      referrals.fields.removeByName('first_contact_at')
    }
    if (referrals.fields.getByName('first_contact_by')) {
      referrals.fields.removeByName('first_contact_by')
    }
    app.save(referrals)
  },
)
