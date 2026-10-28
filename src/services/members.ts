import pb from '@/lib/pocketbase/client'
import { Member } from '@/types/referral'

export async function getCurrentMemberProfile(): Promise<Member | null> {
  const authRecord = pb.authStore.record
  if (!authRecord) return null

  try {
    const user = await pb.collection('users').getOne<Member>(authRecord.id)
    return user
  } catch {
    return authRecord as unknown as Member
  }
}

export async function updateMemberProfile(
  id: string,
  data: {
    name?: string
    agency?: string
    phone?: string
    public_slug?: string
    address?: string
    pix_key?: string
    pix_key_type?: string
    condominium_name?: string
  },
): Promise<{ success: boolean; message: string; user?: Member }> {
  // Use secure server endpoint to prevent direct collection manipulation
  const res = await pb.send<{
    success: boolean
    message: string
    user: Member
    participant: unknown
  }>('/backend/v1/participant/update-profile', {
    method: 'POST',
    body: data,
  })
  return res
}

/**
 * Generate a friendly public slug based on member name
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
}
