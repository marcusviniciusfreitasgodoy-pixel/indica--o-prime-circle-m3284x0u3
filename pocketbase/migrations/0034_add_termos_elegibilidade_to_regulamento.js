migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_documents')

    // Buscar versão ativa do regulamento_do_programa
    let activeReg = null
    try {
      activeReg = app.findFirstRecordByFilter(
        'legal_documents',
        "slug = 'regulamento_do_programa' && is_active = true",
        '-version',
      )
    } catch (_) {}

    const declaracoesText = `

## 4. Termos e Elegibilidade

1. Declaro ter 18 anos ou mais.
2. Li e concordo com os Termos de Uso da Plataforma.
3. Li e concordo com a Política de Privacidade (LGPD).
4. Declaro sob as penas da lei a Ausência de Impedimento Legal e Ético.
`

    if (activeReg) {
      let content = activeReg.getString('content')
      // Se já tiver a seção Termos e Elegibilidade, não duplica
      if (!content.includes('Termos e Elegibilidade')) {
        // Encontra onde inserir ou insere após a seção ## 3
        if (content.includes('## 4. Como indicar')) {
          // Renumera as seções seguintes para acomodar a nova seção 4 ou adapta
          // O usuário pediu: "a numeração pode se adaptar à estrutura existente do documento; a seção deve chamar-se "Termos e Elegibilidade" e os itens, listados assim, para que ao aceitar o regulamento o participante aceite todos"
          // Inserimos a seção 4 e reajustamos os títulos subsequentes
          content = content.replace(
            '## 4. Como indicar',
            `## 4. Termos e Elegibilidade\n\nDeclaro ter 18 anos ou mais.\nLi e concordo com os Termos de Uso da Plataforma.\nLi e concordo com a Política de Privacidade (LGPD).\nDeclaro sob as penas da lei a Ausência de Impedimento Legal e Ético.\n\n## 5. Como indicar`,
          )
          content = content.replace(
            '## 5. Quando a indicação é válida',
            '## 6. Quando a indicação é válida',
          )
          content = content.replace('## 6. Recompensas', '## 7. Recompensas')
          content = content.replace('## 7. Pagamento', '## 8. Pagamento')
          content = content.replace(
            '## 8. O que o indicador nunca pode fazer',
            '## 9. O que o indicador nunca pode fazer',
          )
          content = content.replace('## 9. Fraude', '## 10. Fraude')
          content = content.replace('## 10. Acompanhamento', '## 11. Acompanhamento')
          content = content.replace('## 11. Dados pessoais', '## 12. Dados pessoais')
          content = content.replace(
            '## 12. Alterações e encerramento',
            '## 13. Alterações e encerramento',
          )
          content = content.replace('## 13. Foro', '## 14. Foro')
        } else {
          content = content + declaracoesText
        }

        activeReg.set('content', content)
        activeReg.set('is_provisional', true)
        app.save(activeReg)
      }
    }
  },
  (app) => {
    // Reverter não precisa de ação destrutiva se for idempotent
  },
)
