import pb from '@/lib/pocketbase/client'

export interface PendingAcceptanceDoc {
  document_id: string
  slug: string
  title: string
  version: number
  is_provisional: boolean
  is_required: boolean
}

export interface PendingAcceptancesResponse {
  has_pending: boolean
  pending: PendingAcceptanceDoc[]
}

export interface AcceptDocumentsResponse {
  success: boolean
  accepted_count: number
  remaining: string[]
}

const BACKEND_URL = import.meta.env.VITE_POCKETBASE_URL || ''

function authHeaders(): Record<string, string> {
  const token = pb.authStore.token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: token } : {}),
  }
}

/**
 * Consulta os documentos jurídicos ATIVOS obrigatórios que o usuário ainda
 * não aceitou na versão vigente. Equipe interna recebe lista vazia.
 */
export async function getPendingAcceptances(): Promise<PendingAcceptancesResponse> {
  const res = await fetch(`${BACKEND_URL}/backend/v1/participant/pending-acceptances`, {
    method: 'GET',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Não foi possível consultar os documentos pendentes.')
  }
  return res.json()
}

/**
 * Grava o aceite dos documentos informados (ids devem ser os das versões
 * vigentes ativas). Idempotente.
 */
export async function acceptDocuments(documentIds: string[]): Promise<AcceptDocumentsResponse> {
  const res = await fetch(`${BACKEND_URL}/backend/v1/participant/accept-documents`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ document_ids: documentIds }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'Não foi possível gravar o aceite dos documentos.')
  }
  return res.json()
}
