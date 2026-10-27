import pb from '@/lib/pocketbase/client'

export interface RewardRule {
  id: string
  category_id: string
  referral_type: string
  milestone: string
  beneficiary_type: string
  campaign_id?: string
  condominium_id?: string
  reward_type: string
  fixed_amount_brl?: number
  percentage_value?: number
  brackets?: string
  catalog_description?: string
  valid_from?: string
  valid_to?: string
  version: number
  active: boolean
  released_for_use: boolean
  created?: string
  updated?: string
  expand?: {
    category_id?: { id: string; name: string; slug: string; requires_creci?: boolean }
    campaign_id?: { id: string; name: string; code: string }
    condominium_id?: { id: string; name: string }
  }
}

export interface Reward {
  id: string
  referral_id: string
  deal_id?: string
  milestone: 'captada' | 'fechamento'
  beneficiary_type: 'indicador' | 'cliente'
  participant_id: string
  rule_id: string
  reward_type: string
  calculated_amount_brl: number
  adjusted_amount_brl?: number
  adjustment_reason?: string
  final_amount_brl: number
  status:
    | 'aguardando_comissao'
    | 'em_analise'
    | 'em_revisao_admin'
    | 'pendente_dados'
    | 'aprovada'
    | 'em_lote'
    | 'paga'
    | 'cancelada'
  approved_at?: string
  approved_by?: string
  approval_justification?: string
  batch_id?: string
  payment_method?: string
  paid_at?: string
  payment_reference?: string
  payment_notes?: string
  payment_proof_file?: string
  via_decline?: boolean
  orange_flag_reason?: string
  orange_flag_resolved_at?: string
  orange_flag_resolved_by?: string
  created?: string
  updated?: string
  expand?: {
    referral_id?: {
      id: string
      type?: string
      referral_type?: string
      referrer_name?: string
      referrer_phone?: string
      owner_name?: string
      buyer_name?: string
      condominium_id?: string
      expand?: {
        condominium_id?: { id: string; name: string }
      }
    }
    participant_id?: {
      id: string
      user_id?: string
      cpf?: string
      pix_key?: string
      address?: string
      expand?: {
        user_id?: { id: string; name: string; email: string; phone?: string }
      }
    }
    rule_id?: RewardRule
    deal_id?: {
      id: string
      deal_type?: string
      value_brl?: number
      deal_date?: string
      commission_received_brl?: number
      commission_received_at?: string
      owner_referral_id?: string
      buyer_referral_id?: string
    }
  }
}

export interface PaymentBatch {
  id: string
  month_ref: string
  status: 'aberto' | 'em_conferencia' | 'fechado' | 'pago'
  reckoning_date?: string
  due_date?: string
  total_amount_brl: number
  item_count: number
  closed_at?: string
  closed_by?: string
  created?: string
  updated?: string
}

export async function listRewards(filter?: string, sort = '-created'): Promise<Reward[]> {
  return await pb.collection('rewards').getFullList<Reward>({
    filter: filter || '',
    sort,
    expand:
      'referral_id,referral_id.condominium_id,participant_id,participant_id.user_id,rule_id,deal_id',
  })
}

export async function listRewardRules(filter?: string): Promise<RewardRule[]> {
  return await pb.collection('reward_rules').getFullList<RewardRule>({
    filter: filter || '',
    sort: 'category_id,milestone,-version',
    expand: 'category_id,campaign_id,condominium_id',
  })
}

export async function listPaymentBatches(): Promise<PaymentBatch[]> {
  return await pb.collection('payment_batches').getFullList<PaymentBatch>({
    sort: '-month_ref',
  })
}

export async function registerCommissionReceived(
  dealId: string,
  dataStr: string,
  valorRecebido: number,
) {
  return await pb.send('/backend/v1/rewards/register-commission-received', {
    method: 'POST',
    body: {
      deal_id: dealId,
      data: dataStr,
      valor_recebido: valorRecebido,
    },
  })
}

export async function cancelDeal(dealId: string, motivo: string) {
  return await pb.send('/backend/v1/rewards/cancel-deal', {
    method: 'POST',
    body: {
      deal_id: dealId,
      motivo,
    },
  })
}

export async function resolveRelatedIndicators(
  dealId: string,
  decisao: 'confirmar_independencia' | 'aplicar_indicador_unico',
  motivo: string,
) {
  return await pb.send('/backend/v1/rewards/resolve-related-indicators', {
    method: 'POST',
    body: {
      deal_id: dealId,
      decisao,
      motivo,
    },
  })
}

export async function approveReward(rewardId: string, justificativa: string) {
  return await pb.send('/backend/v1/rewards/approve-reward', {
    method: 'POST',
    body: {
      reward_id: rewardId,
      justificativa,
    },
  })
}

export async function registerRewardPayment(
  rewardId: string,
  paymentMethod: string,
  paidAt: string,
  file: File,
  reference?: string,
  notes?: string,
) {
  const formData = new FormData()
  formData.append('reward_id', rewardId)
  formData.append('payment_method', paymentMethod)
  formData.append('paid_at', paidAt)
  if (reference) formData.append('payment_reference', reference)
  if (notes) formData.append('payment_notes', notes)
  formData.append('payment_proof_file', file)

  return await pb.send('/backend/v1/rewards/register-payment', {
    method: 'POST',
    body: formData,
  })
}

export async function buildPaymentBatch(monthRef?: string) {
  return await pb.send('/backend/v1/rewards/build-payment-batch', {
    method: 'POST',
    body: {
      month_ref: monthRef || '',
    },
  })
}

export async function closePaymentBatch(batchId: string) {
  return await pb.send('/backend/v1/rewards/close-batch', {
    method: 'POST',
    body: {
      batch_id: batchId,
    },
  })
}
