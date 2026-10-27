# Inventário de Segurança & Governança (RLS, Funções e Buckets)

**Programa Godoy Prime Indica — Etapa 7 de 7**
**Data de Revisão:** Março de 2025
**Ambiente:** Skip Cloud (PocketBase) + React TypeScript Client

---

## 1. Inventário de Coleções e Regras de Acesso (RLS Equivalente)

Todas as coleções do backend possuem regras de acesso estritas (`listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule`) amarradas a tokens de autenticação PocketBase e aos papéis RBAC mapeados na coleção `user_roles`.

| Coleção                    | Tipo | List / View Rule                                                      | Create Rule                             | Update Rule                                | Delete Rule | Finalidade & Proteção                                             |
| :------------------------- | :--- | :-------------------------------------------------------------------- | :-------------------------------------- | :----------------------------------------- | :---------- | :---------------------------------------------------------------- |
| **users**                  | auth | `@request.auth.id = id \|\| internal`                                 | Aberto / Registro                       | `@request.auth.id = id \|\| admin`         | admin       | Autenticação base do sistema                                      |
| **user_roles**             | base | `@request.auth.id != ''`                                              | admin                                   | admin                                      | admin       | Mapeamento de cargos internos (`admin`, `operador`, `financeiro`) |
| **participants**           | base | `@request.auth.id = user_id \|\| internal`                            | `@request.auth.id = user_id \|\| admin` | `@request.auth.id = user_id \|\| internal` | admin       | Perfil de membros e parceiros                                     |
| **participant_categories** | base | `@request.auth.id != ''`                                              | admin                                   | admin                                      | admin       | Categorias e comissões do programa                                |
| **condominiums**           | base | `@request.auth.id != ''`                                              | admin                                   | admin                                      | admin       | Catálogo de condomínios da Barra e Recreio                        |
| **referrals**              | base | `@request.auth.id = participant_id.user_id \|\| internal`             | `@request.auth.id != ''`                | internal                                   | admin       | Indicações imobiliárias, funis e histórico                        |
| **referral_events**        | base | `@request.auth.id = referral_id.participant_id.user_id \|\| internal` | internal                                | internal                                   | admin       | Linha do tempo e histórico de eventos                             |
| **duplicate_flags**        | base | internal                                                              | internal                                | internal                                   | admin       | Detecção de duplicidade interna                                   |
| **contact_attempts**       | base | internal                                                              | internal                                | internal                                   | admin       | Registro de tentativas e SLA de contato                           |
| **referral_notes**         | base | internal                                                              | internal                                | internal                                   | admin       | Anotações operacionais internas                                   |
| **referral_tasks**         | base | internal                                                              | internal                                | internal                                   | admin       | Fila de tarefas e prazos                                          |
| **documents**              | base | internal                                                              | internal                                | internal                                   | admin       | Arquivos anexos privados (Bucket protegido)                       |
| **capture_records**        | base | internal                                                              | internal                                | internal                                   | admin       | Instrumentos de captação formal                                   |
| **deals**                  | base | internal                                                              | admin                                   | admin                                      | admin       | Fechamentos de negócios e VGV                                     |
| **public_reason_codes**    | base | `@request.auth.id != ''`                                              | admin                                   | admin                                      | admin       | Catálogo de justificativas padronizadas                           |
| **rewards**                | base | `@request.auth.id = participant_id.user_id \|\| internal`             | internal                                | internal                                   | admin       | Premiações por captação e fechamento                              |
| **reward_rules**           | base | `@request.auth.id != ''`                                              | admin                                   | admin                                      | admin       | Regras e marcos de remuneração                                    |
| **payment_batches**        | base | internal                                                              | financeiro / admin                      | financeiro / admin                         | admin       | Lotes de liquidação financeira                                    |
| **campaigns**              | base | `@request.auth.id != ''`                                              | admin                                   | admin                                      | admin       | Campanhas promocionais e materiais                                |
| **message_templates**      | base | internal                                                              | admin                                   | admin                                      | admin       | Templates transacionais e WhatsApp                                |
| **notification_logs**      | base | `@request.auth.id = participant_id.user_id \|\| internal`             | internal                                | internal                                   | admin       | Logs de envio de mensagens e webhooks                             |
| **known_owner_base**       | base | admin                                                                 | admin                                   | admin                                      | admin       | Base conhecida de proprietários legados                           |
| **known_buyer_base**       | base | admin                                                                 | admin                                   | admin                                      | admin       | Base conhecida de compradores legados                             |
| **audit_logs**             | base | admin                                                                 | internal                                | Bloqueado (imutável)                       | admin       | Trilha de auditoria imutável                                      |
| **program_settings**       | base | `@request.auth.id != ''` (leitura)                                    | admin                                   | admin                                      | admin       | Parâmetros globais (LGPD, SLAs, etc.)                             |

_Legenda:_

- `internal`: Usuários com role ativa `admin`, `operador` ou `financeiro` na tabela `user_roles`.
- `admin`: Usuários com role `admin` em `user_roles`.

