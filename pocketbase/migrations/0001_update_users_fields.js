migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('agency')) {
      users.fields.add(
        new TextField({
          name: 'agency',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('phone')) {
      users.fields.add(
        new TextField({
          name: 'phone',
          required: false,
        }),
      )
    }

    if (!users.fields.getByName('public_slug')) {
      users.fields.add(
        new TextField({
          name: 'public_slug',
          required: false,
        }),
      )
    }

    // Update users collection API rules so members can list and view other members to transfer referrals,
    // but can only update or delete themselves.
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != '' || public_slug != ''" // allow public link lookup by slug
    users.updateRule = 'id = @request.auth.id'

    app.save(users)

    // Add unique index on public_slug if populated
    users.addIndex('idx_users_public_slug', false, 'public_slug', "public_slug != ''")
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.removeIndex('idx_users_public_slug')
    users.fields.removeByName('agency')
    users.fields.removeByName('phone')
    users.fields.removeByName('public_slug')
    app.save(users)
  },
)
