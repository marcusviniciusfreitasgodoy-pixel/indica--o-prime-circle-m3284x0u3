# Catálogo Oficial de Modelos de Mensagem do WhatsApp (Meta Cloud API)
## Programa Prime Circle Indica — Godoy Prime Imóveis

Este documento contém o catálogo padronizado dos modelos de mensagem que devem ser submetidos e aprovados no **Meta WhatsApp Manager** (Gerenciador do WhatsApp Business).

> **Atenção às Regras da Meta**:
> - O idioma padrão configurado é **Português (Brasil)** (`pt_BR`).
> - Apenas modelos **aprovados** (`approved`) podem ser enviados pela API oficial.
> - As categorias são divididas estritamente entre **UTILITY** (notificações operacionais, transações, status e alertas) e **MARKETING** (sequência de ativação e convites para engajamento).
> - As mensagens que possuem botão dinâmico de URL utilizam a variável de sufixo `{{1}}` no link de redirecionamento.

---

### Sumário dos Modelos

| Nome do Modelo (`meta_template_name`) | Categoria | Evento Correspondente | Destinatário |
| :--- | :--- | :--- | :--- |
| `indicacao_recebida_indicador` | **UTILITY** | Indicação recebida | Indicador (Participante) |
| `indicacao_recebida_indicado` | **UTILITY** | Indicação recebida | Titular indicado (Proprietário/Cliente) |
| `etapa_em_analise` | **UTILITY** | Mudança: Em análise | Indicador |
| `etapa_em_contato` | **UTILITY** | Mudança: Em contato / Atendimento | Indicador |
| `etapa_captado` | **UTILITY** | Mudança: Captado | Indicador |
| `etapa_em_divulgacao` | **UTILITY** | Mudança: Em divulgação | Indicador |
| `etapa_visita_proposta` | **UTILITY** | Mudança: Visitando / Proposta | Indicador |
| `etapa_negocio_fechado` | **UTILITY** | Mudança: Vendido / Alugado / Comprou | Indicador |
| `etapa_nao_aproveitada` | **UTILITY** | Mudança: Recusada / Perdida / Duplicada | Indicador |
| `recompensa_aprovada` | **UTILITY** | Recompensa aprovada com data prevista | Indicador |
| `recompensa_paga` | **UTILITY** | Recompensa paga via PIX | Indicador |
| `cadastro_aprovado` | **UTILITY** | Cadastro de participante aprovado | Indicador |
| `cadastro_suspenso` | **UTILITY** | Cadastro suspenso | Indicador |
| `alerta_indicacao_parada` | **UTILITY** | Indicação parada (SLA) | Consultor / Equipe |
| `parceiro_mudou_nivel` | **UTILITY** | Evolução de nível (Prime / Signature) | Parceiro |
| `gratificacao_entregue` | **UTILITY** | Gratificação física ou bônus entregue | Indicador |
| `godoy_enviou_indicacao` | **UTILITY** | Godoy Prime enviou lead ao parceiro | Parceiro |
| `ativacao_passo_0` | **MARKETING** | Régua de ativação: Dia 0 (Boas-vindas) | Participante |
| `ativacao_passo_3` | **MARKETING** | Régua de ativação: Dia 3 (Primeira indicação) | Participante sem indicações |
| `ativacao_passo_10` | **MARKETING** | Régua de ativação: Dia 10 (Dicas de captação) | Participante |
| `ativacao_passo_30` | **MARKETING** | Régua de ativação: Dia 30 (Check-in mensal) | Participante |

---

## 1. Modelos da Categoria UTILITY

### 1.1 `indicacao_recebida_indicador`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante indicador
  - `{{2}}`: Protocolo da indicação (ex: `#REF-1042`)
- **Texto do Corpo**:
  > Olá, {{1}}! Sua indicação com protocolo {{2}} foi recebida com sucesso e está em análise pela equipe Godoy Prime. Acompanhe todas as etapas pelo link oficial.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Acompanhar Indicação`
  - URL Base: `https://seu-dominio.com/painel/indicacoes/`
  - Sufixo dinâmico: `{{1}}` (ID da indicação)

---

### 1.2 `indicacao_recebida_indicado`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome da pessoa indicada
  - `{{2}}`: Nome de quem indicou
  - `{{3}}`: Protocolo de atendimento
- **Texto do Corpo**:
  > Olá, {{1}}! Você foi indicado(a) por {{2}} para conhecer os serviços exclusivos de assessoria imobiliária da Godoy Prime na Barra da Tijuca e Recreio dos Bandeirantes (Protocolo: {{3}}). Em breve um de nossos consultores especializados fará contato.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Conhecer a Godoy Prime`
  - URL Base: `https://seu-dominio.com/`

---

