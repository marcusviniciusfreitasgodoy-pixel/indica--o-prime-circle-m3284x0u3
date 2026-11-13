// 0040_fill_legal_document_gaps.js
// Preenche as lacunas de identificação da promotora nos documentos jurídicos
// provisionais publicados pela migração 0031_c8_provisional_legal_documents.js.
//
// Os placeholders <<...>> abaixo foram mantidos como recebidos: a usuário ainda
// não forneceu o CNPJ real, o endereço da sede nem o e-mail de privacidade.
// Preenchê-los exige editar este arquivo com os dados reais antes de aplicar.
//
// Regras aplicadas:
// - o restante do texto permanece idêntico;
// - o número da versão aumenta (a vigente fica is_active = false);
// - is_provisional = false apenas nos documentos sem nenhum colchete [ ] pendente
//   (os << >> não contam como colchete pendente); o modelo de abordagem com
//   [primeiro nome], [nome], [Nome do indicador], [vender, alugar, comprar ou alugar]
//   e CRECI [número] é template de mensagem e NÃO é tratado como lacuna.

function stripApproachTemplateBrackets(content) {
  return content
    .replace(/\[primeiro nome\]/g, '<primeiro-nome>')
    .replace(/\[nome\]/g, '<nome>')
    .replace(/\[Nome do indicador\]/g, '<nome-do-indicador>')
    .replace(/\[vender, alugar, comprar ou alugar\]/g, '<finalidade>')
    .replace(/\[número\]/g, '<creci>')
    .replace(/\[data e hora\]/g, '<data-e-hora>')
    .replace(/\[data\]/g, '<data>')
}

