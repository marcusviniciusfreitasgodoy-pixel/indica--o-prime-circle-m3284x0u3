# ESPECIFICAÇÃO TÉCNICA E FUNCIONAL — GODOY PRIME INDICA (PRIME CIRCLE)

--- ESPECIFICAÇÃO, PARTE 1 DE 2 ---

## 0. Visão Geral e Contexto do Programa

O **Prime Circle Indica** (Godoy Prime Indica) é o programa estruturado de indicações imobiliárias da Godoy Prime Imóveis, voltado para os bairros prioritários da **Barra da Tijuca** e **Recreio dos Bandeirantes** na cidade do Rio de Janeiro.

O sistema conecta dois grandes públicos:

1. **Frente Comunidade**: Profissionais que vivem ou atuam diretamente nos condomínios e residências (porteiros, zeladores, prestadores de serviços residenciais, clientes compradores/vendedores e entidades condominiais).
2. **Frente Parceiros**: Profissionais e empresas com atuação no mercado imobiliário e patrimonial (advogados, contadores, decoradores, administradoras de condomínios, síndicos profissionais e corretores parceiros com CRECI).

A plataforma gerencia o ciclo de vida completo de cada indicação (proprietário vendedor, proprietário locador ou interessado comprador/inquilino), desde a recepção e triagem automatizada antifraude até a formalização de captação com aprovação em 4 olhos, divulgação, fechamento de negócio, comissionamento e premiação.

---

## 1. Objetivos e Premissas de Negócio

### 1.1 Objetivos

- Estruturar um ecossistema seguro e auditável de indicações com rastreabilidade ponta a ponta.
- Garantir conformidade com a legislação imobiliária brasileira (CRECI / COFECI), normas civis e a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei 13.709/2018).
- Assegurar transparência ao indicador sem violar o sigilo de dados sensíveis e estratégicos do proprietário ou da operação interna.
- Evitar conflitos de atribuição e duplicidades de cadastros através de motor de regras com janelas de precedência.

### 1.2 Premissas

- Toda indicação recebida deve ser triada em até 5 dias úteis e submetida a contato inicial em até 7 dias corridos.
- Informações sensíveis de contato do indicado nunca são expostas a terceiros na vitrine pública.
- O participante recebe atualizações em linguagem amigável e resumida (ex.: "Em análise", "Em contato", "Captado", "Em divulgação", "Vendido", "Alugado", "Reconhecida", "Não aproveitada").
- Formalizações de captação exigem segregação de funções (regra dos quatro olhos): quem solicita o contrato não pode aprová-lo.

---

## 2. Atores e Perfis de Usuário (RBAC)

A plataforma utiliza um modelo de controle de acesso baseado em papéis (RBAC - Role-Based Access Control) armazenado na coleção desacoplada `user_roles`:

1. **Administrador (`admin`)**:
   - Gestão global da plataforma, parametrização de configurações (`program_settings`), gestão de usuários e papéis internos da equipe.
   - Decisão final em conflitos de duplicidade e atribuição de indicações.
   - Aprovação de declínio institucional com reconhecimento de mérito (`declinada_pela_godoy`).
   - Registro de fechamento de negócios (`deals`), apuração mensal de premiações e estorno/cancelamento.
   - Acesso exclusivo aos logs imutáveis de auditoria (`audit_logs`).

2. **Operador (`operador`)**:
   - Triagem diária de indicações recebidas, validação de regras de duplicidade e histórico.
   - Registro de tentativas de contato (`contact_attempts`), notas operacionais internas (`referral_notes`) e tarefas (`referral_tasks`).
   - Solicitação de formalização de captação e aprovação (desde que não seja o solicitante da mesma captação).
   - Movimentação de status operacionais ao longo do funil de atendimento.

3. **Financeiro (`financeiro`)**:
   - Consulta a negócios fechados, relatórios de apuração mensal de premiação e conferência de chaves PIX de participantes ativos.
   - Visualização de relatórios de comissionamento e liquidação de repasses.

4. **Participante / Indicador (`membro`)**:
   - Visualização do seu painel restrito com suas indicações ativas, histórico resumido e status simplificados.
   - Cadastro de nova indicação (caso autorizado pela sua categoria).
   - Acesso ao seu link público e QR Code exclusivo para captação externa.
   - Gerenciamento de seu perfil, chave PIX para premiações e aceite formal de termos jurídicos.

---

## 3. Programas e Frentes de Atuação

O ecossistema é dividido em dois programas estratégicos cadastrados na coleção `programs`:

### 3.1 Frente Comunidade (`comunidade`)

Voltada para quem vive o dia a dia predial e residencial na Barra da Tijuca e no Recreio:

- Relacionamento de proximidade e geração espontânea de oportunidades.
- Modelos simplificados de premiação fixa ou percentual por indicação concretizada.
- Exigência de link público para categorias sensíveis (como portaria e zeladoria).

### 3.2 Frente Parceiros (`parceiros`)

Voltada para agentes de mercado e parceiros corporativos:

