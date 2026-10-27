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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white font-medium">
              Proprietários & Imóveis Conhecidos
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Busca unificada de proprietários, histórico por imóvel e base de precedência (180 dias).
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Adicionar à Base Conhecida
          </Button>
        </div>

        {/* Search Bar */}
        <div className="bg-stone-900 border border-stone-800 p-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
            <Input
              placeholder="Buscar proprietário, condomínio, unidade ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-stone-950 border-stone-800 pl-9 rounded-none text-xs"
            />
          </div>
        </div>

        {/* Owners Table */}
        {loading ? (
          <div className="py-20 flex justify-center text-stone-400 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
            Carregando base de proprietários...
          </div>
        ) : filteredOwners.length === 0 ? (
          <Card className="bg-stone-900 border-stone-800 rounded-none p-12 text-center text-stone-500 text-xs">
            Nenhum proprietário encontrado com os termos pesquisados.
          </Card>
        ) : (
          <div className="bg-stone-900 border border-stone-800 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 border-b border-stone-800 text-stone-400">
                <tr>
                  <th className="p-3">Proprietário</th>
                  <th className="p-3">Contato</th>
                  <th className="p-3">Imóvel / Condomínio</th>
                  <th className="p-3">Origem</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {filteredOwners.map((owner, idx) => (
                  <tr key={`${owner.id}-${idx}`} className="hover:bg-stone-800/30 transition-colors">
                    <td className="p-3 font-medium text-stone-200">{owner.name}</td>
                    <td className="p-3 text-stone-400">
                      <div>{owner.phone || 'Sem telefone'}</div>
                      <div className="text-[11px] text-stone-500">{owner.email}</div>
                    </td>
                    <td className="p-3">
                      {owner.displayCondo ? (
                        <span className="text-amber-300">
                          {owner.displayCondo}
                          {owner.unit ? ` (${owner.unit})` : ''}
                        </span>
                      ) : (
                        <span className="text-stone-400">{owner.address || 'Não especificado'}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {owner.isKnownBase ? (
                        <Badge
                          variant="outline"
                          className="rounded-none border-stone-700 text-amber-400 text-[10px]"
                        >
                          Base Conhecida (Precedência)
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-none border-stone-700 text-sky-400 text-[10px]"
                        >
                          Indicação #{owner.rawReferral?.id.substring(0, 6)} ({owner.rawReferral?.status})
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {owner.rawReferral ? (
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="text-amber-400 hover:text-amber-300 rounded-none text-xs"
                        >
                          <Link to={`/admin/indicacoes/${owner.rawReferral.id}`}>
                            Ver Indicação
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedOwner(owner)}
                          className="text-stone-400 hover:text-white rounded-none text-xs"
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
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <form onSubmit={handleAddKnownOwner}>
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-white">
                Adicionar à Base Conhecida
              </DialogTitle>
              <DialogDescription className="text-stone-400 text-xs">
                Proprietários com conversa real cadastrada acionam a regra de precedência de 180 dias contra duplicações.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Nome do Proprietário:</label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Nome completo..."
                  className="bg-stone-950 border-stone-800 text-xs rounded-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-stone-300 font-medium">Telefone:</label>
                  <Input
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="(21) 99999-9999"
                    className="bg-stone-950 border-stone-800 text-xs rounded-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-stone-300 font-medium">E-mail:</label>
                  <Input
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="bg-stone-950 border-stone-800 text-xs rounded-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Condomínio (se houver):</label>
                <select
                  value={ownerCondoId}
                  onChange={(e) => setOwnerCondoId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-none p-2 text-xs text-stone-200"
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
                  <label className="text-stone-300 font-medium">Unidade / Apto:</label>
                  <Input
                    value={ownerUnit}
                    onChange={(e) => setOwnerUnit(e.target.value)}
                    placeholder="Ex: Bloco 2 / 401"
                    className="bg-stone-950 border-stone-800 text-xs rounded-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-stone-300 font-medium">Endereço:</label>
                  <Input
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    placeholder="Av. das Américas..."
                    className="bg-stone-950 border-stone-800 text-xs rounded-none"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddModalOpen(false)}
                className="rounded-none text-xs text-stone-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !ownerName.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : 'Salvar na Base'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
