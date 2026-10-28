/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const participants = app.findCollectionByNameOrId('participants')
    const programLevels = app.findCollectionByNameOrId('program_levels')
    const referrals = app.findCollectionByNameOrId('referrals')
    const deals = app.findCollectionByNameOrId('deals')

    const internalRule =
      "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)"

    // 1. participant_level_history
    const levelHistory = new Collection({
      name: 'participant_level_history',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: internalRule,
      updateRule: internalRule,
      deleteRule: "@request.auth.id != '' && @request.auth.is_admin = true",
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
          name: 'previous_level_id',
          type: 'relation',
          required: false,
          collectionId: programLevels.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'new_level_id',
          type: 'relation',
          required: true,
          collectionId: programLevels.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'changed_at',
          type: 'date',
          required: true,
        },
        {
          name: 'reason',
          type: 'text',
          required: false,
        },
        {
          name: 'qualifying_referrals_count',
          type: 'number',
          required: false,
          onlyInt: true,
        },
        {
          name: 'deals_count',
          type: 'number',
          required: false,
          onlyInt: true,
        },
        {
          name: 'vgv_total_brl',
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
        'CREATE INDEX idx_level_hist_part ON participant_level_history (participant_id, changed_at DESC)',
      ],
    })
    app.save(levelHistory)

    // 2. benefit_catalog
    const benefitCatalog = new Collection({
      name: 'benefit_catalog',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: "@request.auth.id != '' && @request.auth.is_admin = true",
      updateRule: "@request.auth.id != '' && @request.auth.is_admin = true",
      deleteRule: "@request.auth.id != '' && @request.auth.is_admin = true",
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
          name: 'description',
          type: 'text',
          required: false,
        },
        {
          name: 'min_level_id',
          type: 'relation',
          required: false,
          collectionId: programLevels.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'min_level_order',
          type: 'number',
          required: false,
          onlyInt: true,
        },
        {
          name: 'estimated_value_brl',
          type: 'number',
          required: false,
        },
        {
          name: 'is_active',
          type: 'bool',
        },
        {
          name: 'target_audience',
          type: 'select',
          required: true,
          values: ['parceiros', 'comunidade', 'todos'],
          maxSelect: 1,
        },
        {
          name: 'category',
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
        'CREATE UNIQUE INDEX idx_benefit_catalog_slug ON benefit_catalog (slug)',
        'CREATE INDEX idx_benefit_catalog_active ON benefit_catalog (is_active)',
      ],
    })
    app.save(benefitCatalog)

    // 3. benefit_grants
    const benefitGrants = new Collection({
      name: 'benefit_grants',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule:
        "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_financeiro = true)",
      updateRule:
        "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_financeiro = true)",
      deleteRule: "@request.auth.id != '' && @request.auth.is_admin = true",
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
          name: 'referral_id',
          type: 'relation',
          required: false,
          collectionId: referrals.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'deal_id',
          type: 'relation',
          required: false,
          collectionId: deals.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'benefit_id',
          type: 'relation',
          required: false,
          collectionId: benefitCatalog.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'custom_description',
          type: 'text',
          required: false,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['em_analise', 'aprovado', 'entregue', 'cancelado'],
          maxSelect: 1,
        },
        {
          name: 'milestone',
          type: 'text',
          required: false,
        },
        {
          name: 'estimated_value_brl',
          type: 'number',
          required: false,
        },
        {
          name: 'delivered_at',
          type: 'date',
          required: false,
        },
        {
          name: 'delivered_by',
          type: 'relation',
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'delivery_proof',
          type: 'text',
          required: false,
        },
        {
          name: 'notes',
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
        'CREATE INDEX idx_benefit_grants_part ON benefit_grants (participant_id, status)',
        'CREATE INDEX idx_benefit_grants_ref ON benefit_grants (referral_id)',
      ],
    })
    app.save(benefitGrants)

    // 4. reciprocal_referrals
    const reciprocalReferrals = new Collection({
      name: 'reciprocal_referrals',
      type: 'base',
      listRule: internalRule,
      viewRule: internalRule,
      createRule: internalRule,
      updateRule: internalRule,
      deleteRule: "@request.auth.id != '' && @request.auth.is_admin = true",
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
          name: 'client_name',
          type: 'text',
          required: true,
        },
        {
          name: 'client_phone',
          type: 'text',
          required: false,
        },
        {
          name: 'client_email',
          type: 'text',
          required: false,
        },
        {
          name: 'opportunity_summary',
          type: 'text',
          required: true,
        },
        {
          name: 'sent_date',
          type: 'date',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['enviada', 'em_andamento', 'fechada', 'cancelada'],
          maxSelect: 1,
        },
        {
          name: 'notes',
          type: 'text',
          required: false,
        },
        {
          name: 'registered_by',
          type: 'relation',
          required: true,
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
        'CREATE INDEX idx_reciprocal_part ON reciprocal_referrals (participant_id, sent_date DESC)',
      ],
    })
    app.save(reciprocalReferrals)

    // 5. Seed benefit_catalog (TODOS inativos por padrão, para revisão do usuário em /admin/programas)
    // Resolve os níveis do programa Parceiros
    let lvlParceiro = null
    let lvlPrime = null
    let lvlSignature = null

    try {
      lvlParceiro = app.findFirstRecordByFilter('program_levels', "slug = 'parceiro'")
    } catch (_) {}
    try {
      lvlPrime = app.findFirstRecordByFilter('program_levels', "slug = 'parceiro_prime'")
    } catch (_) {}
    try {
      lvlSignature = app.findFirstRecordByFilter('program_levels', "slug = 'parceiro_signature'")
    } catch (_) {}

    const benefitsSeed = [
      // Nível 1: Parceiro
      {
        slug: 'kit_boas_vindas_prime',
        title: 'Kit de Boas-Vindas Prime Circle',
        description:
          'Kit institucional premium com itens exclusivos Godoy Prime para o escritório do parceiro.',
        min_level_id: lvlParceiro ? lvlParceiro.id : null,
        min_level_order: 1,
        estimated_value_brl: 350,
        target_audience: 'parceiros',
        category: 'Kits & Materiais',
      },
      {
        slug: 'networking_eventos_exclusivos',
        title: 'Convite para Rodadas de Negócios e Eventos Prime',
        description:
          'Acesso reservado aos encontros executivos e almoços de relacionamento com incorporadores e investidores.',
        min_level_id: lvlParceiro ? lvlParceiro.id : null,
        min_level_order: 1,
        estimated_value_brl: 500,
        target_audience: 'parceiros',
        category: 'Eventos & Relacionamento',
      },
      {
        slug: 'divulgacao_midia_prime',
        title: 'Divulgação Institucional do Parceiro nas Mídias Prime',
        description:
          'Menção do parceiro e sua especialidade jurídica ou técnica nas redes e comunicados institucionais Godoy Prime.',
        min_level_id: lvlParceiro ? lvlParceiro.id : null,
        min_level_order: 1,
        estimated_value_brl: 1200,
        target_audience: 'parceiros',
        category: 'Marketing & Visibilidade',
      },
      // Nível 2: Parceiro Prime
      {
        slug: 'voucher_gastronomico_barra',
        title: 'Voucher Experiência Gastronômica Barra da Tijuca',
        description:
          'Jantar ou almoço especial com acompanhante em restaurante de alta gastronomia na Barra da Tijuca.',
        min_level_id: lvlPrime ? lvlPrime.id : lvlParceiro ? lvlParceiro.id : null,
        min_level_order: 2,
        estimated_value_brl: 800,
        target_audience: 'parceiros',
        category: 'Experiências',
      },
      {
        slug: 'consultoria_laudos_periciais',
        title: 'Consultoria Notarial e Laudos Periciais Exclusivos',
        description:
          'Apoio técnico de engenharia de avaliações e suporte em diligências documentais imobiliárias de alto padrão.',
        min_level_id: lvlPrime ? lvlPrime.id : lvlParceiro ? lvlParceiro.id : null,
        min_level_order: 2,
        estimated_value_brl: 2500,
        target_audience: 'parceiros',
        category: 'Suporte Técnico & Perícias',
      },
      {
        slug: 'video_institucional_podcast',
        title: 'Produção de Vídeo Institucional / Podcast do Escritório',
        description:
          'Gravação em estúdio parceiro com entrevista técnica e edição profissional para fortalecimento da autoridade do parceiro.',
        min_level_id: lvlPrime ? lvlPrime.id : lvlParceiro ? lvlParceiro.id : null,
        min_level_order: 2,
        estimated_value_brl: 3500,
        target_audience: 'parceiros',
        category: 'Marketing & Audiovisual',
      },
      // Nível 3: Parceiro Signature
      {
        slug: 'voo_panoramico_helicoptero',
        title: 'Voo Panorâmico de Helicóptero Barra / Recreio / Orla',
        description:
          'Experiência aérea exclusiva sobrevoando a Barra da Tijuca, Recreio dos Bandeirantes e litoral carioca.',
        min_level_id: lvlSignature ? lvlSignature.id : lvlPrime ? lvlPrime.id : null,
        min_level_order: 3,
        estimated_value_brl: 2500,
        target_audience: 'parceiros',
        category: 'Experiências de Luxo',
      },
      {
        slug: 'viagem_weekend_resort',
        title: 'Weekend VIP em Resort / Hotel Boutique',
        description:
          'Final de semana exclusivo com direito a acompanhante em hotel de luxo ou resort parceiro no estado do Rio de Janeiro.',
        min_level_id: lvlSignature ? lvlSignature.id : lvlPrime ? lvlPrime.id : null,
        min_level_order: 3,
        estimated_value_brl: 6000,
        target_audience: 'parceiros',
        category: 'Experiências de Luxo',
      },
      {
        slug: 'trofeu_signature_publicacao',
        title: 'Troféu de Honra Signature & Publicação de Destaque',
        description:
          'Troféu físico lapidado em cristal e placa gravada, com artigo dedicado ao parceiro na edição de prestígio Prime Circle.',
        min_level_id: lvlSignature ? lvlSignature.id : lvlPrime ? lvlPrime.id : null,
        min_level_order: 3,
        estimated_value_brl: 4500,
        target_audience: 'parceiros',
        category: 'Reconhecimento & Premiação',
      },
      // Comunidade / Entidade
      {
        slug: 'benfeitoria_fundo_condominio',
        title: 'Aporte / Benfeitoria em Fundo do Condomínio',
        description:
          'Crédito ou aquisição direta de itens para áreas comuns do condomínio ou fundo de lazer e manutenção predial.',
        min_level_id: null,
        min_level_order: 1,
        estimated_value_brl: 2000,
        target_audience: 'comunidade',
        category: 'Condomínios',
      },
    ]

    benefitsSeed.forEach((item) => {
      let rec = null
      try {
        rec = app.findFirstRecordByData('benefit_catalog', 'slug', item.slug)
      } catch (_) {
        rec = new Record(benefitCatalog)
        rec.set('slug', item.slug)
      }
      rec.set('title', item.title)
      rec.set('description', item.description)
      if (item.min_level_id) rec.set('min_level_id', item.min_level_id)
      rec.set('min_level_order', item.min_level_order)
      rec.set('estimated_value_brl', item.estimated_value_brl)
      rec.set('is_active', false) // Regra: TODOS INATIVOS por padrão!
      rec.set('target_audience', item.target_audience)
      rec.set('category', item.category)
      app.save(rec)
    })

    // 6. Configuração de Bônus por Volume da Comunidade (DESLIGADO por padrão)
    const programSettings = app.findCollectionByNameOrId('program_settings')
    let bonusRec = null
    try {
      bonusRec = app.findFirstRecordByData('program_settings', 'key', 'community_volume_bonus')
    } catch (_) {
      bonusRec = new Record(programSettings)
      bonusRec.set('key', 'community_volume_bonus')
    }
    bonusRec.set(
      'description',
      'Parâmetros e ativação do bônus adicional por volume para participantes da Frente Comunidade',
    )
    bonusRec.set(
      'value_json',
      JSON.stringify({
        enabled: false, // Regra: DESLIGADO por padrão!
        min_referrals_quarter: 5,
        bonus_fixed_brl: 500,
        bonus_percentage_extra: 2.5,
        eligible_categories: [
          'porteiro_zelador',
          'prestador_residencial',
          'cliente',
          'entidade_condominial',
        ],
      }),
    )
    app.save(bonusRec)
  },
  (app) => {
    try {
      const rh = app.findCollectionByNameOrId('participant_level_history')
      app.delete(rh)
    } catch (_) {}
    try {
      const bg = app.findCollectionByNameOrId('benefit_grants')
      app.delete(bg)
    } catch (_) {}
    try {
      const rr = app.findCollectionByNameOrId('reciprocal_referrals')
      app.delete(rr)
    } catch (_) {}
    try {
      const bc = app.findCollectionByNameOrId('benefit_catalog')
      app.delete(bc)
    } catch (_) {}
  },
)