- Níveis de progressão baseados em volume e qualidade (`program_levels`):
  1. **Parceiro** (Nível 1): Parceiro inicial cadastrado (premiação padrão de 10% sobre o honorário auferido).
  2. **Parceiro Prime** (Nível 2): Parceiro recorrente com histórico consistente (premiação de 15%).
  3. **Parceiro Signature** (Nível 3): Parceiro estratégico e de alta exclusividade (premiação de 20%).

---

## 4. Categorias de Participantes e Regras de Indicação

As categorias cadastradas na coleção `participant_categories` determinam os canais permitidos e a exigência de aprovação cadastral:

| Categoria (`slug`)      | Frente     | Requer Aprovação | Canal Permitido                                 | Descrição                                                                       |
| ----------------------- | ---------- | ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `porteiro_zelador`      | Comunidade | Sim              | Somente Link Público (`link_only`)              | Profissionais de portaria e zeladoria de condomínios residenciais e comerciais. |
| `prestador_residencial` | Comunidade | Sim              | Somente Link Público (`link_only`)              | Autônomos de reformas, arquitetura, eletricidade, pintura e manutenção.         |
| `cliente`               | Comunidade | Não              | Link Público e Envio Direto (`link_and_direct`) | Clientes compradores ou vendedores com relacionamento prévio com a Godoy Prime. |
| `parceiro_profissional` | Parceiros  | Sim              | Link Público e Envio Direto (`link_and_direct`) | Advogados, contadores, decoradores e consultores de patrimônio.                 |
| `empresa_parceira`      | Parceiros  | Sim              | Link Público e Envio Direto (`link_and_direct`) | Pessoas jurídicas formalmente conveniadas à Prime Circle.                       |
| `administradora`        | Parceiros  | Sim              | Link Público e Envio Direto (`link_and_direct`) | Empresas de administração condominial e imobiliária.                            |
| `sindico`               | Parceiros  | Sim              | Somente Link Público (`link_only`)              | Síndicos moradores e profissionais (exigência ética de imparcialidade).         |
| `entidade_condominial`  | Comunidade | Sim              | Somente Link Público (`link_only`)              | Associações de moradores e grêmios condominiais.                                |
| `corretor_parceiro`     | Parceiros  | Sim              | Link Público e Envio Direto (`link_and_direct`) | Corretores de imóveis devidamente registrados no CRECI.                         |

---

## 5. Parâmetros e Configurações Operacionais (`program_settings`)

As variáveis do sistema são dinâmicas e editáveis pelo Administrador na coleção `program_settings`:

1. `serviced_neighborhoods`: Lista de bairros prioritários atendidos (`["Barra da Tijuca", "Recreio dos Bandeirantes"]`).
2. `first_contact_window_days`: Janela máxima para realização do primeiro contato com o indicado (`7` dias).
3. `stalled_referral_thresholds_days`: Alerta de indicação parada (`{"triage_days": 5, "active_states_days": 10}`).
4. `capture_attribution_window_days`: Janela limite para captação formal a partir da indicação aceita (`90` dias).
5. `sale_window_from_capture_months`: Janela para fechamento de venda após a captação (`12` meses).
6. `known_owner_precedence_days`: Janela de precedência para proprietário já cadastrado na base com contato recente (`180` dias).
7. `referral_monthly_cap_per_category`: Teto de indicações ativas simultâneas por participante ao mês (`10`).
8. `retention_before_anonymization_months`: Prazo de retenção de dados antes de expurgo/anonimização LGPD (`24` meses).
9. `monthly_reckoning_day`: Dia de corte mensal para apuração de negócios e premiações (`10`).
10. `batch_payment_due_day`: Dia fixo do lote mensal de pagamentos de premiações via PIX (`25`).
11. `buyer_window_months`: Validade da indicação de comprador/interessado (`12` meses).
12. `buyer_precedence_days`: Precedência para comprador já em atendimento (`180` dias).
13. `whatsapp_quiet_hours`: Horário de silêncio para comunicações automáticas (`{"start": "21:00", "end": "08:00"}`).
14. `marketing_messages_monthly_limit`: Limite de comunicações ativas de marketing por participante (`4` mensagens/mês).
15. `tenant_window_months`: Janela de atribuição para locatário indicado (`6` meses).
16. `activation_deadlines_days`: Régua de ativação e acompanhamento (`[0, 3, 10, 30]` dias).

---

## 6. Jornada da Indicação e Máquinas de Estado

A plataforma possui duas esteiras operacionais com transições estritas, impedindo avanços arbitrários:

### 6.1 Esteira de Proprietário / Imóvel

1. **`recebida`**: Indicação ingressada via formulário direto ou link público.
2. **`em_triagem`**: Operador analisa viabilidade, duplicidade e histórico.
3. **`aceita`**: Indicação validada e apta para abordagem comercial.
4. **`em_contato`**: Operador realiza tentativas ativas de contato com o proprietário.
5. **`qualificada`**: Proprietário confirmou interesse em negociar o imóvel.
6. **`em_negociacao`**: Termos de autorização ou parceria em discussão comercial.
7. **`captacao_solicitada`**: Documento de captação enviado para validação interna.
8. **`captada`**: Captação formalizada aprovada por revisor habilitado (regra dos quatro olhos).
9. **`em_divulgacao`**: Imóvel cadastrado no CRM, com link público ou vitrine reservada ativa.
10. **`vendida`** / **`alugada`**: Negócio fechado com contrato e comissão apurada.

