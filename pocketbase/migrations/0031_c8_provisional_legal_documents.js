migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('legal_documents')

    // 1. Ampliar o tamanho máximo do campo content para suportar documentos jurídicos completos
    const contentField = col.fields.getByName('content')
    if (contentField) {
      contentField.max = 100000
    }

    // 2. Adicionar campo is_provisional (bool) caso não exista
    if (!col.fields.getByName('is_provisional')) {
      col.fields.add(
        new BoolField({
          name: 'is_provisional',
          required: false,
        }),
      )
    }

    app.save(col)

    // Textos A, B e C exatos da especificação C8
    const TEXT_A = `# Regulamento do Programa de Indicações Godoy Prime

**Promotora:** Godoy Prime Realty, CNPJ [preencher], CRECI-RJ PJ 11841, com sede em [endereço], Rio de Janeiro, RJ.

## 1. O que é o programa

1.1. O Programa de Indicações Godoy Prime recompensa pessoas convidadas que comunicam à Godoy Prime Realty a existência de alguém interessado em vender, alugar, comprar ou alugar para morar um imóvel na Barra da Tijuca ou no Recreio dos Bandeirantes.

1.2. O indicador apenas comunica uma oportunidade. Toda a atividade de corretagem é feita exclusivamente por corretor de imóveis com CRECI ativo da Godoy Prime: o contato com o indicado, a avaliação, a visita, a negociação, a assinatura de autorizações e contratos e a intermediação.

1.3. A recompensa paga a informação. Ela é fixa, não depende do preço do imóvel nem de comissão, e não depende de venda ou locação acontecer.

1.4. A participação não cria vínculo de emprego, sociedade, representação, mandato ou exclusividade entre o indicador e a Godoy Prime.

## 2. Definições

- **Indicador:** pessoa aprovada no programa que comunica uma oportunidade.
- **Indicado:** pessoa interessada em vender, alugar, comprar ou alugar um imóvel.
- **Link pessoal:** endereço ou QR exclusivo do indicador, pelo qual o próprio indicado se cadastra.
- **Indicação válida:** a que cumpre as condições do item 5.
- **Proprietário qualificado:** proprietário real, contatado pela Godoy Prime, que confirmou o interesse em vender ou alugar.

## 3. Quem pode participar

3.1. Pessoa física maior de 18 anos, com CPF regular e chave Pix em seu próprio nome, que receba convite individual da Godoy Prime, conclua o cadastro, aceite este regulamento e os termos, e seja aprovada.

3.2. A participação se dá por categoria, informada no cadastro e confirmada na aprovação:

| Categoria | Condições adicionais |
|---|---|
| Cliente, morador ou vizinho | Nenhuma |
| Porteiro, zelador e prestador de serviço residencial | Indicação só pelo link pessoal, entregue em mãos ao indicado. Declarações do item 4 do termo de adesão |
| Síndico | Indicação só pelo link pessoal. Comunicação prévia da adesão ao conselho fiscal do condomínio. Declarações do item 4 do termo de adesão |
| Profissional sem CRECI | Contrato próprio de comunicação de oportunidade, com teto anual |
| Condomínio ou associação de moradores | Não recebe recompensa em dinheiro. Pode receber doação de benfeitoria, aprovada em assembleia e sem vínculo com venda, em termo próprio |
| Corretor de imóveis com CRECI ativo | Não participa deste programa. A colaboração se dá por contrato de parceria entre corretores |

3.3. Não podem participar advogados, empregados e corretores da Godoy Prime, nem pessoas que já tenham sido excluídas do programa.

3.4. A Godoy Prime pode recusar ou encerrar cadastros, com aviso ao interessado.

## 4. Como indicar

4.1. **Pelo link pessoal.** É a forma padrão e a única permitida para porteiros, zeladores, prestadores de serviço residencial e síndicos. O indicador entrega o link ou o cartão com QR em mãos. O próprio indicado se cadastra, informa seus dados e autoriza o contato.

4.2. **Pelo painel**, quando a categoria permitir. O indicador informa o nome e o contato do indicado e declara que ele concordou em ser procurado. No primeiro contato, a Godoy Prime informa ao indicado quem o indicou e oferece a opção de não ser contatado. Se ele recusar, os dados são apagados e a indicação é cancelada.

4.3. É proibido:
- indicar alguém sem sua concordância;
- indicar imóvel anunciado por outra imobiliária ou corretor;
- usar dados, cadastros, sistemas, câmeras ou documentos do condomínio ou de um empregador;
- divulgar o programa em público, em redes sociais, grupos, murais ou anúncios.

## 5. Quando a indicação é válida

5.1. Vale a primeira indicação registrada para o mesmo imóvel ou a mesma pessoa.

5.2. Não é válida a indicação de quem já estava na base da Godoy Prime com conversa real nos últimos 180 dias, ou em negociação ativa.

5.3. A indicação de proprietário vale por 90 dias, a partir do registro, para chegar ao gatilho. A indicação de comprador vale pelo mesmo prazo.

5.4. Cada indicado gera no máximo uma recompensa para cada finalidade.

## 6. Recompensas

| Indicação | Gatilho | Valor |
|---|---|---|
| Proprietário que quer vender | Assinatura de autorização com a Godoy Prime, de qualquer tipo, ou decisão da Godoy Prime de não captar um proprietário qualificado | R$ 100 |
| Proprietário que quer alugar | Mesmo gatilho | R$ 100 |
| Comprador | Primeira reunião ou visita realizada com corretor da Godoy Prime, com interesse confirmado e capacidade financeira demonstrada, como pré-aprovação de crédito ou comprovante de recursos | R$ 500 |

6.1. Nesta fase, a indicação de pessoa que quer alugar um imóvel para morar pode ser feita, mas não gera recompensa.

6.2. A recompensa é devida mesmo que a venda ou a locação não aconteça.

6.3. Não há nenhum valor adicional na venda, na locação ou na administração do imóvel.

6.4. Cada indicador recebe no máximo [8] recompensas por ano civil. As indicações acima desse limite ficam registradas, sem recompensa.

## 7. Pagamento

7.1. A recompensa é paga pela Godoy Prime Realty, pessoa jurídica, em até 10 dias depois do gatilho, por Pix para chave em nome do próprio indicador, com recibo.

7.2. Os tributos devidos são retidos e recolhidos conforme a lei, e o indicador recebe o informe de rendimentos.

7.3. A recompensa não pode ser cedida a terceiros.

## 8. O que o indicador nunca pode fazer

8.1. Negociar, falar de preço ou de condições, apresentar o imóvel, acompanhar visita, anunciar o imóvel, usar a marca Godoy Prime ou se apresentar como integrante, representante, agente ou consultor da Godoy Prime.

8.2. A primeira ocorrência encerra a participação. As recompensas de indicações já com gatilho cumprido continuam devidas, salvo fraude.

## 9. Fraude

Indicações com dados falsos, com indicado ligado ao próprio indicador para obter recompensa, ou que descumpram o item 4.3 são canceladas. Recompensas pagas indevidamente podem ser cobradas, e o indicador é excluído.

## 10. Acompanhamento

O indicador acompanha suas indicações por um painel, que mostra só a etapa de cada uma. Ele nunca vê telefone, e-mail, endereço ou outros dados de contato do indicado.

## 11. Dados pessoais

O tratamento de dados segue a Política de Privacidade do programa. As indicações que não chegam ao gatilho são eliminadas em 6 meses.

## 12. Alterações e encerramento

12.1. A Godoy Prime pode alterar este regulamento com aviso de 30 dias. A alteração não afeta indicações já registradas.

12.2. O programa pode ser encerrado com o mesmo aviso. As recompensas de gatilhos já cumpridos continuam devidas.

## 13. Foro

Fica eleito o foro da Comarca da Capital do Rio de Janeiro.`

    const TEXT_B = `# Termo de Adesão ao Programa de Indicações Godoy Prime

Pelo presente termo, a pessoa identificada abaixo adere ao Programa de Indicações Godoy Prime, promovido pela Godoy Prime Realty, CNPJ [preencher], CRECI-RJ PJ 11841.

## 1. Identificação

Nome: [ ] · CPF: [ ] · Telefone: [ ] · E-mail: [ ]
Categoria: [ ] · Condomínio, quando aplicável: [ ] · Convite nº: [ ]

## 2. Adesão

Declaro que li e aceito o Regulamento do Programa, os Termos de Uso e a Política de Privacidade vigentes, nas versões indicadas no registro eletrônico deste aceite.

## 3. Declarações de todos os indicadores

Declaro que:
1. tenho 18 anos ou mais;
2. a chave Pix informada está em meu nome;
3. não sou advogado, nem empregado ou corretor da Godoy Prime;
4. não sou corretor de imóveis. Se for, sei que a colaboração se dá por contrato de parceria entre corretores, e não por este programa;
5. apenas comunicarei oportunidades. Não negociarei, não falarei de preço ou condições, não apresentarei imóveis, não acompanharei visitas, não anunciarei imóveis e não me apresentarei como integrante, representante, agente ou consultor da Godoy Prime;
6. só indicarei pessoas que concordarem em ser procuradas;
7. não indicarei imóveis anunciados por outra imobiliária ou corretor;
8. não divulgarei o programa em público, em redes sociais, grupos, murais ou anúncios;
9. sei que a recompensa é fixa, paga pela informação, e não depende de venda ou locação.

## 4. Declarações adicionais por categoria

**Porteiro, zelador e prestador de serviço residencial.** Declaro também que:
1. meu contrato de trabalho, o regimento interno do condomínio e as regras do meu empregador não proíbem minha participação. Se houver dúvida, consultarei antes de indicar;
2. não usarei dados, cadastros, sistemas, câmeras, documentos ou informações a que tenho acesso por causa do meu trabalho;
3. só indicarei pelo meu link pessoal, entregue em mãos, e não abordarei moradores em nome do condomínio;
4. não prejudicarei minhas atividades de trabalho para indicar.

**Síndico.** Declaro também que:
1. comuniquei por escrito minha adesão ao conselho fiscal do condomínio, em [data];
2. não usarei informações a que tenho acesso por causa do cargo;
3. só indicarei pelo meu link pessoal e não usarei os canais de comunicação do condomínio;
4. nenhuma recompensa minha será paga com recursos ou em nome do condomínio.

## 5. Responsabilidade

Sou responsável pela veracidade das minhas declarações. Sei que o descumprimento encerra minha participação e pode levar à cobrança de recompensas pagas indevidamente.

## 6. Vigência

Este termo vale por prazo indeterminado. Posso sair do programa a qualquer momento, pelo painel ou por mensagem. A Godoy Prime pode encerrar minha participação conforme o regulamento.

## 7. Aceite

Aceite eletrônico em [data e hora], do IP [ ] e do navegador [ ], registrado pelo sistema.`

    const TEXT_C = `# Consentimento e aviso de privacidade para a pessoa indicada

## 1. Texto curto, junto ao botão de envio do formulário

> Autorizo a Godoy Prime Realty a me contatar sobre o meu interesse imobiliário e a tratar os dados que informei para essa finalidade, conforme o aviso de privacidade abaixo. Sei que quem me indicou vai saber só em que etapa está o atendimento, nunca os meus dados.

Caixa separada e desmarcada:

> Aceito receber mensagens da Godoy Prime pelo WhatsApp no número informado. Posso cancelar a qualquer momento respondendo SAIR.

## 2. Aviso de privacidade resumido

**Quem trata os seus dados.** Godoy Prime Realty, CNPJ [preencher], [endereço], Rio de Janeiro, RJ. Contato para assuntos de privacidade: [e-mail].

**Quais dados.** Nome, telefone, e-mail e as informações que você deu sobre o imóvel ou sobre o que procura.

**Para quê.**
1. Para entrar em contato e atender o seu interesse em vender, alugar, comprar ou alugar um imóvel.
2. Para registrar quem indicou você, e pagar a recompensa dessa pessoa.

**Base legal.** O seu consentimento, para o contato e as mensagens de WhatsApp. Os procedimentos preliminares de um contrato que você pediu, para o atendimento imobiliário.

**Quem vê.**
- A equipe e os corretores da Godoy Prime.
- Quem indicou você vê só a etapa do atendimento, como "em atendimento" ou "concluído". Nunca vê o seu telefone, e-mail, endereço ou detalhes do imóvel.
- Não vendemos nem compartilhamos os seus dados para publicidade.

**Mensagens.** Enviamos mensagens só entre 8h e 21h. As mensagens de WhatsApp saem pela plataforma oficial da Meta.

**Por quanto tempo.**
- Se o atendimento não avançar, eliminamos os seus dados em 6 meses.
- Se virar negócio, guardamos pelo prazo exigido em lei para contratos e obrigações fiscais.

**Os seus direitos.** Confirmar se tratamos os seus dados, acessar, corrigir, pedir a eliminação, revogar o consentimento e se opor ao contato, a qualquer momento, pelo e-mail [e-mail] ou respondendo a qualquer mensagem nossa.

## 3. Mensagem do primeiro contato, quando a indicação veio pelo painel

> Olá, [primeiro nome]. Aqui é [nome], corretor da Godoy Prime Realty, CRECI [número]. [Nome do indicador] nos contou que você pode ter interesse em [vender, alugar, comprar ou alugar] um imóvel. Podemos conversar? Se preferir não ser contatado, responda NÃO e apagaremos os seus dados.`

    const docsToUpgrade = [
      {
        slug: 'regulamento_do_programa',
        title: 'Regulamento do Programa de Indicações Godoy Prime',
        content: TEXT_A,
      },
      {
        slug: 'declaracao_ausencia_impedimento',
        title: 'Termo de Adesão ao Programa de Indicações Godoy Prime',
        content: TEXT_B,
      },
      {
        slug: 'consentimento_proprietario',
        title: 'Consentimento e aviso de privacidade para a pessoa indicada',
        content: TEXT_C,
      },
    ]

    docsToUpgrade.forEach((docDef) => {
      // 1. Encontrar a maior versão existente deste slug
      let maxVersion = 0
      try {
        const records = app.findRecordsByFilter(
          'legal_documents',
          'slug = {:slug}',
          '-version',
          100,
          0,
          { slug: docDef.slug },
        )
        records.forEach((r) => {
          const v = r.getInt('version') || 0
          if (v > maxVersion) maxVersion = v
          // Desativar versão anterior
          if (r.getBool('is_active')) {
            r.set('is_active', false)
            app.save(r)
          }
        })
      } catch (_) {}

      const nextVersion = maxVersion + 1

      // 2. Verificar se a nova versão já existe (idempotência)
      let nextRec
      try {
        nextRec = app.findFirstRecordByFilter(
          'legal_documents',
          'slug = {:slug} && version = {:v}',
          { slug: docDef.slug, v: nextVersion },
        )
      } catch (_) {
        nextRec = new Record(col)
        nextRec.set('slug', docDef.slug)
        nextRec.set('version', nextVersion)
      }

      nextRec.set('title', docDef.title)
      nextRec.set('content', docDef.content)
      nextRec.set('is_active', true)
      nextRec.set('is_provisional', true)
      nextRec.set('published_at', new Date().toISOString())
      app.save(nextRec)
    })
  },
  (app) => {
    // Reverter: marcar as versões 2 como is_active = false e reativar versões 1
    const slugs = [
      'regulamento_do_programa',
      'declaracao_ausencia_impedimento',
      'consentimento_proprietario',
    ]
    slugs.forEach((slug) => {
      try {
        const records = app.findRecordsByFilter(
          'legal_documents',
          'slug = {:slug}',
          '-version',
          100,
          0,
          { slug },
        )
        records.forEach((r) => {
          const v = r.getInt('version')
          if (v === 1) {
            r.set('is_active', true)
          } else {
            r.set('is_active', false)
          }
          app.save(r)
        })
      } catch (_) {}
    })
  },
)
