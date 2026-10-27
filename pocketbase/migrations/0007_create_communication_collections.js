migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const referralsCol = app.findCollectionByNameOrId('referrals')
    const condominiumsCol = app.findCollectionByNameOrId('condominiums')
    const participantsCol = app.findCollectionByNameOrId('participants')

    const internalRule =
      "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id"
    const adminRule =
      "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && @collection.user_roles.role ?= 'admin'"

    // 1. campaigns: name, code único, channel, condominium_id opcional, participant_id opcional, starts_at, ends_at, notes
    if (!app.hasTable('campaigns')) {
      const campaigns = new Collection({
        name: 'campaigns',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: internalRule,
        updateRule: internalRule,
        deleteRule: adminRule,
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'code', type: 'text', required: true },
          {
            name: 'channel',
            type: 'select',
            required: true,
            values: ['portaria', 'parceiro', 'cliente', 'impresso', 'evento', 'outro'],
            maxSelect: 1,
          },
          {
            name: 'condominium_id',
            type: 'relation',
            required: false,
            collectionId: condominiumsCol.id,
            maxSelect: 1,
          },
          {
            name: 'participant_id',
            type: 'relation',
            required: false,
            collectionId: participantsCol.id,
            maxSelect: 1,
          },
          { name: 'starts_at', type: 'date', required: false },
          { name: 'ends_at', type: 'date', required: false },
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_campaigns_code ON campaigns (code)',
          'CREATE INDEX idx_campaigns_channel ON campaigns (channel)',
        ],
      })
      app.save(campaigns)
    }

    const campaignsCol = app.findCollectionByNameOrId('campaigns')

    // 2. Add campaign_id to referrals if not exists
    if (!referralsCol.fields.getByName('campaign_id')) {
      referralsCol.fields.add(
        new RelationField({
          name: 'campaign_id',
          collectionId: campaignsCol.id,
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(referralsCol)
    }

    // 3. whatsapp_optins: phone, person_type, person_id, opted_in_at, source, opted_out_at
    if (!app.hasTable('whatsapp_optins')) {
      const whatsappOptins = new Collection({
        name: 'whatsapp_optins',
        type: 'base',
        listRule: internalRule,
        viewRule: internalRule,
        createRule: internalRule,
        updateRule: internalRule,
        deleteRule: adminRule,
        fields: [
          { name: 'phone', type: 'text', required: true },
          {
            name: 'person_type',
            type: 'select',
            required: true,
            values: ['participante', 'proprietario', 'interessado', 'equipe', 'outro'],
            maxSelect: 1,
          },
          { name: 'person_id', type: 'text', required: false },
          { name: 'opted_in_at', type: 'date', required: true },
          { name: 'source', type: 'text', required: false },
          { name: 'opted_out_at', type: 'date', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_wa_optins_phone ON whatsapp_optins (phone)',
          'CREATE INDEX idx_wa_optins_person ON whatsapp_optins (person_type, person_id)',
        ],
      })
      app.save(whatsappOptins)
    }

    // 4. message_templates: event_code, channel (whatsapp, email), audience, subject, body, active,
    // meta_template_name, meta_language, meta_category, meta_status, meta_params, button_url_param
    if (!app.hasTable('message_templates')) {
      const messageTemplates = new Collection({
        name: 'message_templates',
        type: 'base',
        listRule: internalRule,
        viewRule: internalRule,
        createRule: adminRule,
        updateRule: adminRule,
        deleteRule: adminRule,
        fields: [
          { name: 'event_code', type: 'text', required: true },
          {
            name: 'channel',
            type: 'select',
            required: true,
            values: ['whatsapp', 'email'],
            maxSelect: 1,
          },
          {
            name: 'audience',
            type: 'select',
            required: true,
            values: ['participante', 'proprietario', 'interessado', 'equipe', 'financeiro'],
            maxSelect: 1,
          },
          { name: 'subject', type: 'text', required: false },
          { name: 'body', type: 'text', required: true },
          { name: 'active', type: 'bool' },
          { name: 'meta_template_name', type: 'text', required: false },
          { name: 'meta_language', type: 'text', required: false },
          {
            name: 'meta_category',
            type: 'select',
            required: false,
            values: ['utility', 'marketing'],
            maxSelect: 1,
          },
          {
            name: 'meta_status',
            type: 'select',
            required: false,
            values: ['approved', 'pending', 'rejected', 'paused'],
            maxSelect: 1,
          },
          { name: 'meta_params', type: 'json', required: false },
          { name: 'button_url_param', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_msg_tpl_event_channel ON message_templates (event_code, channel)',
          'CREATE INDEX idx_msg_tpl_meta_name ON message_templates (meta_template_name)',
        ],
      })
      app.save(messageTemplates)
    }

    const messageTemplatesCol = app.findCollectionByNameOrId('message_templates')

    // 5. message_queue: template_id, recipient, params, send_after, attempts, status, last_error
    if (!app.hasTable('message_queue')) {
      const messageQueue = new Collection({
        name: 'message_queue',
        type: 'base',
        listRule: internalRule,
        viewRule: internalRule,
        createRule: internalRule,
        updateRule: internalRule,
        deleteRule: adminRule,
        fields: [
          {
            name: 'template_id',
            type: 'relation',
            required: false,
            collectionId: messageTemplatesCol.id,
            maxSelect: 1,
          },
          { name: 'channel', type: 'text', required: false }, // whatsapp, email
          { name: 'recipient', type: 'text', required: true },
          { name: 'params', type: 'json', required: false },
          { name: 'send_after', type: 'date', required: true },
          { name: 'attempts', type: 'number', required: false, onlyInt: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['pending', 'processing', 'sent', 'failed', 'cancelled'],
            maxSelect: 1,
          },
          { name: 'last_error', type: 'text', required: false },
          { name: 'metadata', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_msg_queue_status_after ON message_queue (status, send_after)',
        ],
      })
      app.save(messageQueue)
    }

    // 6. notification_logs: recipient, channel, event_code, status, provider_message_id, error, entity_id, created_at, status_updated_at
    if (!app.hasTable('notification_logs')) {
      const notificationLogs = new Collection({
        name: 'notification_logs',
        type: 'base',
        listRule: internalRule,
        viewRule: internalRule,
        createRule: internalRule,
        updateRule: internalRule,
        deleteRule: adminRule,
        fields: [
          { name: 'recipient', type: 'text', required: true },
          {
            name: 'channel',
            type: 'select',
            required: true,
            values: ['whatsapp', 'email'],
            maxSelect: 1,
          },
          { name: 'event_code', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['queued', 'sent', 'delivered', 'read', 'failed'],
            maxSelect: 1,
          },
          { name: 'provider_message_id', type: 'text', required: false },
          { name: 'error', type: 'text', required: false },
          { name: 'entity_id', type: 'text', required: false },
          { name: 'status_updated_at', type: 'date', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_notif_logs_provider_id ON notification_logs (provider_message_id)',
          'CREATE INDEX idx_notif_logs_entity ON notification_logs (entity_id)',
          'CREATE INDEX idx_notif_logs_recipient ON notification_logs (recipient)',
          'CREATE INDEX idx_notif_logs_event ON notification_logs (event_code, status)',
        ],
      })
      app.save(notificationLogs)
    }

    // 7. activation_log: participant_id, step, sent_at
    if (!app.hasTable('activation_log')) {
      const activationLog = new Collection({
        name: 'activation_log',
        type: 'base',
        listRule: internalRule,
        viewRule: internalRule,
        createRule: internalRule,
        updateRule: internalRule,
        deleteRule: adminRule,
        fields: [
          {
            name: 'participant_id',
            type: 'relation',
            required: true,
            collectionId: participantsCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'step', type: 'number', required: true, onlyInt: true },
          { name: 'sent_at', type: 'date', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_activation_part_step ON activation_log (participant_id, step)',
        ],
      })
      app.save(activationLog)
    }
  },
  (app) => {
    const list = [
      'activation_log',
      'notification_logs',
      'message_queue',
      'message_templates',
      'whatsapp_optins',
      'campaigns',
    ]
    for (let i = 0; i < list.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(list[i])
        app.delete(col)
      } catch (_) {}
    }
  },
)
