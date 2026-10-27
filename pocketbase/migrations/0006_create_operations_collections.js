migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const referralsCol = app.findCollectionByNameOrId('referrals')
    const condominiumsCol = app.findCollectionByNameOrId('condominiums')
    const participantsCol = app.findCollectionByNameOrId('participants')

    // Rule helpers: internal roles (admin, operador, financeiro)
    // In pocketbase rule language: @request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id
    const internalRule =
      "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id"
    const adminRule =
      "@request.auth.id != '' && @collection.user_roles.user_id ?= @request.auth.id && @collection.user_roles.role ?= 'admin'"

    // 1. Expand referrals collection with Etapa 3 fields and adjust status select
    // Update status field to include new workflow statuses:
    // recebida, em_triagem, aceita, em_contato, qualificada, em_negociacao, captacao_solicitada, captada, em_divulgacao, vendida, alugada, recusada, duplicada, perdida, declinada_pela_godoy, retirada, cancelada, em_atendimento, visitando, proposta, comprou, alugou (plus legacy nova, atendida, concluida, repassada)
    const statusField = referralsCol.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        'recebida',
        'em_triagem',
        'aceita',
        'em_contato',
        'qualificada',
        'em_negociacao',
        'captacao_solicitada',
        'captada',
        'em_divulgacao',
        'vendida',
        'alugada',
        'recusada',
        'duplicada',
        'perdida',
        'declinada_pela_godoy',
        'retirada',
        'cancelada',
        'em_atendimento',
        'visitando',
        'proposta',
        'comprou',
        'alugou',
        'nova',
        'atendida',
        'concluida',
        'repassada',
      ]
    }

    const typeField = referralsCol.fields.getByName('type')
    if (typeField) {
      typeField.values = [
        'proprietario',
        'comprador',
        'imovel',
        'cliente',
        'proprietario_venda',
        'proprietario_locacao',
      ]
    }

    // Add fields to referrals:
    if (!referralsCol.fields.getByName('referral_type')) {
      referralsCol.fields.add(
        new SelectField({
          name: 'referral_type',
          values: ['proprietario', 'comprador'],
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!referralsCol.fields.getByName('participant_id')) {
      referralsCol.fields.add(
        new RelationField({
          name: 'participant_id',
          collectionId: participantsCol.id,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!referralsCol.fields.getByName('assigned_operator_id')) {
      referralsCol.fields.add(
        new RelationField({
          name: 'assigned_operator_id',
          collectionId: users.id,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!referralsCol.fields.getByName('condominium_id')) {
      referralsCol.fields.add(
        new RelationField({
          name: 'condominium_id',
          collectionId: condominiumsCol.id,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!referralsCol.fields.getByName('unit')) {
      referralsCol.fields.add(new TextField({ name: 'unit', required: false }))
    }
    if (!referralsCol.fields.getByName('normalized_address')) {
      referralsCol.fields.add(new TextField({ name: 'normalized_address', required: false }))
    }
    if (!referralsCol.fields.getByName('owner_name')) {
      referralsCol.fields.add(new TextField({ name: 'owner_name', required: false }))
    }
    if (!referralsCol.fields.getByName('owner_phone')) {
      referralsCol.fields.add(new TextField({ name: 'owner_phone', required: false }))
    }
    if (!referralsCol.fields.getByName('owner_email')) {
      referralsCol.fields.add(new TextField({ name: 'owner_email', required: false }))
    }
    if (!referralsCol.fields.getByName('owner_cpf')) {
      referralsCol.fields.add(new TextField({ name: 'owner_cpf', required: false }))
    }
    if (!referralsCol.fields.getByName('target_neighborhood')) {
      referralsCol.fields.add(new TextField({ name: 'target_neighborhood', required: false }))
    }
    if (!referralsCol.fields.getByName('buyer_name')) {
      referralsCol.fields.add(new TextField({ name: 'buyer_name', required: false }))
    }
    if (!referralsCol.fields.getByName('buyer_phone')) {
      referralsCol.fields.add(new TextField({ name: 'buyer_phone', required: false }))
    }
    if (!referralsCol.fields.getByName('buyer_email')) {
      referralsCol.fields.add(new TextField({ name: 'buyer_email', required: false }))
    }
    if (!referralsCol.fields.getByName('source_origin')) {
      referralsCol.fields.add(new TextField({ name: 'source_origin', required: false }))
    }
    if (!referralsCol.fields.getByName('attribution_status')) {
      referralsCol.fields.add(
        new SelectField({
          name: 'attribution_status',
          values: ['atribuida', 'pendente', 'recusada'],
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!referralsCol.fields.getByName('attribution_hint')) {
      referralsCol.fields.add(new TextField({ name: 'attribution_hint', required: false }))
    }
    if (!referralsCol.fields.getByName('consent_declared')) {
      referralsCol.fields.add(new BoolField({ name: 'consent_declared' }))
    }
    if (!referralsCol.fields.getByName('consent_confirmed_by_operator')) {
      referralsCol.fields.add(new BoolField({ name: 'consent_confirmed_by_operator' }))
    }
    if (!referralsCol.fields.getByName('status_reason')) {
      referralsCol.fields.add(new TextField({ name: 'status_reason', required: false }))
    }
    if (!referralsCol.fields.getByName('public_reason_code')) {
      referralsCol.fields.add(new TextField({ name: 'public_reason_code', required: false }))
    }
    if (!referralsCol.fields.getByName('loss_responsibility')) {
      referralsCol.fields.add(
        new SelectField({
          name: 'loss_responsibility',
          values: ['proprietario', 'indicacao_invalida'],
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!referralsCol.fields.getByName('declined_reason')) {
      referralsCol.fields.add(new TextField({ name: 'declined_reason', required: false }))
    }
    if (!referralsCol.fields.getByName('declined_by')) {
      referralsCol.fields.add(
        new RelationField({
          name: 'declined_by',
          collectionId: users.id,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!referralsCol.fields.getByName('listing_link')) {
      referralsCol.fields.add(new TextField({ name: 'listing_link', required: false }))
    }
    if (!referralsCol.fields.getByName('is_reserved_listing')) {
      referralsCol.fields.add(new BoolField({ name: 'is_reserved_listing' }))
    }
    if (!referralsCol.fields.getByName('public_summary')) {
      referralsCol.fields.add(new TextField({ name: 'public_summary', required: false }))
    }
    if (!referralsCol.fields.getByName('public_photos')) {
      referralsCol.fields.add(new JSONField({ name: 'public_photos', required: false }))
    }
    if (!referralsCol.fields.getByName('deal_value_brl')) {
      referralsCol.fields.add(new NumberField({ name: 'deal_value_brl', required: false }))
    }
    if (!referralsCol.fields.getByName('deal_date')) {
      referralsCol.fields.add(new DateField({ name: 'deal_date', required: false }))
    }
    if (!referralsCol.fields.getByName('deal_property_description')) {
      referralsCol.fields.add(
        new TextField({ name: 'deal_property_description', required: false }),
      )
    }

    // Update referrals access rules so internal roles can see and manage all referrals:
    referralsCol.listRule =
      "@request.auth.id != '' && (current_owner_id = @request.auth.id || original_owner_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)"
    referralsCol.viewRule =
      "@request.auth.id != '' && (current_owner_id = @request.auth.id || original_owner_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)"
    app.save(referralsCol)

    // 2. referral_events: timeline of state transitions
    const referralEvents = new Collection({
      name: 'referral_events',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (referral_id.current_owner_id = @request.auth.id || referral_id.original_owner_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (referral_id.current_owner_id = @request.auth.id || referral_id.original_owner_id = @request.auth.id || @collection.user_roles.user_id ?= @request.auth.id)",
      createRule: null, // pb_hooks only
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'referral_id',
          type: 'relation',
          required: true,
          collectionId: referralsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'from_status', type: 'text', required: false },
        { name: 'to_status', type: 'text', required: true },
        {
          name: 'actor_id',
          type: 'relation',
          required: false,
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'actor_name', type: 'text', required: false },
        { name: 'reason', type: 'text', required: false },
        { name: 'public_reason_code', type: 'text', required: false },
        { name: 'public_label', type: 'text', required: false },
        { name: 'visible_to_participant', type: 'bool' },
        { name: 'metadata', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ref_events_ref ON referral_events (referral_id, created DESC)',
        'CREATE INDEX idx_ref_events_visible ON referral_events (visible_to_participant)',
      ],
    })
    app.save(referralEvents)

    // 3. duplicate_flags: duplicate detection flags for triage
    const duplicateFlags = new Collection({
      name: 'duplicate_flags',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: null,
      updateRule: internalRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'referral_id',
          type: 'relation',
          required: true,
          collectionId: referralsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'conflicting_referral_id',
          type: 'relation',
          required: false,
          collectionId: referralsCol.id,
          maxSelect: 1,
        },
        { name: 'conflict_type', type: 'text', required: true }, // 'address_unit', 'condo_unit', 'phone', 'email', 'known_base'
        { name: 'conflict_details', type: 'text', required: true },
        { name: 'is_resolved', type: 'bool' },
        { name: 'resolution_action', type: 'text', required: false }, // 'accepted', 'rejected', 'marked_duplicate'
        {
          name: 'resolved_by',
          type: 'relation',
          required: false,
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'resolved_at', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_dup_flags_ref ON duplicate_flags (referral_id)',
        'CREATE INDEX idx_dup_flags_resolved ON duplicate_flags (is_resolved)',
      ],
    })
    app.save(duplicateFlags)

    // 4. known_owner_base: base de proprietários conhecidos
    const knownOwnerBase = new Collection({
      name: 'known_owner_base',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: internalRule,
      updateRule: internalRule,
      deleteRule: adminRule,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'phone', type: 'text', required: false },
        { name: 'normalized_phone', type: 'text', required: false },
        { name: 'email', type: 'text', required: false },
        { name: 'cpf', type: 'text', required: false },
        {
          name: 'condominium_id',
          type: 'relation',
          required: false,
          collectionId: condominiumsCol.id,
          maxSelect: 1,
        },
        { name: 'unit', type: 'text', required: false },
        { name: 'address', type: 'text', required: false },
        { name: 'normalized_address', type: 'text', required: false },
        { name: 'last_real_contact_at', type: 'date', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_known_owners_phone ON known_owner_base (normalized_phone)',
        'CREATE INDEX idx_known_owners_email ON known_owner_base (email)',
        'CREATE INDEX idx_known_owners_address ON known_owner_base (normalized_address)',
      ],
    })
    app.save(knownOwnerBase)

    // 5. known_buyer_base: base conhecida de compradores
    const knownBuyerBase = new Collection({
      name: 'known_buyer_base',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: internalRule,
      updateRule: internalRule,
      deleteRule: adminRule,
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'phone', type: 'text', required: false },
        { name: 'normalized_phone', type: 'text', required: false },
        { name: 'email', type: 'text', required: false },
        { name: 'target_neighborhood', type: 'text', required: false },
        { name: 'last_real_contact_at', type: 'date', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_known_buyers_phone ON known_buyer_base (normalized_phone)',
        'CREATE INDEX idx_known_buyers_email ON known_buyer_base (email)',
      ],
    })
    app.save(knownBuyerBase)

    // 6. contact_attempts: tentativas de contato com o indicado
    const contactAttempts = new Collection({
      name: 'contact_attempts',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: internalRule,
      updateRule: internalRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'referral_id',
          type: 'relation',
          required: true,
          collectionId: referralsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'operator_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        {
          name: 'channel',
          type: 'select',
          required: true,
          values: ['whatsapp', 'telefone', 'email', 'presencial'],
          maxSelect: 1,
        },
        {
          name: 'outcome',
          type: 'select',
          required: true,
          values: [
            'sucesso',
            'sem_resposta',
            'recusou',
            'numero_invalido',
            'agendou_retorno',
            'outro',
          ],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text', required: false },
        { name: 'scheduled_callback_at', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contact_attempts_ref ON contact_attempts (referral_id, created DESC)',
      ],
    })
    app.save(contactAttempts)

    // 7. referral_notes: notas operacionais internas (nunca visíveis ao participante)
    const referralNotes = new Collection({
      name: 'referral_notes',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: internalRule,
      updateRule: internalRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'referral_id',
          type: 'relation',
          required: true,
          collectionId: referralsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'author_id',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'content', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_ref_notes_ref ON referral_notes (referral_id, created DESC)'],
    })
    app.save(referralNotes)

    // 8. referral_tasks: tarefas da indicação
    const referralTasks = new Collection({
      name: 'referral_tasks',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: internalRule,
      updateRule: internalRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'referral_id',
          type: 'relation',
          required: true,
          collectionId: referralsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'assigned_to',
          type: 'relation',
          required: false,
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text', required: false },
        { name: 'due_date', type: 'date', required: false },
        { name: 'is_completed', type: 'bool' },
        { name: 'completed_at', type: 'date', required: false },
        {
          name: 'completed_by',
          type: 'relation',
          required: false,
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ref_tasks_ref ON referral_tasks (referral_id)',
        'CREATE INDEX idx_ref_tasks_due ON referral_tasks (due_date)',
      ],
    })
    app.save(referralTasks)

    // 9. documents: anexos e contratos protegidos
    // Note: private storage for capture-documents and partner-contracts
    // File field with protected: true restricts direct downloading without proper authorization
    const documents = new Collection({
      name: 'documents',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: internalRule,
      updateRule: internalRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'referral_id',
          type: 'relation',
          required: false,
          collectionId: referralsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'participant_id',
          type: 'relation',
          required: false,
          collectionId: participantsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'bucket_type',
          type: 'select',
          required: true,
          values: ['capture-documents', 'partner-contracts'],
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        {
          name: 'file',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 20971520, // 20 MB
          protected: true,
        },
        {
          name: 'uploaded_by',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'file_type', type: 'text', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_documents_ref ON documents (referral_id)',
        'CREATE INDEX idx_documents_part ON documents (participant_id)',
        'CREATE INDEX idx_documents_bucket ON documents (bucket_type)',
      ],
    })
    app.save(documents)

    // 10. capture_records: formalização da captação
    const captureRecords = new Collection({
      name: 'capture_records',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: internalRule,
      updateRule: internalRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'referral_id',
          type: 'relation',
          required: true,
          collectionId: referralsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'instrument_type',
          type: 'select',
          required: true,
          values: [
            'autorizacao_exclusiva',
            'autorizacao_simples',
            'contrato_parceria',
            'termo_opcao',
          ],
          maxSelect: 1,
        },
        {
          name: 'document_id',
          type: 'relation',
          required: true,
          collectionId: documents.id,
          maxSelect: 1,
        },
        {
          name: 'requested_by',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'requested_at', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['solicitada', 'aprovada', 'devolvida'],
          maxSelect: 1,
        },
        {
          name: 'approved_by',
          type: 'relation',
          required: false,
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'approved_at', type: 'date', required: false },
        { name: 'return_reason', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_capture_records_ref ON capture_records (referral_id)',
        'CREATE INDEX idx_capture_records_status ON capture_records (status)',
      ],
    })
    app.save(captureRecords)

    // 11. deals: registros de negócios fechados com os campos da spec
    // owner_referral_id, buyer_referral_id, value_brl, commission_received_at, commission_received_brl, commission_split, cancelled_at, cancel_reason
    const deals = new Collection({
      name: 'deals',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'owner_referral_id',
          type: 'relation',
          required: false,
          collectionId: referralsCol.id,
          maxSelect: 1,
        },
        {
          name: 'buyer_referral_id',
          type: 'relation',
          required: false,
          collectionId: referralsCol.id,
          maxSelect: 1,
        },
        {
          name: 'deal_type',
          type: 'select',
          required: true,
          values: ['venda', 'locacao'],
          maxSelect: 1,
        },
        { name: 'value_brl', type: 'number', required: true },
        { name: 'deal_date', type: 'date', required: true },
        { name: 'commission_received_at', type: 'date', required: false },
        { name: 'commission_received_brl', type: 'number', required: false },
        { name: 'commission_split', type: 'json', required: false },
        { name: 'cancelled_at', type: 'date', required: false },
        { name: 'cancel_reason', type: 'text', required: false },
        { name: 'property_description', type: 'text', required: false },
        {
          name: 'registered_by',
          type: 'relation',
          required: true,
          collectionId: users.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_deals_owner_ref ON deals (owner_referral_id)',
        'CREATE INDEX idx_deals_buyer_ref ON deals (buyer_referral_id)',
        'CREATE INDEX idx_deals_date ON deals (deal_date DESC)',
      ],
    })
    app.save(deals)

    // 12. public_reason_codes: tabela editável de motivos resumidos em linguagem simples
    const publicReasonCodes = new Collection({
      name: 'public_reason_codes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        { name: 'code', type: 'text', required: true },
        { name: 'display_text', type: 'text', required: true },
        {
          name: 'category',
          type: 'select',
          required: true,
          values: ['recusada', 'duplicada', 'perdida', 'retirada', 'cancelada', 'declinada'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_public_reason_code ON public_reason_codes (code)'],
    })
    app.save(publicReasonCodes)

    // Seed default public reason codes
    const defaultReasons = [
      {
        code: 'recusa_fora_perfil',
        display_text: 'Imóvel fora do perfil de atuação da Godoy Prime',
        category: 'recusada',
      },
      {
        code: 'recusa_dados_insuficientes',
        display_text: 'Contato não localizado ou dados insuficientes',
        category: 'recusada',
      },
      {
        code: 'duplicada_ja_cadastrada',
        display_text: 'Indicação já em atendimento na nossa base',
        category: 'duplicada',
      },
      {
        code: 'perdida_proprietario_desistiu',
        display_text: 'Proprietário optou por não comercializar o imóvel no momento',
        category: 'perdida',
      },
      {
        code: 'perdida_contato_invalido',
        display_text: 'Não obtivemos retorno após múltiplas tentativas de contato',
        category: 'perdida',
      },
      {
        code: 'retirada_venda_direta',
        display_text: 'Imóvel negociado diretamente pelo proprietário ou por outro canal',
        category: 'retirada',
      },
      {
        code: 'retirada_contrato_vencido',
        display_text: 'Prazo de autorização do imóvel expirado',
        category: 'retirada',
      },
      {
        code: 'cancelada_solicitacao_indicador',
        display_text: 'Cancelamento solicitado pelo indicador',
        category: 'cancelada',
      },
      {
        code: 'declinada_interesse_comercial',
        display_text: 'Reconhecida pela Godoy Prime sob avaliação estratégica',
        category: 'declinada',
      },
    ]

    defaultReasons.forEach((r) => {
      const item = new Record(publicReasonCodes)
      item.set('code', r.code)
      item.set('display_text', r.display_text)
      item.set('category', r.category)
      app.save(item)
    })
  },
  (app) => {
    const list = [
      'public_reason_codes',
      'deals',
      'capture_records',
      'documents',
      'referral_tasks',
      'referral_notes',
      'contact_attempts',
      'known_buyer_base',
      'known_owner_base',
      'duplicate_flags',
      'referral_events',
    ]
    for (let i = 0; i < list.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(list[i])
        app.delete(col)
      } catch (_) {}
    }
  },
)
