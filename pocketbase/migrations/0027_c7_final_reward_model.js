/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar campos select de milestone em reward_rules e rewards
    try {
      const rewardRulesCol = app.findCollectionByNameOrId('reward_rules')
      const mField = rewardRulesCol.fields.getByName('milestone')
      if (mField && mField.values) {
        if (!mField.values.includes('declinada_pela_godoy')) {
          mField.values.push('declinada_pela_godoy')
        }
        if (!mField.values.includes('primeira_visita_realizada')) {
          mField.values.push('primeira_visita_realizada')
        }
        app.save(rewardRulesCol)
      }
    } catch (err) {
      console.warn('[migration 0027] Erro ao atualizar milestone em reward_rules:', err)
    }

    try {
      const rewardsCol = app.findCollectionByNameOrId('rewards')
      const rmField = rewardsCol.fields.getByName('milestone')
      if (rmField && rmField.values) {
        if (!rmField.values.includes('declinada_pela_godoy')) {
          rmField.values.push('declinada_pela_godoy')
        }
        if (!rmField.values.includes('primeira_visita_realizada')) {
          rmField.values.push('primeira_visita_realizada')
        }
        app.save(rewardsCol)
      }
    } catch (err) {
      console.warn('[migration 0027] Erro ao atualizar milestone em rewards:', err)
    }

    // 2. Atualizar collection referrals: adicionar campos de primeira visita e capacidade financeira
    try {
      const referralsCol = app.findCollectionByNameOrId('referrals')
      const statusField = referralsCol.fields.getByName('status')
      if (statusField && statusField.values) {
        if (!statusField.values.includes('primeira_visita_realizada')) {
          statusField.values.push('primeira_visita_realizada')
        }
      }
      if (!referralsCol.fields.getByName('primeira_visita_at')) {
        referralsCol.fields.add(new DateField({ name: 'primeira_visita_at' }))
      }
      if (!referralsCol.fields.getByName('capacidade_financeira_demonstrada')) {
        referralsCol.fields.add(new BoolField({ name: 'capacidade_financeira_demonstrada' }))
      }
      if (!referralsCol.fields.getByName('tipo_comprovacao_financeira')) {
        referralsCol.fields.add(new TextField({ name: 'tipo_comprovacao_financeira' }))
      }
      if (!referralsCol.fields.getByName('descricao_comprovacao_financeira')) {
        referralsCol.fields.add(new TextField({ name: 'descricao_comprovacao_financeira' }))
      }
      app.save(referralsCol)
    } catch (err) {
      console.warn('[migration 0027] Erro ao atualizar referrals:', err)
    }

    // 3. Item 1: Desativar e marcar como obsoletas (sem apagar) regras antigas:
    // fechamento, tabela_faixas, teto de comissão, bônus por volume, inquilino e benefício por indicar indicador
    try {
      app
        .db()
        .newQuery(
          `UPDATE reward_rules
           SET active = 0,
               notes = CASE 
                 WHEN notes IS NULL OR notes = '' THEN '[OBSOLETA - C7] Desativada: novo modelo de recompensa final pela informacao.'
                 ELSE notes || ' | [OBSOLETA - C7] Desativada: novo modelo de recompensa final pela informacao.'
               END
           WHERE milestone = 'fechamento'
              OR reward_type = 'tabela_faixas'
              OR referral_type = 'inquilino'
              OR cap_pct_of_commission > 0
              OR name LIKE '%Fechamento%'
              OR name LIKE '%Inquilino%'
              OR name LIKE '%Faixas%'
              OR name LIKE '%Volume%'
              OR name LIKE '%Bonus%'
              OR name LIKE '%Indicar%'`,
        )
        .execute()
    } catch (err) {
      console.warn('[migration 0027] Erro ao desativar regras antigas:', err)
    }

    // 4. Item 6: Catálogo de parceiros: desativar consultoria_laudos_periciais
    // e garantir que nenhum benefício mencione laudo, perícia, perito ou tribunal
    try {
      app
        .db()
        .newQuery(
          `UPDATE benefit_catalog
           SET is_active = 0,
               title = 'Consultoria Notarial e Apoio Tecnico Documental',
               description = 'Apoio tecnico de engenharia e suporte em diligencias documentais imobiliarias de alto padrao.',
               category = 'Suporte Tecnico & Documental'
           WHERE slug = 'consultoria_laudos_periciais'`,
        )
        .execute()

      app
        .db()
        .newQuery(
          `UPDATE benefit_catalog
           SET is_active = 0
           WHERE title LIKE '%laudo%'
              OR title LIKE '%peric%'
              OR title LIKE '%perit%'
              OR title LIKE '%tribunal%'
              OR description LIKE '%laudo%'
              OR description LIKE '%peric%'
              OR description LIKE '%perit%'
              OR description LIKE '%tribunal%'`,
        )
        .execute()
    } catch (err) {
      console.warn('[migration 0027] Erro ao desativar beneficios periciais:', err)
    }

    // 5. Item 4 & 5: Configurações em program_settings
    const setOrUpdateSetting = (key, valJson, desc) => {
      try {
        const exist = app.findFirstRecordByData('program_settings', 'key', key)
        exist.set('value_json', JSON.stringify(valJson))
        if (desc) exist.set('description', desc)
        app.save(exist)
      } catch (_) {
        try {
          const col = app.findCollectionByNameOrId('program_settings')
          const rec = new Record(col)
          rec.set('key', key)
          rec.set('value_json', JSON.stringify(valJson))
          if (desc) rec.set('description', desc)
          app.save(rec)
        } catch (e2) {
          console.warn(`[migration 0027] Erro ao salvar setting ${key}:`, e2)
        }
      }
    }

    // - Teto de 8 recompensas pagas por participante por ano civil
    setOrUpdateSetting(
      'annual_reward_cap_per_participant',
      8,
      'Teto de 8 recompensas por participante por ano civil. A partir da 9a fica em revisao do admin',
    )
    // - Validade da indicacao: 90 dias
    setOrUpdateSetting(
      'referral_validity_days',
      90,
      'Validade da indicacao: 90 dias a partir do registro para chegar ao marco',
    )
    setOrUpdateSetting(
      'capture_attribution_window_days',
      90,
      'Janela de atribuicao da captacao: 90 dias',
    )
    // - Prazo de pagamento: ate 10 dias depois do marco
    setOrUpdateSetting(
      'payment_deadline_days_after_milestone',
      10,
      'Prazo de pagamento: ate 10 dias depois do marco (lote mensal apenas agrupa pagamentos)',
    )
    // - Retencao: 6 meses (e nao 24)
    setOrUpdateSetting(
      'retention_before_anonymization_months',
      6,
      'Retencao: indicacoes que nao chegam ao marco sao anonimizadas em 6 meses (LGPD)',
    )
    // - Pagamento so por Pix da Godoy Prime Realty PJ com recibo
    setOrUpdateSetting(
      'payment_disbursement_rules',
      {
        method: 'pix',
        payer: 'Godoy Prime Realty PJ',
        destination: 'chave Pix do proprio participante com recibo',
        notes: 'Pagamento exclusivamente por Pix da pessoa juridica para a chave do titular',
      },
      'Regras de desembolso: Pix da Godoy Prime Realty PJ para chave do proprio participante',
    )
    // - Desativar bonus por volume
    setOrUpdateSetting(
      'community_volume_bonus',
      { enabled: false, reason: 'Desativado no modelo de recompensa final C7' },
      'Bonus por volume: desativado no C7',
    )
    // - Item 5: clube_beneficios_url vazia por padrao
    setOrUpdateSetting(
      'clube_beneficios_url',
      '',
      'URL do Clube de beneficios Godoy Prime exibido no painel de participantes ativos',
    )

    // 6. Item 2: Novas regras de recompensa para todas as categorias que recebem dinheiro
    // - Proprietario de venda: R$ 100 nos marcos captada ou declinada_pela_godoy
    // - Proprietario de locacao: R$ 100 nos mesmos marcos
    // - Comprador: R$ 500 no marco primeira_visita_realizada (capacidade comprovada)
    // - Inquilino: nenhuma recompensa
    // - entidade_condominial: NUNCA recebe dinheiro
    // - Toda regra nova nasce com released_for_use = false
    const allCategories = app.findRecordsByFilter('participant_categories', 'id != ""', '', 50, 0)
    const rulesCol = app.findCollectionByNameOrId('reward_rules')

    const createRuleIfNotExist = (ruleDef) => {
      try {
        const exist = app.findRecordsByFilter(
          'reward_rules',
          'category_id = {:cat} && referral_type = {:rt} && milestone = {:m} && name = {:n}',
          '',
          1,
          0,
          {
            cat: ruleDef.category_id,
            rt: ruleDef.referral_type,
            m: ruleDef.milestone,
            n: ruleDef.name,
          },
        )
        if (exist && exist.length > 0) {
          return
        }

        const r = new Record(rulesCol)
        r.set('name', ruleDef.name)
        r.set('version', 1)
        r.set('category_id', ruleDef.category_id)
        r.set('referral_type', ruleDef.referral_type)
        r.set('milestone', ruleDef.milestone)
        r.set('beneficiary_type', 'indicador')
        r.set('reward_type', 'valor_fixo')
        r.set('fixed_amount_brl', ruleDef.fixed_amount_brl)
        r.set('active', true)
        r.set('released_for_use', false) // TODA regra nova nasce bloqueada ate o admin liberar
        r.set('valid_from', '2026-01-01 00:00:00.000Z')
        r.set('notes', ruleDef.notes || 'Regra C7: paga-se pela informacao, nunca pela venda.')
        app.save(r)
      } catch (err) {
        console.warn(`[migration 0027] Erro ao criar regra ${ruleDef.name}:`, err)
      }
    }

    for (let i = 0; i < allCategories.length; i++) {
      const cat = allCategories[i]
      const slug = cat.getString('slug')
      const catName = cat.getString('name')

      // entidade_condominial: NUNCA recebe dinheiro
      if (slug === 'entidade_condominial') continue

      // 1. Proprietário Venda - R$ 100 marco captada
      createRuleIfNotExist({
        name: `${catName} - Proprietário Venda (Captação)`,
        category_id: cat.id,
        referral_type: 'proprietario_venda',
        milestone: 'captada',
        fixed_amount_brl: 100,
        notes: 'R$ 100 pela informação de captação de venda. Liberada apenas pelo admin.',
      })

      // 2. Proprietário Venda - R$ 100 marco declinada_pela_godoy
      createRuleIfNotExist({
        name: `${catName} - Proprietário Venda (Declinada pela Godoy)`,
        category_id: cat.id,
        referral_type: 'proprietario_venda',
        milestone: 'declinada_pela_godoy',
        fixed_amount_brl: 100,
        notes:
          'R$ 100 de reconhecimento mesmo que a Godoy decida não captar. Liberada apenas pelo admin.',
      })

      // 3. Proprietário Locação - R$ 100 marco captada
      createRuleIfNotExist({
        name: `${catName} - Proprietário Locação (Captação)`,
        category_id: cat.id,
        referral_type: 'proprietario_locacao',
        milestone: 'captada',
        fixed_amount_brl: 100,
        notes: 'R$ 100 pela informação de captação de locação. Liberada apenas pelo admin.',
      })

      // 4. Proprietário Locação - R$ 100 marco declinada_pela_godoy
      createRuleIfNotExist({
        name: `${catName} - Proprietário Locação (Declinada pela Godoy)`,
        category_id: cat.id,
        referral_type: 'proprietario_locacao',
        milestone: 'declinada_pela_godoy',
        fixed_amount_brl: 100,
        notes:
          'R$ 100 de reconhecimento mesmo que a Godoy decida não captar locação. Liberada apenas pelo admin.',
      })

      // 5. Comprador - R$ 500 no marco primeira_visita_realizada
      createRuleIfNotExist({
        name: `${catName} - Comprador (Primeira Visita Realizada)`,
        category_id: cat.id,
        referral_type: 'comprador',
        milestone: 'primeira_visita_realizada',
        fixed_amount_brl: 500,
        notes:
          'R$ 500 na primeira visita realizada com capacidade financeira comprovada. Liberada apenas pelo admin.',
      })
    }
  },
  (app) => {
    // down logic
  },
)
