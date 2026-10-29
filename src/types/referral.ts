export type ReferralType =
  | 'proprietario'
  | 'comprador'
  | 'imovel'
  | 'cliente'
  | 'proprietario_venda'
  | 'proprietario_locacao'

export type ReferralStatus =
  | 'recebida'
  | 'em_triagem'
  | 'aceita'
  | 'em_contato'
  | 'qualificada'
  | 'em_negociacao'
  | 'captacao_solicitada'
  | 'captada'
  | 'em_divulgacao'
  | 'vendida'
  | 'alugada'
  | 'recusada'
  | 'duplicada'
  | 'perdida'
  | 'declinada_pela_godoy'
  | 'retirada'
  | 'cancelada'
  | 'em_atendimento'
  | 'visitando'
  | 'proposta'
  | 'comprou'
  | 'alugou'
  | 'nova'
  | 'atendida'
  | 'concluida'
  | 'repassada'

export type ReferralChannel = 'link_publico' | 'manual'

export interface ReferralHistoryItem {
  date: string
  action: string
  description: string
  actor?: string
  from_user_id?: string
  from_user_name?: string
  to_user_id?: string
  to_user_name?: string
  reason?: string | null
}

export interface Member {
  id: string
  name: string
  email: string
  verified?: boolean
  agency?: string
  phone?: string
  public_slug?: string
  avatar?: string
  is_admin?: boolean
  is_operador?: boolean
  is_financeiro?: boolean
  creci?: string
  created: string
  updated: string
}

export interface PublicMemberInfo {
  id: string
  name: string
  agency?: string
  phone?: string
  public_slug?: string
}

export interface Condominium {
  id: string
  name: string
  neighborhood: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  active?: boolean
  created?: string
  updated?: string
}

export interface ReferralEvent {
  id: string
  referral_id: string
  from_status?: string
  to_status: string
  actor_id?: string
  actor_name?: string
  reason?: string
  public_reason_code?: string
  public_label?: string
  visible_to_participant?: boolean
  metadata?: any
  created: string
}

export interface DuplicateFlag {
  id: string
  referral_id: string
  conflicting_referral_id?: string
  conflict_type: string
  conflict_details: string
  is_resolved?: boolean
  resolution_action?: string
  resolved_by?: string
  resolved_at?: string
  created: string
  expand?: {
    conflicting_referral_id?: Referral
  }
}

export interface ContactAttempt {
  id: string
  referral_id: string
  operator_id: string
  channel: 'whatsapp' | 'telefone' | 'email' | 'presencial'
  outcome: 'sucesso' | 'sem_resposta' | 'recusou' | 'numero_invalido' | 'agendou_retorno' | 'outro'
  notes?: string
  scheduled_callback_at?: string
  created: string
  expand?: {
    operator_id?: Member
  }
}

export interface ReferralNote {
  id: string
  referral_id: string
  author_id: string
  content: string
  created: string
  expand?: {
    author_id?: Member
  }
}

export interface ReferralTask {
  id: string
  referral_id: string
  assigned_to?: string
  title: string
  description?: string
  due_date?: string
  is_completed?: boolean
  completed_at?: string
  completed_by?: string
  created: string
  expand?: {
    assigned_to?: Member
  }
}

export interface DocumentItem {
  id: string
  referral_id?: string
  participant_id?: string
  bucket_type: 'capture-documents' | 'partner-contracts'
  title: string
  file: string
  uploaded_by: string
  file_type?: string
  notes?: string
  created: string
  expand?: {
    uploaded_by?: Member
  }
}

export interface CaptureRecord {
  id: string
  referral_id: string
  instrument_type:
    | 'autorizacao_exclusiva'
    | 'autorizacao_simples'
    | 'contrato_parceria'
    | 'termo_opcao'
  document_id: string
  requested_by: string
  requested_at: string
  status: 'solicitada' | 'aprovada' | 'devolvida'
  approved_by?: string
  approved_at?: string
  return_reason?: string
  created: string
  expand?: {
    document_id?: DocumentItem
    requested_by?: Member
    approved_by?: Member
  }
}

export interface Deal {
  id: string
  owner_referral_id?: string
  buyer_referral_id?: string
  deal_type: 'venda' | 'locacao'
  value_brl: number
  deal_date: string
  commission_received_at?: string
  commission_received_brl?: number
  commission_split?: any
  cancelled_at?: string
  cancel_reason?: string
  property_description?: string
  registered_by: string
  created: string
  expand?: {
    owner_referral_id?: Referral
    buyer_referral_id?: Referral
    registered_by?: Member
  }
}

export interface Participant {
  id: string
  user_id: string
  category_id: string
  level_id?: string
  status: 'pendente_aprovacao' | 'ativo' | 'suspenso' | 'inativo'
  pix_key?: string
  pix_key_type?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
  referral_code?: string
  notes?: string
  approved_at?: string
  approved_by?: string
  created: string
  updated: string
  expand?: {
    user_id?: Member
    category_id?: {
      id: string
      name: string
      slug: string
      front: string
      requires_approval: boolean
    }
    level_id?: { id: string; name: string; slug: string; reward_percentage?: number }
    approved_by?: Member
  }
}

export interface Referral {
  id: string
  type: ReferralType
  referral_type?: 'proprietario' | 'comprador'
  referrer_name: string
  referrer_phone: string
  description: string
  return_contact: string
  status: ReferralStatus
  channel?: ReferralChannel
  current_owner_id: string
  original_owner_id: string
  participant_id?: string
  assigned_operator_id?: string
  condominium_id?: string
  unit?: string
  normalized_address?: string
  owner_name?: string
  owner_phone?: string
  owner_email?: string
  owner_cpf?: string
  target_neighborhood?: string
  buyer_name?: string
  buyer_phone?: string
  buyer_email?: string
  source_origin?: string
  attribution_status?: 'atribuida' | 'pendente' | 'recusada'
  attribution_hint?: string
  consent_declared?: boolean
  consent_confirmed_by_operator?: boolean
  status_reason?: string
  public_reason_code?: string
  loss_responsibility?: 'proprietario' | 'indicacao_invalida'
  declined_reason?: string
  declined_by?: string
  listing_link?: string
  is_reserved_listing?: boolean
  public_summary?: string
  public_photos?: any
  deal_value_brl?: number
  deal_date?: string
  deal_property_description?: string
  attended_at?: string
  primeira_visita_at?: string
  capacidade_financeira_demonstrada?: 'sim' | 'nao' | boolean | string
  tipo_comprovacao_financeira?: string
  descricao_comprovacao_financeira?: string
  consent_status?: string
  first_contact_at?: string
  first_contact_by?: string
  history?: ReferralHistoryItem[] | string
  created: string
  updated: string
  // Expanded relations
  expand?: {
    current_owner_id?: Member
    original_owner_id?: Member
    assigned_operator_id?: Member
    first_contact_by?: Member
    condominium_id?: Condominium
    participant_id?: Participant
  }
}

export interface CreateReferralPayload {
  type: ReferralType
  referral_type?: 'proprietario' | 'comprador'
  referrer_name: string
  referrer_phone: string
  description: string
  return_contact: string
  channel?: ReferralChannel
  condominium_id?: string
  unit?: string
  owner_name?: string
  owner_phone?: string
  owner_email?: string
  buyer_name?: string
  buyer_phone?: string
  buyer_email?: string
  target_neighborhood?: string
  consent_declared?: boolean
}

export interface PublicReferralSubmissionPayload {
  memberIdentifier: string
  type: ReferralType
  referrer_name: string
  referrer_phone: string
  description: string
  return_contact: string
  campaign_code?: string
}
