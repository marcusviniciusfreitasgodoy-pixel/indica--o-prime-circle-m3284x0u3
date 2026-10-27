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
 * Get all referrals visible to the logged-in member
 * (where they are either current_owner_id or original_owner_id)
 */
export async function getMemberReferrals(): Promise<Referral[]> {
  const records = await pb.collection('referrals').getFullList<Referral>({
    sort: '-created',
    expand: 'current_owner_id,original_owner_id',
  })
  return records
}

/**
 * Get a single referral by ID with owner information expanded
 */
export async function getReferralById(id: string): Promise<Referral> {
  const record = await pb.collection('referrals').getOne<Referral>(id, {
    expand: 'current_owner_id,original_owner_id',
  })
  return record
}

/**
 * Create a referral manually by the logged in member
 */
export async function createManualReferral(
  payload: CreateReferralPayload,
  currentUserId: string,
  currentUserName: string,
): Promise<Referral> {
  const now = new Date().toISOString()
  const historyItem: ReferralHistoryItem = {
    date: now,
    action: 'criada_manual',
    description: `Indicação cadastrada manualmente por ${currentUserName || 'Membro'}`,
    actor: currentUserName || 'Membro',
    to_user_id: currentUserId,
    to_user_name: currentUserName || 'Membro',
  }

  const record = await pb.collection('referrals').create<Referral>({
    type: payload.type,
    referrer_name: payload.referrer_name,
    referrer_phone: payload.referrer_phone,
    description: payload.description,
    return_contact: payload.return_contact,
    status: 'nova',
    channel: 'manual',
    current_owner_id: currentUserId,
    original_owner_id: currentUserId,
    history: [historyItem],
  })

  return record
}

/**
 * Update referral status (e.g. em_atendimento, atendida, concluida)
 */
export async function updateReferralStatus(
  referral: Referral,
  newStatus: ReferralStatus,
  currentUserId: string,
  currentUserName: string,
  notes?: string,
): Promise<Referral> {
  const historyList = parseReferralHistory(referral.history)
  const now = new Date().toISOString()

  const statusLabels: Partial<Record<ReferralStatus, string>> = {
    recebida: 'Recebida',
    em_triagem: 'Em Triagem',
    aceita: 'Aceita',
    em_contato: 'Em Contato',
    qualificada: 'Qualificada',
    em_negociacao: 'Em Negociação',
    captacao_solicitada: 'Captação Solicitada',
    captada: 'Captada',
    em_divulgacao: 'Em Divulgação',
    vendida: 'Vendida',
    alugada: 'Alugada',
    recusada: 'Recusada',
    duplicada: 'Duplicada',
    perdida: 'Perdida',
    declinada_pela_godoy: 'Declinada pela Godoy',
    retirada: 'Retirada',
    cancelada: 'Cancelada',
    em_atendimento: 'Em Atendimento',
    visitando: 'Visitando',
    proposta: 'Proposta',
    comprou: 'Comprou',
    alugou: 'Alugou',
    nova: 'Nova',
    atendida: 'Atendida',
    concluida: 'Concluída',
    repassada: 'Repassada',
  }

  const historyItem: ReferralHistoryItem = {
    date: now,
    action: `status_${newStatus}`,
    description: `Status alterado para "${statusLabels[newStatus]}" por ${currentUserName || 'Membro'}${
      notes ? ` (${notes})` : ''
    }`,
    actor: currentUserName || 'Membro',
    from_user_id: currentUserId,
    from_user_name: currentUserName,
    reason: notes,
  }

  const patchData: Record<string, unknown> = {
    status: newStatus,
    history: [...historyList, historyItem],
  }

  if (newStatus === 'atendida' || newStatus === 'em_atendimento') {
    if (!referral.attended_at) {
      patchData.attended_at = now
    }
  }

  const updated = await pb.collection('referrals').update<Referral>(referral.id, patchData)
  return updated
}

/**
 * Transfer referral to another network member via custom backend endpoint
 */
export async function transferReferral(
  referralId: string,
  targetMemberId: string,
  reason?: string,
): Promise<{ success: boolean; message: string; newOwnerId?: string; newOwnerName?: string }> {
  const res = await pb.send<{
    success: boolean
    message: string
    newOwnerId: string
    newOwnerName: string
  }>(`/backend/v1/referrals/${referralId}/transfer`, {
    method: 'POST',
    body: {
      target_member_id: targetMemberId,
      reason: reason || '',
    },
  })
  return res
}

/**
 * Check and execute auto-transfers for unattended referrals older than 3 days
 */
export async function triggerAutoTransfersCheck(): Promise<{
  success: boolean
  transferredCount: number
}> {
  try {
    const res = await pb.send<{ success: boolean; transferredCount: number }>(
      '/backend/v1/referrals/check-auto-transfers',
      {
        method: 'POST',
      },
    )
    return res
  } catch (err) {
    console.warn('Auto-transfers check failed or endpoint not reached:', err)
    return { success: false, transferredCount: 0 }
  }
}

/**
 * Get all members in the network (for the transfer dropdown and member directory)
 */
export async function getNetworkMembers(): Promise<Member[]> {
  const members = await pb.collection('users').getFullList<Member>({
    sort: 'name',
  })
  return members
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
