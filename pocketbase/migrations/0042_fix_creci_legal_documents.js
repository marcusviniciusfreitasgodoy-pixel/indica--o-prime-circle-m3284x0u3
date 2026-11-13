// 0042_fix_creci_legal_documents.js
//
// Publica novas versões de "regulamento_do_programa" e
// "declaracao_ausencia_impedimento" (Termo de Adesão) substituindo qualquer
// marcador "<<...>>" de CRECI por "11841" (CRECI-RJ PJ 11841, dado informado
// pelo dono). Regras de versionamento (mesmas da 0040/0041): o número da
// versão aumenta, a versão anterior fica is_active = false, o conteúdo
// permanece idêntico fora da substituição e a nova versão passa a obrigar
// re-aceite (checagem por versão em participant_legal.pb.js).
//
// is_provisional = false em cada um SE não restar NENHUM marcador "<<...>>",
// "[preencher]", "[endereço]" ou "[e-mail]" no texto. Colchetes legítimos de
// modelo de abordagem ([primeiro nome], [nome], [Nome do indicador],
// CRECI [número] em trechos de modelo de mensagem) NÃO contam como pendência
// — a mesma máscara temporária usada na 0041 é reaplicada na contagem.
//
// Política de Privacidade e Termos de Uso NÃO são tocados (continuam
// provisórios, aguardando revisão jurídica).

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

function countPendingMarkers(content) {
  const masked = stripApproachTemplateBrackets(content)
  const angle = (masked.match(/<<[\s\S]*?>>/g) || []).length
  const brackets = (masked.match(/\[[^\]]*\]/g) || []).length
  return angle + brackets
}

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_documents')

    const CRECI = '11841'

    const UPDATES = [
      {
        slug: 'regulamento_do_programa',
        title: 'Regulamento do Programa de Indicações Godoy Prime',
      },
      {
        slug: 'declaracao_ausencia_impedimento',
        title: 'Termo de Adesão ao Programa de Indicações Godoy Prime',
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
        console.log('[0042] Nenhuma versão ativa para slug: ' + upd.slug)
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
          '[0042] Versão ' + nextVersion + ' de ' + upd.slug + ' já existe; nada a fazer.',
        )
        return
      }

      const oldContent = current.getString('content')

      // Todas as ocorrências de "<<...>>" que citam CRECI viram "11841".
      // Ex.: "CRECI-RJ PJ <<CRECI>>" → "CRECI-RJ PJ 11841".
      let content = oldContent
      let replaced = 0
      content = content.replace(/<<[^<>]*CRECI[^<>]*>>/g, function () {
        replaced++
        return CRECI
      })

      // Qualquer outro "<<...>>" que ainda exista é reportado, não inventado.
      const leftovers = content.match(/<<[\s\S]*?>>/g) || []

      if (replaced === 0) {
        if (leftovers.length === 0) {
          console.log(
            '[0042] ' +
              upd.slug +
              ': nenhum marcador de CRECI na versão ' +
              maxVersion +
              '; nada a fazer.',
          )
          return
        }
        throw new Error(
          '[0042] ' +
            upd.slug +
            ': marcadores desconhecidos e não substituíveis: ' +
            leftovers.join(' | '),
        )
      }

      const stillPending = countPendingMarkers(content)
      const isProvisional = stillPending > 0

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
        '[0042] ' +
          upd.slug +
          ': publicada versão ' +
          nextVersion +
          (isProvisional ? ' (is_provisional = true)' : ' (is_provisional = false)') +
          ', marcadores CRECI substituídos: ' +
          replaced,
      )
    })
  },
  (app) => {
    const slugs = ['regulamento_do_programa', 'declaracao_ausencia_impedimento']
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
        // Reativa a versão imediatamente anterior à criada pela 0042 (>= 5)
        // e remove as versões publicadas por ela.
        const createdHere = records.filter((r) => r.getInt('version') >= 5)
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
