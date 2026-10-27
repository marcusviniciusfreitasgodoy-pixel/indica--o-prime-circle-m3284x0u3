import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { MemberNavbar } from '@/components/MemberNavbar'
import { updateMemberProfile, slugify } from '@/services/members'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  User,
  Building2,
  Phone,
  Mail,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState(user?.name || '')
  const [agency, setAgency] = useState(user?.agency || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [publicSlug, setPublicSlug] = useState(user?.public_slug || '')
  const [isSaving, setIsSaving] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Sync state if user changes
  React.useEffect(() => {
    if (user) {
      setName(user.name || '')
      setAgency(user.agency || '')
      setPhone(user.phone || '')
      setPublicSlug(user.public_slug || '')
    }
  }, [user])

  const slug = publicSlug.trim() || user?.id || ''
  const publicLinkUrl = `${window.location.origin}/indicacao/${slug}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLinkUrl)
    setCopiedLink(true)
    toast({
      title: 'Link copiado com sucesso!',
      description:
        'Envie para porteiros, síndicos e parceiros captarem imóveis e clientes para você.',
    })
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleAutoGenerateSlug = () => {
    if (name) {
      setPublicSlug(slugify(name))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setIsSaving(true)
      const cleanSlug = publicSlug ? slugify(publicSlug) : ''
      await updateMemberProfile(user.id, {
        name: name.trim(),
        agency: agency.trim(),
        phone: phone.trim(),
        public_slug: cleanSlug,
      })

      await refreshUser()

      toast({
        title: 'Perfil atualizado!',
        description: 'Seus dados e link de captação foram salvos.',
      })
    } catch (err: unknown) {
      console.error('Erro ao atualizar perfil:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao salvar dados.'
      toast({
        title: 'Erro ao salvar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif flex items-center gap-2">
            <User className="h-7 w-7 text-amber-500" />
            Meu Perfil & Link de Captação
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie seus dados institucionais na rede e personalize sua página pública de
            indicação.
          </p>
        </div>

        {/* Public link showcase box */}
        <Card className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-amber-500/40 shadow-xl text-slate-100">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Share2 className="h-5 w-5" />
              <CardTitle className="text-base text-white">Sua Página Pública de Captação</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-300">
              Este é o seu link exclusivo. Compartilhe com porteiros, síndicos, zeladores, clientes
              e parceiros para que eles enviem indicações diretamente para o seu painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs font-mono text-amber-300 break-all px-2 select-all flex-1">
                {publicLinkUrl}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs h-9 shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copiar Link
                    </>
                  )}
                </Button>
                <Button
                  asChild
                  type="button"
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs h-9 shrink-0"
                >
                  <Link to={`/indicacao/${slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Abrir Página
                  </Link>
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              * Quem acessa este link vê seu nome, imobiliária e um formulário rápido para cadastrar
              imóveis ou clientes sem precisar criar conta.
            </p>
          </CardContent>
        </Card>

        {/* Member profile edit form */}
        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-lg">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-lg text-white">Dados do Membro</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Informações visíveis aos parceiros da rede e na sua página pública de captação.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSave}>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="member-name" className="text-xs text-slate-300">
                    Nome Completo *
                  </Label>
                  <Input
                    id="member-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="member-agency" className="text-xs text-slate-300">
                    Imobiliária / Empresa *
                  </Label>
                  <Input
                    id="member-agency"
                    placeholder="Ex.: Prime Circle Imóveis"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="member-email" className="text-xs text-slate-300">
                    E-mail institucional (login)
                  </Label>
                  <Input
                    id="member-email"
                    value={user?.email || ''}
                    disabled
                    className="bg-slate-950/50 border-slate-800 text-slate-400 text-sm cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="member-phone" className="text-xs text-slate-300">
                    Telefone / WhatsApp de Contato
                  </Label>
                  <Input
                    id="member-phone"
                    placeholder="(11) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500"
                  />
                </div>
              </div>

              {/* Public link slug customization */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <Label htmlFor="member-slug" className="text-xs text-slate-300">
                    Identificador amigável do seu link público (slug)
                  </Label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSlug}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
                  >
                    Gerar a partir do nome
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500 bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg select-none hidden sm:inline">
                    /indicacao/
                  </span>
                  <Input
                    id="member-slug"
                    placeholder="seu-nome"
                    value={publicSlug}
                    onChange={(e) => setPublicSlug(slugify(e.target.value))}
                    className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus-visible:ring-amber-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Apenas letras minúsculas e hífens. Exemplo:{' '}
                  <code className="text-slate-300 font-mono">marcus-godoy</code>
                </p>
              </div>
            </CardContent>

            <CardFooter className="border-t border-slate-800/80 pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  )
}
