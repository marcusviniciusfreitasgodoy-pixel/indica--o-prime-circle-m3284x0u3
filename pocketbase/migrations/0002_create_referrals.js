migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const referrals = new Collection({
      name: 'referrals',
      type: 'base',
      // Members can see referrals where they are the current_owner_id or original_owner_id
      listRule:
        "@request.auth.id != '' && (current_owner_id = @request.auth.id || original_owner_id = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (current_owner_id = @request.auth.id || original_owner_id = @request.auth.id)",
      // Members can create manually for themselves
      createRule: "@request.auth.id != ''",
      // Members can update if they are the current owner
      updateRule: "@request.auth.id != '' && current_owner_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && current_owner_id = @request.auth.id",
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['imovel', 'cliente'],
          maxSelect: 1,
        },
        {
          name: 'referrer_name',
          type: 'text',
          required: true,
        },
        {
          name: 'referrer_phone',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
          required: true,
        },
        {
          name: 'return_contact',
          type: 'text',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['nova', 'em_atendimento', 'atendida', 'concluida', 'repassada'],
          maxSelect: 1,
        },
        {
          name: 'channel',
          type: 'select',
          required: false,
          values: ['link_publico', 'manual'],
          maxSelect: 1,
        },
        {
          name: 'current_owner_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'original_owner_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'attended_at',
          type: 'date',
          required: false,
        },
        {
          name: 'history',
          type: 'json',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_referrals_current_owner ON referrals (current_owner_id)',
        'CREATE INDEX idx_referrals_original_owner ON referrals (original_owner_id)',
        'CREATE INDEX idx_referrals_status ON referrals (status)',
        'CREATE INDEX idx_referrals_created ON referrals (created DESC)',
      ],
    })

    app.save(referrals)
  },
  (app) => {
    const referrals = app.findCollectionByNameOrId('referrals')
    app.delete(referrals)
  },
)