**Estados de Saída / Finais:**

- **`recusada`**: Fora do perfil de atendimento ou dados inconsistentes.
- **`duplicada`**: Imóvel ou proprietário já ativo em outra indicação recente.
- **`perdida`**: Desistência do proprietário ou insucesso de contato após múltiplas tentativas (requer seleção de responsabilidade: `proprietario` ou `indicacao_invalida`).
- **`declinada_pela_godoy`**: Godoy optou por não comercializar, mas reconhece a validade e o mérito do indicador (exibido como **"Reconhecida"** no painel do participante).
- **`retirada`**: Proprietário suspendeu o anúncio ou contrato de captação expirou.
- **`cancelada`**: Cancelamento motivado a pedido do indicador ou por vício formal.

### 6.2 Esteira de Comprador / Interessado

1. **`recebida`** → 2. **`em_triagem`** → 3. **`aceita`** → 4. **`em_atendimento`** → 5. **`visitando`** (visitas agendadas e realizadas) → 6. **`proposta`** (proposta formal apresentada) → 7. **`comprou`** / **`alugou`** (negócio fechado).
   Saídas para **`recusada`**, **`duplicada`**, **`perdida`** ou **`cancelada`**.

---

--- ESPECIFICAÇÃO, PARTE 2 DE 2 ---

## 7. Modelo de Dados

O modelo de dados é estruturado sobre o PocketBase (Skip Cloud), com coleções relacionais, tipagem rigorosa, índices de performance e regras de acesso (API rules) que garantem a segurança por padrão.

### 7.1 Coleções de Autenticação, Perfis e RBAC

- **`users` (auth)**:
  - Campos: `name` (text), `avatar` (file), `agency` (text), `phone` (text), `public_slug` (text, indexado e único), `verified` (bool), `email` (email).
  - Regras de API: Autenticação padrão, permissões granulares por usuário.
- **`user_roles` (base)**:
  - Campos: `user_id` (relation → users, cascade delete), `role` (select: `admin`, `operador`, `financeiro`), `created` (autodate), `updated` (autodate).
  - Índices: `idx_user_roles_user_role` (UNIQUE: user_id + role), `idx_user_roles_role`.
  - Regras de API: Leitura por usuários autenticados para checagem do próprio papel ou leitura global por equipe interna; modificação estrita a nível de servidor (`pb_hooks`) ou superuser.
- **`profiles` (base)**:
  - Campos: `user_id` (relation → users, cascade delete, UNIQUE), `name` (text), `phone` (text), `avatar` (file).
  - Regras de API: Atualização restrita ao próprio dono do registro (`user_id = @request.auth.id`).

### 7.2 Coleções do Programa e Participantes

- **`programs` (base)**:
  - Campos: `slug` (text, UNIQUE: `comunidade`, `parceiros`), `name` (text), `description` (text), `is_active` (bool).
- **`program_levels` (base)**:
  - Campos: `program_id` (relation → programs), `slug` (text), `name` (text), `order` (number), `criteria_description` (text), `reward_percentage` (number).
  - Índices: `idx_program_levels_program_slug` (UNIQUE: program_id + slug).
- **`participant_categories` (base)**:
  - Campos: `program_id` (relation → programs), `slug` (text, UNIQUE), `name` (text), `front` (select: `comunidade`, `parceiros`), `requires_approval` (bool), `allowed_channels` (select: `link_only`, `link_and_direct`), `description` (text).
- **`condominiums` (base)**:
  - Campos: `name` (text), `neighborhood` (text), `address` (text), `city` (text), `state` (text), `zip_code` (text), `active` (bool).
  - Índices: `idx_condominiums_neighborhood`, `idx_condominiums_name`.
- **`participants` (base)**:
  - Campos: `user_id` (relation → users, UNIQUE), `category_id` (relation → participant_categories), `level_id` (relation → program_levels, opcional), `status` (select: `pendente_aprovacao`, `ativo`, `suspenso`, `inativo`), `pix_key` (text), `pix_key_type` (select: `cpf`, `cnpj`, `email`, `telefone`, `aleatoria`), `referral_code` (text), `notes` (text), `approved_at` (date), `approved_by` (relation → users).
- **`participant_condominiums` (base)**:
  - Campos: `participant_id` (relation → participants), `condominium_id` (relation → condominiums), `role_description` (text).
  - Índices: `idx_part_condos_unique` (UNIQUE: participant_id + condominium_id).

### 7.3 Coleções Jurídicas e Governança

- **`legal_documents` (base)**:
  - Campos: `slug` (text), `title` (text), `version` (number), `content` (text), `is_active` (bool), `published_at` (date).
  - Documentos previstos: `termos_de_uso`, `politica_de_privacidade`, `regulamento_do_programa`, `declaracao_ausencia_impedimento`, `consentimento_proprietario`.
