import pb from '@/lib/pocketbase/client'
import {
  DuplicateFlag,
  ContactAttempt,
  ReferralNote,
  ReferralTask,
  DocumentItem,
  CaptureRecord,
  ReferralEvent,
} from '@/types/referral'

const BACKEND_URL = import.meta.env.VITE_POCKETBASE_URL || ''

/**
 * Change status with transition matrix enforcement
 */
export async function changeReferralStatus(params: {
  referral_id: string
  target_status: string
  status_reason?: string
  public_reason_code?: string
  loss_responsibility?: 'proprietario' | 'indicacao_invalida'
  deal_value_brl?: number
  deal_date?: string
  deal_property_description?: string
}) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/referrals/change-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao alterar status da indicação.')
  }
  return data
}

/**
 * Decline by Godoy Prime (admin only)
 */
export async function declineByGodoy(referralId: string, declinedReason: string) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/referrals/decline-by-godoy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({
      referral_id: referralId,
      declined_reason: declinedReason,
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao declinar pela Godoy.')
  }
  return data
}

/**
 * Formalize capture request
 */
export async function requestCapture(params: {
  referral_id: string
  document_id: string
  instrument_type: string
}) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/referrals/request-capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao solicitar formalização de captação.')
  }
  return data
}

/**
 * Approve capture (admin or operator, must be DIFFERENT user from requester)
 */
export async function approveCapture(captureId: string) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/referrals/approve-capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({ capture_id: captureId }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao aprovar captação.')
  }
  return data
}

/**
 * Return capture to negotiation with reason
 */
export async function returnCapture(captureId: string, returnReason: string) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/referrals/return-capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({ capture_id: captureId, return_reason: returnReason }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao devolver formalização.')
  }
  return data
}

/**
 * Register listing
 */
export async function registerListing(params: {
  referral_id: string
  listing_link?: string
  is_reserved_listing?: boolean
  public_summary: string
  public_photos?: string[]
}) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/referrals/register-listing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao registrar anúncio.')
  }
  return data
}

/**
 * Register deal (admin only)
 */
export async function registerDeal(params: {
  owner_referral_id?: string
  buyer_referral_id?: string
  deal_type: 'venda' | 'locacao'
  value_brl: number
  deal_date: string
  property_description?: string
}) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/referrals/register-deal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao registrar negócio.')
  }
  return data
}

/**
 * Resolve attribution hint
 */
export async function resolveAttributionHint(params: {
  referral_id: string
  action: 'confirmar' | 'recusar'
  target_member_id?: string
}) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/referrals/resolve-attribution-hint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao resolver atribuição.')
  }
  return data
}

/**
 * Confirm consent by operator
 */
export async function confirmConsent(referralId: string) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/referrals/confirm-consent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({ referral_id: referralId }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao confirmar consentimento.')
  }
  return data
}

/**
 * Assign operator via server endpoint
 */
export async function assignOperator(referralId: string, operatorId: string | null) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/referrals/assign-operator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({ referral_id: referralId, operator_id: operatorId }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao atribuir operador.')
  }
  return data
}

/**
 * Get short-lived signed download URL for protected documents
 */
/**
 * Public vitrine property fetcher (safe, no address/unit exposed)
 */
export async function getPublicVitrineProperty(imovelId: string) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/public/vitrine/${imovelId}`)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Imóvel não encontrado na vitrine.')
  }
  return data as {
    id: string
    condo_name: string
    neighborhood: string
    public_summary: string
    public_photos: string[]
    listing_link?: string
    is_reserved_listing: boolean
  }
}

export async function getDocumentDownloadUrl(documentId: string) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/documents/${documentId}/download-url`, {
    headers: {
      Authorization: pb.authStore.token,
    },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao obter link seguro do documento.')
  }
  return `${BACKEND_URL}${data.url}`
}

/**
 * Submit buyer lead from public vitrine
 */
export async function submitBuyerLead(payload: {
  referral_code: string
  property_referral_id?: string
  name: string
  phone: string
  email?: string
  notes?: string
}) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/public/submit-buyer-lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao enviar interesse.')
  }
  return data
}

/**
 * Approve participant
 */
