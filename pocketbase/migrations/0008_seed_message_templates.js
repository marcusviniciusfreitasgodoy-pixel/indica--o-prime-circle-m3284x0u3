migrate(
  (app) => {
    const templatesCol = app.findCollectionByNameOrId('message_templates')

    const seeds = [
      // 1. indicacao_recebida_indicador
      {
        event_code: 'indicacao_recebida_indicador',
        channel: 'email',
        audience: 'participante',
        subject: 'Sua indicação foi recebida com sucesso — Godoy Prime',
        body: 'Olá, {{nome}}!\n\nRecebemos a sua indicação (protocolo: {{protocolo}}). Nossa equipe já iniciou a triagem operacional.\n\nVocê pode acompanhar todo o andamento em tempo real através do link:\n{{link}}\n\nAgradecemos pela sua confiança e parceria.\n\nAtenciosamente,\nEquipe Godoy Prime Imóveis',
        active: true,
      },
      {
        event_code: 'indicacao_recebida_indicador',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! Sua indicação com protocolo {{2}} foi recebida com sucesso e está em análise. Acompanhe as etapas pelo link oficial.',
        active: true,
        meta_template_name: 'indicacao_recebida_indicador',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'protocolo'],
        button_url_param: 'link',
      },

      // 2. indicacao_recebida_indicado (Pessoa indicada - WhatsApp com protocolo e nome de quem indicou)
      {
        event_code: 'indicacao_recebida_indicado',
        channel: 'whatsapp',
        audience: 'proprietario',
        subject: '',
        body: 'Olá, {{1}}! Você foi indicado(a) por {{2}} para conhecer os serviços exclusivos de assessoria imobiliária da Godoy Prime na Barra da Tijuca e Recreio (Protocolo: {{3}}). Em breve um de nossos consultores fará contato.',
        active: true,
        meta_template_name: 'indicacao_recebida_indicado',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'nome_indicador', 'protocolo'],
        button_url_param: 'link',
      },

      // 3. indicacao_recebida_equipe (Equipe - e-mail ao responsável)
      {
        event_code: 'indicacao_recebida_equipe',
        channel: 'email',
        audience: 'equipe',
        subject: '[Nova Indicação] Protocolo {{protocolo}} aguardando triagem',
        body: 'Olá, equipe!\n\nUma nova indicação foi registrada na plataforma.\n\nProtocolo: {{protocolo}}\nTipo: {{tipo}}\nIndicador: {{nome_indicador}}\n\nAcesse a esteira de triagem interna para analisar e dar andamento:\n{{link}}\n\nGodoy Prime Indica',
        active: true,
      },

      // 4. em_analise (WhatsApp)
      {
        event_code: 'em_analise',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! Sua indicação (Protocolo: {{2}}) avançou para a etapa "Em análise". Nossa equipe está validando a viabilidade do atendimento.',
        active: true,
        meta_template_name: 'etapa_em_analise',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'protocolo'],
        button_url_param: 'link',
      },

      // 5. em_contato (WhatsApp)
      {
        event_code: 'em_contato',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! Sua indicação (Protocolo: {{2}}) está agora "Em contato". Nosso consultor responsável iniciou a abordagem com o cliente.',
        active: true,
        meta_template_name: 'etapa_em_contato',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'protocolo'],
        button_url_param: 'link',
      },

      // 6. captado (WhatsApp e e-mail)
      {
        event_code: 'captado',
        channel: 'email',
        audience: 'participante',
        subject: 'Excelente notícia! Sua indicação foi captada — Godoy Prime',
        body: 'Olá, {{nome}}!\n\nTemos o prazer de informar que o imóvel referente à sua indicação (protocolo: {{protocolo}}) foi formalmente captado por nossa equipe com documentação autorizada.\n\nO próximo passo é a preparação do material e início da divulgação.\n\nAcompanhe os detalhes:\n{{link}}\n\nAtenciosamente,\nGodoy Prime Imóveis',
        active: true,
      },
      {
        event_code: 'captado',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Boas notícias, {{1}}! O imóvel da sua indicação (Protocolo: {{2}}) foi formalmente captado com autorização. Estamos preparando a divulgação.',
        active: true,
        meta_template_name: 'etapa_captado',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'protocolo'],
        button_url_param: 'link',
      },

      // 7. em_divulgacao (WhatsApp com link do anúncio e botão de compartilhar)
      {
        event_code: 'em_divulgacao',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! O imóvel que você indicou (Protocolo: {{2}}) já está em divulgação em nossos canais oficiais! Veja o anúncio e compartilhe com sua rede pelo link abaixo.',
        active: true,
        meta_template_name: 'etapa_em_divulgacao',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'protocolo'],
        button_url_param: 'link_anuncio',
      },

      // 8. visitando_imoveis_proposta (WhatsApp)
      {
        event_code: 'visitando_imoveis_proposta',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! A indicação de cliente comprador (Protocolo: {{2}}) está evoluindo: chegamos à etapa de visitas e propostas comerciais.',
        active: true,
        meta_template_name: 'etapa_visita_proposta',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'protocolo'],
        button_url_param: 'link',
      },

      // 9. negocio_concluido (Vendido / Alugado / Comprou: WhatsApp, e-mail participante e e-mail ao financeiro)
      {
        event_code: 'negocio_concluido',
        channel: 'email',
        audience: 'participante',
        subject: 'Parabéns! Negócio fechado referente à sua indicação — Godoy Prime',
        body: 'Parabéns, {{nome}}!\n\nO negócio referente à sua indicação (protocolo: {{protocolo}}, etapa: {{etapa}}) foi fechado com sucesso!\n\nNossa equipe financeira já está realizando a apuração da sua comissão/premiação conforme as regras do programa.\n\nConfira os detalhes no seu painel:\n{{link}}\n\nAtenciosamente,\nGodoy Prime Imóveis',
        active: true,
      },
      {
        event_code: 'negocio_concluido',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Parabéns, {{1}}! O negócio da sua indicação (Protocolo: {{2}}) foi fechado com sucesso ({{3}})! Sua premiação está em apuração pela equipe financeira.',
        active: true,
        meta_template_name: 'etapa_negocio_fechado',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'protocolo', 'etapa'],
        button_url_param: 'link',
      },
      {
        event_code: 'negocio_concluido_financeiro',
        channel: 'email',
        audience: 'financeiro',
        subject: '[Alerta Financeiro] Negócio fechado para apuração de premiação',
        body: 'Atenção, setor financeiro!\n\nFoi registrado o fechamento de negócio para a indicação {{protocolo}}.\n\nValor: R$ {{valor_brl}}\nData do Fechamento: {{data_negocio}}\nIndicador: {{nome_indicador}} (PIX: {{chave_pix}})\n\nAcesse o módulo financeiro para conferência do rateio:\n{{link}}\n\nPrime Circle Indica',
        active: true,
      },

      // 10. nao_aproveitada (WhatsApp com motivo resumido)
      {
        event_code: 'nao_aproveitada',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! Informamos que a sua indicação (Protocolo: {{2}}) não pôde ser aproveitada neste momento pelo seguinte motivo: {{3}}. Agradecemos sua iniciativa e contamos com novas indicações!',
        active: true,
        meta_template_name: 'etapa_nao_aproveitada',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'protocolo', 'motivo'],
        button_url_param: 'link',
      },

      // 11. atribuicao_pendente_operador (e-mail ao operador)
      {
        event_code: 'atribuicao_pendente_operador',
        channel: 'email',
        audience: 'equipe',
        subject: '[Ação Necessária] Indicação com atribuição pendente por indício',
        body: 'Olá, operador!\n\nUma indicação (protocolo: {{protocolo}}) foi submetida com indício de autorização/indicação pendente ("Alguém indicou você?").\n\nDetalhe do indício: {{indicio}}\n\nPor favor, acesse a triagem para confirmar ou recusar a atribuição:\n{{link}}\n\nGodoy Prime Indica',
        active: true,
      },

      // 12. recompensa_aprovada (WhatsApp e e-mail com data prevista)
      {
        event_code: 'recompensa_aprovada',
        channel: 'email',
        audience: 'participante',
        subject: 'Sua premiação foi aprovada! — Godoy Prime',
        body: 'Olá, {{nome}}!\n\nSua premiação referente à indicação {{protocolo}} no valor de R$ {{valor_premio}} foi devidamente aprovada pela nossa diretoria.\n\nData prevista para liquidação via PIX: {{data_prevista}}.\n\nConfira os dados bancários/PIX no seu perfil:\n{{link}}\n\nAtenciosamente,\nGodoy Prime Imóveis',
        active: true,
      },
      {
        event_code: 'recompensa_aprovada',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! Sua premiação de R$ {{2}} (Protocolo: {{3}}) foi aprovada! A previsão de pagamento via PIX é no dia {{4}}.',
        active: true,
        meta_template_name: 'recompensa_aprovada',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'valor_premio', 'protocolo', 'data_prevista'],
        button_url_param: 'link',
      },

      // 13. recompensa_paga (WhatsApp e e-mail)
      {
        event_code: 'recompensa_paga',
        channel: 'email',
        audience: 'participante',
        subject: 'Pagamento de premiação realizado via PIX — Godoy Prime',
        body: 'Olá, {{nome}}!\n\nO pagamento da sua premiação no valor de R$ {{valor_premio}} referente à indicação {{protocolo}} foi liquidado com sucesso na sua chave PIX cadastrada.\n\nComprovante e recibo disponíveis no painel:\n{{link}}\n\nObrigado pela sua valiosa parceria!\n\nAtenciosamente,\nGodoy Prime Imóveis',
        active: true,
      },
      {
        event_code: 'recompensa_paga',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Tudo pronto, {{1}}! O pagamento da sua premiação de R$ {{2}} referente ao protocolo {{3}} foi realizado via PIX. Confira o comprovante no painel.',
        active: true,
        meta_template_name: 'recompensa_paga',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'valor_premio', 'protocolo'],
        button_url_param: 'link',
      },

      // 14. cadastro_aprovado (WhatsApp e e-mail)
      {
        event_code: 'cadastro_aprovado',
        channel: 'email',
        audience: 'participante',
        subject: 'Bem-vindo(a) ao Godoy Prime Indica! Seu cadastro foi aprovado',
        body: 'Olá, {{nome}}!\n\nSeu cadastro no programa de indicações da Godoy Prime foi aprovado com sucesso!\n\nAgora você tem acesso ao seu painel exclusivo, ao seu link personalizado e QR Code para começar a indicar clientes e proprietários.\n\nAcesse agora:\n{{link}}\n\nBoas indicações!\n\nEquipe Godoy Prime Imóveis',
        active: true,
      },
      {
        event_code: 'cadastro_aprovado',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! Seu cadastro no Godoy Prime Indica foi aprovado! Seu link exclusivo e QR Code já estão disponíveis no seu painel para começar a indicar.',
        active: true,
        meta_template_name: 'cadastro_aprovado',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome'],
        button_url_param: 'link',
      },

      // 15. cadastro_suspenso (WhatsApp e e-mail)
      {
        event_code: 'cadastro_suspenso',
        channel: 'email',
        audience: 'participante',
        subject: 'Aviso importante sobre sua conta — Godoy Prime Indica',
        body: 'Prezado(a) {{nome}},\n\nInformamos que seu acesso ao programa de indicações Godoy Prime Indica encontra-se temporariamente suspenso.\n\nMotivo informado: {{motivo}}\n\nCaso tenha dúvidas ou queira solicitar revisão, favor responder a este e-mail ou contatar a nossa ouvidoria:\n{{link}}\n\nAtenciosamente,\nGodoy Prime Imóveis',
        active: true,
      },
      {
        event_code: 'cadastro_suspenso',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}. Informamos que sua conta no Godoy Prime Indica foi temporariamente suspensa pelo motivo: {{2}}. Para mais detalhes, consulte seu e-mail cadastrado.',
        active: true,
        meta_template_name: 'cadastro_suspenso',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'motivo'],
        button_url_param: 'link',
      },

      // 16. indicacao_parada_responsavel (WhatsApp e e-mail ao responsável)
      {
        event_code: 'indicacao_parada_responsavel',
        channel: 'email',
        audience: 'equipe',
        subject: '[Alerta de SLA] Indicação {{protocolo}} sem movimentação há mais de {{dias}} dias',
        body: 'Atenção, consultor responsável!\n\nA indicação {{protocolo}} (etapa: {{etapa}}) ultrapassou o tempo limite de SLA estabelecido sem novas interações ({{dias}} dias sem movimentação).\n\nPor favor, atualize o status ou registre uma nova tentativa de contato imediatamente:\n{{link}}\n\nPrime Circle Indica',
        active: true,
      },
      {
        event_code: 'indicacao_parada_responsavel',
        channel: 'whatsapp',
        audience: 'equipe',
        subject: '',
        body: 'Alerta operacional: a indicação {{1}} sob sua responsabilidade está parada na etapa {{2}} há {{3}} dias. Acesse o sistema para atualizar.',
        active: true,
        meta_template_name: 'alerta_indicacao_parada',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['protocolo', 'etapa', 'dias'],
        button_url_param: 'link',
      },

      // 17. ativacao_passo_0 (Marketing)
      {
        event_code: 'ativacao_passo_0',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! Bem-vindo(a) ao Godoy Prime Indica. Sabia que você já pode compartilhar seu link exclusivo com síndicos, vizinhos e porteiros da Barra e Recreio? Acesse seu painel e confira.',
        active: true,
        meta_template_name: 'ativacao_passo_0',
        meta_language: 'pt_BR',
        meta_category: 'marketing',
        meta_status: 'pending',
        meta_params: ['nome'],
        button_url_param: 'link',
      },

      // 18. ativacao_passo_3 (Marketing)
      {
        event_code: 'ativacao_passo_3',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! Como vão os negócios? Lembra de alguém no seu condomínio querendo vender ou alugar um imóvel? Envie uma indicação em menos de 1 minuto pelo seu link.',
        active: true,
        meta_template_name: 'ativacao_passo_3',
        meta_language: 'pt_BR',
        meta_category: 'marketing',
        meta_status: 'pending',
        meta_params: ['nome'],
        button_url_param: 'link',
      },

      // 19. ativacao_passo_10 (Marketing)
      {
        event_code: 'ativacao_passo_10',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! A Godoy Prime preparou dicas exclusivas para aumentar suas chances de premiação nas captações na Barra da Tijuca e Recreio. Veja como compartilhar sua vitrine pública.',
        active: true,
        meta_template_name: 'ativacao_passo_10',
        meta_language: 'pt_BR',
        meta_category: 'marketing',
        meta_status: 'pending',
        meta_params: ['nome'],
        button_url_param: 'link',
      },

      // 20. ativacao_passo_30 (Marketing)
      {
        event_code: 'ativacao_passo_30',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! Completamos 30 dias de parceria no Godoy Prime Indica! Queremos saber como podemos apoiar você e seu condomínio. Acesse seu painel e confira as novidades do mês.',
        active: true,
        meta_template_name: 'ativacao_passo_30',
        meta_language: 'pt_BR',
        meta_category: 'marketing',
        meta_status: 'pending',
        meta_params: ['nome'],
        button_url_param: 'link',
      },

      // 21. lote_mensal_montado (e-mail ao financeiro)
      {
        event_code: 'lote_mensal_montado',
        channel: 'email',
        audience: 'financeiro',
        subject: '[Fechamento Mensal] Lote de premiações apurado para o dia 25',
        body: 'Prezado setor financeiro,\n\nO lote mensal de premiações do Prime Circle Indica foi consolidado para processamento.\n\nTotal de participantes no lote: {{total_participantes}}\nValor total apurado: R$ {{valor_total}}\nData de corte: Dia 10 | Pagamento programado: Dia 25\n\nAcesse o módulo financeiro para conferência das chaves PIX e liberação dos repasses:\n{{link}}\n\nGodoy Prime Imóveis',
        active: true,
      },

      // 22. parceiro_mudou_nivel (WhatsApp, e-mail participante e e-mail ao admin)
      {
        event_code: 'parceiro_mudou_nivel',
        channel: 'email',
        audience: 'participante',
        subject: 'Parabéns! Você alcançou um novo nível no Prime Circle — Godoy Prime',
        body: 'Parabéns, {{nome}}!\n\nReconhecendo o seu excelente desempenho e volume de indicações de sucesso, você foi promovido(a) para o nível {{novo_nivel}} do programa Prime Circle!\n\nAgora você conta com premiação diferenciada de {{percentual}}% e benefícios exclusivos.\n\nConfira seus novos benefícios:\n{{link}}\n\nMuito obrigado por fazer parte da nossa história!\n\nGodoy Prime Imóveis',
        active: true,
      },
      {
        event_code: 'parceiro_mudou_nivel',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Parabéns, {{1}}! Você subiu de categoria no Prime Circle: agora você é {{2}} com premiação de {{3}}%. Acesse o painel e celebre essa conquista!',
        active: true,
        meta_template_name: 'parceiro_mudou_nivel',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'novo_nivel', 'percentual'],
        button_url_param: 'link',
      },
      {
        event_code: 'parceiro_mudou_nivel_admin',
        channel: 'email',
        audience: 'equipe',
        subject: '[Upgrade de Parceiro] {{nome}} atingiu o nível {{novo_nivel}}',
        body: 'Prezados administradores,\n\nO participante parceiro {{nome}} atingiu os critérios de evolução e foi promovido ao nível {{novo_nivel}}.\n\nVer detalhes do perfil e histórico:\n{{link}}\n\nPrime Circle Indica',
        active: true,
      },

      // 23. gratificacao_entregue (WhatsApp e e-mail)
      {
        event_code: 'gratificacao_entregue',
        channel: 'email',
        audience: 'participante',
        subject: 'Sua gratificação de reconhecimento foi entregue — Godoy Prime',
        body: 'Olá, {{nome}}!\n\nConfirmamos a entrega da sua gratificação especial de reconhecimento: {{descricao_gratificacao}}.\n\nÉ uma honra contar com você na família Prime Circle.\n\nDetalhes no seu painel:\n{{link}}\n\nUm grande abraço,\nGodoy Prime Imóveis',
        active: true,
      },
      {
        event_code: 'gratificacao_entregue',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! Confirmamos a entrega da sua gratificação: {{2}}. Obrigado pela sua dedicação e parceria com a Godoy Prime!',
        active: true,
        meta_template_name: 'gratificacao_entregue',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'descricao_gratificacao'],
        button_url_param: 'link',
      },

      // 24. godoy_enviou_indicacao (WhatsApp)
      {
        event_code: 'godoy_enviou_indicacao',
        channel: 'whatsapp',
        audience: 'participante',
        subject: '',
        body: 'Olá, {{1}}! A Godoy Prime acaba de encaminhar uma indicação de oportunidade imobiliária para você: {{2}}. Acesse seu painel para ver todos os detalhes do contato.',
        active: true,
        meta_template_name: 'godoy_enviou_indicacao',
        meta_language: 'pt_BR',
        meta_category: 'utility',
        meta_status: 'pending',
        meta_params: ['nome', 'resumo'],
        button_url_param: 'link',
      },
    ]

    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i]
      try {
        // Idempotent check
        const existing = app.findFirstRecordByFilter(
          'message_templates',
          `event_code = '${s.event_code}' && channel = '${s.channel}' && audience = '${s.audience}'`,
        )
        if (existing) continue
      } catch (_) {}

      const rec = new Record(templatesCol)
      rec.set('event_code', s.event_code)
      rec.set('channel', s.channel)
      rec.set('audience', s.audience)
      rec.set('subject', s.subject || '')
      rec.set('body', s.body)
      rec.set('active', s.active)
      if (s.meta_template_name) rec.set('meta_template_name', s.meta_template_name)
      if (s.meta_language) rec.set('meta_language', s.meta_language)
      if (s.meta_category) rec.set('meta_category', s.meta_category)
      if (s.meta_status) rec.set('meta_status', s.meta_status)
      if (s.meta_params) rec.set('meta_params', JSON.stringify(s.meta_params))
      if (s.button_url_param) rec.set('button_url_param', s.button_url_param)

      app.save(rec)
    }
  },
  (app) => {
    // Revert seeds if rolled back
  },
)
