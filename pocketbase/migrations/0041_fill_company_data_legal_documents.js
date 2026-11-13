// 0041_fill_company_data_legal_documents.js
//
// Publica novas versões dos documentos jurídicos com os dados oficiais da
// Godoy Prime Realty preenchidos. Regras de versionamento: número da versão
// aumenta, a versão anterior fica is_active = false, is_provisional é
// recalculado e a nova versão é a que passa a obrigar novo aceite (a checagem
// de re-aceite por versão é implementada nos hooks de participant).
//
// - Regulamento do Programa e Termo de Adesão: <<CNPJ>> e <<ENDEREÇO>> são
//   substituídos pelos dados reais. is_provisional = false quando não sobra
//   nenhum colchete [ ] pendente (modelo de abordagem com [primeiro nome],
//   [nome], [Nome do indicador], CRECI [número] etc. NÃO é tratado como lacuna).
// - Política de Privacidade e Termos de Uso: estavam travados na v1 com o
//   texto "TEXTO PROVISÓRIO, AGUARDANDO REVISÃO JURÍDICA" (a migração 0040 não
//   os alcançou). O conteúdo NÃO é reescrito: apenas preenchemos os dados da
//   empresa e MANTENEMOS o aviso de provisório com is_provisional = true até a
//   revisão jurídica final ser enviada.
// - Consentimento do Proprietário: v3 já ativa e sem lacunas — é revalidada
//   e republicada como v4 apenas se ainda contiver marcador (idempotente).

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

    const CNPJ = '58.409.058/0001-73'
    const ENDERECO_SEDE = 'Avenida das Américas, 10.101, Bloco 2, Sala 316'
    const ENDERECO_COMPLETO = 'Avenida das Américas, 10.101, Bloco 2, Sala 316, Rio de Janeiro, RJ'
    const EMAIL = 'contato@primecircle.app.br'

    const UPDATES = [
      {
        slug: 'regulamento_do_programa',
        title: 'Regulamento do Programa de Indicações Godoy Prime',
        keepProvisional: false,
        replacements: [
          { from: '<<CNPJ DA GODOY PRIME REALTY>>', to: CNPJ },
          { from: '<<ENDEREÇO COMPLETO>>', to: ENDERECO_SEDE },
          { from: 'CNPJ [preencher]', to: `CNPJ ${CNPJ}` },
          { from: 'sede em [endereço]', to: `sede em ${ENDERECO_SEDE}` },
        ],
      },
      {
        slug: 'declaracao_ausencia_impedimento',
        title: 'Termo de Adesão ao Programa de Indicações Godoy Prime',
        keepProvisional: false,
        replacements: [
          { from: '<<CNPJ DA GODOY PRIME REALTY>>', to: CNPJ },
          { from: '<<ENDEREÇO COMPLETO>>', to: ENDERECO_SEDE },
          { from: 'CNPJ [preencher]', to: `CNPJ ${CNPJ}` },
          { from: 'sede em [endereço]', to: `sede em ${ENDERECO_SEDE}` },
        ],
      },
      {
        slug: 'consentimento_proprietario',
        title: 'Consentimento e aviso de privacidade para a pessoa indicada',
        keepProvisional: false,
        replacements: [
          { from: '<<CNPJ DA GODOY PRIME REALTY>>', to: CNPJ },
          { from: '<<ENDEREÇO COMPLETO>>', to: ENDERECO_COMPLETO },
          { from: '<<E-MAIL>>', to: EMAIL },
          { from: 'CNPJ [preencher], [endereço]', to: `CNPJ ${CNPJ}, ${ENDERECO_COMPLETO}` },
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
        keepProvisional: true,
        replacements: [
          { from: '<<CNPJ DA GODOY PRIME REALTY>>', to: CNPJ },
          { from: '<<ENDEREÇO COMPLETO>>', to: ENDERECO_COMPLETO },
          { from: '<<E-MAIL>>', to: EMAIL },
          { from: 'CNPJ [preencher]', to: `CNPJ ${CNPJ}` },
          { from: '[endereço]', to: ENDERECO_COMPLETO },
          { from: '[e-mail]', to: EMAIL },
        ],
      },
      {
        slug: 'termos_de_uso',
        title: 'Termos de Uso da Plataforma Prime Circle Indica',
        keepProvisional: true,
        replacements: [
          { from: '<<CNPJ DA GODOY PRIME REALTY>>', to: CNPJ },
          { from: '<<ENDEREÇO COMPLETO>>', to: ENDERECO_COMPLETO },
          { from: '<<E-MAIL>>', to: EMAIL },
          { from: 'CNPJ [preencher]', to: `CNPJ ${CNPJ}` },
          { from: '[endereço]', to: ENDERECO_COMPLETO },
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
        console.log('[0041] Nenhuma versão ativa para slug: ' + upd.slug)
        return
      }

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
          '[0041] Versão ' + nextVersion + ' de ' + upd.slug + ' já existe; nada a fazer.',
        )
        return
      }

      const oldContent = current.getString('content')
      const hadNotice = /TEXTO PROVISÓRIO, AGUARDANDO REVISÃO JURÍDICA/.test(oldContent)

      let missing = 0
      upd.replacements.forEach((rep) => {
        if (oldContent.indexOf(rep.from) !== -1) missing++
      })

      const hasAnyPlaceholder = /<<|>>/.test(oldContent) || countPendingBrackets(oldContent) > 0

      // Só cria nova versão se há marcador/lacuna a resolver OU se a política
      // de provisório mudou (ex.: v1 política ainda sem versão nova).
      const needsNewVersion = missing > 0 || (upd.keepProvisional && maxVersion === 1 && hadNotice)
      if (!needsNewVersion) {
        console.log('[0041] ' + upd.slug + ': nada a fazer na versão ' + maxVersion)
        return
      }

      let content = oldContent
      upd.replacements.forEach((rep) => {
        while (content.indexOf(rep.from) !== -1) {
          content = content.replace(rep.from, rep.to)
        }
      })

      upd.replacements.forEach((rep) => {
        if (content.indexOf(rep.from) !== -1) {
          throw new Error('[0041] Falha ao substituir lacuna em ' + upd.slug + ': ' + rep.from)
        }
      })

      const stillPending = countPendingBrackets(content)
      const isProvisional = upd.keepProvisional ? true : stillPending > 0

      current.set('is_active', false)
      app.save(current)

      const nextRec = new Record(col)
      nextRec.set('slug', upd.slug)
      nextRec.set('title', upd.title)
      nextRec.set('version', nextVersion)
      nextRec.set('content', content)
      nextRec.set('is_active', true)
      nextRec.set('is_provisional', isProvisional)
      nextRec.set('published_at', new Date().toISOString())
      app.save(nextRec)

      console.log(
        '[0041] ' +
          upd.slug +
          ': publicada versão ' +
          nextVersion +
          (isProvisional ? ' (is_provisional = true)' : ' (is_provisional = false)'),
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
        // Reativa a versão imediatamente anterior à criada pela 0041 e
        // remove as versões publicadas por ela.
        const createdHere = records.filter((r) => r.getInt('version') > 3)
        createdHere.forEach((r) => {
          const prevVersion = r.getInt('version') - 1
          try {
            const prev = app.findFirstRecordByFilter(
              'legal_documents',
              'slug = {:slug} && version = {:v}',
              { slug, v: prevVersion },
            )
            if (prev) {
              prev.set('is_active', true)
              app.save(prev)
            }
          } catch (_) {}
          app.delete(r)
        })
      } catch (_) {}
    })
  },
)