export async function approveParticipant(participantId: string) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/admin/participants/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({ participant_id: participantId }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao aprovar participante.')
  }
  return data
}

/**
 * Suspend participant
 */
export async function suspendParticipant(participantId: string, reason: string) {
  const res = await fetch(`${BACKEND_URL}/backend/v1/admin/participants/suspend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({ participant_id: participantId, reason }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Erro ao suspender participante.')
  }
  return data
}

/**
 * Fetch public reason codes list
 */
export async function getPublicReasonCodes() {
  return pb.collection('public_reason_codes').getFullList({ sort: 'category,display_text' })
}

/**
 * Fetch timeline events of referral
 */
export async function getReferralEvents(referralId: string): Promise<ReferralEvent[]> {
  const records = await pb.collection('referral_events').getFullList<ReferralEvent>({
    filter: `referral_id = "${referralId}"`,
    sort: '-created',
  })
  return records
}

/**
 * Fetch duplicate flags
 */
export async function getDuplicateFlags(referralId?: string): Promise<DuplicateFlag[]> {
  const filter = referralId ? `referral_id = "${referralId}"` : ''
  const records = await pb.collection('duplicate_flags').getFullList<DuplicateFlag>({
    filter,
    sort: '-created',
    expand: 'conflicting_referral_id,conflicting_referral_id.current_owner_id',
  })
  return records
}

/**
 * Contact attempts
 */
export async function getContactAttempts(referralId: string): Promise<ContactAttempt[]> {
  return pb.collection('contact_attempts').getFullList<ContactAttempt>({
    filter: `referral_id = "${referralId}"`,
    sort: '-created',
    expand: 'operator_id',
  })
}

export async function addContactAttempt(data: {
  referral_id: string
  channel: 'whatsapp' | 'telefone' | 'email' | 'presencial'
  outcome: 'sucesso' | 'sem_resposta' | 'recusou' | 'numero_invalido' | 'agendou_retorno' | 'outro'
  notes?: string
  scheduled_callback_at?: string
}) {
  return pb.collection('contact_attempts').create({
    ...data,
    operator_id: pb.authStore.record?.id,
  })
}

/**
 * Referral notes (internal)
 */
export async function getReferralNotes(referralId: string): Promise<ReferralNote[]> {
  return pb.collection('referral_notes').getFullList<ReferralNote>({
    filter: `referral_id = "${referralId}"`,
    sort: '-created',
    expand: 'author_id',
  })
}

export async function addReferralNote(referralId: string, content: string) {
  return pb.collection('referral_notes').create({
    referral_id: referralId,
    content,
    author_id: pb.authStore.record?.id,
  })
}

/**
 * Referral tasks
 */
export async function getReferralTasks(referralId: string): Promise<ReferralTask[]> {
  return pb.collection('referral_tasks').getFullList<ReferralTask>({
    filter: `referral_id = "${referralId}"`,
    sort: 'is_completed,due_date',
    expand: 'assigned_to',
  })
}

export async function addReferralTask(data: {
  referral_id: string
  title: string
  description?: string
  due_date?: string
  assigned_to?: string
}) {
  return pb.collection('referral_tasks').create({
    ...data,
    is_completed: false,
  })
}

export async function toggleReferralTask(taskId: string, isCompleted: boolean) {
  return pb.collection('referral_tasks').update(taskId, {
    is_completed: isCompleted,
    completed_at: isCompleted ? new Date().toISOString() : null,
    completed_by: isCompleted ? pb.authStore.record?.id : null,
  })
}

/**
 * Documents
 */
export async function getReferralDocuments(referralId: string): Promise<DocumentItem[]> {
  return pb.collection('documents').getFullList<DocumentItem>({
    filter: `referral_id = "${referralId}"`,
    sort: '-created',
    expand: 'uploaded_by',
  })
}

export async function uploadDocument(formData: FormData): Promise<DocumentItem> {
  return pb.collection('documents').create<DocumentItem>(formData)
}

/**
 * Capture records
 */
export async function getCaptureRecords(referralId: string): Promise<CaptureRecord[]> {
  return pb.collection('capture_records').getFullList<CaptureRecord>({
    filter: `referral_id = "${referralId}"`,
    sort: '-created',
    expand: 'document_id,requested_by,approved_by',
  })
}
