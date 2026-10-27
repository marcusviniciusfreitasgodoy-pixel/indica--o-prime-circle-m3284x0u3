migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. user_roles: keeps role assignments separate from profiles/users
    // Roles allowed: admin, operador, financeiro
    // list/view: authenticated users can check their own role or internal staff can view all
    // create/update/delete: null (superusers or pb_hooks server-side only)
    const userRoles = new Collection({
      name: 'user_roles',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.id = @collection.user_roles.user_id)",
      viewRule:
        "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.id = @collection.user_roles.user_id)",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['admin', 'operador', 'financeiro'],
          maxSelect: 1,
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
        'CREATE UNIQUE INDEX idx_user_roles_user_role ON user_roles (user_id, role)',
        'CREATE INDEX idx_user_roles_role ON user_roles (role)',
      ],
    })
    app.save(userRoles)

    // 2. profiles: user profile table linked 1:1 with users
    // Policy: user can only edit name, phone, avatar on own profile.
    const profiles = new Collection({
      name: 'profiles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'phone',
          type: 'text',
          required: false,
        },
        {
          name: 'avatar',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
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
      indexes: ['CREATE UNIQUE INDEX idx_profiles_user_id ON profiles (user_id)'],
    })
    app.save(profiles)

    // 3. programs: e.g. "comunidade" e "parceiros"
    const programs = new Collection({
      name: 'programs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'slug',
          type: 'text',
          required: true,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
          required: false,
        },
        {
          name: 'is_active',
          type: 'bool',
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
      indexes: ['CREATE UNIQUE INDEX idx_programs_slug ON programs (slug)'],
    })
    app.save(programs)

    // 4. program_levels: e.g. Parceiro, Parceiro Prime, Parceiro Signature
    const programLevels = new Collection({
      name: 'program_levels',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'program_id',
          type: 'relation',
          required: true,
          collectionId: programs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'order',
          type: 'number',
          required: false,
          onlyInt: true,
        },
        {
          name: 'criteria_description',
          type: 'text',
          required: false,
        },
        {
          name: 'reward_percentage',
          type: 'number',
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
        'CREATE UNIQUE INDEX idx_program_levels_program_slug ON program_levels (program_id, slug)',
        'CREATE INDEX idx_program_levels_order ON program_levels (order ASC)',
      ],
    })
    app.save(programLevels)

    // 5. participant_categories: Porteiro/Zelador, Cliente, Síndico, etc.
    const participantCategories = new Collection({
      name: 'participant_categories',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'program_id',
          type: 'relation',
          required: true,
          collectionId: programs.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'front',
          type: 'select',
          required: true,
          values: ['comunidade', 'parceiros'],
          maxSelect: 1,
        },
        {
          name: 'requires_approval',
          type: 'bool',
        },
        {
          name: 'allowed_channels',
          type: 'select',
          required: true,
          values: ['link_only', 'link_and_direct'],
          maxSelect: 1,
        },
        {
          name: 'description',
          type: 'text',
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
        'CREATE UNIQUE INDEX idx_participant_categories_slug ON participant_categories (slug)',
        'CREATE INDEX idx_participant_categories_program ON participant_categories (program_id)',
      ],
    })
    app.save(participantCategories)

    // 6. condominiums: reference condominiums in Barra da Tijuca, Recreio, etc.
    const condominiums = new Collection({
      name: 'condominiums',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'neighborhood',
          type: 'text',
          required: true,
        },
        {
          name: 'address',
          type: 'text',
          required: false,
        },
        {
          name: 'city',
          type: 'text',
          required: false,
        },
        {
          name: 'state',
          type: 'text',
          required: false,
        },
        {
          name: 'zip_code',
          type: 'text',
          required: false,
        },
        {
          name: 'active',
          type: 'bool',
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
        'CREATE INDEX idx_condominiums_neighborhood ON condominiums (neighborhood)',
        'CREATE INDEX idx_condominiums_name ON condominiums (name)',
      ],
    })
    app.save(condominiums)

    // 7. participants: members in the referral program
    // Rule: participant reads only their own record; internal staff (with any user_role) can view
    const participants = new Collection({
      name: 'participants',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (user_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (user_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'category_id',
          type: 'relation',
          required: true,
          collectionId: participantCategories.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'level_id',
          type: 'relation',
          required: false,
          collectionId: programLevels.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente_aprovacao', 'ativo', 'suspenso', 'inativo'],
          maxSelect: 1,
        },
        {
          name: 'pix_key',
          type: 'text',
          required: false,
        },
        {
          name: 'pix_key_type',
          type: 'select',
          required: false,
          values: ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'],
          maxSelect: 1,
        },
        {
          name: 'referral_code',
          type: 'text',
          required: false,
        },
        {
          name: 'notes',
          type: 'text',
          required: false,
        },
        {
          name: 'approved_at',
          type: 'date',
          required: false,
        },
        {
          name: 'approved_by',
          type: 'relation',
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
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
        'CREATE UNIQUE INDEX idx_participants_user_id ON participants (user_id)',
        'CREATE INDEX idx_participants_category ON participants (category_id)',
        'CREATE INDEX idx_participants_status ON participants (status)',
      ],
    })
    app.save(participants)

    // 8. participant_condominiums: links doormen/síndicos to specific condominiums
    const participantCondominiums = new Collection({
      name: 'participant_condominiums',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (participant_id.user_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (participant_id.user_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule:
        "@request.auth.id != '' && (participant_id.user_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      fields: [
        {
          name: 'participant_id',
          type: 'relation',
          required: true,
          collectionId: participants.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'condominium_id',
          type: 'relation',
          required: true,
          collectionId: condominiums.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'role_description',
          type: 'text',
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
        'CREATE UNIQUE INDEX idx_part_condos_unique ON participant_condominiums (participant_id, condominium_id)',
      ],
    })
    app.save(participantCondominiums)

    // 9. legal_documents: Terms of use, privacy policy, regulation, declarations
    const legalDocuments = new Collection({
      name: 'legal_documents',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'slug',
          type: 'text',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'version',
          type: 'number',
          required: true,
          onlyInt: true,
        },
        {
          name: 'content',
          type: 'text',
          required: true,
        },
        {
          name: 'is_active',
          type: 'bool',
        },
        {
          name: 'published_at',
          type: 'date',
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
        'CREATE UNIQUE INDEX idx_legal_docs_slug_ver ON legal_documents (slug, version)',
        'CREATE INDEX idx_legal_docs_slug_active ON legal_documents (slug, is_active)',
      ],
    })
    app.save(legalDocuments)

    // 10. acceptances: log of legal document acceptances by participants
    const acceptances = new Collection({
      name: 'acceptances',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (user_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      createRule: "@request.auth.id != '' && user_id = @request.auth.id",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'document_id',
          type: 'relation',
          required: true,
          collectionId: legalDocuments.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'ip_address',
          type: 'text',
          required: false,
        },
        {
          name: 'user_agent',
          type: 'text',
          required: false,
        },
        {
          name: 'accepted_at',
          type: 'date',
          required: true,
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
      indexes: ['CREATE INDEX idx_acceptances_user_doc ON acceptances (user_id, document_id)'],
    })
    app.save(acceptances)

    // 11. program_settings: key-value/config storage for referral rules
    // Read: authenticated users; Write: null (admin via backend functions only)
    const programSettings = new Collection({
      name: 'program_settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'key',
          type: 'text',
          required: true,
        },
        {
          name: 'value_json',
          type: 'json',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
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
      indexes: ['CREATE UNIQUE INDEX idx_program_settings_key ON program_settings (key)'],
    })
    app.save(programSettings)

    // 12. audit_logs: immutable log of critical actions
    // Requirement: audit_logs só recebe insert por funções do servidor e só admin lê.
    // In collection rule: list/view only admin can read (via user_roles filter check).
    // create/update/delete: null (only superuser / pb_hooks server-side).
    const auditLogs = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && @collection.user_roles.role ?= 'admin'",
      viewRule:
        "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && @collection.user_roles.role ?= 'admin'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'actor_id',
          type: 'relation',
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'actor_email',
          type: 'text',
          required: false,
        },
        {
          name: 'action',
          type: 'text',
          required: true,
        },
        {
          name: 'resource_type',
          type: 'text',
          required: true,
        },
        {
          name: 'resource_id',
          type: 'text',
          required: false,
        },
        {
          name: 'details',
          type: 'json',
          required: false,
        },
        {
          name: 'ip_address',
          type: 'text',
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
        'CREATE INDEX idx_audit_logs_action ON audit_logs (action)',
        'CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id)',
        'CREATE INDEX idx_audit_logs_created ON audit_logs (created DESC)',
      ],
    })
    app.save(auditLogs)
  },
  (app) => {
    const list = [
      'audit_logs',
      'program_settings',
      'acceptances',
      'legal_documents',
      'participant_condominiums',
      'participants',
      'condominiums',
      'participant_categories',
      'program_levels',
      'programs',
      'profiles',
      'user_roles',
    ]
    for (let i = 0; i < list.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(list[i])
        app.delete(col)
      } catch (_) {}
    }
  },
)
