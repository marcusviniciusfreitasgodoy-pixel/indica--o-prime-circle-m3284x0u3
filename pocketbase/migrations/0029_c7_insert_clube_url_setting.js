/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const now = new Date().toISOString()
      app
        .db()
        .newQuery(
          `INSERT OR REPLACE INTO program_settings (id, key, value_json, description, created, updated)
           VALUES ('ps_clube_benef', 'clube_beneficios_url', '""', 'URL do Clube de beneficios Godoy Prime exibido no painel de participantes ativos', {:now}, {:now})`,
        )
        .bind({ now })
        .execute()
    } catch (err) {
      console.warn('[migration 0029] Erro ao inserir clube_beneficios_url via raw query:', err)
    }
  },
  (app) => {
    // down logic
  },
)
