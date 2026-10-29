import pb from '@/lib/pocketbase/client'
import {
  Referral,
  CreateReferralPayload,
  PublicReferralSubmissionPayload,
  PublicMemberInfo,
  Member,
  ReferralStatus,
  ReferralHistoryItem,
} from '@/types/referral'

export interface ParticipantReferralItem {
  id: string
  protocol: string
  type: string
  referral_type: string
  indicated_first_name: string
  neighborhood: string
  status: ReferralStatus
  public_stage: string
  timeline_stage?: string
  created: string
  updated: string
  attended_at: string | null
  primeira_visita_at?: string | null
  deal_date: string | null
  public_reason_code: string
  status_reason: string
  channel: string
  description?: string
  public_summary?: string
  events: Array<{
    id: string
    created: string
    public_label: string
    reason: string
  }>
}

export interface DirectReferralPayload {
  referral_type: 'proprietario' | 'comprador' | 'proprietario_locacao'
  indicated_name: string
  indicated_phone: string
  indicated_email?: string
  target_neighborhood?: string
  notes?: string
  consent_declared: boolean
  consent_status: 'declarado_indicador'
}

/**
 * Normalizes referral history whether it's stored as parsed JSON or raw string
 */
export function parseReferralHistory(history: unknown): ReferralHistoryItem[] {
  if (!history) return []
  if (Array.isArray(history)) return history
  if (typeof history === 'string') {
    try {
      const parsed = JSON.parse(history)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * Helper to convert ParticipantReferralItem to Referral format compatible with Member UI
 */
export function participantItemToReferral(item: ParticipantReferralItem): Referral {
  const historyItems: ReferralHistoryItem[] = (item.events || []).map((ev) => ({
    date: ev.created,
    action: ev.public_label || 'atualizacao',
    description: ev.public_label || 'Atualização de status',
    actor: 'Equipe Godoy Prime',
    reason: ev.reason || undefined,
  }))

  return {
    id: item.id,
    type: item.type as any,
    referral_type: item.referral_type as any,
    referrer_name: item.indicated_first_name,
    referrer_phone: 'Protegido (LGPD)',
    description: item.description || `Indicação em ${item.neighborhood}`,
    return_contact: 'Canal Seguro Prime Circle',
    status: item.status,
    channel: (item.channel as any) || 'manual',
    current_owner_id: pb.authStore.record?.id || '',
    original_owner_id: pb.authStore.record?.id || '',
    attended_at: item.attended_at || undefined,
    deal_date: item.deal_date || undefined,
    public_reason_code: item.public_reason_code || undefined,
    status_reason: item.status_reason || undefined,
    created: item.created,
    updated: item.updated,
    history: historyItems,
    expand: {
      current_owner_id: pb.authStore.record as unknown as Member,
      original_owner_id: pb.authStore.record as unknown as Member,
    },
  }
}

/**
 * Get all referrals visible to the logged-in member via secure server route
 * /backend/v1/participant/my-referrals (LGPD compliant, no sensitive contacts exposed)
 */
export async function getMemberReferrals(): Promise<Referral[]> {
  const res = await pb.send<{ items: ParticipantReferralItem[] }>(
    '/backend/v1/referrals/my-referrals',
    {
      method: 'POST',
      body: {},
    },
  )
  const items = res.items || []
  return items.map(participantItemToReferral)
}

/**
 * Get raw participant referral items
 */
export async function getRawMemberReferrals(): Promise<ParticipantReferralItem[]> {
  const res = await pb.send<{ items: ParticipantReferralItem[] }>(
    '/backend/v1/referrals/my-referrals',
    {
      method: 'POST',
      body: {},
    },
  )
  return res.items || []
}

/**
 * Submit direct referral from panel (allowed only for categories without link_only)
 */
export async function submitDirectReferral(
  payload: DirectReferralPayload,
): Promise<{ success: boolean; message: string; id: string; protocol: string }> {
  const res = await pb.send<{
    success: boolean
    message: string
    id: string
    protocol: string
  }>('/backend/v1/referrals/submit-direct-referral', {
    method: 'POST',
    body: payload,
  })
  return res
}

/**
 * Get a single referral by ID using the secure participant route
 */
export async function getReferralById(id: string): Promise<Referral> {
  const res = await pb.send<{ items: ParticipantReferralItem[] }>(
    `/backend/v1/participant/my-referrals?id=${encodeURIComponent(id)}`,
    {
      method: 'GET',
    },
  )
  const item = (res.items || []).find((i) => i.id === id)
  if (!item) {
    throw new Error('Indicação não encontrada ou você não tem permissão para acessá-la.')
  }
  return participantItemToReferral(item)
}

/**
 * Create a referral manually by the logged in member via secure server route
 */
export async function createManualReferral(
  payload: CreateReferralPayload,
  currentUserId: string,
  currentUserName: string,
): Promise<{ success: boolean; message: string; id: string; memberName: string }> {
  const res = await pb.send<{
    success: boolean
    message: string
    id: string
    memberName: string
  }>('/backend/v1/public-referrals', {
    method: 'POST',
    body: {
      memberIdentifier: currentUserId,
      type: payload.type,
      referrer_name: payload.referrer_name,
      referrer_phone: payload.referrer_phone,
      description: payload.description,
      return_contact: payload.return_contact,
      channel: 'manual',
    },
  })
  return res
}

/**
 * Update referral status via secure server endpoint (/backend/v1/referrals/change-status)
 */
export async function updateReferralStatus(
  referral: Referral | { id: string },
  newStatus: ReferralStatus,
  currentUserId?: string,
  currentUserName?: string,
  notes?: string,
): Promise<{ success: boolean; message: string; referral_id: string; status: string }> {
  const res = await pb.send<{
    success: boolean
    message: string
    referral_id: string
    status: string
  }>('/backend/v1/referrals/change-status', {
    method: 'POST',
    body: {
      referral_id: referral.id,
      target_status: newStatus,
      status_reason: notes || 'Atualização via painel',
      public_reason_code: notes ? 'outros' : undefined,
    },
  })
  return res
}

/**
 * Get network members safe helper.
 * Since participants cannot read other users directly from users collection due to RLS,
 * returns current user or queries users if role permits.
 */
export async function getNetworkMembers(): Promise<Member[]> {
  try {
    const cur = pb.authStore.record as unknown as Member
    if (!cur) return []

    // Usuário comum (não admin/operador/financeiro) não pode listar todos os usuários da coleção users devido ao RLS.
    // Retorna apenas a si mesmo sem disparar request desnecessário.
    const isInternal = !!(cur.is_admin || cur.is_operador || cur.is_financeiro)
    if (!isInternal) {
      return [cur]
    }

    const members = await pb.collection('users').getFullList<Member>({
      sort: 'name',
    })
    return members
  } catch {
    // If participant is restricted, return current user record only
    const cur = pb.authStore.record as unknown as Member
    return cur ? [cur] : []
  }
}

/**
 * Public route to resolve member info by public slug or user id
 */
export async function getPublicMemberInfo(slugOrId: string): Promise<PublicMemberInfo> {
  const res = await pb.send<PublicMemberInfo>(`/backend/v1/public-member/${slugOrId}`, {
    method: 'GET',
  })
  return res
}

/**
 * Public submission of referral through member's public link
 */
export async function submitPublicReferral(
  payload: PublicReferralSubmissionPayload,
): Promise<{ success: boolean; message: string; id: string; memberName: string }> {
  const res = await pb.send<{
    success: boolean
    message: string
    id: string
    memberName: string
  }>('/backend/v1/public-referrals', {
    method: 'POST',
    body: payload,
  })
  return res
}
