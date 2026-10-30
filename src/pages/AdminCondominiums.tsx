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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AdminNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-label text-gold-deep block mb-1">
              Base Patrimonial
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-foreground font-semibold flex items-center gap-2">
              <Building className="w-6 h-6 text-gold-deep" strokeWidth={1.5} />
              Condomínios & Empreendimentos
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-sans">
              Base de condomínios semeada na Barra da Tijuca e Recreio dos Bandeirantes com
              histórico de captações.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] rounded-[1px] text-xs font-heading font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
            Novo Condomínio
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border p-4 flex flex-col sm:flex-row gap-3 items-center justify-between rounded-[1px]">
          <div className="relative w-full sm:w-80">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5"
              strokeWidth={1.5}
            />
            <Input
              placeholder="Buscar por nome do condomínio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background border-border pl-9 rounded-[1px] text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant={selectedNeighborhood === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedNeighborhood('all')}
              className="rounded-[1px] text-xs font-heading"
            >
              Todos os Bairros
            </Button>
            <Button
              variant={selectedNeighborhood === 'Barra da Tijuca' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedNeighborhood('Barra da Tijuca')}
              className="rounded-[1px] text-xs font-heading"
            >
              Barra da Tijuca
            </Button>
            <Button
              variant={selectedNeighborhood === 'Recreio dos Bandeirantes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedNeighborhood('Recreio dos Bandeirantes')}
              className="rounded-[1px] text-xs font-heading"
            >
              Recreio
            </Button>
          </div>
        </div>

        {/* Condos Grid */}
        {loading ? (
          <div className="py-20 flex justify-center text-muted-foreground text-sm font-sans">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" strokeWidth={1.5} />
            Carregando condomínios...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-card border-border rounded-[1px] p-12 text-center text-muted-foreground text-xs font-sans">
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
                  className="bg-card border-border hover:border-gold-deep cursor-pointer transition-all rounded-[1px] shadow-subtle"
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <Badge
                        variant="outline"
                        className="rounded-[1px] border-border text-gold-deep text-[10px] font-heading font-medium"
                      >
                        {c.neighborhood}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {refsCount} indicações
                      </span>
                    </div>
                    <CardTitle className="text-base text-foreground font-serif font-semibold mt-1">
                      {c.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs text-muted-foreground space-y-2 font-sans">
                    <p className="flex items-center gap-1 line-clamp-1">
                      <MapPin
                        className="w-3.5 h-3.5 text-muted-foreground shrink-0"
                        strokeWidth={1.5}
                      />
                      {c.address || `${c.neighborhood}, Rio de Janeiro - RJ`}
                    </p>
                    <div className="flex justify-end pt-1">
                      <span className="text-[11px] text-gold-deep hover:text-gold-deep/80 flex items-center font-heading font-medium">
                        Ver histórico do prédio
                        <ArrowRight className="w-3 h-3 ml-1" strokeWidth={1.5} />
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
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedCondo && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-foreground font-semibold">
                  {selectedCondo.name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs flex items-center gap-1 mt-1 font-sans">
                  <MapPin className="w-3.5 h-3.5 text-gold-deep" strokeWidth={1.5} />
                  {selectedCondo.address || `${selectedCondo.neighborhood}, Rio de Janeiro - RJ`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs font-sans">
                <div className="flex justify-between items-center border-b border-border pb-2 font-heading">
                  <span className="font-semibold text-foreground uppercase tracking-label text-[11px]">
                    Indicações Vinculadas ({condoReferrals.length})
                  </span>
                </div>

                {condoReferrals.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center italic font-sans">
                    Nenhuma indicação cadastrada para este condomínio até o momento.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {condoReferrals.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 bg-secondary/50 border border-border rounded-[1px] flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium text-foreground">
                            {r.owner_name || 'Proprietário'} {r.unit ? `(Unidade ${r.unit})` : ''}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Indicado por: {r.expand?.current_owner_id?.name || 'Membro'} •{' '}
                            {new Date(r.created).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="rounded-[1px] border-border text-foreground text-[10px] font-mono"
                          >
                            {r.status}
                          </Badge>
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="text-gold-deep hover:text-gold-deep/80 rounded-[1px] text-xs font-heading"
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
                  className="rounded-[1px] text-xs font-heading"
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
        <DialogContent className="bg-card border-border text-foreground rounded-[1px] sm:max-w-md">
          <form onSubmit={handleCreateCondo}>
            <DialogHeader>
              <DialogTitle className="font-serif text-lg text-foreground font-semibold">
                Cadastrar Condomínio
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-3 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-foreground font-heading font-medium">
                  Nome do Condomínio / Edifício:
                </label>
                <Input
                  placeholder="Ex: Condomínio Península Bernini"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background border-border text-xs rounded-[1px] text-foreground"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-heading font-medium">Bairro:</label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Barra da Tijuca, Recreio dos Bandeirantes..."
                  className="bg-background border-border text-xs rounded-[1px] text-foreground"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-heading font-medium">
                  Endereço Completo:
                </label>
                <Input
                  placeholder="Av. dos Flamboyants, 500"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-background border-border text-xs rounded-[1px] text-foreground"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-[1px] text-xs font-heading text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !name.trim()}
                className="bg-primary text-primary-foreground hover:bg-[#7A5E1E] hover:text-[#FAFAF8] rounded-[1px] text-xs font-heading font-semibold"
              >
                {submitting ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" strokeWidth={1.5} />
                ) : (
                  'Cadastrar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
