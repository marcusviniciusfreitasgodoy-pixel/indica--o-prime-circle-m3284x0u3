migrate(
  (app) => {
    // Atualizar o registro com id zz2p549p44yw2s1 diretamente via SQL
    // e também qualquer registro ativo de slug 'regulamento_do_programa'
    const addition = `\\n\\n## 4. Termos e Elegibilidade\\n\\nDeclaro ter 18 anos ou mais.\\nLi e concordo com os Termos de Uso da Plataforma.\\nLi e concordo com a Política de Privacidade (LGPD).\\nDeclaro sob as penas da lei a Ausência de Impedimento Legal e Ético.\\n\\n`

    // Usar query SQL no SQLite do PocketBase
    app
      .db()
      .newQuery(`
      UPDATE legal_documents
      SET content = REPLACE(content, '## 4. Como indicar', '## 4. Termos e Elegibilidade

Declaro ter 18 anos ou mais.
Li e concordo com os Termos de Uso da Plataforma.
Li e concordo com a Política de Privacidade (LGPD).
Declaro sob as penas da lei a Ausência de Impedimento Legal e Ético.

## 5. Como indicar'),
          is_provisional = 1,
          updated = strftime('%Y-%m-%d %H:%M:%f', 'now')
      WHERE slug = 'regulamento_do_programa'
        AND is_active = 1
        AND content NOT LIKE '%Termos e Elegibilidade%'
    `)
      .execute()

    // Atualizar renumeração das seções seguintes
    app
      .db()
      .newQuery(`
      UPDATE legal_documents
      SET content = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            content,
            '## 5. Quando a indicação é válida', '## 6. Quando a indicação é válida'),
            '## 6. Recompensas', '## 7. Recompensas'),
            '## 7. Pagamento', '## 8. Pagamento'),
            '## 8. O que o indicador nunca pode fazer', '## 9. O que o indicador nunca pode fazer'),
            '## 9. Fraude', '## 10. Fraude'),
            '## 10. Acompanhamento', '## 11. Acompanhamento'),
            '## 11. Dados pessoais', '## 12. Dados pessoais'),
            '## 12. Alterações e encerramento', '## 13. Alterações e encerramento'),
            '## 13. Foro', '## 14. Foro')
      WHERE slug = 'regulamento_do_programa'
        AND is_active = 1
        AND content LIKE '%## 4. Termos e Elegibilidade%'
        AND content LIKE '%## 5. Quando a indicação é válida%'
    `)
      .execute()
  },
  (app) => {},
)
