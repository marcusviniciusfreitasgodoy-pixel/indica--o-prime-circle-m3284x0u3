import React, { useEffect, useState } from 'react'
import { AdminNavbar } from '@/components/AdminNavbar'
import { listCampaigns, createCampaign, updateCampaign, Campaign } from '@/services/communication'
import { pb } from '@/lib/pocketbase/client'
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
  const [type, setType] = useState('entidade')
  const [targetCondoId, setTargetCondoId] = useState('')
  const [targetParticipantId, setTargetParticipantId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [utmSource, setUtmSource] = useState('entidade')
  const [utmMedium, setUtmMedium] = useState('qrcode')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [active, setActive] = useState(true)
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
    setType('entidade')
    setTargetCondoId('')
    setTargetParticipantId('')
    setStartDate(new Date().toISOString().substring(0, 10))
    setEndDate('')
    setUtmSource('entidade')
    setUtmMedium('qrcode')
    setUtmCampaign('')
    setActive(true)
    setDialogOpen(true)
  }

  const handleOpenEdit = (c: Campaign) => {
    setEditingId(c.id)
    setCode(c.code)
    setName(c.name)
    setType(c.type)
    setTargetCondoId(c.target_condominium_id || '')
    setTargetParticipantId(c.target_participant_id || '')
    setStartDate(c.start_date ? c.start_date.substring(0, 10) : '')
    setEndDate(c.end_date ? c.end_date.substring(0, 10) : '')
    setUtmSource(c.utm_source || 'entidade')
    setUtmMedium(c.utm_medium || 'qrcode')
    setUtmCampaign(c.utm_campaign || '')
    setActive(c.active)
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
        type,
        target_condominium_id: targetCondoId || null,
        target_participant_id: targetParticipantId || null,
        start_date: startDate || null,
        end_date: endDate || null,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || code.trim().toLowerCase(),
        active,
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

  const getQrUrl = (camp: Campaign) => {
    const targetUrl = getCampaignUrl(camp)
    return `${pb.baseUrl}/backend/v1/qr-code?url=${encodeURIComponent(targetUrl)}`
  }

  const filteredCampaigns = campaigns.filter((c) => {
    if (!search) return true
    const s = search.toLowerCase()
    return c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s)
  })

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-6">
          <div>
            <h1 className="text-2xl font-serif text-white flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-amber-500" />
              Campanhas & Materiais de Divulgação
            </h1>
            <p className="text-xs text-stone-400 mt-1">
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
              className="rounded-none border-stone-700 text-stone-300 hover:text-white text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={handleOpenNew}
              className="rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Nova Campanha
            </Button>
          </div>
        </div>

        {/* Filter */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por código ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-stone-900 border-stone-800 text-xs rounded-none"
          />
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((camp) => (
            <Card
              key={camp.id}
              className="rounded-none border-stone-800 bg-stone-900/60 flex flex-col justify-between"
            >
              <CardHeader className="pb-3 border-b border-stone-800/60">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-amber-950/70 text-amber-300 border-amber-800/60 text-[10px] font-mono rounded-none">
                        ?c={camp.code}
                      </Badge>
                      <Badge className="bg-stone-800 text-stone-300 text-[10px] rounded-none">
                        {camp.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-semibold text-white">{camp.name}</CardTitle>
                  </div>

                  <Badge
                    className={`text-[10px] rounded-none ${
                      camp.active
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-stone-900 text-stone-500 border-stone-800'
                    }`}
                  >
                    {camp.active ? 'Ativa' : 'Pausada'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-3 pb-4 space-y-3 flex-1 text-xs text-stone-400">
                <div className="bg-stone-950/60 p-2.5 border border-stone-800/70 font-mono text-[11px] text-stone-300 break-all select-all">
                  {getCampaignUrl(camp)}
                </div>

                <div className="space-y-1 text-[11px]">
                  {camp.target_condominium_id && (
                    <div className="flex items-center gap-1.5 text-stone-300">
                      <Building className="w-3.5 h-3.5 text-amber-500" />
                      Condomínio vinculado
                    </div>
                  )}
                  {camp.start_date && (
                    <div>
                      Vigência: {new Date(camp.start_date).toLocaleDateString('pt-BR')}
                      {camp.end_date &&
                        ` até ${new Date(camp.end_date).toLocaleDateString('pt-BR')}`}
                    </div>
                  )}
                </div>
              </CardContent>

              <div className="p-3 border-t border-stone-800/60 bg-stone-950/40 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(camp)}
                  className="rounded-none border-stone-700 text-stone-300 text-xs h-7"
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setMaterialsCamp(camp)
                    setCopiedLink(false)
                    setCopiedEmail(false)
                  }}
                  className="rounded-none bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 text-xs h-7 flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Kit de Materiais
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Campaign Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif">
              {editingId ? 'Editar Campanha' : 'Nova Campanha'}
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-400">
              Crie links exclusivos de rastreamento com parâmetro{' '}
              <code className="text-amber-400">?c=CODIGO</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Código Rastreável</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="EX: CLUBE-IPANEMA"
                  className="bg-stone-950 border-stone-800 uppercase font-mono rounded-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Tipo de Campanha</Label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
                >
                  <option value="entidade">Parceiro Institucional / Entidade</option>
                  <option value="condominio">Condomínio / Associação</option>
                  <option value="influencer">Influenciador / Parceiro</option>
                  <option value="institucional">Institucional Godoy</option>
                  <option value="sazonal">Sazonal / Temporária</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-stone-300">Nome da Campanha</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Parceria Clube de Regatas 2025"
                className="bg-stone-950 border-stone-800 rounded-none text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Condomínio Vinculado (Opcional)</Label>
                <select
                  value={targetCondoId}
                  onChange={(e) => setTargetCondoId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
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
                <Label className="text-xs text-stone-300">Participante Entidade (Opcional)</Label>
                <select
                  value={targetParticipantId}
                  onChange={(e) => setTargetParticipantId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
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
                <Label className="text-xs text-stone-300">Data de Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Data de Término</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="campActive"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-stone-700 bg-stone-950 text-amber-500"
              />
              <Label htmlFor="campActive" className="text-xs text-stone-300 cursor-pointer">
                Campanha ativa para novas indicações
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="rounded-none border-stone-700 text-stone-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold text-xs"
            >
              {saving ? 'Salvando...' : 'Salvar Campanha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Materials Kit Dialog */}
      <Dialog open={!!materialsCamp} onOpenChange={(open) => !open && setMaterialsCamp(null)}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-serif flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-500" />
              Kit de Divulgação: {materialsCamp?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-400">
              Materiais prontos com QR Code oficial gerado no backend e link com parâmetro{' '}
              <code className="text-amber-400 font-mono">?c={materialsCamp?.code}</code>
            </DialogDescription>
          </DialogHeader>

          {materialsCamp && (
            <div className="space-y-6 py-3 text-xs">
              {/* QR Code & Direct Link */}
              <div className="p-4 bg-stone-950 border border-stone-800 flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2 rounded-sm shrink-0">
                  <img
                    src={getQrUrl(materialsCamp)}
                    alt="QR Code da Campanha"
                    className="w-32 h-32 object-contain"
                  />
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <div className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
                    Link Exclusivo de Indicação
                  </div>
                  <div className="bg-stone-900 p-2 text-stone-200 font-mono text-[11px] break-all border border-stone-800">
                    {getCampaignUrl(materialsCamp)}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none text-xs border-stone-700 text-stone-300 h-7"
                      onClick={() => {
                        navigator.clipboard.writeText(getCampaignUrl(materialsCamp))
                        setCopiedLink(true)
                        setTimeout(() => setCopiedLink(false), 2000)
                      }}
                    >
                      {copiedLink ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-1" />
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
                        className="rounded-none text-xs border-stone-700 text-stone-300 h-7"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Baixar Imagem QR
                      </Button>
                    </a>
                  </div>
                </div>
              </div>

              {/* Flyer Template */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  1. Modelo para Flyer / Cartaz de Condomínio / Mural
                </h4>
                <div className="p-4 bg-stone-950 border border-stone-800 space-y-2 text-stone-300 leading-relaxed font-sans">
                  <p className="font-serif text-sm font-semibold text-white">
                    🏢 Programa de Parceria Imobiliária — {materialsCamp.name} & Godoy Prime
                  </p>
                  <p>
                    Você sabia que pode monetizar sua rede ou apoiar nossa comunidade indicando
                    imóveis para venda ou locação?
                  </p>
                  <p>
                    Acesse o link ou aponte a câmera para o QR Code abaixo para cadastrar
                    proprietários ou compradores interessados com total discrição e acompanhamento
                    transparente.
                  </p>
                  <div className="text-stone-400 font-mono text-[11px] pt-1">
                    🔗 {getCampaignUrl(materialsCamp)}
                  </div>
                </div>
              </div>

              {/* Banner Digital Copy */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  2. Texto para Banner Digital / Redes Sociais / WhatsApp
                </h4>
                <div className="p-4 bg-stone-950 border border-stone-800 space-y-2 text-stone-300 font-mono text-[11px] leading-relaxed">
                  <p>✨ Indique imóveis de alto padrão na Godoy Prime Circle!</p>
                  <p>
                    Conhece alguém querendo vender ou comprar no nosso condomínio/região? Indique
                    pelo canal oficial:
                  </p>
                  <p>👉 {getCampaignUrl(materialsCamp)}</p>
                  <p>
                    Acompanhe cada etapa da negociação com transparência e receba sua premiação no
                    fechamento.
                  </p>
                </div>
              </div>

              {/* Email Copy */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    3. Texto para Disparo de E-mail Institucional
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-stone-400 hover:text-white h-6"
                    onClick={() => {
                      const emailBody = `Assunto: Parceria Oficial ${materialsCamp.name} & Godoy Prime Circle\n\nPrezados associados,\n\nTemos o prazer de anunciar nossa parceria com a Godoy Prime Circle.\nAgora você pode indicar imóveis para venda ou locação com atendimento exclusivo e transparência absoluta.\n\nPara fazer uma indicação, utilize o link:\n${getCampaignUrl(materialsCamp)}\n\nAtenciosamente,\nEquipe ${materialsCamp.name}`
                      navigator.clipboard.writeText(emailBody)
                      setCopiedEmail(true)
                      setTimeout(() => setCopiedEmail(false), 2000)
                    }}
                  >
                    {copiedEmail ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 mr-1" />
                    )}
                    {copiedEmail ? 'E-mail Copiado!' : 'Copiar Texto'}
                  </Button>
                </div>
                <div className="p-4 bg-stone-950 border border-stone-800 space-y-2 text-stone-300 leading-relaxed font-sans">
                  <p className="font-semibold text-white">
                    Assunto: Parceria Oficial {materialsCamp.name} & Godoy Prime Circle
                  </p>
                  <p>Prezados associados e parceiros,</p>
                  <p>
                    Temos a satisfação de apresentar o programa de indicações imobiliárias em
                    parceria com a Godoy Prime Circle. Toda indicação realizada através do nosso
                    link exclusivo é acompanhada em tempo real por nossa equipe.
                  </p>
                  <p>
                    Clique aqui para acessar o canal de indicações:
                    <br />
                    <a
                      href={getCampaignUrl(materialsCamp)}
                      className="text-amber-400 underline font-mono"
                    >
                      {getCampaignUrl(materialsCamp)}
                    </a>
                  </p>
                  <p className="text-stone-400 text-[11px] pt-1">
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
              className="rounded-none border-stone-700 text-stone-300 text-xs"
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