- **`acceptances` (base)**:
  - Campos: `user_id` (relation → users), `document_id` (relation → legal_documents), `ip_address` (text), `user_agent` (text), `accepted_at` (date).
  - Registro auditável com data, IP e identificação do usuário.
- **`program_settings` (base)**:
  - Campos: `key` (text, UNIQUE), `value_json` (json), `description` (text). Armazena os 16 parâmetros centrais do programa.
- **`audit_logs` (base)**:
  - Campos: `actor_id` (relation → users), `actor_email` (text), `action` (text), `resource_type` (text), `resource_id` (text), `details` (json), `ip_address` (text).
  - Imutável: Criação exclusiva pelo servidor (`pb_hooks`), leitura restrita aos administradores (`@collection.user_roles.role ?= 'admin'`).

### 7.4 Coleções Operacionais de Indicações

- **`referrals` (base)**:
  - Campos principais: `referral_type` (`proprietario` | `comprador`), `participant_id` (relation → participants), `assigned_operator_id` (relation → users), `condominium_id` (relation → condominiums), `unit` (text), `normalized_address` (text).
  - Dados do proprietário: `owner_name`, `owner_phone`, `owner_email`, `owner_cpf`.
  - Dados do comprador/interessado: `buyer_name`, `buyer_phone`, `buyer_email`, `target_neighborhood`.
  - Controle de atribuição: `source_origin` (`direto`, `link_publico`, `vitrine`), `attribution_status` (`atribuida`, `pendente`, `recusada`), `attribution_hint` (text).
  - Consentimento e conformidade: `consent_declared` (bool), `consent_confirmed_by_operator` (bool).
  - Máquina de estados: `status` (select com 26 estados mapeados), `status_reason` (text), `public_reason_code` (text), `loss_responsibility` (`proprietario` | `indicacao_invalida`).
  - Declínio institucional: `declined_reason` (text), `declined_by` (relation → users).
  - Divulgação: `listing_link` (text), `is_reserved_listing` (bool), `public_summary` (text), `public_photos` (json).
  - Fechamento: `deal_value_brl` (number), `deal_date` (date), `deal_property_description` (text).
  - Legado e compatibilidade: `type`, `referrer_name`, `referrer_phone`, `description`, `return_contact`, `current_owner_id`, `original_owner_id`, `history`.
- **`referral_events` (base)**:
  - Linha do tempo de todas as transições de status com `referral_id`, `from_status`, `to_status`, `actor_id`, `actor_name`, `reason`, `public_reason_code`, `public_label`, `visible_to_participant`, `metadata`.
- **`duplicate_flags` (base)**:
  - Flags identificadas automaticamente no momento da criação: `referral_id`, `conflicting_referral_id`, `conflict_type` (`phone`, `condo_unit`, `address_unit`, `email`, `known_base`), `conflict_details`, `is_resolved`, `resolution_action`, `resolved_by`, `resolved_at`.
- **`known_owner_base` e `known_buyer_base` (base)**:
  - Bases de precedência histórica da imobiliária para identificar proprietários e compradores já atendidos nos últimos 180 dias.

### 7.5 Coleções de Atendimento e Diligência

- **`contact_attempts` (base)**:
  - Registro detalhado de cada contato comercial: `referral_id`, `operator_id`, `channel` (`whatsapp`, `telefone`, `email`, `presencial`), `outcome` (`sucesso`, `sem_resposta`, `recusou`, `numero_invalido`, `agendou_retorno`, `outro`), `notes`, `scheduled_callback_at`.
- **`referral_notes` (base)**:
  - Notas de inteligência operacional internas (`referral_id`, `author_id`, `content`). Regra estrita: nunca expostas ao participante indicador.
- **`referral_tasks` (base)**:
  - Tarefas com responsáveis e prazos (`referral_id`, `assigned_to`, `title`, `description`, `due_date`, `is_completed`, `completed_at`, `completed_by`).

### 7.6 Coleções de Captação, Negócios e Encerramento

- **`documents` (base)**:
  - Armazenamento privado de arquivos e contratos (`referral_id`, `participant_id`, `bucket_type`: `capture-documents` | `partner-contracts`, `title`, `file` com flag `protected: true`, `uploaded_by`, `file_type`, `notes`).
- **`capture_records` (base)**:
  - Formalização documental da captação: `referral_id`, `instrument_type` (`autorizacao_exclusiva`, `autorizacao_simples`, `contrato_parceria`, `termo_opcao`), `document_id`, `requested_by`, `requested_at`, `status` (`solicitada`, `aprovada`, `devolvida`), `approved_by`, `approved_at`, `return_reason`.
- **`deals` (base)**:
  - Formalização de venda ou locação concretizada: `owner_referral_id`, `buyer_referral_id`, `deal_type` (`venda` | `locacao`), `value_brl`, `deal_date`, `commission_received_at`, `commission_received_brl`, `commission_split`, `cancelled_at`, `cancel_reason`, `property_description`, `registered_by`.
- **`public_reason_codes` (base)**:
  - Dicionário de justificativas amigáveis em linguagem cidadã (`code`, `display_text`, `category`: `recusada`, `duplicada`, `perdida`, `retirada`, `cancelada`, `declinada`).

