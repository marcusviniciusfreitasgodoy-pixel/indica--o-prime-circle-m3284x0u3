import pb from '@/lib/pocketbase/client'
import type { RewardRule } from '@/services/rewards'

export interface RewardValues {
  firstVisitBrl: number | null
  closingBuyerBrl: number | null
  closingOwnerSaleBrl: number | null
}

export interface ClosingRewardsPreview {
  buyer: number | null
  ownerSale: number | null
}

function ruleAmount(rule: RewardRule): number | null {
  if (rule.reward_type !== 'valor_fixo') return null
  const amount = Number(rule.fixed_amount_brl || 0)
  return amount > 0 ? amount : null
}

/**
 * Valores exibidos nas telas, lidos das REGRAS ATIVAS no banco (nunca escritos à mão).
 * Pega a versão mais recente de cada combinação (categoria × marco × tipo).
 */
export async function getProgramRewardValues(categoryId?: string): Promise<RewardValues> {
  const empty: RewardValues = {
    firstVisitBrl: null,
    closingBuyerBrl: null,
    closingOwnerSaleBrl: null,
  }
  if (!categoryId) return empty

  try {
    const filter = `category_id = "${categoryId}" && active = true`
    const rules = await pb.collection('reward_rules').getFullList<RewardRule>({
      filter,
      sort: '-version',
    })
    if (!rules.length) return empty

    const byKey = (milestone: string, referralType: string) =>
      rules
        .filter(
          (r) =>
            r.milestone === milestone &&
            r.beneficiary_type === 'indicador' &&
            (r.referral_type === referralType || r.referral_type === 'todos') &&
            (!r.valid_to || new Date(r.valid_to) >= new Date()),
        )
        .sort((a, b) => (b.version || 0) - (a.version || 0))[0]

    const firstVisit = byKey('primeira_visita_realizada', 'comprador')
    const closingBuyer = byKey('fechamento', 'comprador')
    const closingOwner = byKey('fechamento', 'proprietario_venda')

    return {
      firstVisitBrl: firstVisit ? ruleAmount(firstVisit) : null,
      closingBuyerBrl: closingBuyer ? ruleAmount(closingBuyer) : null,
      closingOwnerSaleBrl: closingOwner ? ruleAmount(closingOwner) : null,
    }
  } catch {
    return empty
  }
}

/**
 * Recompensas de fechamento previstas para uma indicação (valores lidos das regras ativas).
 * Exibidas na tela de detalhe; a geração real acontece no backend ao registrar a comissão.
 */
export async function getClosingRewardsPreview(
  referralType: string,
  categoryId?: string,
): Promise<ClosingRewardsPreview> {
  const empty: ClosingRewardsPreview = { buyer: null, ownerSale: null }
  if (!categoryId) return empty

  try {
    const filter = `category_id = "${categoryId}" && milestone = "fechamento" && beneficiary_type = "indicador" && active = true`
    const rules = await pb.collection('reward_rules').getFullList<RewardRule>({
      filter,
      sort: '-version',
    })
    if (!rules.length) return empty

    const pick = (referralTypeWanted: string) => {
      const rule = rules
        .filter(
          (r) =>
            (r.referral_type === referralTypeWanted || r.referral_type === 'todos') &&
            (!r.valid_to || new Date(r.valid_to) >= new Date()),
        )
        .sort((a, b) => (b.version || 0) - (a.version || 0))[0]
      return rule ? ruleAmount(rule) : null
    }

    if (referralType === 'comprador') {
      return { ...empty, buyer: pick('comprador') }
    }
    if (referralType === 'proprietario_venda') {
      return { ...empty, ownerSale: pick('proprietario_venda') }
    }
    return empty
  } catch {
    return empty
  }
}
