export type ReferralType = 'imovel' | 'cliente'

export type ReferralStatus = 'nova' | 'em_atendimento' | 'atendida' | 'concluida' | 'repassada'

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
  agency?: string
  phone?: string
  public_slug?: string
  avatar?: string
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

export interface Referral {
  id: string
  type: ReferralType
  referrer_name: string
  referrer_phone: string
  description: string
  return_contact: string
  status: ReferralStatus
  channel?: ReferralChannel
  current_owner_id: string
  original_owner_id: string
  attended_at?: string
  history?: ReferralHistoryItem[] | string
  created: string
  updated: string
  // Expanded relations
  expand?: {
    current_owner_id?: Member
    original_owner_id?: Member
  }
}

export interface CreateReferralPayload {
  type: ReferralType
  referrer_name: string
  referrer_phone: string
  description: string
  return_contact: string
  channel?: ReferralChannel
}

export interface PublicReferralSubmissionPayload {
  memberIdentifier: string
  type: ReferralType
  referrer_name: string
  referrer_phone: string
  description: string
  return_contact: string
}
