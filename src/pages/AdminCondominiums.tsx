import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { AdminNavbar } from '@/components/AdminNavbar'
import { Condominium, Referral } from '@/types/referral'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Building, Plus, Search, MapPin, Users, Loader2, ArrowRight } from 'lucide-react'

export function AdminCondominiumsPage() {
  const { toast } = useToast()

  const [condos, setCondos] = useState<Condominium[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('all')

  // Selected condo detail modal
  const [selectedCondo, setSelectedCondo] = useState<Condominium | null>(null)

  // Create condo modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [neighborhood, setNeighborhood] = useState('Barra da Tijuca')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [condoList, refList] = await Promise.all([
        pb.collection('condominiums').getFullList<Condominium>({ sort: 'name' }),
        pb.collection('referrals').getFullList<Referral>({
          fields: 'id,condominium_id,status,owner_name,unit,current_owner_id,created',
          expand: 'current_owner_id',
        }),
      ])
      setCondos(condoList)
      setReferrals(refList)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar condomínios',
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

  const handleCreateCondo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !neighborhood.trim()) return
    try {
      setSubmitting(true)
      await pb.collection('condominiums').create({
        name: name.trim(),
        address: address.trim(),
        neighborhood: neighborhood.trim(),
        city: 'Rio de Janeiro',
        state: 'RJ',
        active: true,
      })
      toast({ title: 'Condomínio cadastrado com sucesso!' })
      setCreateModalOpen(false)
      setName('')
      setAddress('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = condos.filter((c) => {
    if (selectedNeighborhood !== 'all' && c.neighborhood !== selectedNeighborhood) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = c.name?.toLowerCase().includes(q)
      const matchAddr = c.address?.toLowerCase().includes(q)
      if (!matchName && !matchAddr) return false
    }
    return true
  })

  // Get referrals linked to selected condo
  const condoReferrals = selectedCondo
    ? referrals.filter((r) => r.condominium_id === selectedCondo.id)
    : []

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-white font-medium">
              Condomínios & Empreendimentos
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Base de condomínios semeada na Barra da Tijuca e Recreio dos Bandeirantes com
              histórico de captações.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo Condomínio
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-stone-900 border border-stone-800 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
            <Input
              placeholder="Buscar por nome do condomínio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-stone-950 border-stone-800 pl-9 rounded-none text-xs"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant={selectedNeighborhood === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedNeighborhood('all')}
              className={`rounded-none text-xs ${
                selectedNeighborhood === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'border-stone-800 text-stone-400'
              }`}
            >
              Todos os Bairros
            </Button>
            <Button
              variant={selectedNeighborhood === 'Barra da Tijuca' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedNeighborhood('Barra da Tijuca')}
              className={`rounded-none text-xs ${
                selectedNeighborhood === 'Barra da Tijuca'
                  ? 'bg-amber-600 text-white'
                  : 'border-stone-800 text-stone-400'
              }`}
            >
              Barra da Tijuca
            </Button>
            <Button
              variant={selectedNeighborhood === 'Recreio dos Bandeirantes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedNeighborhood('Recreio dos Bandeirantes')}
              className={`rounded-none text-xs ${
                selectedNeighborhood === 'Recreio dos Bandeirantes'
                  ? 'bg-amber-600 text-white'
                  : 'border-stone-800 text-stone-400'
              }`}
            >
              Recreio
            </Button>
          </div>
        </div>

        {/* Condos Grid */}
        {loading ? (
          <div className="py-20 flex justify-center text-stone-400 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
            Carregando condomínios...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-stone-900 border-stone-800 rounded-none p-12 text-center text-stone-500 text-xs">
            Nenhum condomínio encontrado.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const refsCount = referrals.filter((r) => r.condominium_id === c.id).length
              return (
                <Card
                  key={c.id}
                  onClick={() => setSelectedCondo(c)}
                  className="bg-stone-900 border-stone-800 hover:border-amber-500/40 cursor-pointer transition-all rounded-none"
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <Badge
                        variant="outline"
                        className="rounded-none border-stone-700 text-amber-300 text-[10px]"
                      >
                        {c.neighborhood}
                      </Badge>
                      <span className="text-xs text-stone-400 font-mono">
                        {refsCount} indicações
                      </span>
                    </div>
                    <CardTitle className="text-base text-stone-100 font-serif font-medium mt-1">
                      {c.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs text-stone-400 space-y-2">
                    <p className="flex items-center gap-1 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                      {c.address || `${c.neighborhood}, Rio de Janeiro - RJ`}
                    </p>
                    <div className="flex justify-end pt-1">
                      <span className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center">
                        Ver histórico do prédio
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* MODAL: Detalhes do Condomínio com indicações e participantes vinculados */}
      <Dialog open={!!selectedCondo} onOpenChange={(open) => !open && setSelectedCondo(null)}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedCondo && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-white">
                  {selectedCondo.name}
                </DialogTitle>
                <DialogDescription className="text-stone-400 text-xs flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {selectedCondo.address || `${selectedCondo.neighborhood}, Rio de Janeiro - RJ`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                  <span className="font-semibold text-stone-200">
                    Indicações Vinculadas ({condoReferrals.length})
                  </span>
                </div>

                {condoReferrals.length === 0 ? (
                  <p className="text-stone-500 py-4 text-center italic">
                    Nenhuma indicação cadastrada para este condomínio até o momento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {condoReferrals.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 bg-stone-950 border border-stone-800 rounded-none flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium text-stone-200">
                            {r.owner_name || 'Proprietário'} {r.unit ? `(Unidade ${r.unit})` : ''}
                          </p>
                          <span className="text-[10px] text-stone-500">
                            Indicado por: {r.expand?.current_owner_id?.name || 'Membro'} •{' '}
                            {new Date(r.created).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="rounded-none border-stone-700 text-stone-300 text-[10px]"
                          >
                            {r.status}
                          </Badge>
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="text-amber-400 hover:text-amber-300 rounded-none text-xs"
                          >
                            <Link to={`/admin/indicacoes/${r.id}`}>Abrir</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedCondo(null)}
                  className="rounded-none text-xs border-stone-800 text-stone-300"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: Novo Condomínio */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-md">
          <form onSubmit={handleCreateCondo}>
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-white">
                Cadastrar Condomínio
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3 text-xs">
              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Nome do Condomínio / Edifício:</label>
                <Input
                  placeholder="Ex: Condomínio Península Bernini"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-xs rounded-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Bairro:</label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Barra da Tijuca, Recreio dos Bandeirantes..."
                  className="bg-stone-950 border-stone-800 text-xs rounded-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-300 font-medium">Endereço Completo:</label>
                <Input
                  placeholder="Av. dos Flamboyants, 500"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-xs rounded-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-none text-xs text-stone-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !name.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-none text-xs"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
