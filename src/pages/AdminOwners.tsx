import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import { Referral, Condominium } from '@/types/referral'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  UserSquare2,
  Search,
  Building,
  Phone,
  Mail,
  Loader2,
  ChevronRight,
  Plus,
} from 'lucide-react'

export function AdminOwnersPage() {
  const { toast } = useToast()

  const [referrals, setReferrals] = useState<Referral[]>([])
  const [knownOwners, setKnownOwners] = useState<any[]>([])
  const [condos, setCondos] = useState<Condominium[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Detail Modal for an Owner / Property
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null)

  // Register Known Owner Modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerUnit, setOwnerUnit] = useState('')
  const [ownerCondoId, setOwnerCondoId] = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [refList, knownList, condoList] = await Promise.all([
        pb.collection('referrals').getFullList<Referral>({
          filter: "referral_type = 'proprietario' || type = 'imovel' || type = 'proprietario'",
          sort: '-created',
          expand: 'condominium_id,current_owner_id',
        }),
        pb.collection('known_owner_base').getFullList({
          sort: '-created',
          expand: 'condominium_id',
        }),
        pb.collection('condominiums').getFullList<Condominium>({ sort: 'name' }),
      ])
      setReferrals(refList)
      setKnownOwners(knownList)
      setCondos(condoList)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar proprietários',
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

  const handleAddKnownOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerName.trim()) return
    try {
      setSubmitting(true)
      const normPhone = ownerPhone.replace(/\D/g, '')
      const normAddress = ownerAddress
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .trim()

      await pb.collection('known_owner_base').create({
        name: ownerName.trim(),
        phone: ownerPhone.trim(),
        normalized_phone: normPhone,
        email: ownerEmail.trim(),
        condominium_id: ownerCondoId || null,
        unit: ownerUnit.trim(),
        address: ownerAddress.trim(),
        normalized_address: normAddress,
        last_real_contact_at: new Date().toISOString(),
      })

      toast({ title: 'Proprietário cadastrado na base conhecida com sucesso!' })
      setAddModalOpen(false)
      setOwnerName('')
      setOwnerPhone('')
      setOwnerEmail('')
      setOwnerUnit('')
      setOwnerAddress('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // Unified list of owners from active referrals + known_owner_base
  const allOwners = [
    ...knownOwners.map((k) => ({
      ...k,
      isKnownBase: true,
      displayCondo: k.expand?.condominium_id?.name || '',
    })),
    ...referrals.map((r) => ({
      id: r.id,
      name: r.owner_name || r.referrer_name || 'Proprietário',
      phone: r.owner_phone || r.referrer_phone || '',
      email: r.owner_email || '',
      condominium_id: r.condominium_id,
      unit: r.unit || '',
      address: r.normalized_address || r.description,
      isKnownBase: false,
      displayCondo: r.expand?.condominium_id?.name || '',
      rawReferral: r,
    })),
  ]

  const filteredOwners = allOwners.filter((o) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (o.name && o.name.toLowerCase().includes(q)) ||
      (o.phone && o.phone.includes(q)) ||
      (o.email && o.email.toLowerCase().includes(q)) ||
      (o.unit && o.unit.toLowerCase().includes(q)) ||
      (o.displayCondo && o.displayCondo.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep block mb-1">
              Carteira & Precedência
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground font-semibold flex items-center gap-2">
              <UserSquare2 className="w-6 h-6 text-gold-deep" strokeWidth={1.5} />
              Proprietários & Imóveis Conhecidos
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-sans">
              Busca unificada de proprietários, histórico por imóvel e base de precedência (180
              dias).
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] rounded-[1px] text-xs font-heading font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
            Adicionar à Base Conhecida
          </Button>
        </div>

        {/* Search Bar */}
        <div className="bg-card border border-border p-4 rounded-[1px]">
          <div className="relative max-w-md">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5"
              strokeWidth={1.5}
            />
            <Input
              placeholder="Buscar proprietário, condomínio, unidade ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background border-border pl-9 rounded-[1px] text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Owners Table */}
        {loading ? (
          <div className="py-20 flex justify-center text-muted-foreground text-sm font-sans">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" strokeWidth={1.5} />
            Carregando base de proprietários...
          </div>
        ) : filteredOwners.length === 0 ? (
          <Card className="bg-card border-border rounded-[1px] p-12 text-center text-muted-foreground text-xs font-sans">
            Nenhum proprietário encontrado com os termos pesquisados.
          </Card>
        ) : (
          <div className="bg-card border border-border overflow-x-auto rounded-[1px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 border-b border-border text-muted-foreground font-heading text-[11px] uppercase tracking-label">
                <tr>
                  <th className="p-3">Proprietário</th>
                  <th className="p-3">Contato</th>
                  <th className="p-3">Imóvel / Condomínio</th>
                  <th className="p-3">Origem</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredOwners.map((owner, idx) => (
                  <tr
                    key={`${owner.id}-${idx}`}
                    className={`hover:bg-accent/40 transition-colors ${
                      idx % 2 === 1 ? 'bg-secondary/40' : 'bg-card'
                    }`}
                  >
                    <td className="p-3 font-medium text-foreground">{owner.name}</td>
                    <td className="p-3 text-muted-foreground">
                      <div className="font-mono text-foreground">
                        {owner.phone || 'Sem telefone'}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {owner.email}
                      </div>
                    </td>
                    <td className="p-3">
                      {owner.displayCondo ? (
                        <span className="text-gold-deep font-heading">
                          {owner.displayCondo}
                          {owner.unit ? ` (${owner.unit})` : ''}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-sans">
                          {owner.address || 'Não especificado'}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {owner.isKnownBase ? (
                        <Badge
                          variant="outline"
                          className="rounded-[1px] border-border text-gold-deep text-[10px] font-heading font-medium"
                        >
                          Base Conhecida (Precedência)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-[1px] border-border text-info text-[10px] font-mono"
                        >
                          Indicação #{owner.rawReferral?.id.substring(0, 6)} (
                          {owner.rawReferral?.status})
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {owner.rawReferral ? (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="text-gold-deep hover:text-gold-deep/80 rounded-[1px] text-xs font-heading"
                        >
                          <Link to={`/admin/indicacoes/${owner.rawReferral.id}`}>
                            Ver Indicação
                            <ChevronRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.5} />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedOwner(owner)}
                          className="text-muted-foreground hover:text-foreground rounded-[1px] text-xs font-heading"
                        >
                          Detalhes
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL: Adicionar à Base Conhecida */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
          <form onSubmit={handleAddKnownOwner}>
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-foreground font-semibold">
                Adicionar à Base Conhecida
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs font-sans">
                Proprietários com conversa real cadastrada acionam a regra de precedência de 180
                dias contra duplicações.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-foreground font-heading font-medium">
                  Nome do Proprietário:
                </label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Nome completo..."
                  className="bg-background border-border text-xs rounded-[1px] text-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-foreground font-heading font-medium">Telefone:</label>
                  <Input
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="(21) 99999-9999"
                    className="bg-background border-border text-xs rounded-[1px] font-mono text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-foreground font-heading font-medium">E-mail:</label>
                  <Input
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="bg-background border-border text-xs rounded-[1px] text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-heading font-medium">
                  Condomínio (se houver):
                </label>
                <select
                  value={ownerCondoId}
                  onChange={(e) => setOwnerCondoId(e.target.value)}
                  className="w-full bg-background border border-border rounded-[1px] p-2 text-xs text-foreground font-sans"
                >
                  <option value="">(Nenhum condomínio cadastrado)</option>
                  {condos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.neighborhood})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-foreground font-heading font-medium">
                    Unidade / Apto:
                  </label>
                  <Input
                    value={ownerUnit}
                    onChange={(e) => setOwnerUnit(e.target.value)}
                    placeholder="Ex: Bloco 2 / 401"
                    className="bg-background border-border text-xs rounded-[1px] text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-foreground font-heading font-medium">Endereço:</label>
                  <Input
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    placeholder="Av. das Américas..."
                    className="bg-background border-border text-xs rounded-[1px] text-foreground"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddModalOpen(false)}
                className="rounded-[1px] text-xs font-heading text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !ownerName.trim()}
                className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] rounded-[1px] text-xs font-heading font-semibold"
              >
                {submitting ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" strokeWidth={1.5} />
                ) : (
                  'Salvar na Base'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