---

## 8. Automação e Funções de Servidor

A lógica de integridade e negócio roda integralmente no servidor através de hooks (`pocketbase/hooks/*.pb.js`).

### 8.1 Triggers e Hooks de Ciclo de Vida

1. **`onRecordCreate(users)`**:
   - Criação automática sincronizada de registro em `profiles`.
   - Registro de evento de auditoria no log do sistema.
2. **`onRecordCreate(referrals)`**:
   - Força status inicial como `recebida`.
   - Gera primeiro registro de evento em `referral_events` (`public_label: 'Recebida'`).
   - Dispara motor de detecção de duplicidades:
     - Compara telefone do proprietário ou comprador com indicações ativas existentes.
     - Compara condomínio + unidade ou endereço normalizado.
     - Compara dados com as bases conhecidas (`known_owner_base` / `known_buyer_base`) respeitando a janela de precedência de 180 dias.
     - Cria pendências em `duplicate_flags` para conferência do operador na triagem.
3. **`cronAdd('auto_transfer_unattended_referrals')`**:
   - Execução programada periódica (a cada 6 horas) que identifica indicações estagnadas no estado `nova` sem atendimento por mais de 3 dias, realizando repasse automático na rede com trilha de auditoria no histórico.

### 8.2 Endpoints Customizados de API Backend

- **`POST /backend/v1/auth/request-magic-link`**: Geração de link mágico temporário (JWT 15 min) e código OTP de 6 dígitos para acesso seguro sem senha.
- **`POST /backend/v1/auth/verify-magic-link`**: Validação de token com emissão de sessão autenticada oficial PocketBase.
- **`GET /backend/v1/auth/my-roles`**: Resolução imediata dos papéis internos do usuário logado (`isAdmin`, `isOperator`, `isFinance`).
- **`POST /backend/v1/referrals/change-status`**:
  - Validação da matriz de transição estrita para proprietários e compradores.
  - Exigência de motivo e `public_reason_code` para estados finais e desvios.
  - Exigência de responsabilidade (`loss_responsibility`) para perda de indicação.
  - Exigência de perfil de administrador para status de fechamento (`vendida`, `alugada`, `comprou`, `alugou`) com valor em BRL e data do negócio.
  - Gravação automática de `referral_events` e `audit_logs`.
- **`POST /backend/v1/referrals/decline-by-godoy`**:
  - Exclusivo para administradores. Marca indicação como `declinada_pela_godoy` mantendo mérito do parceiro como "Reconhecida".
- **`POST /backend/v1/referrals/request-capture`**:
  - Cria registro em `capture_records` e move indicação para `captacao_solicitada`.
- **`POST /backend/v1/referrals/approve-capture`**:
  - **Regra dos quatro olhos**: Verifica se o aprovador é diferente do operador que solicitou (`requested_by != authRecord.id`). Move indicação para `captada`.
- **`POST /backend/v1/referrals/return-capture`**:
  - Devolve solicitação de captação para correção de pendências e retorna a indicação para `em_negociacao`.
- **`POST /backend/v1/referrals/register-listing`**:
  - Registro de link de anúncio ou seleção de divulgação reservada com resumo e fotos públicas, movendo indicação para `em_divulgacao`.
- **`POST /backend/v1/referrals/register-deal`**:
  - Exclusivo para administradores. Formaliza o fechamento de negócio vinculando indicação de proprietário e/ou comprador, calculando status finais (`vendida`, `alugada`, `comprou`, `alugou`).
- **`GET /backend/v1/public/vitrine/{imovelId}`**:
  - Retorna dados públicos para a vitrine do parceiro sem expor número de unidade, andar ou endereço privativo do proprietário.
- **`POST /backend/v1/public/submit-buyer-lead`**:
  - Recebe interessado comprador a partir da vitrine pública de um parceiro, gerando indicação atribuída a ele.
- **`POST /backend/v1/referrals/resolve-attribution-hint`**:
  - Operador confirma ou recusa o vínculo de indicação originada com indício de autoria.
- **`POST /backend/v1/referrals/confirm-consent`**:
  - Operador atesta confirmação verbal/documental do consentimento do titular conforme exigência da LGPD.
- **`GET /backend/v1/documents/{id}/download-url`**:
  - Emite URL assinada temporária (token com validade de 5 minutos) para download de documentos protegidos por usuários autorizados da equipe.

### 8.3 Tabela de Eventos e Auditoria

A tabela a seguir consolida os eventos gerados na coleção `referral_events` e sua visibilidade para o participante indicador:

