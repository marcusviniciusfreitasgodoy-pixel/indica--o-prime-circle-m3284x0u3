import React, { useEffect, useState } from 'react'
import { AdminNavbar } from '@/components/AdminNavbar'
import {
  listMessageTemplates,
  updateMessageTemplate,
  syncMetaWhatsAppTemplates,
  sendTestWhatsApp,
  sendTestEmail,
  listNotificationLogs,
  MessageTemplate,
  NotificationLog,
} from '@/services/communication'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Mail, MessageSquare, RefreshCw, Send, Edit, Search } from 'lucide-react'

export function AdminMessagesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingMeta, setSyncingMeta] = useState(false)
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email'>('all')

  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)

  const [testingTemplate, setTestingTemplate] = useState<MessageTemplate | null>(null)
  const [testRecipient, setTestRecipient] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [tplData, logData] = await Promise.all([
        listMessageTemplates(),
        listNotificationLogs(100),
      ])
      setTemplates(tplData)
      setLogs(logData)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar mensagens',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSyncMeta = async () => {
    try {
      setSyncingMeta(true)
      const res = await syncMetaWhatsAppTemplates()
      toast({
        title: 'Sincronização Meta',
        description: res.message || 'Status dos modelos atualizado com a Meta.',
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha na sincronização Meta',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSyncingMeta(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return
    try {
      setSavingTemplate(true)
      await updateMessageTemplate(editingTemplate.id, {
        subject: editSubject,
        body: editBody,
        active: editActive,
      })
      toast({
        title: 'Modelo atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
      setEditingTemplate(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleSendTest = async () => {
    if (!testingTemplate || !testRecipient) return
    try {
      setSendingTest(true)
      if (testingTemplate.channel === 'whatsapp') {
        await sendTestWhatsApp({
          to: testRecipient,
          template_id: testingTemplate.id,
          params: ['Teste Parceiro', '#REF-TESTE'],
          force_send: true,
        })
      } else {
        await sendTestEmail({
          to: testRecipient,
          subject: testingTemplate.subject || 'Teste Godoy Prime',
          text: testingTemplate.body,
          event_code: testingTemplate.event_code,
        })
      }
      toast({
        title: 'Teste enviado',
        description: `Disparo realizado com sucesso para ${testRecipient}.`,
      })
      setTestingTemplate(null)
      setTestRecipient('')
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha no envio de teste',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSendingTest(false)
    }
  }

  const filteredTemplates = templates.filter((t) => {
    if (channelFilter !== 'all' && t.channel !== channelFilter) return false
    if (!search) return true
    const s = search.toLowerCase()
    return (
      t.event_code.toLowerCase().includes(s) ||
      (t.subject && t.subject.toLowerCase().includes(s)) ||
      t.body.toLowerCase().includes(s) ||
      (t.meta_template_name && t.meta_template_name.toLowerCase().includes(s))
    )
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep block mb-1">
              Comunicação & Notificações
            </span>
            <h1 className="text-2xl font-serif text-foreground font-semibold flex items-center gap-2">
              <Mail className="w-6 h-6 text-gold-deep" strokeWidth={1.5} />
              Central de Mensagens e Comunicação
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-sans">
              Modelos transacionais de WhatsApp (Meta Cloud API) e E-mail (Resend), com régua de
              ativação e auditoria de disparos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncMeta}
              disabled={syncingMeta}
              className="rounded-[1px] text-xs font-heading"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${syncingMeta ? 'animate-spin text-gold-deep' : ''}`}
                strokeWidth={1.5}
              />
              Sincronizar Meta
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="rounded-[1px] text-xs font-heading"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`}
                strokeWidth={1.5}
              />
              Atualizar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="bg-secondary/60 border border-border rounded-[1px] p-1 font-heading">
            <TabsTrigger value="templates" className="rounded-[1px] text-xs">
              Modelos de Mensagem ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-[1px] text-xs">
              Logs de Envio ({logs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 border border-border rounded-[1px]">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search
                  className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
                  strokeWidth={1.5}
                />
                <Input
                  placeholder="Buscar modelo por código, texto ou nome Meta..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background border-border text-xs text-foreground placeholder:text-muted-foreground rounded-[1px]"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto font-heading">
                <Button
                  size="sm"
                  variant={channelFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setChannelFilter('all')}
                  className="rounded-[1px] text-xs h-8"
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  variant={channelFilter === 'whatsapp' ? 'default' : 'outline'}
                  onClick={() => setChannelFilter('whatsapp')}
                  className="rounded-[1px] text-xs h-8 flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-success" strokeWidth={1.5} />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant={channelFilter === 'email' ? 'default' : 'outline'}
                  onClick={() => setChannelFilter('email')}
                  className="rounded-[1px] text-xs h-8 flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5 text-info" strokeWidth={1.5} />
                  E-mail
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((tpl) => (
                <Card
                  key={tpl.id}
                  className="rounded-[1px] border-border bg-card shadow-subtle flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 border-b border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {tpl.channel === 'whatsapp' ? (
                            <Badge
                              variant="outline"
                              className="border-success/40 bg-success/10 text-success text-[10px] rounded-[1px] flex items-center gap-1 font-heading"
                            >
                              <MessageSquare className="w-3 h-3 text-success" strokeWidth={1.5} />{' '}
                              WhatsApp
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-info/40 bg-info/10 text-info text-[10px] rounded-[1px] flex items-center gap-1 font-heading"
                            >
                              <Mail className="w-3 h-3 text-info" strokeWidth={1.5} /> E-mail
                            </Badge>
                          )}
                          <span className="text-[11px] font-mono text-gold-deep font-semibold">
                            {tpl.event_code}
                          </span>
                        </div>
                        <CardTitle className="text-sm font-serif font-semibold text-foreground">
                          {tpl.subject || tpl.meta_template_name || tpl.event_code}
                        </CardTitle>
                      </div>

                      <div className="flex items-center gap-1">
                        {tpl.channel === 'whatsapp' && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] rounded-[1px] font-heading ${
                              tpl.meta_status === 'approved'
                                ? 'bg-success/10 text-success border-success/40'
                                : tpl.meta_status === 'rejected'
                                  ? 'bg-destructive/10 text-destructive border-destructive/40'
                                  : 'bg-warning/10 text-warning border-warning/40'
                            }`}
                          >
                            Meta: {tpl.meta_status || 'sem registro'}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] rounded-[1px] font-heading ${
                            tpl.active
                              ? 'bg-secondary text-foreground border-border'
                              : 'bg-background text-muted-foreground border-border'
                          }`}
                        >
                          {tpl.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3 pb-4 space-y-3 flex-1 font-sans">
                    <div className="text-xs text-foreground bg-secondary/50 p-3 border border-border rounded-[1px] whitespace-pre-line font-mono text-[11px] leading-relaxed">
                      {tpl.body}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span>
                        Público: <strong className="text-foreground">{tpl.audience}</strong>
                      </span>
                      {tpl.meta_category && (
                        <span>
                          Categoria:{' '}
                          <strong className="text-foreground">{tpl.meta_category}</strong>
                        </span>
                      )}
                      {tpl.button_url_param && (
                        <span>
                          Botão URL:{' '}
                          <strong className="text-gold-deep font-mono">
                            {tpl.button_url_param}
                          </strong>
                        </span>
                      )}
                    </div>
                  </CardContent>

                  <div className="p-3 border-t border-border bg-secondary/30 flex items-center justify-end gap-2 rounded-b-[1px]">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-[1px] text-xs h-7 font-heading"
                      onClick={() => {
                        setTestingTemplate(tpl)
                        setTestRecipient('')
                      }}
                    >
                      <Send className="w-3 h-3 mr-1" strokeWidth={1.5} />
                      Testar Disparo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-[1px] text-xs h-7 font-heading"
                      onClick={() => {
                        setEditingTemplate(tpl)
                        setEditSubject(tpl.subject || '')
                        setEditBody(tpl.body)
                        setEditActive(tpl.active)
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" strokeWidth={1.5} />
                      Editar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card className="rounded-[1px] border-border bg-card overflow-hidden shadow-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left font-sans">
                  <thead className="bg-secondary/60 text-muted-foreground border-b border-border font-heading text-[11px] uppercase tracking-label">
                    <tr>
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Canal</th>
                      <th className="p-3">Destinatário</th>
                      <th className="p-3">Evento</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">ID Provedor / Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground font-sans">
                          Nenhum registro de notificação encontrado.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, idx) => (
                        <tr
                          key={log.id}
                          className={`hover:bg-accent/40 transition-colors ${
                            idx % 2 === 1 ? 'bg-secondary/40' : 'bg-card'
                          }`}
                        >
                          <td className="p-3 text-muted-foreground whitespace-nowrap font-mono">
                            {new Date(log.created).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3">
                            {log.channel === 'whatsapp' ? (
                              <Badge
                                variant="outline"
                                className="border-success/40 bg-success/10 text-success text-[10px] rounded-[1px] font-heading"
                              >
                                WhatsApp
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-info/40 bg-info/10 text-info text-[10px] rounded-[1px] font-heading"
                              >
                                E-mail
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 font-mono text-foreground">{log.recipient}</td>
                          <td className="p-3 font-semibold text-foreground font-mono">
                            {log.event_code}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] rounded-[1px] font-heading ${
                                log.status === 'sent' ||
                                log.status === 'delivered' ||
                                log.status === 'read'
                                  ? 'bg-success/10 text-success border-success/40'
                                  : log.status === 'failed'
                                    ? 'bg-destructive/10 text-destructive border-destructive/40'
                                    : 'bg-warning/10 text-warning border-warning/40'
                              }`}
                            >
                              {log.status}
                            </Badge>
                          </td>
                          <td
                            className="p-3 max-w-xs truncate text-[11px] font-mono text-muted-foreground"
                            title={log.error || log.provider_message_id || ''}
                          >
                            {log.error ? (
                              <span className="text-destructive">{log.error}</span>
                            ) : (
                              log.provider_message_id || '—'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-semibold text-foreground">
              Editar Modelo de Mensagem
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Código do evento:{' '}
              <strong className="text-gold-deep font-mono">{editingTemplate?.event_code}</strong> (
              {editingTemplate?.channel})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 font-sans">
            {editingTemplate?.channel === 'email' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Assunto do E-mail
                </Label>
                <Input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="bg-background border-border rounded-[1px] text-xs text-foreground"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground font-heading font-medium">
                Corpo da Mensagem (com placeholders)
              </Label>
              <Textarea
                rows={6}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="bg-background border-border rounded-[1px] text-xs font-mono resize-none text-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                {editingTemplate?.channel === 'whatsapp'
                  ? 'No WhatsApp da Meta, utilize {{1}}, {{2}} correspondentes aos parâmetros configurados.'
                  : 'No e-mail, utilize tags como {{nome}}, {{protocolo}}, {{link}}.'}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editActive"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="rounded-[1px] border-border bg-background text-primary focus:ring-primary"
              />
              <Label
                htmlFor="editActive"
                className="text-xs text-foreground cursor-pointer font-heading"
              >
                Modelo ativo para envios automáticos
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingTemplate(null)}
              className="rounded-[1px] text-xs font-heading"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="rounded-[1px] bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs font-heading"
            >
              {savingTemplate ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!testingTemplate} onOpenChange={(open) => !open && setTestingTemplate(null)}>
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-semibold text-foreground">
              Disparar Mensagem de Teste
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Canal:{' '}
              <strong className="text-gold-deep uppercase font-heading">
                {testingTemplate?.channel}
              </strong>{' '}
              • Modelo: <span className="font-mono">{testingTemplate?.event_code}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 font-sans">
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground font-heading font-medium">
                {testingTemplate?.channel === 'whatsapp'
                  ? 'Número WhatsApp com DDD'
                  : 'E-mail de Destino'}
              </Label>
              <Input
                placeholder={
                  testingTemplate?.channel === 'whatsapp' ? '21999998888' : 'seu-email@exemplo.com'
                }
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
              />
              <p className="text-[11px] text-muted-foreground">
                O envio será realizado via backend autenticado com segredo de servidor.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestingTemplate(null)}
              className="rounded-[1px] text-xs font-heading"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendTest}
              disabled={sendingTest || !testRecipient}
              className="rounded-[1px] bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs font-heading"
            >
              {sendingTest ? 'Enviando...' : 'Confirmar Envio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default AdminMessagesPage
