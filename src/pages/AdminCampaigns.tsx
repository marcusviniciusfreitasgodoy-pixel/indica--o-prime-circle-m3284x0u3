import React, { useEffect, useState } from 'react'
import { AdminNavbar } from '@/components/AdminNavbar'
import { listCampaigns, createCampaign, updateCampaign, Campaign } from '@/services/communication'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Megaphone,
  Plus,
  QrCode,
  Copy,
  ExternalLink,
  Download,
  Building,
  RefreshCw,
  Search,
  CheckCircle2,
} from 'lucide-react'

export function AdminCampaignsPage() {
  const { toast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [condos, setCondos] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // New/Edit Campaign Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [channel, setChannel] = useState<
    'portaria' | 'parceiro' | 'cliente' | 'impresso' | 'evento' | 'outro'
  >('portaria')
  const [targetCondoId, setTargetCondoId] = useState('')
  const [targetParticipantId, setTargetParticipantId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Partner Materials Dialog
  const [materialsCamp, setMaterialsCamp] = useState<Campaign | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [campList, condosList, partsList] = await Promise.all([
        listCampaigns(),
        pb.collection('condominiums').getFullList({ sort: 'name' }),
        pb
          .collection('participants')
          .getFullList({ filter: "user_type = 'entidade'", sort: 'created' })
          .catch(() => []),
      ])
      setCampaigns(campList)
      setCondos(condosList)
      setParticipants(partsList)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
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

  const handleOpenNew = () => {
    setEditingId(null)
    setCode('CAMP-' + Math.floor(1000 + Math.random() * 9000))
    setName('')
    setChannel('portaria')
    setTargetCondoId('')
    setTargetParticipantId('')
    setStartDate(new Date().toISOString().substring(0, 10))
    setEndDate('')
    setNotes('')
    setDialogOpen(true)
  }

  const handleOpenEdit = (c: Campaign) => {
    setEditingId(c.id)
    setCode(c.code)
    setName(c.name)
    setChannel(c.channel || 'portaria')
    setTargetCondoId(c.condominium_id || '')
    setTargetParticipantId(c.participant_id || '')
    setStartDate(c.starts_at ? c.starts_at.substring(0, 10) : '')
    setEndDate(c.ends_at ? c.ends_at.substring(0, 10) : '')
    setNotes(c.notes || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!code || !name) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o código e o nome da campanha.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      const data: any = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        channel,
        condominium_id: targetCondoId || null,
        participant_id: targetParticipantId || null,
        starts_at: startDate || null,
        ends_at: endDate || null,
        notes: notes || null,
      }

      if (editingId) {
        await updateCampaign(editingId, data)
        toast({ title: 'Campanha atualizada' })
      } else {
        await createCampaign(data)
        toast({ title: 'Campanha criada com sucesso' })
      }

      setDialogOpen(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar campanha',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getCampaignUrl = (camp: Campaign) => {
    const origin = window.location.origin
    return `${origin}/indicar?c=${encodeURIComponent(camp.code)}`
  }

  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({})

  const fetchQrCode = async (camp: Campaign) => {
    const targetUrl = getCampaignUrl(camp)
    if (qrCodeUrls[camp.id]) return qrCodeUrls[camp.id]
    try {
      const res = await fetch(
        `${pb.baseUrl}/backend/v1/communication/qr-code?url=${encodeURIComponent(targetUrl)}`,
      )
      const data = await res.json()
      if (data?.url) {
        setQrCodeUrls((prev) => ({ ...prev, [camp.id]: data.url }))
        return data.url
      }
    } catch {
      /* intentionally ignored */
    }
    const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`
    setQrCodeUrls((prev) => ({ ...prev, [camp.id]: fallback }))
    return fallback
  }

  const getQrUrl = (camp: Campaign) => {
    const targetUrl = getCampaignUrl(camp)
    return (
      qrCodeUrls[camp.id] ||
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(targetUrl)}`
    )
  }

  const filteredCampaigns = campaigns.filter((c) => {
    if (!search) return true
    const s = search.toLowerCase()
    return c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s)
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep block mb-1">
              Divulgação & Rastreamento
            </span>
            <h1 className="text-2xl font-serif text-foreground font-semibold flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-gold-deep" strokeWidth={1.5} />
              Campanhas & Materiais de Divulgação
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-sans">
              Rastreamento de origens (?c=CODIGO), campanhas institucionais e geração de kit de
              materiais (flyer, banner, e-mail com QR Code).
            </p>
          </div>

          <div className="flex items-center gap-2">
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
            <Button
              size="sm"
              onClick={handleOpenNew}
              className="rounded-[1px] bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs flex items-center gap-1.5 font-heading"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Nova Campanha
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="relative max-w-md">
          <Search
            className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.5}
          />
          <Input
            placeholder="Buscar por código ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-xs rounded-[1px] text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((camp) => (
            <Card
              key={camp.id}
              className="rounded-[1px] border-border bg-card shadow-subtle flex flex-col justify-between"
            >
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className="border-border text-gold-deep text-[10px] font-mono rounded-[1px]"
                      >
                        ?c={camp.code}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-border text-muted-foreground text-[10px] rounded-[1px] uppercase font-heading"
                      >
                        {camp.channel}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-serif font-semibold text-foreground">
                      {camp.name}
                    </CardTitle>
                  </div>

                  <Badge
                    variant="outline"
                    className="text-[10px] rounded-[1px] border-success/40 bg-success/10 text-success font-heading"
                  >
                    Ativa
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-3 pb-4 space-y-3 flex-1 text-xs text-muted-foreground font-sans">
                <div className="bg-secondary/60 p-2.5 border border-border font-mono text-[11px] text-foreground break-all select-all rounded-[1px]">
                  {getCampaignUrl(camp)}
                </div>

                <div className="space-y-1 text-[11px]">
                  {camp.condominium_id && (
                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                      <Building className="w-3.5 h-3.5 text-gold-deep" strokeWidth={1.5} />
                      Condomínio vinculado
                    </div>
                  )}
                  {camp.starts_at && (
                    <div className="font-mono text-muted-foreground">
                      Vigência: {new Date(camp.starts_at).toLocaleDateString('pt-BR')}
                      {camp.ends_at && ` até ${new Date(camp.ends_at).toLocaleDateString('pt-BR')}`}
                    </div>
                  )}
                  {camp.notes && <div className="text-muted-foreground italic">{camp.notes}</div>}
                </div>
              </CardContent>

              <div className="p-3 border-t border-border bg-secondary/30 flex items-center justify-end gap-2 rounded-b-[1px]">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(camp)}
                  className="rounded-[1px] text-xs h-7 font-heading"
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setMaterialsCamp(camp)
                    fetchQrCode(camp)
                    setCopiedLink(false)
                    setCopiedEmail(false)
                  }}
                  variant="outline"
                  className="rounded-[1px] border-border text-gold-deep hover:bg-secondary text-xs h-7 flex items-center gap-1 font-heading"
                >
                  <QrCode className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Kit de Materiais
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Campaign Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-semibold text-foreground">
              {editingId ? 'Editar Campanha' : 'Nova Campanha'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Crie links exclusivos de rastreamento com parâmetro{' '}
              <code className="text-gold-deep font-mono">?c=CODIGO</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs font-sans">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Código Rastreável
                </Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="EX: CLUBE-IPANEMA"
                  className="bg-background border-border uppercase font-mono rounded-[1px] text-xs text-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Canal da Campanha
                </Label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full bg-background border border-border rounded-[1px] px-3 py-2 text-xs text-foreground font-sans"
                >
                  <option value="portaria">Portaria</option>
                  <option value="parceiro">Parceiro</option>
                  <option value="cliente">Cliente</option>
                  <option value="impresso">Impresso</option>
                  <option value="evento">Evento</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-foreground font-heading font-medium">
                Nome da Campanha
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Parceria Clube de Regatas 2025"
                className="bg-background border-border rounded-[1px] text-xs text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Condomínio Vinculado (Opcional)
                </Label>
                <select
                  value={targetCondoId}
                  onChange={(e) => setTargetCondoId(e.target.value)}
                  className="w-full bg-background border border-border rounded-[1px] px-3 py-2 text-xs text-foreground font-sans"
                >
                  <option value="">Nenhum</option>
                  {condos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Participante Entidade (Opcional)
                </Label>
                <select
                  value={targetParticipantId}
                  onChange={(e) => setTargetParticipantId(e.target.value)}
                  className="w-full bg-background border border-border rounded-[1px] px-3 py-2 text-xs text-foreground font-sans"
                >
                  <option value="">Nenhum</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Data de Início
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-foreground font-heading font-medium">
                  Data de Término
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-background border-border rounded-[1px] text-xs font-mono text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-foreground font-heading font-medium">
                Observações / Notas
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes ou metas da campanha..."
                className="bg-background border-border rounded-[1px] text-xs text-foreground"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="rounded-[1px] text-xs font-heading"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="rounded-[1px] bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] font-semibold text-xs font-heading"
            >
              {saving ? 'Salvando...' : 'Salvar Campanha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Materials Kit Dialog */}
      <Dialog open={!!materialsCamp} onOpenChange={(open) => !open && setMaterialsCamp(null)}>
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
              <QrCode className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
              Kit de Divulgação: {materialsCamp?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Materiais prontos com QR Code oficial gerado no backend e link com parâmetro{' '}
              <code className="text-gold-deep font-mono">?c={materialsCamp?.code}</code>
            </DialogDescription>
          </DialogHeader>

          {materialsCamp && (
            <div className="space-y-6 py-3 text-xs font-sans">
              {/* QR Code & Direct Link */}
              <div className="p-4 bg-secondary/40 border border-border flex flex-col sm:flex-row items-center gap-4 rounded-[1px]">
                <div className="bg-white p-2 rounded-[1px] shrink-0">
                  <img
                    src={getQrUrl(materialsCamp)}
                    alt="QR Code da Campanha"
                    className="w-32 h-32 object-contain"
                  />
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-label font-heading font-semibold">
                    Link Exclusivo de Indicação
                  </div>
                  <div className="bg-card p-2 text-foreground font-mono text-[11px] break-all border border-border rounded-[1px]">
                    {getCampaignUrl(materialsCamp)}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-[1px] text-xs h-7 font-heading"
                      onClick={() => {
                        navigator.clipboard.writeText(getCampaignUrl(materialsCamp))
                        setCopiedLink(true)
                        setTimeout(() => setCopiedLink(false), 2000)
                      }}
                    >
                      {copiedLink ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success mr-1" strokeWidth={1.5} />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                      )}
                      {copiedLink ? 'Copiado!' : 'Copiar Link'}
                    </Button>
                    <a
                      href={getQrUrl(materialsCamp)}
                      download={`qrcode-${materialsCamp.code}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-[1px] text-xs h-7 font-heading"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                        Baixar Imagem QR
                      </Button>
                    </a>
                  </div>
                </div>
              </div>

              {/* Flyer Template */}
              <div className="space-y-2 font-sans">
                <h4 className="text-xs font-semibold uppercase tracking-label font-heading text-gold-deep">
                  1. Modelo para Flyer / Cartaz de Condomínio / Mural
                </h4>
                <div className="p-4 bg-secondary/40 border border-border space-y-2 text-foreground leading-relaxed rounded-[1px]">
                  <p className="font-serif text-sm font-semibold text-foreground">
                    🏢 Programa de Parceria Imobiliária — {materialsCamp.name} & Godoy Prime
                  </p>
                  <p className="text-muted-foreground font-sans">
                    Você sabia que pode monetizar sua rede ou apoiar nossa comunidade indicando
                    imóveis para venda ou locação?
                  </p>
                  <p className="text-muted-foreground font-sans">
                    Acesse o link ou aponte a câmera para o QR Code abaixo para cadastrar
                    proprietários ou compradores interessados com total discrição e acompanhamento
                    transparente.
                  </p>
                  <div className="text-gold-deep font-mono text-[11px] pt-1">
                    🔗 {getCampaignUrl(materialsCamp)}
                  </div>
                </div>
              </div>

              {/* Banner Digital Copy */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-label font-heading text-gold-deep">
                  2. Texto para Banner Digital / Redes Sociais / WhatsApp
                </h4>
                <div className="p-4 bg-secondary/40 border border-border space-y-2 text-foreground font-mono text-[11px] leading-relaxed rounded-[1px]">
                  <p>✨ Indique imóveis de alto padrão na Godoy Prime Indica!</p>
                  <p>
                    Conhece alguém querendo vender ou comprar no nosso condomínio/região? Indique
                    pelo canal oficial:
                  </p>
                  <p className="text-gold-deep">👉 {getCampaignUrl(materialsCamp)}</p>
                  <p className="text-muted-foreground">
                    Acompanhe cada etapa da negociação com transparência e receba sua premiação no
                    fechamento.
                  </p>
                </div>
              </div>

              {/* Email Copy */}
              <div className="space-y-2 font-sans">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-label font-heading text-gold-deep">
                    3. Texto para Disparo de E-mail Institucional
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-muted-foreground hover:text-foreground h-6 font-heading"
                    onClick={() => {
                      const emailBody = `Assunto: Parceria Oficial ${materialsCamp.name} & Godoy Prime Indica\n\nPrezados associados,\n\nTemos o prazer de anunciar nossa parceria com a Godoy Prime Indica.\nAgora você pode indicar imóveis para venda ou locação com atendimento exclusivo e transparência absoluta.\n\nPara fazer uma indicação, utilize o link:\n${getCampaignUrl(materialsCamp)}\n\nAtenciosamente,\nEquipe ${materialsCamp.name}`
                      navigator.clipboard.writeText(emailBody)
                      setCopiedEmail(true)
                      setTimeout(() => setCopiedEmail(false), 2000)
                    }}
                  >
                    {copiedEmail ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success mr-1" strokeWidth={1.5} />
                    ) : (
                      <Copy className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                    )}
                    {copiedEmail ? 'E-mail Copiado!' : 'Copiar Texto'}
                  </Button>
                </div>
                <div className="p-4 bg-secondary/40 border border-border space-y-2 text-foreground leading-relaxed rounded-[1px]">
                  <p className="font-semibold text-foreground font-sans">
                    Assunto: Parceria Oficial {materialsCamp.name} & Godoy Prime Indica
                  </p>
                  <p className="text-muted-foreground">Prezados associados e parceiros,</p>
                  <p className="text-muted-foreground">
                    Temos a satisfação de apresentar o programa de indicações imobiliárias em
                    parceria com a Godoy Prime Indica. Toda indicação realizada através do nosso
                    link exclusivo é acompanhada em tempo real por nossa equipe.
                  </p>
                  <p className="text-muted-foreground">
                    Clique aqui para acessar o canal de indicações:
                    <br />
                    <a
                      href={getCampaignUrl(materialsCamp)}
                      className="text-gold-deep underline font-mono"
                    >
                      {getCampaignUrl(materialsCamp)}
                    </a>
                  </p>
                  <p className="text-muted-foreground text-[11px] pt-1">
                    Atenciosamente,
                    <br />
                    Diretoria — {materialsCamp.name}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMaterialsCamp(null)}
              className="rounded-[1px] text-xs font-heading"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default AdminCampaignsPage