| Status Destino (`to_status`) | Rótulo Público (`public_label`) | Visível ao Indicador? | Motivo Exigido? | Código Público? | Auditoria (`audit_logs`) |
| ---------------------------- | ------------------------------- | --------------------- | --------------- | --------------- | ------------------------ |
| `recebida`                   | Recebida                        | Sim                   | Não             | Não             | Sim                      |
| `em_triagem`                 | Em análise                      | Sim                   | Não             | Não             | Sim                      |
| `aceita`                     | Em análise                      | Sim                   | Não             | Não             | Sim                      |
| `em_contato`                 | Em contato                      | Sim                   | Não             | Não             | Sim                      |
| `qualificada`                | Em contato                      | Sim                   | Não             | Não             | Sim                      |
| `em_negociacao`              | Em contato                      | Sim                   | Não             | Não             | Sim                      |
| `captacao_solicitada`        | Em formalização                 | Sim                   | Não             | Não             | Sim                      |
| `captada`                    | Captado                         | Sim                   | Não             | Não             | Sim                      |
| `em_divulgacao`              | Em divulgação                   | Sim                   | Não             | Não             | Sim                      |
| `vendida`                    | Vendido                         | Sim                   | Não             | Não             | Sim                      |
| `alugada`                    | Alugado                         | Sim                   | Não             | Não             | Sim                      |
| `recusada`                   | Não aproveitada                 | Sim                   | Sim             | Sim             | Sim                      |
| `duplicada`                  | Não aproveitada                 | Sim                   | Sim             | Sim             | Sim                      |
| `perdida`                    | Não aproveitada                 | Sim                   | Sim             | Sim             | Sim                      |
| `declinada_pela_godoy`       | Reconhecida                     | Sim                   | Sim             | Não             | Sim                      |
| `retirada`                   | Não aproveitada                 | Sim                   | Sim             | Sim             | Sim                      |
| `cancelada`                  | Não aproveitada                 | Sim                   | Sim             | Sim             | Sim                      |
| `em_atendimento`             | Em atendimento                  | Sim                   | Não             | Não             | Sim                      |
| `visitando`                  | Visitando imóveis               | Sim                   | Não             | Não             | Sim                      |
| `proposta`                   | Proposta                        | Sim                   | Não             | Não             | Sim                      |
| `comprou`                    | Comprou                         | Sim                   | Não             | Não             | Sim                      |
| `alugou`                     | Alugou                          | Sim                   | Não             | Não             | Sim                      |

---

## 9. Indicadores e Relatórios

A plataforma provê painéis gerenciais e métricas consolidadas em tempo real:

1. **Taxa de Conversão do Funil**:
   - Percentual de indicações recebidas que chegam à triagem, captação e venda/locação concluída, segmentado por frente (Comunidade vs. Parceiros) e por categoria.
2. **Cumprimento de SLAs Operacionais**:
   - Tempo médio de triagem (SLA: até 5 dias).
   - Tempo até o primeiro contato ativo registrado em `contact_attempts` (SLA: até 7 dias).
   - Volume de indicações paradas e pendências de atribuição não resolvidas.
3. **Métricas de Duplicidade e Qualidade**:
   - Proporção de indicações recusadas por duplicidade e por dados inconsistentes.
   - Distribuição de responsabilidade nas indicações perdidas (`proprietario` vs. `indicacao_invalida`).
4. **Ranking e Progressão de Parceiros**:
   - Volume de indicações qualificadas por participante para subsidiar a elevação de nível nos Parceiros (Parceiro → Parceiro Prime → Parceiro Signature).
5. **Relatórios Financeiros e de Premiação**:
   - Volume financeiro transacionado (VGV) gerado por indicações da rede.
   - Apuração do lote mensal de premiações (fechamento no dia 10, conferência de chaves PIX e pagamento no dia 25).
   - Histórico de pagamentos liquidados e pendentes com rateio documentado em `commission_split`.

---

## 10. Segurança e Conformidade com a LGPD

1. **Minimização de Dados e Sigilo Comercial**:
   - O indicador visualiza apenas o primeiro nome e o status sintetizado da sua indicação. Dados de contato do proprietário, valores de avaliação comercial e anotações internas são estritamente sigilosos.
2. **Proteção da Vitrine Pública**:
   - A vitrine pública compartilhada pelo parceiro exibe fotos selecionadas, condomínio e bairro, mas nunca o número da unidade, bloco ou endereço completo do imóvel, resguardando a privacidade do morador.
3. **Gestão de Consentimento**:
   - Toda indicação exige declaração explícita de consentimento (`consent_declared`) no envio e posterior confirmação pelo operador (`consent_confirmed_by_operator`) no primeiro contato.
4. **Governança de Documentos e Termos Legais**:
   - O onboarding de todo participante exige leitura e aceite registrado de quatro documentos: Termos de Uso, Política de Privacidade, Regulamento do Programa e Declaração de Ausência de Impedimento Legal e Ético.
   - Mudanças nas versões dos documentos invalidam aceites anteriores, solicitando nova confirmação no próximo login.
5. **Arquivos Privados e Download Seguro**:
   - Documentos de captação e contratos de parceria ficam em coleções protegidas, sendo acessados exclusivamente através de URLs assinadas de curta duração (máximo 5 minutos).
6. **Política de Retenção e Anonimização**:
   - Dados de indicações arquivadas, recusadas ou canceladas são programados para anonimização após 24 meses (`retention_before_anonymization_months`).

---

## 11. Identidade Visual e Experiência do Usuário (Design System)

