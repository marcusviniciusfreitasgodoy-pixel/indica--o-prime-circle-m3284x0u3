migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const programs = app.findCollectionByNameOrId('programs')
    const programLevels = app.findCollectionByNameOrId('program_levels')
    const participantCategories = app.findCollectionByNameOrId('participant_categories')
    const condominiums = app.findCollectionByNameOrId('condominiums')
    const legalDocuments = app.findCollectionByNameOrId('legal_documents')
    const programSettings = app.findCollectionByNameOrId('program_settings')
    const userRoles = app.findCollectionByNameOrId('user_roles')
    const profiles = app.findCollectionByNameOrId('profiles')

    // Helper for upserting by slug
    function upsertProgram(slug, name, description) {
      let record
      try {
        record = app.findFirstRecordByData('programs', 'slug', slug)
      } catch (_) {
        record = new Record(programs)
        record.set('slug', slug)
      }
      record.set('name', name)
      record.set('description', description)
      record.set('is_active', true)
      app.save(record)
      return record
    }

    // 1. Programs: comunidade e parceiros
    const progComunidade = upsertProgram(
      'comunidade',
      'Frente Comunidade',
      'Programa voltado para porteiros, zeladores, prestadores residenciais, clientes e entidades condominiais.',
    )
    const progParceiros = upsertProgram(
      'parceiros',
      'Frente Parceiros',
      'Programa voltado para parceiros profissionais, empresas parceiras, administradoras, síndicos e corretores parceiros.',
    )

    // 2. Program Levels (Três níveis dos Parceiros: Parceiro, Parceiro Prime, Parceiro Signature)
    const partnerLevels = [
      {
        slug: 'parceiro',
        name: 'Parceiro',
        order: 1,
        criteria_description: 'Nível inicial de parceiro cadastrado',
        reward_percentage: 10,
      },
      {
        slug: 'parceiro_prime',
        name: 'Parceiro Prime',
        order: 2,
        criteria_description: 'Parceiro com volume frequente de indicações qualificadas',
        reward_percentage: 15,
      },
      {
        slug: 'parceiro_signature',
        name: 'Parceiro Signature',
        order: 3,
        criteria_description: 'Parceiro de alta performance e exclusividade',
        reward_percentage: 20,
      },
    ]

    partnerLevels.forEach((lvl) => {
      let rec
      try {
        rec = app.findFirstRecordByFilter(
          'program_levels',
          `program_id = '${progParceiros.id}' && slug = '${lvl.slug}'`,
        )
      } catch (_) {
        rec = new Record(programLevels)
        rec.set('program_id', progParceiros.id)
        rec.set('slug', lvl.slug)
      }
      rec.set('name', lvl.name)
      rec.set('order', lvl.order)
      rec.set('criteria_description', lvl.criteria_description)
      rec.set('reward_percentage', lvl.reward_percentage)
      app.save(rec)
    })

    // 3. Participant Categories
    // Tabela de categorias conforme especificação:
    // porteiro_zelador: frente comunidade, requires_approval: true, allowed_channels: link_only
    // prestador_residencial: frente comunidade, requires_approval: true, allowed_channels: link_only
    // cliente: frente comunidade, requires_approval: false, allowed_channels: link_and_direct
    // parceiro_profissional: frente parceiros, requires_approval: true, allowed_channels: link_and_direct
    // empresa_parceira: frente parceiros, requires_approval: true, allowed_channels: link_and_direct
    // administradora: frente parceiros, requires_approval: true, allowed_channels: link_and_direct
    // sindico: frente parceiros, requires_approval: true, allowed_channels: link_only (só link)
    // entidade_condominial: frente comunidade, requires_approval: true, allowed_channels: link_only (só link)
    // corretor_parceiro: frente parceiros, requires_approval: true, allowed_channels: link_and_direct

    const categoriesDef = [
      {
        slug: 'porteiro_zelador',
        name: 'Porteiro / Zelador',
        front: 'comunidade',
        programId: progComunidade.id,
        requires_approval: true,
        allowed_channels: 'link_only',
        description:
          'Profissionais de portaria e zeladoria de condomínios residenciais e comerciais.',
      },
      {
        slug: 'prestador_residencial',
        name: 'Prestador Residencial',
        front: 'comunidade',
        programId: progComunidade.id,
        requires_approval: true,
        allowed_channels: 'link_only',
        description:
          'Profissionais autônomos que prestam serviços residenciais (arquitetos, reformas, eletricistas).',
      },
      {
        slug: 'cliente',
        name: 'Cliente',
        front: 'comunidade',
        programId: progComunidade.id,
        requires_approval: false,
        allowed_channels: 'link_and_direct',
        description: 'Clientes Prime Circle que indicam novos proprietários ou compradores.',
      },
      {
        slug: 'parceiro_profissional',
        name: 'Parceiro Profissional',
        front: 'parceiros',
        programId: progParceiros.id,
        requires_approval: true,
        allowed_channels: 'link_and_direct',
        description: 'Advogados, contadores, decoradores e consultores patrimoniais parceiros.',
      },
      {
        slug: 'empresa_parceira',
        name: 'Empresa Parceira',
        front: 'parceiros',
        programId: progParceiros.id,
        requires_approval: true,
        allowed_channels: 'link_and_direct',
        description: 'Pessoas jurídicas conveniadas ao ecossistema Prime Circle.',
      },
      {
        slug: 'administradora',
        name: 'Administradora de Condomínios',
        front: 'parceiros',
        programId: progParceiros.id,
        requires_approval: true,
        allowed_channels: 'link_and_direct',
        description: 'Empresas administradoras prediais.',
      },
      {
        slug: 'sindico',
        name: 'Síndico Profissional / Morador',
        front: 'parceiros',
        programId: progParceiros.id,
        requires_approval: true,
        allowed_channels: 'link_only',
        description: 'Síndicos com atuação em empreendimentos do Rio de Janeiro.',
      },
      {
        slug: 'entidade_condominial',
        name: 'Entidade Condominial',
        front: 'comunidade',
        programId: progComunidade.id,
        requires_approval: true,
        allowed_channels: 'link_only',
        description: 'Associações de moradores e entidades de condomínios.',
      },
      {
        slug: 'corretor_parceiro',
        name: 'Corretor Parceiro',
        front: 'parceiros',
        programId: progParceiros.id,
        requires_approval: true,
        allowed_channels: 'link_and_direct',
        description: 'Corretores de imóveis com CRECI ativo cadastrados na rede de repasse.',
      },
    ]

    categoriesDef.forEach((cat) => {
      let rec
      try {
        rec = app.findFirstRecordByData('participant_categories', 'slug', cat.slug)
      } catch (_) {
        rec = new Record(participantCategories)
        rec.set('slug', cat.slug)
      }
      rec.set('name', cat.name)
      rec.set('front', cat.front)
      rec.set('program_id', cat.programId)
      rec.set('requires_approval', cat.requires_approval)
      rec.set('allowed_channels', cat.allowed_channels)
      rec.set('description', cat.description)
      app.save(rec)
    })

    // 4. Bairros Barra da Tijuca e Recreio dos Bandeirantes (Condomínios de Referência)
    const seedCondos = [
      {
        name: 'Condomínio Golden Green',
        neighborhood: 'Barra da Tijuca',
        address: 'Av. Lúcio Costa, 5200',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zip_code: '22630-012',
      },
      {
        name: 'Condomínio Península - Bernini',
        neighborhood: 'Barra da Tijuca',
        address: 'Av. dos Flamboyants, 500',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zip_code: '22776-070',
      },
      {
        name: 'Condomínio Mandala',
        neighborhood: 'Barra da Tijuca',
        address: 'Av. das Américas, 6000',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zip_code: '22793-080',
      },
      {
        name: 'Condomínio Reserva do Sahy / Vivendas do Sol',
        neighborhood: 'Recreio dos Bandeirantes',
        address: 'Rua Gilka Machado, 450',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zip_code: '22790-000',
      },
      {
        name: 'Condomínio Art Life Recreio',
        neighborhood: 'Recreio dos Bandeirantes',
        address: 'Estrada do Pontal, 7500',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zip_code: '22790-877',
      },
    ]

    seedCondos.forEach((c) => {
      let rec
      try {
        rec = app.findFirstRecordByFilter(
          'condominiums',
          `name = {:name} && neighborhood = {:neighborhood}`,
          { name: c.name, neighborhood: c.neighborhood },
        )
      } catch (_) {
        rec = new Record(condominiums)
        rec.set('name', c.name)
        rec.set('neighborhood', c.neighborhood)
      }
      rec.set('address', c.address)
      rec.set('city', c.city)
      rec.set('state', c.state)
      rec.set('zip_code', c.zip_code)
      rec.set('active', true)
      app.save(rec)
    })

    // 5. program_settings com os padrões da seção 5 da especificação
    const settingsList = [
      {
        key: 'serviced_neighborhoods',
        description: 'Bairros atendidos prioritariamente pela Prime Circle',
        value: ['Barra da Tijuca', 'Recreio dos Bandeirantes'],
      },
      {
        key: 'first_contact_window_days',
        description: 'Janela de primeiro contato com o indicado',
        value: 7,
      },
      {
        key: 'stalled_referral_thresholds_days',
        description: 'Indicação parada: dias em triagem e dias nos demais estados ativos',
        value: {
          triage_days: 5,
          active_states_days: 10,
        },
      },
      {
        key: 'capture_attribution_window_days',
        description: 'Janela de atribuição da captação',
        value: 90,
      },
      {
        key: 'sale_window_from_capture_months',
        description: 'Janela da venda a partir da captação',
        value: 12,
      },
      {
        key: 'known_owner_precedence_days',
        description: 'Precedência de proprietário já conhecido no banco Prime Circle',
        value: 180,
      },
      {
        key: 'referral_monthly_cap_per_category',
        description: 'Teto de indicações por participante por mês por categoria',
        value: 10,
      },
      {
        key: 'retention_before_anonymization_months',
        description: 'Retenção dos dados antes de anonimização (LGPD)',
        value: 24,
      },
      {
        key: 'monthly_reckoning_day',
        description: 'Dia da apuração mensal das premiações',
        value: 10,
      },
      {
        key: 'batch_payment_due_day',
        description: 'Data limite de pagamento do lote de premiação do mês',
        value: 25,
      },
      {
        key: 'active_referral_types',
        description: 'Tipos de indicação ativos na plataforma',
        value: [
          { type: 'proprietario_venda', label: 'Proprietário (Venda)' },
          { type: 'proprietario_locacao', label: 'Proprietário (Locação)' },
          { type: 'comprador', label: 'Comprador' },
        ],
      },
      {
        key: 'buyer_window_months',
        description: 'Janela de validade do comprador indicado',
        value: 12,
      },
      {
        key: 'buyer_precedence_days',
        description: 'Precedência de comprador já conhecido',
        value: 180,
      },
      {
        key: 'whatsapp_quiet_hours',
        description: 'Horário de silêncio para contatos automáticos via WhatsApp',
        value: {
          start: '21:00',
          end: '08:00',
        },
      },
      {
        key: 'marketing_messages_monthly_limit',
        description: 'Limite de mensagens de marketing por participante ao mês',
        value: 4,
      },
      {
        key: 'tenant_window_months',
        description: 'Janela de atribuição do inquilino indicado',
        value: 6,
      },
      {
        key: 'activation_deadlines_days',
        description: 'Prazos de ativação e régua de contato',
        value: [0, 3, 10, 30],
      },
    ]

    settingsList.forEach((st) => {
      let rec
      try {
        rec = app.findFirstRecordByData('program_settings', 'key', st.key)
      } catch (_) {
        rec = new Record(programSettings)
        rec.set('key', st.key)
      }
      rec.set('description', st.description)
      rec.set('value_json', JSON.stringify(st.value))
      app.save(rec)
    })

    // 6. Versões 1 dos documentos jurídicos com texto provisório
    const legalDocsDef = [
      {
        slug: 'termos_de_uso',
        title: 'Termos de Uso da Plataforma Prime Circle Indica',
        version: 1,
      },
      {
        slug: 'politica_de_privacidade',
        title: 'Política de Privacidade e Proteção de Dados (LGPD)',
        version: 1,
      },
      {
        slug: 'regulamento_do_programa',
        title: 'Regulamento Geral do Programa de Indicação Prime Circle',
        version: 1,
      },
      {
        slug: 'declaracao_ausencia_impedimento',
        title: 'Declaração de Ausência de Impedimento Legal e Ético',
        version: 1,
      },
      {
        slug: 'consentimento_proprietario',
        title: 'Termo de Consentimento e Autorização do Proprietário',
        version: 1,
      },
    ]

    const provisionalText =
      'TEXTO PROVISÓRIO, AGUARDANDO REVISÃO JURÍDICA. Este documento contém os termos preliminares do programa Prime Circle Indica sob regência da legislação brasileira vigente e das normas éticas imobiliárias.'

    legalDocsDef.forEach((d) => {
      let rec
      try {
        rec = app.findFirstRecordByFilter(
          'legal_documents',
          `slug = '${d.slug}' && version = ${d.version}`,
        )
      } catch (_) {
        rec = new Record(legalDocuments)
        rec.set('slug', d.slug)
        rec.set('version', d.version)
      }
      rec.set('title', d.title)
      rec.set('content', provisionalText)
      rec.set('is_active', true)
      rec.set('published_at', new Date().toISOString())
      app.save(rec)
    })

    // 7. Papel admin e perfil inicial
    // Se o segredo ADMIN_EMAIL existir, atribui para ele; se não, verifica usuário Marcus Godoy (marcusviniciusfreitasgodoy@gmail.com)
    let adminEmail = ''
    try {
      adminEmail = $os.getenv('ADMIN_EMAIL') || ''
    } catch (_) {}

    if (!adminEmail) {
      adminEmail = 'marcusviniciusfreitasgodoy@gmail.com'
    }

    try {
      const adminUser = app.findAuthRecordByEmail('_pb_users_auth_', adminEmail)
      let roleRec
      try {
        roleRec = app.findFirstRecordByFilter(
          'user_roles',
          `user_id = '${adminUser.id}' && role = 'admin'`,
        )
      } catch (_) {
        roleRec = new Record(userRoles)
        roleRec.set('user_id', adminUser.id)
        roleRec.set('role', 'admin')
        app.save(roleRec)
      }

      // Ensure profile exists for adminUser
      try {
        app.findFirstRecordByData('profiles', 'user_id', adminUser.id)
      } catch (_) {
        const p = new Record(profiles)
        p.set('user_id', adminUser.id)
        p.set('name', adminUser.getString('name') || 'Marcus Godoy')
        p.set('phone', adminUser.getString('phone') || '')
        app.save(p)
      }
    } catch (_) {
      // Admin user does not exist yet; will be assigned when created
    }

    // Also ensure profiles exist for any existing users
    const existingUsers = app.findRecordsByFilter('_pb_users_auth_', '', 'created', 100, 0)
    existingUsers.forEach((u) => {
      try {
        app.findFirstRecordByData('profiles', 'user_id', u.id)
      } catch (_) {
        const prof = new Record(profiles)
        prof.set('user_id', u.id)
        prof.set('name', u.getString('name') || 'Membro Prime Circle')
        prof.set('phone', u.getString('phone') || '')
        app.save(prof)
      }
    })
  },
  (app) => {
    // down is clean / idempotent
  },
)
