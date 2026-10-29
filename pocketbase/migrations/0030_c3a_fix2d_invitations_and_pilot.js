/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Criar coleção invitations
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const catCol = app.findCollectionByNameOrId('participant_categories')

    if (!app.hasTable('invitations')) {
      const invitationsCol = new Collection({
        name: 'invitations',
        type: 'base',
        // Leitura e escrita SOMENTE para equipe interna (sem regra pública)
        listRule:
          "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)",
        createRule:
          "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.is_admin = true || @request.auth.is_operador = true || @request.auth.is_financeiro = true)",
        deleteRule: "@request.auth.id != '' && @request.auth.is_admin = true",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'category_id', type: 'relation', collectionId: catCol.id, maxSelect: 1 },
          { name: 'created_by', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'used_by', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'used_at', type: 'date' },
          { name: 'expires_at', type: 'date', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_invitations_code ON invitations (code)',
          'CREATE INDEX idx_invitations_expires ON invitations (expires_at)',
          'CREATE INDEX idx_invitations_used_by ON invitations (used_by)',
        ],
      })
      app.save(invitationsCol)
    }

    // 2. Adicionar pilot_enabled na participant_categories
    if (!catCol.fields.getByName('pilot_enabled')) {
      catCol.fields.add(new BoolField({ name: 'pilot_enabled' }))
      app.save(catCol)
    }

    // Atualizar categorias do piloto:
    // True: cliente, porteiro_zelador, prestador_residencial, sindico, entidade_condominial, parceiro_profissional
    // False: corretor_parceiro, empresa_parceira, administradora
    // porteiro_zelador, prestador_residencial e sindico: allowed_channels = 'link_only'
    const pilotTrueSlugs = [
      'cliente',
      'porteiro_zelador',
      'prestador_residencial',
      'sindico',
      'entidade_condominial',
      'parceiro_profissional',
    ]

    const pilotFalseSlugs = ['corretor_parceiro', 'empresa_parceira', 'administradora']

    const linkOnlySlugs = ['porteiro_zelador', 'prestador_residencial', 'sindico']

    const allCats = app.findRecordsByFilter('participant_categories', '', '', 100, 0)
    allCats.forEach((c) => {
      const slug = c.getString('slug')
      if (pilotTrueSlugs.includes(slug)) {
        c.set('pilot_enabled', true)
      } else {
        c.set('pilot_enabled', false)
      }

      if (linkOnlySlugs.includes(slug)) {
        c.set('allowed_channels', 'link_only')
      }
      app.save(c)
    })

    // 3. Adicionar campos em participants:
    // conselho_fiscal_notified_at (date)
    // invitation_code (text)
    const partCol = app.findCollectionByNameOrId('participants')
    if (!partCol.fields.getByName('conselho_fiscal_notified_at')) {
      partCol.fields.add(new DateField({ name: 'conselho_fiscal_notified_at' }))
    }
    if (!partCol.fields.getByName('invitation_code')) {
      partCol.fields.add(new TextField({ name: 'invitation_code' }))
    }
    app.save(partCol)

    // 4. Garantir que a coleção documents permita bucket_type 'condo-assembly-records'
    // e status de verificação, ou 'partner-contracts'
    const docsCol = app.findCollectionByNameOrId('documents')
    const bucketField = docsCol.fields.getByName('bucket_type')
    if (bucketField && bucketField.values) {
      if (!bucketField.values.includes('condo-assembly-records')) {
        bucketField.values.push('condo-assembly-records')
        app.save(docsCol)
      }
    }
    if (!docsCol.fields.getByName('verification_status')) {
      docsCol.fields.add(
        new SelectField({
          name: 'verification_status',
          values: ['pendente', 'aprovado', 'rejeitado'],
          maxSelect: 1,
        }),
      )
      app.save(docsCol)
    }

    // 5. Cadastrar documentos legais de declaração específica para histórico em legal_documents
    const legalCol = app.findCollectionByNameOrId('legal_documents')
    const declarationsToSeed = [
      {
        slug: 'declaracao_maioridade',
        title: 'Declaração de Maioridade Civil (18 anos ou mais)',
        content:
          'Declaro sob as penas da lei ter 18 (dezoito) anos completos ou mais na data deste cadastro.',
      },
      {
        slug: 'declaracao_vinculo_empregador',
        title: 'Declaração de Conformidade com Empregador e Regimento Interno',
        content:
          'Declaro que meu contrato de trabalho e o regimento do condomínio ou empregador não vedam esta atividade.',
      },
      {
        slug: 'declaracao_nao_uso_sistemas',
        title: 'Declaração de Não Uso de Recursos do Condomínio',
        content:
          'Declaro que não usarei dados, cadastros, sistemas ou câmeras do condomínio ou do empregador.',
      },
      {
        slug: 'declaracao_entrega_em_maos',
        title: 'Declaração de Entrega Presencial Exclusiva',
        content: 'Declaro que apenas entregarei o link de indicação em mãos.',
      },
    ]

    declarationsToSeed.forEach((dec) => {
      try {
        const existing = app.findFirstRecordByFilter('legal_documents', 'slug = {:s}', {
          s: dec.slug,
        })
        if (existing) return
      } catch (_) {}

      const rec = new Record(legalCol)
      rec.set('slug', dec.slug)
      rec.set('title', dec.title)
      rec.set('version', 1)
      rec.set('content', dec.content)
      rec.set('is_active', true)
      rec.set('published_at', new Date().toISOString())
      app.save(rec)
    })
  },
  (app) => {
    try {
      const invitationsCol = app.findCollectionByNameOrId('invitations')
      app.delete(invitationsCol)
    } catch (_) {}
  },
)