A identidade visual expressa o posicionamento de alto padrão da **Godoy Prime** e do **Prime Circle**:

1. **Paleta de Cores**:
   - **Preto e Grafite Nobre (`#0B0D11`, `#111622`, `#1E2538`)**: Fundo e superfícies transmitindo solidez e elegância.
   - **Dourado e Âmbar Prime (`#D4AF37`, `#F59E0B`, `#B45309`)**: Destaques de ação, medalhas de nível, elementos de prestígio e chamadas principais.
   - **Cinzas Neutros e Bordas Suaves (`#334155`, `#475569`, `#94A3B8`)**: Divisórias limpas e tipografia secundária legível.
   - **Verde Esmeralda (`#10B981`)**: Destaque positivo para negócios fechados, captações aprovadas e sucesso de operações.
2. **Tipografia e Hierarquia**:
   - Fontes sans-serif modernas com pesos balanceados (Inter / Plus Jakarta Sans), títulos de alta legibilidade e números destacados em formato tabular para valores financeiros.
3. **Componentes e Acessibilidade**:
   - Utilização integral da biblioteca Shadcn UI com Tailwind CSS.
   - Badges coloridos por tipo de indicação e por status com contraste acessível para visualização rápida tanto no tema escuro quanto em ambientes iluminados.
   - Design 100% responsivo, com foco na usabilidade mobile para porteiros e corretores que acessam a plataforma via smartphone.

---

## 12. Critérios de Aceite do Produto Completo

1. O participante deve conseguir se cadastrar escolhendo sua categoria profissional (`participant_categories`) e preenchendo sua chave PIX com validação de tipo.
2. Participantes de categorias com `requires_approval: true` só podem acessar o painel e realizar indicações após aprovação por um operador ou administrador.
3. O participante deve registrar o aceite dos 4 documentos jurídicos ativos no primeiro acesso, com gravação de data, IP e user-agent na coleção `acceptances`.
4. Usuários com categorias restritas a `link_only` (porteiros, zeladores, síndicos) não devem ter acesso ao formulário de indicação direta interna, apenas à geração e compartilhamento de seu link público e QR Code.
5. Participantes de categorias com `link_and_direct` (clientes, parceiros profissionais, corretores) podem tanto indicar diretamente pelo painel quanto gerar links públicos.
6. Ao abrir um link público de indicação, a página deve exibir o nome do parceiro ou a marca Godoy Prime de forma profissional e permitir o preenchimento seguro de indicação de proprietário ou comprador.
7. A criação de indicação através de link público deve vincular automaticamente o participante dono do link como `original_owner_id` e `current_owner_id`.
8. No momento do cadastro da indicação, o sistema deve normalizar telefones e endereços e executar a verificação automática de duplicidade.
9. Caso haja duplicidade por telefone, por condomínio + unidade ou pela base de proprietários/compradores conhecidos nos últimos 180 dias, uma flag deve ser criada na coleção `duplicate_flags` e o status deve iniciar em `recebida`.
10. O operador deve visualizar na tela de triagem a lista de pendências de duplicidade com detalhes explicativos do conflito antes de decidir aceitar ou recusar a indicação.
11. Ao aceitar uma indicação na triagem, o status deve avançar para `aceita` e registrar evento na linha do tempo `referral_events`.
12. Ao recusar uma indicação, o operador deve obrigatoriamente informar o motivo e selecionar um código da tabela `public_reason_codes`.
13. O participante nunca deve visualizar dados confidenciais na indicação recusada, vendo apenas o rótulo amigável "Não aproveitada" acompanhado da justificativa pública.
14. A esteira de proprietário deve impedir avanços fora da ordem estrita: `recebida` → `em_triagem` → `aceita` → `em_contato` → `qualificada` → `em_negociacao` → `captacao_solicitada` → `captada` → `em_divulgacao` → `vendida`/`alugada`.
15. O avanço de `em_negociacao` para `captacao_solicitada` exige o upload obrigatório de documento comprobatório em `documents` e o registro formal em `capture_records`.
16. A aprovação de captação (`POST /backend/v1/referrals/approve-capture`) deve rejeitar expressamente caso o usuário que tenta aprovar seja o mesmo que solicitou a formalização (regra dos quatro olhos).
17. A devolução de captação (`POST /backend/v1/referrals/return-capture`) deve exigir justificativa de pendência e retornar a indicação para o status `em_negociacao`.
18. O registro de divulgação (`POST /backend/v1/referrals/register-listing`) deve permitir informar o link externo do anúncio ou selecionar a opção de divulgação reservada, exigindo resumo público e fotos para a vitrine.
19. A vitrine pública (`/vitrine/:imovelId`) deve exibir apenas o nome do condomínio, bairro, resumo do imóvel e fotos autorizadas, ocultando completamente o número do apartamento e endereço privativo.
20. Qualquer interessado que submeter formulário de contato pela vitrine do parceiro deve gerar automaticamente uma indicação do tipo comprador vinculada ao código daquele parceiro.
21. Para marcar qualquer indicação como `perdida`, o operador deve obrigatoriamente preencher o motivo e selecionar a responsabilidade (`proprietario` ou `indicacao_invalida`).
22. Somente administradores (`role = 'admin'`) podem registrar o declínio institucional pela Godoy Prime (`POST /backend/v1/referrals/decline-by-godoy`), marcando como `declinada_pela_godoy` internamente e exibindo como "Reconhecida" para o parceiro.
23. Somente administradores podem mover uma indicação para `vendida`, `alugada`, `comprou` ou `alugou`, sendo obrigatório o preenchimento do valor do negócio em BRL e a data de fechamento.
24. O registro de negócios (`deals`) deve permitir vincular tanto a indicação do proprietário quanto a do comprador (quando ambos forem oriundos da rede), gerando os registros de fechamento em ambas as pontas.
25. O repasse manual de indicação entre membros da rede deve registrar a data, ator de origem, ator de destino e justificativa no histórico auditável da indicação.
26. O cron de auto-repasse (`auto_transfer_unattended_referrals`) deve reatribuir automaticamente indicações sem atendimento após 3 dias da criação para outro membro da rede elegível.
27. Operadores podem registrar tentativas de contato (`contact_attempts`) detalhando canal, desfecho e agendamento de retorno.
28. Operadores podem adicionar notas internas (`referral_notes`), garantindo que essas notas nunca sejam acessíveis via API pelos participantes comuns.
29. Operadores podem criar e concluir tarefas vinculadas a cada indicação (`referral_tasks`).
30. Os arquivos anexados com flag privada só podem ser baixados mediante requisição de URL temporária assinada emitida pelo backend (`/backend/v1/documents/:id/download-url`).
31. O Administrador pode gerenciar os papéis internos da equipe através dos endpoints dedicados `/backend/v1/admin/team/assign-role` e `remove-role`, com bloqueio contra auto-remoção de papel de admin.
32. O Administrador pode criar, visualizar e editar os parâmetros na coleção `program_settings`.
33. O Administrador pode cadastrar novos condomínios de referência nos bairros da Barra da Tijuca e Recreio dos Bandeirantes.
34. A tela de auditoria (`AdminAudit`) deve permitir consulta e filtragem rápida por ator, ação, tipo de recurso e data, exibindo os dados completos gravados em `audit_logs`.
35. As atualizações em tempo real (realtime) devem sincronizar automaticamente a lista de indicações quando ocorrerem mudanças de status ou repasses.
36. O sistema deve fornecer login com senha e suporte a Magic Link / OTP de 6 dígitos via email.
37. As rotas internas de administração (`/admin/*`) devem ser restritas aos usuários com papéis internos cadastrados em `user_roles`, redirecionando usuários não autorizados para tela de acesso negado.
38. O painel do participante deve exibir métricas resumidas de desempenho: total indicado, ativas, captadas, concluídas e previsão de premiações.
39. O sistema não deve conter erros de tipagem no TypeScript (`tsc`) nem inconsistências no linter (`oxlint`), construindo a aplicação com sucesso no Vite.