### 1.3 `etapa_em_analise`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Protocolo da indicação
- **Texto do Corpo**:
  > Olá, {{1}}! Sua indicação (Protocolo: {{2}}) avançou para a etapa "Em análise". Nossa equipe está validando a viabilidade e os dados operacionais.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Ver Detalhes`
  - URL Base: `https://seu-dominio.com/painel/indicacoes/`
  - Sufixo dinâmico: `{{1}}`

---

### 1.4 `etapa_em_contato`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Protocolo da indicação
- **Texto do Corpo**:
  > Olá, {{1}}! Sua indicação (Protocolo: {{2}}) está agora "Em contato". Nosso consultor responsável iniciou a abordagem comercial.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Acompanhar`
  - URL Base: `https://seu-dominio.com/painel/indicacoes/`
  - Sufixo dinâmico: `{{1}}`

---

### 1.5 `etapa_captado`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Protocolo da indicação
- **Texto do Corpo**:
  > Boas notícias, {{1}}! O imóvel da sua indicação (Protocolo: {{2}}) foi formalmente captado com documentação e autorização aprovadas. Estamos preparando o material de divulgação.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Ver Captação`
  - URL Base: `https://seu-dominio.com/painel/indicacoes/`
  - Sufixo dinâmico: `{{1}}`

---

### 1.6 `etapa_em_divulgacao`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Protocolo da indicação
- **Texto do Corpo**:
  > Olá, {{1}}! O imóvel que você indicou (Protocolo: {{2}}) já está em divulgação em nossos portais oficiais! Veja o anúncio e compartilhe com sua rede pelo link abaixo.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Ver Anúncio`
  - URL Base: `https://seu-dominio.com/vitrine/`
  - Sufixo dinâmico: `{{1}}`

---

### 1.7 `etapa_visita_proposta`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Protocolo da indicação
- **Texto do Corpo**:
  > Olá, {{1}}! A indicação de cliente (Protocolo: {{2}}) está evoluindo: chegamos à etapa de visitas e propostas comerciais ativas.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Acompanhar`
  - URL Base: `https://seu-dominio.com/painel/indicacoes/`
  - Sufixo dinâmico: `{{1}}`

---

### 1.8 `etapa_negocio_fechado`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Protocolo da indicação
  - `{{3}}`: Tipo do desfecho (ex: Vendido / Alugado / Comprou)
- **Texto do Corpo**:
  > Parabéns, {{1}}! O negócio da sua indicação (Protocolo: {{2}}) foi fechado com sucesso ({{3}})! Sua premiação está em fase de apuração pela equipe financeira.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Ver Premiação`
  - URL Base: `https://seu-dominio.com/painel/indicacoes/`
  - Sufixo dinâmico: `{{1}}`

---

### 1.9 `etapa_nao_aproveitada`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Protocolo da indicação
  - `{{3}}`: Motivo resumido em linguagem cidadã
- **Texto do Corpo**:
  > Olá, {{1}}! Informamos que a sua indicação (Protocolo: {{2}}) não pôde ser aproveitada neste momento pelo seguinte motivo: {{3}}. Agradecemos sua iniciativa e contamos com novas indicações!
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Ver Detalhes`
  - URL Base: `https://seu-dominio.com/painel/indicacoes/`
  - Sufixo dinâmico: `{{1}}`

---

### 1.10 `recompensa_aprovada`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Valor da premiação em R$
  - `{{3}}`: Protocolo da indicação
  - `{{4}}`: Data prevista de liquidação via PIX
- **Texto do Corpo**:
  > Olá, {{1}}! Sua premiação de R$ {{2}} (Protocolo: {{3}}) foi aprovada! A previsão de pagamento via PIX é no dia {{4}}.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Conferir Chave PIX`
  - URL Base: `https://seu-dominio.com/perfil`

---

### 1.11 `recompensa_paga`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Valor liquidado em R$
  - `{{3}}`: Protocolo da indicação
- **Texto do Corpo**:
  > Tudo pronto, {{1}}! O pagamento da sua premiação de R$ {{2}} referente ao protocolo {{3}} foi realizado via PIX. Confira o comprovante no painel.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Ver Comprovante`
  - URL Base: `https://seu-dominio.com/painel`

---

### 1.12 `cadastro_aprovado`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
- **Texto do Corpo**:
  > Olá, {{1}}! Seu cadastro no Godoy Prime Indica foi aprovado! Seu link exclusivo e QR Code já estão disponíveis no seu painel para começar a indicar.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Acessar Meu Painel`
  - URL Base: `https://seu-dominio.com/painel`

---

### 1.13 `cadastro_suspenso`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Motivo da suspensão
- **Texto do Corpo**:
  > Olá, {{1}}. Informamos que sua conta no Godoy Prime Indica foi temporariamente suspensa pelo motivo: {{2}}. Para mais detalhes, consulte seu e-mail cadastrado.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Falar com Suporte`
  - URL Base: `https://seu-dominio.com/`

