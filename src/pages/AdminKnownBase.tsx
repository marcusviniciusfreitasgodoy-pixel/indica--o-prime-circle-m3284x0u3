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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Superior */}
        <div className="border border-stone-800 bg-stone-900/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-none text-[10px] uppercase tracking-wider">
                LGPD & Governança (Seções 10 e 12)
              </Badge>
              <span className="text-xs text-stone-500 font-mono">Restrito a Administradores</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-white">
              Base Conhecida & Anonimização LGPD
            </h1>
            <p className="text-xs sm:text-sm text-stone-400">
              Importação de carteira legada com normalização (+55), verificação prévia e descarte
              conforme retenção legal de 24 meses.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              onClick={() => setRetentionModalOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-none border-stone-700 text-stone-300 hover:text-white text-xs"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Executar Retenção Periódica
            </Button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center border-b border-stone-800 gap-1">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'import'
                ? 'border-amber-500 text-amber-400 bg-stone-900/40'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Importação CSV (Edge Function)
          </button>
          <button
            onClick={() => setActiveTab('owners')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'owners'
                ? 'border-amber-500 text-amber-400 bg-stone-900/40'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Proprietários Conhecidos ({knownOwners.length})
          </button>
          <button
            onClick={() => setActiveTab('buyers')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'buyers'
                ? 'border-amber-500 text-amber-400 bg-stone-900/40'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Compradores Conhecidos ({knownBuyers.length})
          </button>
        </div>

        {/* ABA: Importação CSV */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            <Card className="rounded-none border-stone-800 bg-stone-900/70 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-serif text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Entrada de Dados CSV
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Colunas aceitas: tipo, nome, telefone, e-mail, cpf, endereço, unidade e data da
                    última conversa real.
                  </p>
                </div>
                <Button
                  onClick={() => setCsvText(sampleCSV)}
                  variant="ghost"
                  size="sm"
                  className="rounded-none text-xs text-amber-400 hover:text-amber-300"
                >
                  Carregar Exemplo
                </Button>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Cole aqui o conteúdo CSV com cabeçalho (separado por ';' ou ',')..."
                  className="rounded-none font-mono text-xs bg-stone-950 border-stone-800 text-stone-200 h-44 resize-y"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-stone-500">
                  Os telefones serão normalizados automaticamente com código do Brasil (+55).
                </p>

                <div className="flex gap-2">
                  <Button
                    onClick={handlePreviewCSV}
                    disabled={analyzing || !csvText.trim()}
                    variant="outline"
                    className="rounded-none border-stone-700 text-stone-200 text-xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    {analyzing ? 'Analisando...' : '1. Gerar Prévia & Normalizar'}
                  </Button>

                  {previewData && (
                    <Button
                      onClick={handleConfirmImport}
                      disabled={importing}
                      className="rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      {importing ? 'Gravando...' : '2. Confirmar e Gravar na Base'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Prévia dos Dados */}
            {previewData && (
              <Card className="rounded-none border-stone-800 bg-stone-900/70 p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div>
                    <h3 className="text-base font-serif text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Prévia dos Dados Normalizados
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Confira a amostra antes de persistir no banco de dados.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-none text-xs">
                      {previewData.countOwners} Proprietários
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-none text-xs">
                      {previewData.countBuyers} Compradores
                    </Badge>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-stone-800 text-stone-400">
                      <tr>
                        <th className="py-2">Tipo</th>
                        <th className="py-2">Nome</th>
                        <th className="py-2">Telefone Normalizado</th>
                        <th className="py-2">E-mail</th>
                        <th className="py-2">Endereço / Unidade</th>
                        <th className="py-2">Último Contato Real</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60 font-mono">
                      {previewData.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-900/50">
                          <td className="py-2">
                            <Badge
                              className={`rounded-none text-[10px] ${
                                item.kind === 'proprietario'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}
                            >
                              {item.kind}
                            </Badge>
                          </td>
                          <td className="py-2 font-sans font-medium text-stone-200">{item.name}</td>
                          <td className="py-2 text-stone-300">
                            {item.normalized_phone || item.phone || '-'}
                          </td>
                          <td className="py-2 text-stone-400">{item.email || '-'}</td>
                          <td className="py-2 text-stone-300 font-sans">
                            {item.normalized_address || item.address || '-'}{' '}
                            {item.unit ? `(Apto ${item.unit})` : ''}
                          </td>
                          <td className="py-2 text-stone-400">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por nome, telefone ou endereço..."
                  className="rounded-none bg-stone-950 border-stone-800 text-xs pl-9"
                />
              </div>
            </div>

            <Card className="rounded-none border-stone-800 bg-stone-900/70 p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-800 text-stone-400">
                    <tr>
                      <th className="py-2">Nome</th>
                      <th className="py-2">Telefone Normalizado</th>
                      <th className="py-2">E-mail</th>
                      <th className="py-2">Unidade / Endereço</th>
                      <th className="py-2">Última Conversa Real</th>
                      <th className="py-2">Status LGPD</th>
                      <th className="py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {knownOwners
                      .filter((o) => {
                        const term = searchTerm.toLowerCase()
                        return (
                          (o.name || '').toLowerCase().includes(term) ||
                          (o.phone || '').toLowerCase().includes(term) ||
                          (o.normalized_address || '').toLowerCase().includes(term)
                        )
                      })
                      .map((owner) => {
                        const isAnonymized = !!owner.anonymized_at
                        return (
                          <tr key={owner.id} className="hover:bg-stone-900/50">
                            <td className="py-2.5 text-stone-200 font-medium">{owner.name}</td>
                            <td className="py-2.5 font-mono text-stone-400">
                              {owner.normalized_phone || owner.phone || '-'}
                            </td>
                            <td className="py-2.5 text-stone-400">{owner.email || '-'}</td>
                            <td className="py-2.5 text-stone-300">
                              {owner.unit ? `Apto ${owner.unit} • ` : ''}
                              {owner.normalized_address || owner.address || '-'}
                            </td>
                            <td className="py-2.5 text-stone-400 font-mono">
                              {owner.last_real_contact_at
                                ? new Date(owner.last_real_contact_at).toLocaleDateString('pt-BR')
                                : '-'}
                            </td>
                            <td className="py-2.5">
                              {isAnonymized ? (
                                <Badge className="bg-stone-800 text-stone-400 border border-stone-700 rounded-none text-[10px]">
                                  Anonimizado
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-none text-[10px]">
                                  Ativo
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 text-right">
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
                                  className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-none"
                                >
                                  <UserX className="w-3.5 h-3.5 mr-1" />
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
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por nome, telefone ou bairro..."
                  className="rounded-none bg-stone-950 border-stone-800 text-xs pl-9"
                />
              </div>
            </div>

            <Card className="rounded-none border-stone-800 bg-stone-900/70 p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-800 text-stone-400">
                    <tr>
                      <th className="py-2">Nome</th>
                      <th className="py-2">Telefone Normalizado</th>
                      <th className="py-2">E-mail</th>
                      <th className="py-2">Bairro de Interesse</th>
                      <th className="py-2">Última Conversa Real</th>
                      <th className="py-2">Status LGPD</th>
                      <th className="py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {knownBuyers
                      .filter((b) => {
                        const term = searchTerm.toLowerCase()
                        return (
                          (b.name || '').toLowerCase().includes(term) ||
                          (b.phone || '').toLowerCase().includes(term) ||
                          (b.target_neighborhood || '').toLowerCase().includes(term)
                        )
                      })
                      .map((buyer) => {
                        const isAnonymized = !!buyer.anonymized_at
                        return (
                          <tr key={buyer.id} className="hover:bg-stone-900/50">
                            <td className="py-2.5 text-stone-200 font-medium">{buyer.name}</td>
                            <td className="py-2.5 font-mono text-stone-400">
                              {buyer.normalized_phone || buyer.phone || '-'}
                            </td>
                            <td className="py-2.5 text-stone-400">{buyer.email || '-'}</td>
                            <td className="py-2.5 text-stone-300">
                              {buyer.target_neighborhood || 'Barra da Tijuca'}
                            </td>
                            <td className="py-2.5 text-stone-400 font-mono">
                              {buyer.last_real_contact_at
                                ? new Date(buyer.last_real_contact_at).toLocaleDateString('pt-BR')
                                : '-'}
                            </td>
                            <td className="py-2.5">
                              {isAnonymized ? (
                                <Badge className="bg-stone-800 text-stone-400 border border-stone-700 rounded-none text-[10px]">
                                  Anonimizado
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-none text-[10px]">
                                  Ativo
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 text-right">
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
                                  className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-none"
                                >
                                  <UserX className="w-3.5 h-3.5 mr-1" />
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
          <DialogContent className="rounded-none bg-stone-900 border-stone-800 text-stone-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-serif text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                Anonimização de Titular (LGPD)
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                Esta ação substitui irreversivelmente nome, telefone, e-mail e CPF do cadastro por
                dados mascarados, preservando os registros analíticos para apurações estatísticas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 bg-stone-950 border border-stone-800 text-xs">
                <span className="text-stone-400">Titular selecionado:</span>
                <p className="font-semibold text-white mt-0.5">{selectedEntity?.name}</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-stone-300">
                  Justificativa Legal / Motivo Obrigatório <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  value={anonymizeReason}
                  onChange={(e) => setAnonymizeReason(e.target.value)}
                  placeholder="Ex: Solicitação formal de exclusão pelo titular via canal de privacidade (Art. 18 LGPD)..."
                  className="rounded-none bg-stone-950 border-stone-800 text-xs h-24"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                onClick={() => setAnonymizeModalOpen(false)}
                variant="outline"
                className="rounded-none border-stone-700 text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmAnonymize}
                disabled={submittingAnonymize || !anonymizeReason.trim()}
                className="rounded-none bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
              >
                {submittingAnonymize ? 'Gravando...' : 'Confirmar Anonimização'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Retenção Periódica (apply-retention) */}
        <Dialog open={retentionModalOpen} onOpenChange={setRetentionModalOpen}>
          <DialogContent className="rounded-none bg-stone-900 border-stone-800 text-stone-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-serif text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Política de Retenção Automática
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                Dispara a limpeza periódica que anonimiza todas as indicações não convertidas
                (recusadas, canceladas, perdidas) criadas há mais de 24 meses (ou prazo de
                program_settings).
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 text-xs text-stone-300 space-y-2">
              <p>
                Este processo também é executado automaticamente todos os domingos às 03:00 UTC pelo
                job agendado <code className="text-amber-400 font-mono">apply_retention</code>.
              </p>
              <p className="text-stone-400">Deseja forçar a execução imediata agora?</p>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                onClick={() => setRetentionModalOpen(false)}
                variant="outline"
                className="rounded-none border-stone-700 text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleTriggerRetention}
                disabled={triggeringRetention}
                className="rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold text-xs"
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