---

## 13. Ordem de Construção

A implementação da solução completa é estruturada em 7 etapas progressivas:

| Etapa       | Foco / Entregável                                   | Principais Componentes e Coleções Envolvidas                                                                                                                                                          |
| ----------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Etapa 1** | Estrutura Base, Autenticação, Perfis e RBAC         | `users`, `user_roles`, `profiles`, fluxo de Magic Link / OTP, rotas protegidas (`ProtectedRoute`), controle de acesso por papéis internos.                                                            |
| **Etapa 2** | Fundação do Programa, Bairros e Governança Jurídica | `programs`, `program_levels`, `participant_categories`, `condominiums`, `legal_documents`, `acceptances`, `program_settings`, onboarding com aceite legal.                                            |
| **Etapa 3** | Operações, Triagem, Máquina de Estados e Captação   | `referrals`, `referral_events`, `duplicate_flags`, `known_owner_base`, `known_buyer_base`, `contact_attempts`, `referral_notes`, `referral_tasks`, `documents`, `capture_records`, regra dos 4 olhos. |
| **Etapa 4** | Vitrine Pública e Captação de Compradores           | `public_reason_codes`, endpoints `/backend/v1/public/vitrine/:id` e `/backend/v1/public/submit-buyer-lead`, página `PublicVitrine`, captação com proteção de endereço.                                |
| **Etapa 5** | Negócios Fechados, Apuração Mensal e Financeiro     | `deals`, endpoints `/backend/v1/referrals/register-deal`, cálculo de comissões, rateio de premiações e módulo financeiro de conferência de chaves PIX.                                                |
| **Etapa 6** | Relatórios, Dashboards Analíticos e Métricas SLA    | Painéis `AdminDashboard` e `Dashboard`, monitoramento de SLAs de 5 e 7 dias, volume por categoria, taxa de conversão do funil e ranking de parceiros.                                                 |
| **Etapa 7** | Auditoria Completa, Conformidade LGPD e Validação   | `audit_logs`, `AdminAudit`, URLs assinadas de download, anonimização LGPD, validação ponta a ponta dos 39 critérios de aceite e build de produção.                                                    |

--- FIM DA PARTE 2 ---