---

### 1.14 `alerta_indicacao_parada`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Protocolo da indicação
  - `{{2}}`: Etapa atual
  - `{{3}}`: Dias sem movimentação
- **Texto do Corpo**:
  > Alerta operacional: a indicação {{1}} sob sua responsabilidade está parada na etapa {{2}} há {{3}} dias. Acesse o sistema para atualizar.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Abrir no Admin`
  - URL Base: `https://seu-dominio.com/admin/indicacoes/`
  - Sufixo dinâmico: `{{1}}`

---

### 1.15 `parceiro_mudou_nivel`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do parceiro
  - `{{2}}`: Nome do novo nível (ex: Parceiro Prime)
  - `{{3}}`: Percentual de premiação (ex: 15)
- **Texto do Corpo**:
  > Parabéns, {{1}}! Você subiu de categoria no Prime Circle: agora você é {{2}} com premiação de {{3}}%. Acesse o painel e celebre essa conquista!
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Ver Benefícios`
  - URL Base: `https://seu-dominio.com/painel`

---

### 1.16 `gratificacao_entregue`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do participante
  - `{{2}}`: Descrição da gratificação de reconhecimento
- **Texto do Corpo**:
  > Olá, {{1}}! Confirmamos a entrega da sua gratificação: {{2}}. Obrigado pela sua dedicação e parceria com a Godoy Prime!
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Ver Painel`
  - URL Base: `https://seu-dominio.com/painel`

---

### 1.17 `godoy_enviou_indicacao`
- **Categoria**: `UTILITY`
- **Variáveis**:
  - `{{1}}`: Nome do parceiro
  - `{{2}}`: Resumo da oportunidade imobiliária
- **Texto do Corpo**:
  > Olá, {{1}}! A Godoy Prime acaba de encaminhar uma indicação de oportunidade imobiliária para você: {{2}}. Acesse seu painel para ver todos os detalhes do contato.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Ver Oportunidade`
  - URL Base: `https://seu-dominio.com/painel`

---

## 2. Modelos da Categoria MARKETING (Sequência de Ativação)

### 2.1 `ativacao_passo_0`
- **Categoria**: `MARKETING`
- **Variáveis**:
  - `{{1}}`: Nome do participante
- **Texto do Corpo**:
  > Olá, {{1}}! Bem-vindo(a) ao Godoy Prime Indica. Sabia que você já pode compartilhar seu link exclusivo com síndicos, vizinhos e porteiros da Barra e Recreio? Acesse seu painel e confira.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Pegar Meu Link`
  - URL Base: `https://seu-dominio.com/painel`

---

### 2.2 `ativacao_passo_3`
- **Categoria**: `MARKETING`
- **Variáveis**:
  - `{{1}}`: Nome do participante
- **Texto do Corpo**:
  > Olá, {{1}}! Como vão os negócios? Lembra de alguém no seu condomínio querendo vender ou alugar um imóvel? Envie uma indicação em menos de 1 minuto pelo seu link.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Indicar Agora`
  - URL Base: `https://seu-dominio.com/painel`

---

### 2.3 `ativacao_passo_10`
- **Categoria**: `MARKETING`
- **Variáveis**:
  - `{{1}}`: Nome do participante
- **Texto do Corpo**:
  > Olá, {{1}}! A Godoy Prime preparou dicas exclusivas para aumentar suas chances de premiação nas captações na Barra da Tijuca e Recreio. Veja como compartilhar sua vitrine pública.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Ver Vitrine`
  - URL Base: `https://seu-dominio.com/painel`

---

### 2.4 `ativacao_passo_30`
- **Categoria**: `MARKETING`
- **Variáveis**:
  - `{{1}}`: Nome do participante
- **Texto do Corpo**:
  > Olá, {{1}}! Completamos 30 dias de parceria no Godoy Prime Indica! Queremos saber como podemos apoiar você e seu condomínio. Acesse seu painel e confira as novidades do mês.
- **Botão (URL dinâmica)**:
  - Tipo: `URL`
  - Texto do botão: `Acessar Painel`
  - URL Base: `https://seu-dominio.com/painel`

---

## 3. Instruções para Sincronização

Após criar e obter a aprovação dos modelos no WhatsApp Manager:
1. Acesse o menu administrativo: `/admin/mensagens`.
2. Clique no botão **"Sincronizar Modelos com Meta"**.
3. O endpoint interno `POST /backend/v1/communication/sync-whatsapp-templates` buscará os status atualizados na Graph API da Meta (`https://graph.facebook.com/v19.0/{META_WA_BUSINESS_ACCOUNT_ID}/message_templates`) e atualizará a coleção `message_templates` automaticamente para `approved`.