---

## 2. Funções de Servidor (pb_hooks) e Controle de Acesso (Security Definer)

No PocketBase, os endpoints expostos via `routerAdd` em `pb_hooks/` atuam como funções de servidor (equivalentes a Edge Functions / RPC com privilégio de sistema elevado), onde a autorização é verificada estritamente antes da execução:

| Endpoint / Função                       | Método | Controle de Acesso             | Audit Log | Descrição                                              |
| :-------------------------------------- | :----- | :----------------------------- | :-------- | :----------------------------------------------------- |
| `/backend/v1/referrals/submit-public`   | POST   | Público (Rate-limit implícito) | Sim       | Captação pública de indicação de proprietário/vitrine  |
| `/backend/v1/referrals/change-status`   | POST   | Operador / Admin               | Sim       | Transição de fases do funil com validação de regras    |
| `/backend/v1/referrals/contact-attempt` | POST   | Operador / Admin               | Sim       | Registro de contato e cumprimento de SLA               |
| `/backend/v1/referrals/request-capture` | POST   | Operador / Admin               | Sim       | Solicitação formal de captação com upload de documento |
| `/backend/v1/referrals/approve-capture` | POST   | Operador / Admin               | Sim       | Aprovação de documento e concessão do 1º marco         |
| `/backend/v1/referrals/register-deal`   | POST   | Admin                          | Sim       | Registro de negócio fechado e comissão apurada         |
| `/backend/v1/rewards/build-batch`       | POST   | Financeiro / Admin             | Sim       | Agrupamento de premiações em lote para pagamento       |
| `/backend/v1/rewards/register-payment`  | POST   | Financeiro / Admin             | Sim       | Liquidação de lote com comprovante PIX                 |
| `/backend/v1/admin/import-known-base`   | POST   | **Exclusivo Admin**            | Sim       | Importação e normalização (+55) de base legada         |
| `/backend/v1/admin/anonymize-person`    | POST   | **Exclusivo Admin** (RPC)      | Sim       | Anonimização definitiva LGPD com justificativa         |
| `/backend/v1/admin/apply-retention`     | POST   | Admin ou Cron Secret           | Sim       | Disparo sob demanda da retenção de 24 meses            |
| `/backend/v1/documents/download-url`    | GET    | Interno / Envolvido            | Não       | Geração de URL temporária assinada (300s)              |
| `/backend/v1/campaigns/send-test`       | POST   | Admin                          | Sim       | Teste isolado de templates e envio de e-mails/WhatsApp |
| `/backend/v1/campaigns/broadcast`       | POST   | Admin                          | Sim       | Disparo segmentado com checagem de opt-in ativo        |
| `/api/webhooks/whatsapp`                | POST   | Meta Secret Validado           | Sim       | Recepção de status e opt-out ('SAIR')                  |

---

## 3. Storage / Buckets Privados e Políticas de Proteção de Arquivos

Arquivos armazenados no sistema residem no File Storage protegido do PocketBase com regras de proteção:

1. **Bucket `capture-documents` & `partner-contracts` (Coleção `documents`):**
   - Campo `file` com flag `protected: true` e tamanho máximo de 20 MB.
   - Bloqueio de download direto anônimo: arquivos só podem ser baixados gerando um token temporário assinado via endpoint autenticado `/backend/v1/documents/download-url`, com expiração de 300 segundos.
   - Permissão restrita à equipe interna e administradores.

2. **Bucket `payment-proofs` (Coleção `rewards`):**
   - Campo `payment_proof_file` na coleção `rewards`.
   - Acesso de visualização condicionado às regras de RLS da coleção: somente o participante beneficiário daquela recompensa e membros do setor financeiro/administração podem inspecionar o comprovante.

3. **Bucket de Avatares e Imagens de Campanhas:**
   - Recursos públicos com validação de extensão de imagem para renderização na vitrine.

---

## 4. Jobs Agendados (Crons) e Automações Periódicas

| Identificador              | Frequência              | Ação Executada                                           | Salvaguarda de Segurança               |
| :------------------------- | :---------------------- | :------------------------------------------------------- | :------------------------------------- |
| `check_stalled_referrals`  | Diário (06:00 UTC)      | Notifica operadores sobre indicações paradas além do SLA | Log de auditoria                       |
| `process_activation_rules` | Diário (07:00 UTC)      | Verifica inatividade de participantes da rede            | Execução em bloco com limite           |
| `apply_retention`          | Semanal (Dom 03:00 UTC) | Anonimiza indicações recusadas/perdidas > 24 meses       | Imutabilidade de histórico estatístico |

---

## 5. Conclusão da Revisão

Todas as 25 coleções possuem regras de RLS ativas; as rotas sensíveis de descarte e importação estão restritas unicamente ao perfil `admin` e geram rastreabilidade com IP e ID do ator em `audit_logs`. Nenhuma porta pública de leitura ou mutação inadvertida foi detectada.
