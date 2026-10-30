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
import { User, Share2, Copy, Check, ExternalLink, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Eyebrow } from '@/components/brand'

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
  const publicLinkUrl = `${window.location.origin}/i/${slug}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLinkUrl)
    setCopiedLink(true)
    toast({
      title: 'Link copiado com sucesso!',
      description:
        'Envie para contatos interessados em vender, alugar ou comprar imóveis na Barra e Recreio.',
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
        description: 'Seus dados e link de indicação foram salvos.',
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
    <div className="min-h-screen bg-background text-foreground pb-16 font-sans">
      <MemberNavbar />

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 max-w-3xl space-y-6">
        <div>
          <Eyebrow>CONTA DO INDICADOR · GODOY PRIME REALTY</Eyebrow>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="h-6 w-6 text-gold-deep" strokeWidth={1.5} />
            Meu Perfil &amp; <em>Link Pessoal</em>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-sans">
            Gerencie seus dados no programa e personalize o identificador do seu link exclusivo.
          </p>
        </div>

        {/* Public link showcase box */}
        <Card className="bg-card border-border shadow-luxury text-card-foreground rounded-[1px]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-gold-deep">
              <Share2 className="h-4 w-4" strokeWidth={1.5} />
              <CardTitle className="text-base text-foreground font-serif font-bold">
                Seu Link Pessoal de Indicação
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground font-sans">
              Este é o seu link exclusivo. Compartilhe individualmente com contatos interessados
              para que eles preencham o formulário oficial diretamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 font-sans">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-secondary/50 p-2.5 rounded-[1px] border border-border">
              <span className="text-xs font-mono text-foreground break-all px-2 select-all flex-1">
                {publicLinkUrl}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="text-xs h-9 shrink-0 rounded-[1px]"
                >
                  {copiedLink ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-success" strokeWidth={1.5} />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1 text-gold-deep" strokeWidth={1.5} />
                      Copiar Link
                    </>
                  )}
                </Button>
                <Button
                  asChild
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs h-9 shrink-0 rounded-[1px]"
                >
                  <Link to={`/i/${slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                    Abrir Página
                  </Link>
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              * Quem acessa este link é acolhido com a mensagem de indicação e um formulário direto
              onde já autoriza o contato de corretores credenciados com CRECI ativo.
            </p>
          </CardContent>
        </Card>

        {/* Member profile edit form */}
        <Card className="bg-card border-border text-card-foreground shadow-sm rounded-[1px]">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-lg text-foreground font-serif font-bold">
              Dados do Indicador
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground font-sans">
              Informações cadastrais para contato e liquidação de recompensas.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSave}>
            <CardContent className="space-y-4 pt-5 font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="member-name" className="text-xs font-heading text-foreground">
                    Nome Completo *
                  </Label>
                  <Input
                    id="member-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-[1px] text-xs sm:text-sm font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="member-agency" className="text-xs font-heading text-foreground">
                    Profissão / Entidade
                  </Label>
                  <Input
                    id="member-agency"
                    placeholder="Ex.: Morador, Síndico, Parceiro"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    className="rounded-[1px] text-xs sm:text-sm font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="member-email" className="text-xs font-heading text-foreground">
                    E-mail de acesso (login)
                  </Label>
                  <Input
                    id="member-email"
                    value={user?.email || ''}
                    disabled
                    className="rounded-[1px] text-xs sm:text-sm font-mono cursor-not-allowed bg-secondary/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="member-phone" className="text-xs font-heading text-foreground">
                    Telefone / WhatsApp de Contato
                  </Label>
                  <Input
                    id="member-phone"
                    placeholder="(21) 98765-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-[1px] text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              {/* Public link slug customization */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label htmlFor="member-slug" className="text-xs font-heading text-foreground">
                    Identificador amigável do seu link (slug)
                  </Label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSlug}
                    className="text-[11px] text-gold-deep hover:underline font-heading font-medium"
                  >
                    Gerar a partir do nome
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-secondary/50 border border-border px-3 py-2 rounded-[1px] select-none hidden sm:inline">
                    /i/
                  </span>
                  <Input
                    id="member-slug"
                    placeholder="seu-nome"
                    value={publicSlug}
                    onChange={(e) => setPublicSlug(slugify(e.target.value))}
                    className="rounded-[1px] text-xs sm:text-sm font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground font-sans">
                  Apenas letras minúsculas e hífens. Exemplo:{' '}
                  <code className="text-foreground font-mono">marcus-godoy</code>
                </p>
              </div>
            </CardContent>

            <CardFooter className="border-t border-border pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-[1px] text-xs sm:text-sm h-9"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  )
}
