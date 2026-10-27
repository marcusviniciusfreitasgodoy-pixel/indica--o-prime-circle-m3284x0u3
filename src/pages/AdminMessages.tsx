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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-6">
          <div>
            <h1 className="text-2xl font-serif text-white flex items-center gap-2">
              <Mail className="w-6 h-6 text-amber-500" />
              Central de Mensagens e Comunicação
            </h1>
            <p className="text-xs text-stone-400 mt-1">
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
              className="rounded-none border-stone-700 text-stone-300 hover:text-white text-xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${syncingMeta ? 'animate-spin text-amber-500' : ''}`}
              />
              Sincronizar Meta
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="rounded-none border-stone-700 text-stone-300 hover:text-white text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="bg-stone-900 border border-stone-800 rounded-none p-1">
            <TabsTrigger value="templates" className="rounded-none text-xs">
              Modelos de Mensagem ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-none text-xs">
              Logs de Envio ({logs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/60 p-3 border border-stone-800">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar modelo por código, texto ou nome Meta..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-stone-950 border-stone-800 text-xs text-stone-200 rounded-none"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  size="sm"
                  variant={channelFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setChannelFilter('all')}
                  className="rounded-none text-xs h-8"
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  variant={channelFilter === 'whatsapp' ? 'default' : 'outline'}
                  onClick={() => setChannelFilter('whatsapp')}
                  className="rounded-none text-xs h-8 flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant={channelFilter === 'email' ? 'default' : 'outline'}
                  onClick={() => setChannelFilter('email')}
                  className="rounded-none text-xs h-8 flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  E-mail
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((tpl) => (
                <Card
                  key={tpl.id}
                  className="rounded-none border-stone-800 bg-stone-900/70 flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 border-b border-stone-800/60">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {tpl.channel === 'whatsapp' ? (
                            <Badge className="bg-emerald-950/70 border-emerald-800/50 text-emerald-300 text-[10px] rounded-none flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> WhatsApp
                            </Badge>
                          ) : (
                            <Badge className="bg-sky-950/70 border-sky-800/50 text-sky-300 text-[10px] rounded-none flex items-center gap-1">
                              <Mail className="w-3 h-3" /> E-mail
                            </Badge>
                          )}
                          <span className="text-[11px] font-mono text-stone-400 font-semibold">
                            {tpl.event_code}
                          </span>
                        </div>
                        <CardTitle className="text-sm font-semibold text-white">
                          {tpl.subject || tpl.meta_template_name || tpl.event_code}
                        </CardTitle>
                      </div>

                      <div className="flex items-center gap-1">
                        {tpl.channel === 'whatsapp' && (
                          <Badge
                            className={`text-[10px] rounded-none ${
                              tpl.meta_status === 'approved'
                                ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50'
                                : tpl.meta_status === 'rejected'
                                  ? 'bg-red-900/40 text-red-300 border-red-800/50'
                                  : 'bg-amber-900/40 text-amber-300 border-amber-800/50'
                            }`}
                          >
                            Meta: {tpl.meta_status || 'sem registro'}
                          </Badge>
                        )}
                        <Badge
                          className={`text-[10px] rounded-none ${
                            tpl.active
                              ? 'bg-stone-800 text-stone-300 border-stone-700'
                              : 'bg-stone-900 text-stone-500 border-stone-800'
                          }`}
                        >
                          {tpl.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3 pb-4 space-y-3 flex-1">
                    <div className="text-xs text-stone-300 bg-stone-950/80 p-3 border border-stone-800/60 rounded-none whitespace-pre-line font-mono text-[11px] leading-relaxed">
                      {tpl.body}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-400">
                      <span>
                        Público: <strong className="text-stone-300">{tpl.audience}</strong>
                      </span>
                      {tpl.meta_category && (
                        <span>
                          Categoria: <strong className="text-stone-300">{tpl.meta_category}</strong>
                        </span>
                      )}
                      {tpl.button_url_param && (
                        <span>
                          Botão URL:{' '}
                          <strong className="text-stone-300">{tpl.button_url_param}</strong>
                        </span>
                      )}
                    </div>
                  </CardContent>

                  <div className="p-3 border-t border-stone-800/60 bg-stone-950/40 flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none border-stone-700 text-stone-300 text-xs h-7"
                      onClick={() => {
                        setTestingTemplate(tpl)
                        setTestRecipient('')
                      }}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Testar Disparo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none border-stone-700 text-stone-300 text-xs h-7"
                      onClick={() => {
                        setEditingTemplate(tpl)
                        setEditSubject(tpl.subject || '')
                        setEditBody(tpl.body)
                        setEditActive(tpl.active)
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card className="rounded-none border-stone-800 bg-stone-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-950 text-stone-400 border-b border-stone-800">
                    <tr>
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Canal</th>
                      <th className="p-3">Destinatário</th>
                      <th className="p-3">Evento</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">ID Provedor / Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-stone-300">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-stone-500">
                          Nenhum registro de notificação encontrado.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-stone-800/30">
                          <td className="p-3 text-stone-400 whitespace-nowrap font-mono">
                            {new Date(log.created).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3">
                            {log.channel === 'whatsapp' ? (
                              <Badge className="bg-emerald-950/70 border-emerald-800/50 text-emerald-300 text-[10px] rounded-none">
                                WhatsApp
                              </Badge>
                            ) : (
                              <Badge className="bg-sky-950/70 border-sky-800/50 text-sky-300 text-[10px] rounded-none">
                                E-mail
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 font-mono">{log.recipient}</td>
                          <td className="p-3 font-semibold text-stone-200">{log.event_code}</td>
                          <td className="p-3">
                            <Badge
                              className={`text-[10px] rounded-none ${
                                log.status === 'sent' ||
                                log.status === 'delivered' ||
                                log.status === 'read'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : log.status === 'failed'
                                    ? 'bg-red-950 text-red-300 border-red-800'
                                    : 'bg-amber-950 text-amber-300 border-amber-800'
                              }`}
                            >
                              {log.status}
                            </Badge>
                          </td>
                          <td
                            className="p-3 max-w-xs truncate text-[11px] font-mono text-stone-400"
                            title={log.error || log.provider_message_id || ''}
                          >
                            {log.error ? (
                              <span className="text-red-400">{log.error}</span>
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
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif">Editar Modelo de Mensagem</DialogTitle>
            <DialogDescription className="text-xs text-stone-400">
              Código do evento:{' '}
              <strong className="text-amber-400 font-mono">{editingTemplate?.event_code}</strong> (
              {editingTemplate?.channel})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {editingTemplate?.channel === 'email' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-stone-300">Assunto do E-mail</Label>
                <Input
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-stone-300">Corpo da Mensagem (com placeholders)</Label>
              <Textarea
                rows={6}
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono resize-none"
              />
              <p className="text-[11px] text-stone-500">
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
                className="rounded border-stone-700 bg-stone-950 text-amber-500"
              />
              <Label htmlFor="editActive" className="text-xs text-stone-300 cursor-pointer">
                Modelo ativo para envios automáticos
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingTemplate(null)}
              className="rounded-none border-stone-700 text-stone-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold text-xs"
            >
              {savingTemplate ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!testingTemplate} onOpenChange={(open) => !open && setTestingTemplate(null)}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif">Disparar Mensagem de Teste</DialogTitle>
            <DialogDescription className="text-xs text-stone-400">
              Canal:{' '}
              <strong className="text-amber-400 uppercase">{testingTemplate?.channel}</strong> •
              Modelo: {testingTemplate?.event_code}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-stone-300">
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
                className="bg-stone-950 border-stone-800 rounded-none text-xs"
              />
              <p className="text-[11px] text-stone-500">
                O envio será realizado via backend autenticado com segredo de servidor.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestingTemplate(null)}
              className="rounded-none border-stone-700 text-stone-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendTest}
              disabled={sendingTest || !testRecipient}
              className="rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold text-xs"
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
