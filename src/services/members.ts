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
  },
): Promise<Member> {
  const updated = await pb.collection('users').update<Member>(id, data)
  return updated
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
