import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Activity, Search, Shield, Filter, Loader2, Calendar } from 'lucide-react'

export function AdminAuditPage() {
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [resourceFilter, setResourceFilter] = useState('all')

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await pb.collection('audit_logs').getFullList({
        sort: '-created',
        expand: 'actor_id',
      })
      setLogs(res)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar auditoria',
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

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false
    if (resourceFilter !== 'all' && log.resource_type !== resourceFilter) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchActor = log.actor_email?.toLowerCase().includes(q)
      const matchAction = log.action?.toLowerCase().includes(q)
      const matchResource = log.resource_id?.toLowerCase().includes(q)
      const matchDetails =
        typeof log.details === 'string'
          ? log.details.toLowerCase().includes(q)
          : JSON.stringify(log.details).toLowerCase().includes(q)

      if (!matchActor && !matchAction && !matchResource && !matchDetails) return false
    }

    return true
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep block mb-1">
            Conformidade & Rastreabilidade
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-foreground font-semibold flex items-center gap-2">
            <Shield className="w-6 h-6 text-gold-deep" strokeWidth={1.5} />
            Trilha de Auditoria & Conformidade
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-sans">
            Registro imutável de todas as ações operacionais, transições de status, formalizações e
            cadastros.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border p-4 space-y-3 rounded-[1px]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search
                className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5"
                strokeWidth={1.5}
              />
              <Input
                placeholder="Buscar por e-mail, ação, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background border-border pl-9 rounded-[1px] text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="bg-background border-border rounded-[1px] text-xs font-heading">
                  <SelectValue placeholder="Todas as Ações" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground rounded-[1px]">
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  <SelectItem value="referral_status_changed">Mudança de Status</SelectItem>
                  <SelectItem value="capture_requested">Captação Solicitada</SelectItem>
                  <SelectItem value="capture_approved">Captação Aprovada</SelectItem>
                  <SelectItem value="capture_returned">Captação Devolvida</SelectItem>
                  <SelectItem value="deal_registered">Negócio Registrado</SelectItem>
                  <SelectItem value="listing_registered">Anúncio Divulgado</SelectItem>
                  <SelectItem value="referral_declined_by_godoy">Declinada pela Godoy</SelectItem>
                  <SelectItem value="participant_approved">Participante Aprovado</SelectItem>
                  <SelectItem value="participant_suspended">Participante Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger className="bg-background border-border rounded-[1px] text-xs font-heading">
                  <SelectValue placeholder="Todas as Entidades" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground rounded-[1px]">
                  <SelectItem value="all">Todas as Entidades</SelectItem>
                  <SelectItem value="referrals">Indicações (referrals)</SelectItem>
                  <SelectItem value="capture_records">Captações (capture_records)</SelectItem>
                  <SelectItem value="deals">Negócios (deals)</SelectItem>
                  <SelectItem value="participants">Participantes</SelectItem>
                  <SelectItem value="documents">Documentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        {loading ? (
          <div className="py-20 flex justify-center text-muted-foreground text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" strokeWidth={1.5} />
            Carregando registros de auditoria...
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card className="bg-card border-border rounded-[1px] p-12 text-center text-muted-foreground text-xs">
            Nenhum evento registrado encontrado.
          </Card>
        ) : (
          <div className="bg-card border border-border overflow-x-auto rounded-[1px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-heading text-[11px] uppercase tracking-label">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Usuário Responsável</th>
                  <th className="p-3">Ação</th>
                  <th className="p-3">Entidade & ID</th>
                  <th className="p-3">Detalhes / Metadados</th>
                  <th className="p-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.map((log, index) => {
                  let parsedDetails = log.details
                  if (typeof log.details === 'string') {
                    try {
                      parsedDetails = JSON.parse(log.details)
                    } catch {
                      /* intentionally ignored */
                    }
                  }

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-accent/40 transition-colors ${
                        index % 2 === 1 ? 'bg-secondary/40' : 'bg-card'
                      }`}
                    >
                      <td className="p-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        {new Date(log.created).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {log.actor_email || log.expand?.actor_id?.name || 'Sistema'}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="rounded-[1px] border-border text-foreground font-mono text-[10px]"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-foreground text-[11px]">
                        <span className="text-muted-foreground">{log.resource_type}:</span>{' '}
                        {log.resource_id ? `#${log.resource_id.substring(0, 8)}` : '-'}
                      </td>
                      <td className="p-3 max-w-md">
                        <pre className="text-[10px] text-muted-foreground bg-secondary/70 p-1.5 border border-border/60 overflow-x-auto font-mono">
                          {typeof parsedDetails === 'object'
                            ? JSON.stringify(parsedDetails, null, 2)
                            : String(parsedDetails)}
                        </pre>
                      </td>
                      <td className="p-3 text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
