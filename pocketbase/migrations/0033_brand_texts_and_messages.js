migrate(
  (app) => {
    // 1. Atualizar descrições de categorias originadas da migração 0005
    // Removendo "Prime Circle", ajustando vocabulário conforme as regras do programa.
    const categoriesUpdates = [
      {
        slug: 'cliente',
        description:
          'Clientes da Godoy Prime Realty que indicam novos proprietários ou compradores.',
      },
      {
        slug: 'empresa_parceira',
        description:
          'Pessoas jurídicas conveniadas ao programa de indicações da Godoy Prime Realty.',
      },
      {
        slug: 'parceiro_profissional',
        description:
          'Advogados, contadores, arquitetos, decoradores e consultores patrimoniais parceiros.',
      },
      {
        slug: 'corretor_parceiro',
        description:
          'Corretores de imóveis com CRECI ativo cadastrados na rede de repasse e parceria.',
      },
    ]

    categoriesUpdates.forEach((cat) => {
      try {
        const rec = app.findFirstRecordByData('participant_categories', 'slug', cat.slug)
        rec.set('description', cat.description)
        app.save(rec)
      } catch (_) {}
    })

    // 2. Atualizar program_settings originados da migração 0005
    const settingsUpdates = [
      {
        key: 'serviced_neighborhoods',
        description: 'Bairros atendidos prioritariamente pela Godoy Prime Realty',
      },
      {
        key: 'capture_attribution_window_days',
        description: 'Janela de atribuição após autorização assinada com o proprietário',
      },
      {
        key: 'sale_window_from_capture_months',
        description: 'Janela de venda a partir da autorização assinada',
      },
      {
        key: 'known_owner_precedence_days',
        description: 'Precedência de proprietário já conhecido no banco da Godoy Prime Realty',
      },
    ]

    settingsUpdates.forEach((st) => {
      try {
        const rec = app.findFirstRecordByData('program_settings', 'key', st.key)
        rec.set('description', st.description)
        app.save(rec)
      } catch (_) {}
    })

    // 3. Atualizar modelos de mensagem (message_templates)
    // - Trocar "Prime Circle" e "Prime Circle Indica" por "Godoy Prime Realty" ou "Programa de Indicações Godoy Prime".
    // - Nas mensagens para o participante: trocar "captado", "captada" e "captação" por "o proprietário assinou a autorização com a Godoy Prime" (adaptando contexto).
    // - No modelo de evolução de nível (parceiro_mudou_nivel):
    //   remover "excelente desempenho e volume de indicações".
    //   Texto exato: "Você passou para o nível {{2}} do programa de parceiros."
    // - Nas mensagens de negócio concluído para o participante: NÃO mencionar recompensa, valor nem prêmio.
    // - Manter variáveis {{...}} e meta_params como estão.
    // - Todos os modelos de WhatsApp alterados voltam para meta_status = "pending".

    const templateUpdates = [
      // 1. indicacao_recebida_indicado (WhatsApp)
      {
        event_code: 'indicacao_recebida_indicado',
        channel: 'whatsapp',
        audience: 'proprietario',
        body: 'Olá, {{1}}! Você foi indicado(a) por {{2}} para conhecer os serviços exclusivos de assessoria imobiliária da Godoy Prime Realty na Barra da Tijuca e Recreio (Protocolo: {{3}}). Em breve nossa equipe fará contato.',
        meta_status: 'pending',
      },

      // 2. indicacao_recebida_equipe (Email)
      {
        event_code: 'indicacao_recebida_equipe',
        channel: 'email',
        audience: 'equipe',
        body: 'Olá, equipe!\n\nUma nova indicação foi registrada na plataforma.\n\nProtocolo: {{protocolo}}\nTipo: {{tipo}}\nIndicador: {{nome_indicador}}\n\nAcesse a esteira de triagem interna para analisar e dar andamento:\n{{link}}\n\nPrograma de Indicações Godoy Prime',
      },

      // 3. captado (Email participante)
      {
        event_code: 'captado',
        channel: 'email',
        audience: 'participante',
        subject:
          'Excelente notícia! Autorização assinada referente à sua indicação — Godoy Prime Realty',
        body: 'Olá, {{nome}}!\n\nTemos o prazer de informar que, referente à sua indicação (protocolo: {{protocolo}}), o proprietário assinou a autorização com a Godoy Prime.\n\nO próximo passo é a preparação do material e início da divulgação.\n\nAcompanhe os detalhes:\n{{link}}\n\nAtenciosamente,\nEquipe Godoy Prime Realty',
      },

      // 4. captado (WhatsApp participante)
      {
        event_code: 'captado',
        channel: 'whatsapp',
        audience: 'participante',
        body: 'Boas notícias, {{1}}! Referente à sua indicação (Protocolo: {{2}}), o proprietário assinou a autorização com a Godoy Prime. Estamos preparando a divulgação.',
        meta_status: 'pending',
      },

      // 5. negocio_concluido (Email participante) - NÃO mencionar recompensa, valor nem prêmio
      {
        event_code: 'negocio_concluido',
        channel: 'email',
        audience: 'participante',
        subject: 'Parabéns! Negócio fechado referente à sua indicação — Godoy Prime Realty',
        body: 'Parabéns, {{nome}}!\n\nO negócio referente à sua indicação (protocolo: {{protocolo}}, etapa: {{etapa}}) foi fechado com sucesso!\n\nConfira os detalhes no seu painel:\n{{link}}\n\nAtenciosamente,\nEquipe Godoy Prime Realty',
      },

      // 6. negocio_concluido (WhatsApp participante) - NÃO mencionar recompensa, valor nem prêmio
      {
        event_code: 'negocio_concluido',
        channel: 'whatsapp',
        audience: 'participante',
        body: 'Parabéns, {{1}}! O negócio da sua indicação (Protocolo: {{2}}) foi concluído com sucesso ({{3}})! Acompanhe os detalhes pelo seu painel.',
        meta_status: 'pending',
      },

      // 7. negocio_concluido_financeiro (Email financeiro)
      {
        event_code: 'negocio_concluido_financeiro',
        channel: 'email',
        audience: 'financeiro',
        subject: '[Alerta Financeiro] Negócio fechado para apuração de premiação',
        body: 'Atenção, setor financeiro!\n\nFoi registrado o fechamento de negócio para a indicação {{protocolo}}.\n\nValor: R$ {{valor_brl}}\nData do Fechamento: {{data_negocio}}\nIndicador: {{nome_indicador}} (PIX: {{chave_pix}})\n\nAcesse o módulo financeiro para conferência do rateio:\n{{link}}\n\nPrograma de Indicações Godoy Prime',
      },

      // 8. atribuicao_pendente_operador (Email equipe)
      {
        event_code: 'atribuicao_pendente_operador',
        channel: 'email',
        audience: 'equipe',
        subject: '[Ação Necessária] Indicação com atribuição pendente por indício',
        body: 'Olá, operador!\n\nUma indicação (protocolo: {{protocolo}}) foi submetida com indício de autorização/indicação pendente ("Alguém indicou você?").\n\nDetalhe do indício: {{indicio}}\n\nPor favor, acesse a triagem para confirmar ou recusar a atribuição:\n{{link}}\n\nPrograma de Indicações Godoy Prime',
      },

      // 9. indicacao_parada_responsavel (Email equipe)
      {
        event_code: 'indicacao_parada_responsavel',
        channel: 'email',
        audience: 'equipe',
        subject:
          '[Alerta de SLA] Indicação {{protocolo}} sem movimentação há mais de {{dias}} dias',
        body: 'Atenção, equipe responsável!\n\nA indicação {{protocolo}} (etapa: {{etapa}}) ultrapassou o tempo limite de SLA estabelecido sem novas interações ({{dias}} dias sem movimentação).\n\nPor favor, atualize o status ou registre uma nova tentativa de contato imediatamente:\n{{link}}\n\nPrograma de Indicações Godoy Prime',
      },

      // 10. ativacao_passo_10 (WhatsApp participante) - Dicas da Godoy Prime
      {
        event_code: 'ativacao_passo_10',
        channel: 'whatsapp',
        audience: 'participante',
        body: 'Olá, {{1}}! A Godoy Prime preparou dicas exclusivas para aumentar as chances com proprietários na Barra da Tijuca e Recreio. Veja como compartilhar sua vitrine pública.',
        meta_status: 'pending',
      },

      // 11. lote_mensal_montado (Email financeiro)
      {
        event_code: 'lote_mensal_montado',
        channel: 'email',
        audience: 'financeiro',
        subject: '[Fechamento Mensal] Lote de premiações apurado para o dia 25',
        body: 'Prezado setor financeiro,\n\nO lote mensal de premiações do Programa de Indicações Godoy Prime foi consolidado para processamento.\n\nTotal de participantes no lote: {{total_participantes}}\nValor total apurado: R$ {{valor_total}}\nData de corte: Dia 10 | Pagamento programado: Dia 25\n\nAcesse o módulo financeiro para conferência das chaves PIX e liberação dos repasses:\n{{link}}\n\nGodoy Prime Realty',
      },

      // 12. parceiro_mudou_nivel (Email participante)
      {
        event_code: 'parceiro_mudou_nivel',
        channel: 'email',
        audience: 'participante',
        subject:
          'Parabéns! Você passou para o nível {{novo_nivel}} do programa de parceiros — Godoy Prime Realty',
        body: 'Parabéns, {{nome}}!\n\nVocê passou para o nível {{novo_nivel}} do programa de parceiros da Godoy Prime Realty!\n\nAgora você conta com premiação diferenciada de {{percentual}}% e benefícios exclusivos.\n\nConfira seus novos benefícios:\n{{link}}\n\nMuito obrigado por fazer parte da nossa história!\n\nGodoy Prime Realty',
      },

      // 13. parceiro_mudou_nivel (WhatsApp participante)
      // Texto exato: "Você passou para o nível {{2}} do programa de parceiros."
      {
        event_code: 'parceiro_mudou_nivel',
        channel: 'whatsapp',
        audience: 'participante',
        body: 'Olá, {{1}}! Você passou para o nível {{2}} do programa de parceiros. Acesse o painel para conferir seus novos benefícios.',
        meta_status: 'pending',
      },

      // 14. parceiro_mudou_nivel_admin (Email equipe)
      {
        event_code: 'parceiro_mudou_nivel_admin',
        channel: 'email',
        audience: 'equipe',
        subject: '[Upgrade de Parceiro] {{nome}} atingiu o nível {{novo_nivel}}',
        body: 'Prezados administradores,\n\nO participante parceiro {{nome}} atingiu os critérios de evolução e foi promovido ao nível {{novo_nivel}}.\n\nVer detalhes do perfil e histórico:\n{{link}}\n\nPrograma de Indicações Godoy Prime',
      },

      // 15. gratificacao_entregue (Email participante)
      {
        event_code: 'gratificacao_entregue',
        channel: 'email',
        audience: 'participante',
        subject: 'Sua gratificação de reconhecimento foi entregue — Godoy Prime Realty',
        body: 'Olá, {{nome}}!\n\nConfirmamos a entrega da sua gratificação especial de reconhecimento: {{descricao_gratificacao}}.\n\nÉ uma honra contar com você na Godoy Prime Realty.\n\nDetalhes no seu painel:\n{{link}}\n\nUm grande abraço,\nEquipe Godoy Prime Realty',
      },
    ]

    templateUpdates.forEach((tpl) => {
      try {
        const records = app.findRecordsByFilter(
          'message_templates',
          `event_code = '${tpl.event_code}' && channel = '${tpl.channel}' && audience = '${tpl.audience}'`,
          '',
          1,
          0,
        )
        if (records && records.length > 0) {
          const rec = records[0]
          if (tpl.subject !== undefined) rec.set('subject', tpl.subject)
          if (tpl.body !== undefined) rec.set('body', tpl.body)
          if (tpl.meta_status !== undefined) rec.set('meta_status', tpl.meta_status)
          app.save(rec)
        }
      } catch (err) {
        console.error(
          '[0033_brand_texts_and_messages] Erro ao atualizar template:',
          tpl.event_code,
          err,
        )
      }
    })
  },
  (app) => {
    // Reversão limpa / no-op idempotente
  },
)