function countPendingBrackets(content) {
  return (stripApproachTemplateBrackets(content).match(/\[[^\]]*\]/g) || []).length
}

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_documents')

    const CNPJ = '<<CNPJ DA GODOY PRIME REALTY>>'
    const ENDERECO = '<<ENDEREÇO COMPLETO>>'
    const EMAIL = '<<E-MAIL>>'

    const UPDATES = [
      {
        slug: 'regulamento_do_programa',
        title: 'Regulamento do Programa de Indicações Godoy Prime',
        replacements: [
          { from: 'CNPJ [preencher]', to: `CNPJ ${CNPJ}` },
          { from: 'sede em [endereço]', to: `sede em ${ENDERECO}` },
        ],
      },
      {
        slug: 'declaracao_ausencia_impedimento',
        title: 'Termo de Adesão ao Programa de Indicações Godoy Prime',
        replacements: [{ from: 'CNPJ [preencher]', to: `CNPJ ${CNPJ}` }],
      },
      {
        slug: 'consentimento_proprietario',
        title: 'Consentimento e aviso de privacidade para a pessoa indicada',
        replacements: [
          { from: 'CNPJ [preencher], [endereço]', to: `CNPJ ${CNPJ}, ${ENDERECO}` },
          {
            from: 'Contato para assuntos de privacidade: [e-mail]',
            to: `Contato para assuntos de privacidade: ${EMAIL}`,
          },
          {
            from: 'pelo e-mail [e-mail] ou respondendo',
            to: `pelo e-mail ${EMAIL} ou respondendo`,
          },
        ],
      },
      {
        slug: 'politica_de_privacidade',
        title: 'Política de Privacidade e Proteção de Dados (LGPD)',
        replacements: [
          { from: 'CNPJ [preencher]', to: `CNPJ ${CNPJ}` },
          { from: '[endereço]', to: ENDERECO },
          { from: '[e-mail]', to: EMAIL },
        ],
      },
      {
        slug: 'termos_de_uso',
        title: 'Termos de Uso da Plataforma Prime Circle Indica',
        replacements: [
          { from: 'CNPJ [preencher]', to: `CNPJ ${CNPJ}` },
          { from: '[endereço]', to: ENDERECO },
          { from: '[e-mail]', to: EMAIL },
        ],
      },
    ]

    UPDATES.forEach((upd) => {
      // Versão vigente = maior version com is_active = true
      let current = null
      let maxVersion = 0
      try {
        const records = app.findRecordsByFilter(
          'legal_documents',
          'slug = {:slug} && is_active = true',
          '-version',
          10,
          0,
          { slug: upd.slug },
        )
        records.forEach((r) => {
          const v = r.getInt('version') || 0
          if (v > maxVersion) {
            maxVersion = v
            current = r
          }
        })
      } catch (_) {}

      if (!current) {
        console.log('[0040] Nenhuma versão ativa para slug: ' + upd.slug)
        return
      }

      // Idempotência: se a próxima versão já existe, não reaplica
      const nextVersion = maxVersion + 1
      let exists = null
      try {
        exists = app.findFirstRecordByFilter(
          'legal_documents',
          'slug = {:slug} && version = {:v}',
          { slug: upd.slug, v: nextVersion },
        )
      } catch (_) {}
      if (exists) {
        console.log(
          '[0040] Versão ' + nextVersion + ' de ' + upd.slug + ' já existe; nada a fazer.',
        )
        return
      }

      const oldContent = current.getString('content')

      // Confirma que a versão vigente é a que está com lacunas provisionais;
      // se não houver mais lacunas neste documento, não cria nova versão.
      let missing = 0
      upd.replacements.forEach((rep) => {
        if (oldContent.indexOf(rep.from) !== -1) missing++
      })
      if (missing === 0) {
        console.log('[0040] ' + upd.slug + ': lacunas já preenchidas na versão ' + maxVersion)
        return
      }

      let content = oldContent
      upd.replacements.forEach((rep) => {
        while (content.indexOf(rep.from) !== -1) {
          content = content.replace(rep.from, rep.to)
        }
      })

      // Segurança: todos os placeholders originais foram substituídos
      upd.replacements.forEach((rep) => {
        if (content.indexOf(rep.from) !== -1) {
          throw new Error('[0040] Falha ao substituir lacuna em ' + upd.slug + ': ' + rep.from)
        }
      })

      const stillPending = countPendingBrackets(content)

      // Desativar a versão anterior
      current.set('is_active', false)
      app.save(current)

      // Publicar a nova versão
      const nextRec = new Record(col)
      nextRec.set('slug', upd.slug)
      nextRec.set('title', upd.title)
      nextRec.set('version', nextVersion)
      nextRec.set('content', content)
      nextRec.set('is_active', true)
      nextRec.set('is_provisional', stillPending > 0)
      nextRec.set('published_at', new Date().toISOString())
      app.save(nextRec)

      console.log(
        '[0040] ' +
          upd.slug +
          ': publicada versão ' +
          nextVersion +
          (stillPending > 0
            ? ' (is_provisional = true, ' + stillPending + ' colchete(s) pendente(s))'
            : ' (is_provisional = false, sem colchetes pendentes)'),
      )
    })
  },
  (app) => {
    const slugs = [
      'regulamento_do_programa',
      'declaracao_ausencia_impedimento',
      'consentimento_proprietario',
      'politica_de_privacidade',
      'termos_de_uso',
    ]
    slugs.forEach((slug) => {
      try {
        const records = app.findRecordsByFilter(
          'legal_documents',
          'slug = {:slug}',
          '-version',
          20,
          0,
          { slug },
        )
        records.forEach((r) => {
          const v = r.getInt('version')
          // Reativar a versão anterior à criada por esta migração e
          // remover as versões criadas por ela.
          if (r.getBool('is_provisional') === false && v > 1) {
            // versão criada por esta migração nos slugs não-provisionais
            app.delete(r)
            return
          }
          // Nos slugs provisionais (com colchetes restantes), a versão criada
          // aqui é a de maior número com is_active = true; desfaz apenas se
          // houver uma versão 2 provisionada pela 0031 abaixo dela.
          if (v >= 2) {
            try {
              const prev = app.findFirstRecordByFilter(
                'legal_documents',
                'slug = {:slug} && version = {:v}',
                { slug, v: v - 1 },
              )
              if (prev) {
                prev.set('is_active', true)
                app.save(prev)
              }
              app.delete(r)
            } catch (_) {}
          }
        })
      } catch (_) {}
    })
  },
)
