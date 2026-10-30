import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Database,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Eye,
  Trash2,
  Clock,
  UserX,
  Search,
  Users,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PreviewItem {
  index: number
  kind: 'proprietario' | 'comprador'
  name: string
  phone?: string
  normalized_phone?: string
  email?: string
  cpf?: string
  address?: string
  normalized_address?: string
  unit?: string
  condominium_id?: string
  target_neighborhood?: string
  last_real_contact_at?: string
  notes?: string
}

export default function AdminKnownBasePage() {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<'import' | 'owners' | 'buyers'>('import')

  // CSV Import State
  const [csvText, setCsvText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previewData, setPreviewData] = useState<{
    countOwners: number
    countBuyers: number
    items: PreviewItem[]
    total: number
  } | null>(null)

  // Lists
  const [knownOwners, setKnownOwners] = useState<any[]>([])
  const [knownBuyers, setKnownBuyers] = useState<any[]>([])
  const [condos, setCondos] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Anonymize Modal
  const [anonymizeModalOpen, setAnonymizeModalOpen] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'known_owner' | 'known_buyer'
    id: string
    name: string
  } | null>(null)
  const [anonymizeReason, setAnonymizeReason] = useState('')
  const [submittingAnonymize, setSubmittingAnonymize] = useState(false)

  // Retention Trigger Modal
  const [retentionModalOpen, setRetentionModalOpen] = useState(false)
  const [triggeringRetention, setTriggeringRetention] = useState(false)

  useEffect(() => {
    loadLists()
  }, [])

  async function loadLists() {
    setLoadingList(true)
    try {
      const [owners, buyers, condoList] = await Promise.all([
        pb.collection('known_owner_base').getFullList({ sort: '-created' }),
        pb.collection('known_buyer_base').getFullList({ sort: '-created' }),
        pb.collection('condominiums').getFullList({ sort: 'name' }),
      ])
      setKnownOwners(owners)
      setKnownBuyers(buyers)
      setCondos(condoList)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoadingList(false)
    }
  }

  // Parse CSV client-side into JSON items for edge function
  function parseCSV(text: string) {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (lines.length <= 1) return []

    // Detect separator (; or ,)
    const firstLine = lines[0]
    const sep = firstLine.includes(';') ? ';' : ','

    const rawHeaders = firstLine.split(sep).map((h) => h.replace(/["']/g, '').trim().toLowerCase())

    const normalizeHeader = (h: string) => {
      const clean = h
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
      if (clean.includes('tipo') || clean.includes('kind')) return 'kind'
      if (clean.includes('nome') || clean.includes('name')) return 'name'
      if (
        clean.includes('telefone') ||
        clean.includes('phone') ||
        clean.includes('celular') ||
        clean.includes('contato')
      )
        return 'phone'
      if (clean.includes('email') || clean.includes('e_mail')) return 'email'
      if (clean.includes('cpf') || clean.includes('documento')) return 'cpf'
      if (clean.includes('endereco') || clean.includes('address') || clean.includes('logradouro'))
        return 'address'
      if (
        clean.includes('unidade') ||
        clean.includes('unit') ||
        clean.includes('apto') ||
        clean.includes('numero')
      )
        return 'unit'
      if (clean.includes('bairro') || clean.includes('neighborhood')) return 'target_neighborhood'
      if (clean.includes('ultima') || clean.includes('last_contact') || clean.includes('data'))
        return 'last_real_contact_at'
      if (clean.includes('obs') || clean.includes('notas') || clean.includes('notes'))
        return 'notes'
      return clean
    }

    const headers = rawHeaders.map(normalizeHeader)

    const items = []
    for (let i = 1; i < lines.length; i++) {
      const rowVals = lines[i].split(sep).map((v) => v.replace(/^["']|["']$/g, '').trim())
      const item: any = {}
      headers.forEach((h, idx) => {
        item[h] = rowVals[idx] || ''
      })
      if (item.name) {
        items.push(item)
      }
    }
    return items
  }

  // Handle Dry Run (Preview)
  async function handlePreviewCSV() {
    if (!csvText.trim()) {
      toast({
        title: 'CSV Vazio',
        description: 'Cole o conteúdo CSV ou selecione um arquivo válido.',
        variant: 'destructive',
      })
      return
    }

    const items = parseCSV(csvText)
    if (items.length === 0) {
      toast({
        title: 'Formato inválido',
        description: 'Nenhuma linha de registro identificada no CSV.',
        variant: 'destructive',
      })
      return
    }

    setAnalyzing(true)
    try {
      const res = await pb.send('/backend/v1/admin/import-known-base', {
        method: 'POST',
        body: {
          dry_run: true,
          items,
        },
      })

      setPreviewData({
        countOwners: res.count_owners,
        countBuyers: res.count_buyers,
        total: res.total_received,
        items: res.sample_preview || [],
      })

      toast({
        title: 'Prévia Gerada com Sucesso',
        description: `${res.count_owners} proprietários e ${res.count_buyers} compradores identificados.`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha na análise da prévia',
        description: err.message || 'Verifique o formato das colunas do CSV.',
        variant: 'destructive',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  // Handle Confirmed Import
  async function handleConfirmImport() {
    const items = parseCSV(csvText)
    if (items.length === 0) return

    setImporting(true)
    try {
      const res = await pb.send('/backend/v1/admin/import-known-base', {
        method: 'POST',
        body: {
          dry_run: false,
          items,
        },
      })

      toast({
        title: 'Importação Concluída!',
        description: res.message,
      })

      setCsvText('')
      setPreviewData(null)
      loadLists()
    } catch (err: any) {
      toast({
        title: 'Erro ao importar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  // Handle Anonymize
  async function handleConfirmAnonymize() {
    if (!selectedEntity || !anonymizeReason.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe a justificativa legal LGPD para anonimizar este cadastro.',
        variant: 'destructive',
      })
      return
    }

    setSubmittingAnonymize(true)
    try {
      const res = await pb.send('/backend/v1/admin/anonymize-person', {
        method: 'POST',
        body: {
          entity_type: selectedEntity.type,
          entity_id: selectedEntity.id,
          reason: anonymizeReason,
        },
      })

      toast({
        title: 'Registro Anonimizado',
        description: res.message,
      })

      setAnonymizeModalOpen(false)
      setSelectedEntity(null)
      setAnonymizeReason('')
      loadLists()
    } catch (err: any) {
      toast({
        title: 'Erro ao anonimizar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSubmittingAnonymize(false)
    }
  }

  // Handle Periodic Retention Trigger
  async function handleTriggerRetention() {
    setTriggeringRetention(true)
    try {
      const res = await pb.send('/backend/v1/admin/apply-retention', {
        method: 'POST',
      })

      toast({
        title: 'Política de Retenção Executada',
        description: res.message,
      })

      setRetentionModalOpen(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao rodar retenção',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setTriggeringRetention(false)
    }
  }

  // Sample CSV Template Generator
  const sampleCSV = `tipo;nome;telefone;email;endereco;unidade;data_ultima_conversa
proprietario;Carlos Eduardo Silva;21988887777;carlos.silva@email.com;Avenida Lúcio Costa 3600;102;2025-08-15
proprietario;Mariana Albuquerque;21999991111;mariana.albuquerque@email.com;Rua Jornalista Henrique Cordeiro 120;B-404;2025-09-01
comprador;Roberto Fontes;21977772222;roberto.fontes@email.com;Barra da Tijuca;;2025-07-20`

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Superior */}
        <div className="border border-border bg-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[1px] shadow-subtle">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-border text-gold-deep rounded-[1px] text-[10px] uppercase tracking-label font-heading"
              >
                LGPD & Governança (Seções 10 e 12)
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Restrito a Administradores
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-foreground font-semibold">
              Base Conhecida & Anonimização LGPD
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans">
              Importação de carteira legada com normalização (+55), verificação prévia e descarte
              conforme retenção legal de 24 meses.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              onClick={() => setRetentionModalOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-[1px] text-xs font-heading"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 text-gold-deep" strokeWidth={1.5} />
              Executar Retenção Periódica
            </Button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center border-b border-border gap-1 font-heading">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'import'
                ? 'border-gold-deep text-gold-deep bg-secondary/50'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UploadCloud className="w-4 h-4" strokeWidth={1.5} />
            Importação CSV (Edge Function)
          </button>
          <button
            onClick={() => setActiveTab('owners')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'owners'
                ? 'border-gold-deep text-gold-deep bg-secondary/50'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="w-4 h-4" strokeWidth={1.5} />
            Proprietários Conhecidos ({knownOwners.length})
          </button>
          <button
            onClick={() => setActiveTab('buyers')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'buyers'
                ? 'border-gold-deep text-gold-deep bg-secondary/50'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" strokeWidth={1.5} />
            Compradores Conhecidos ({knownBuyers.length})
          </button>
        </div>

        {/* ABA: Importação CSV */}
        {activeTab === 'import' && (
          <div className="space-y-6 font-sans">
            <Card className="rounded-[1px] border-border bg-card p-6 space-y-4 shadow-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-serif font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gold-deep" strokeWidth={1.5} />
                    Entrada de Dados CSV
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                    Colunas aceitas: tipo, nome, telefone, e-mail, cpf, endereço, unidade e data da
                    última conversa real.
                  </p>
                </div>
                <Button
                  onClick={() => setCsvText(sampleCSV)}
                  variant="ghost"
                  size="sm"
                  className="rounded-[1px] text-xs text-gold-deep hover:text-gold-deep/80 font-heading"
                >
                  Carregar Exemplo
                </Button>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Cole aqui o conteúdo CSV com cabeçalho (separado por ';' ou ',')..."
                  className="rounded-[1px] font-mono text-xs bg-background border-border text-foreground h-44 resize-y"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-muted-foreground font-sans">
                  Os telefones serão normalizados automaticamente com código do Brasil (+55).
                </p>

                <div className="flex gap-2 font-heading">
                  <Button
                    onClick={handlePreviewCSV}
                    disabled={analyzing || !csvText.trim()}
                    variant="outline"
                    className="rounded-[1px] text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5 text-gold-deep" strokeWidth={1.5} />
                    {analyzing ? 'Analisando...' : '1. Gerar Prévia & Normalizar'}
                  </Button>

                  {previewData && (
                    <Button
                      onClick={handleConfirmImport}
                      disabled={importing}
                      className="rounded-[1px] bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs font-heading"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                      {importing ? 'Gravando...' : '2. Confirmar e Gravar na Base'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Prévia dos Dados */}
            {previewData && (
              <Card className="rounded-[1px] border-border bg-card p-6 space-y-4 shadow-subtle">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <h3 className="text-base font-serif font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" strokeWidth={1.5} />
                      Prévia dos Dados Normalizados
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                      Confira a amostra antes de persistir no banco de dados.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 font-heading">
                    <Badge
                      variant="outline"
                      className="border-border text-gold-deep rounded-[1px] text-xs"
                    >
                      {previewData.countOwners} Proprietários
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-border text-info rounded-[1px] text-xs"
                    >
                      {previewData.countBuyers} Compradores
                    </Badge>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="border-b border-border text-muted-foreground font-heading text-[11px] uppercase tracking-label">
                      <tr>
                        <th className="py-2">Tipo</th>
                        <th className="py-2">Nome</th>
                        <th className="py-2">Telefone Normalizado</th>
                        <th className="py-2">E-mail</th>
                        <th className="py-2">Endereço / Unidade</th>
                        <th className="py-2">Último Contato Real</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {previewData.items.map((item, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-accent/40 transition-colors ${
                            idx % 2 === 1 ? 'bg-secondary/40' : 'bg-card'
                          }`}
                        >
                          <td className="py-2">
                            <Badge
                              variant="outline"
                              className={`rounded-[1px] text-[10px] font-heading ${
                                item.kind === 'proprietario'
                                  ? 'border-border text-gold-deep'
                                  : 'border-border text-info'
                              }`}
                            >
                              {item.kind}
                            </Badge>
                          </td>
                          <td className="py-2 font-sans font-medium text-foreground">
                            {item.name}
                          </td>
                          <td className="py-2 font-mono text-foreground">
                            {item.normalized_phone || item.phone || '-'}
                          </td>
                          <td className="py-2 text-muted-foreground font-mono">
                            {item.email || '-'}
                          </td>
                          <td className="py-2 text-foreground font-sans">
                            {item.normalized_address || item.address || '-'}{' '}
                            {item.unit ? `(Apto ${item.unit})` : ''}
                          </td>
                          <td className="py-2 text-muted-foreground font-mono">
                            {item.last_real_contact_at || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ABA: Proprietários Conhecidos */}
        {activeTab === 'owners' && (
          <div className="space-y-4 font-sans">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-72">
                <Search
                  className="w-4 h-4 absolute left-3 top-3 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por nome, telefone ou endereço..."
                  className="rounded-[1px] bg-card border-border text-xs pl-9 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <Card className="rounded-[1px] border-border bg-card p-4 shadow-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-heading text-[11px] uppercase tracking-label">
                    <tr>
                      <th className="p-2.5">Nome</th>
                      <th className="p-2.5">Telefone Normalizado</th>
                      <th className="p-2.5">E-mail</th>
                      <th className="p-2.5">Unidade / Endereço</th>
                      <th className="p-2.5">Última Conversa Real</th>
                      <th className="p-2.5">Status LGPD</th>
                      <th className="p-2.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {knownOwners
                      .filter((o) => {
                        const term = searchTerm.toLowerCase()
                        return (
                          (o.name || '').toLowerCase().includes(term) ||
                          (o.phone || '').toLowerCase().includes(term) ||
                          (o.normalized_address || '').toLowerCase().includes(term)
                        )
                      })
                      .map((owner, idx) => {
                        const isAnonymized = !!owner.anonymized_at
                        return (
                          <tr
                            key={owner.id}
                            className={`hover:bg-accent/40 transition-colors ${
                              idx % 2 === 1 ? 'bg-secondary/40' : 'bg-card'
                            }`}
                          >
                            <td className="p-2.5 text-foreground font-medium">{owner.name}</td>
                            <td className="p-2.5 font-mono text-foreground">
                              {owner.normalized_phone || owner.phone || '-'}
                            </td>
                            <td className="p-2.5 text-muted-foreground font-mono">
                              {owner.email || '-'}
                            </td>
                            <td className="p-2.5 text-foreground font-sans">
                              {owner.unit ? `Apto ${owner.unit} • ` : ''}
                              {owner.normalized_address || owner.address || '-'}
                            </td>
                            <td className="p-2.5 text-muted-foreground font-mono">
                              {owner.last_real_contact_at
                                ? new Date(owner.last_real_contact_at).toLocaleDateString('pt-BR')
                                : '-'}
                            </td>
                            <td className="p-2.5">
                              {isAnonymized ? (
                                <Badge
                                  variant="outline"
                                  className="bg-secondary text-muted-foreground border-border rounded-[1px] text-[10px] font-heading"
                                >
                                  Anonimizado
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-success/40 bg-success/10 text-success rounded-[1px] text-[10px] font-heading"
                                >
                                  Ativo
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              {!isAnonymized && (
                                <Button
                                  onClick={() => {
                                    setSelectedEntity({
                                      type: 'known_owner',
                                      id: owner.id,
                                      name: owner.name,
                                    })
                                    setAnonymizeModalOpen(true)
                                  }}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-[1px] font-heading"
                                >
                                  <UserX className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                                  Anonimizar
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ABA: Compradores Conhecidos */}
        {activeTab === 'buyers' && (
          <div className="space-y-4 font-sans">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-72">
                <Search
                  className="w-4 h-4 absolute left-3 top-3 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por nome, telefone ou bairro..."
                  className="rounded-[1px] bg-card border-border text-xs pl-9 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <Card className="rounded-[1px] border-border bg-card p-4 shadow-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-heading text-[11px] uppercase tracking-label">
                    <tr>
                      <th className="p-2.5">Nome</th>
                      <th className="p-2.5">Telefone Normalizado</th>
                      <th className="p-2.5">E-mail</th>
                      <th className="p-2.5">Bairro de Interesse</th>
                      <th className="p-2.5">Última Conversa Real</th>
                      <th className="p-2.5">Status LGPD</th>
                      <th className="p-2.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {knownBuyers
                      .filter((b) => {
                        const term = searchTerm.toLowerCase()
                        return (
                          (b.name || '').toLowerCase().includes(term) ||
                          (b.phone || '').toLowerCase().includes(term) ||
                          (b.target_neighborhood || '').toLowerCase().includes(term)
                        )
                      })
                      .map((buyer, idx) => {
                        const isAnonymized = !!buyer.anonymized_at
                        return (
                          <tr
                            key={buyer.id}
                            className={`hover:bg-accent/40 transition-colors ${
                              idx % 2 === 1 ? 'bg-secondary/40' : 'bg-card'
                            }`}
                          >
                            <td className="p-2.5 text-foreground font-medium">{buyer.name}</td>
                            <td className="p-2.5 font-mono text-foreground">
                              {buyer.normalized_phone || buyer.phone || '-'}
                            </td>
                            <td className="p-2.5 text-muted-foreground font-mono">
                              {buyer.email || '-'}
                            </td>
                            <td className="p-2.5 text-foreground font-sans">
                              {buyer.target_neighborhood || 'Barra da Tijuca'}
                            </td>
                            <td className="p-2.5 text-muted-foreground font-mono">
                              {buyer.last_real_contact_at
                                ? new Date(buyer.last_real_contact_at).toLocaleDateString('pt-BR')
                                : '-'}
                            </td>
                            <td className="p-2.5">
                              {isAnonymized ? (
                                <Badge
                                  variant="outline"
                                  className="bg-secondary text-muted-foreground border-border rounded-[1px] text-[10px] font-heading"
                                >
                                  Anonimizado
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-info/40 bg-info/10 text-info rounded-[1px] text-[10px] font-heading"
                                >
                                  Ativo
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              {!isAnonymized && (
                                <Button
                                  onClick={() => {
                                    setSelectedEntity({
                                      type: 'known_buyer',
                                      id: buyer.id,
                                      name: buyer.name,
                                    })
                                    setAnonymizeModalOpen(true)
                                  }}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 rounded-[1px] font-heading"
                                >
                                  <UserX className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                                  Anonimizar
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Modal de Anonimização Manual (RPC anonymize_person) */}
        <Dialog open={anonymizeModalOpen} onOpenChange={setAnonymizeModalOpen}>
          <DialogContent className="rounded-[1px] bg-card border-border text-foreground sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                Anonimização de Titular (LGPD)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans">
                Esta ação substitui irreversivelmente nome, telefone, e-mail e CPF do cadastro por
                dados mascarados, preservando os registros analíticos para apurações estatísticas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 font-sans">
              <div className="p-3 bg-secondary/60 border border-border text-xs rounded-[1px]">
                <span className="text-muted-foreground">Titular selecionado:</span>
                <p className="font-semibold text-foreground mt-0.5">{selectedEntity?.name}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Justificativa Legal / Motivo Obrigatório{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={anonymizeReason}
                  onChange={(e) => setAnonymizeReason(e.target.value)}
                  placeholder="Ex: Solicitação formal de exclusão pelo titular via canal de privacidade (Art. 18 LGPD)..."
                  className="rounded-[1px] bg-background border-border text-xs h-24 text-foreground"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                onClick={() => setAnonymizeModalOpen(false)}
                variant="outline"
                className="rounded-[1px] text-xs font-heading"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmAnonymize}
                disabled={submittingAnonymize || !anonymizeReason.trim()}
                className="rounded-[1px] bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold text-xs font-heading"
              >
                {submittingAnonymize ? 'Gravando...' : 'Confirmar Anonimização'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Retenção Periódica (apply-retention) */}
        <Dialog open={retentionModalOpen} onOpenChange={setRetentionModalOpen}>
          <DialogContent className="rounded-[1px] bg-card border-border text-foreground sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
                Política de Retenção Automática
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-sans">
                Dispara a limpeza periódica que anonimiza todas as indicações não convertidas
                (recusadas, canceladas, perdidas) criadas há mais de 24 meses (ou prazo de
                program_settings).
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 text-xs text-foreground space-y-2 font-sans">
              <p className="text-muted-foreground">
                Este processo também é executado automaticamente todos os domingos às 03:00 UTC pelo
                job agendado <code className="text-gold-deep font-mono">apply_retention</code>.
              </p>
              <p className="text-muted-foreground">Deseja forçar a execução imediata agora?</p>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                onClick={() => setRetentionModalOpen(false)}
                variant="outline"
                className="rounded-[1px] text-xs font-heading"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleTriggerRetention}
                disabled={triggeringRetention}
                className="rounded-[1px] bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs font-heading"
              >
                {triggeringRetention ? 'Processando...' : 'Executar Retenção'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
