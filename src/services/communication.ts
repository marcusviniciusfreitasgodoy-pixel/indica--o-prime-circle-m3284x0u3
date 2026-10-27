import { pb } from '@/lib/pocketbase/client'

export interface MessageTemplate {
  id: string
  event_code: string
  channel: 'whatsapp' | 'email'
  audience: 'participante' | 'proprietario' | 'interessado' | 'equipe' | 'financeiro'
  subject?: string
  body: string
  active: boolean
  meta_template_name?: string
  meta_language?: string
  meta_category?: 'utility' | 'marketing'
  meta_status?: 'approved' | 'pending' | 'rejected' | 'paused'
  meta_params?: string[] | string
  button_url_param?: string
  created: string
  updated: string
}

export interface NotificationLog {
  id: string
  recipient: string
  channel: 'whatsapp' | 'email'
  event_code: string
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  provider_message_id?: string
  error?: string
  entity_id?: string
  created: string
  status_updated_at?: string
}

export interface Campaign {
  id: string
  name: string
  code: string
  channel: 'portaria' | 'parceiro' | 'cliente' | 'impresso' | 'evento' | 'outro'
  condominium_id?: string
  participant_id?: string
  starts_at?: string
  ends_at?: string
  notes?: string
  created: string
  updated: string
  expand?: {
    condominium_id?: { id: string; name: string }
    participant_id?: {
      id: string
      user_id?: string
      expand?: { user_id?: { name: string; email: string } }
    }
  }
}

export async function listMessageTemplates(): Promise<MessageTemplate[]> {
  return await pb.collection('message_templates').getFullList<MessageTemplate>({
    sort: 'channel,event_code',
  })
}

export async function updateMessageTemplate(
  id: string,
  data: Partial<MessageTemplate>,
): Promise<MessageTemplate> {
  return await pb.collection('message_templates').update<MessageTemplate>(id, data)
}

export async function syncMetaWhatsAppTemplates(): Promise<{
  success: boolean
  message: string
  remote_count?: number
  updated_count?: number
}> {
  return await pb.send('/backend/v1/communication/sync-whatsapp-templates', {
    method: 'POST',
  })
}

export async function sendTestWhatsApp(options: {
  to: string
  template_id?: string
  template_name?: string
  event_code?: string
  params?: string[]
  button_url_param?: string
  force_send?: boolean
}): Promise<{ success: boolean; message: string; provider_message_id?: string; error?: string }> {
  return await pb.send('/backend/v1/communication/send-whatsapp', {
    method: 'POST',
    body: options,
  })
}

export async function sendTestEmail(options: {
  to: string
  subject: string
  text: string
  event_code?: string
}): Promise<{ success: boolean; message: string; id?: string; error?: string }> {
  return await pb.send('/backend/v1/communication/send-email', {
    method: 'POST',
    body: options,
  })
}

export async function listNotificationLogs(limit = 100): Promise<NotificationLog[]> {
  return await pb.collection('notification_logs').getFullList<NotificationLog>({
    sort: '-created',
    batch: limit,
  })
}

export async function listCampaigns(): Promise<Campaign[]> {
  return await pb.collection('campaigns').getFullList<Campaign>({
    sort: '-created',
    expand: 'condominium_id,participant_id.user_id',
  })
}

export async function createCampaign(data: Partial<Campaign>): Promise<Campaign> {
  return await pb.collection('campaigns').create<Campaign>(data)
}

export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
  return await pb.collection('campaigns').update<Campaign>(id, data)
}

export async function deleteCampaign(id: string): Promise<boolean> {
  return await pb.collection('campaigns').delete(id)
}
