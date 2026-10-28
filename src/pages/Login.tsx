import React, { useState } from 'react'
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ShieldCheck,
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
  Mail,
  KeyRound,
  CheckCircle2,
  UserPlus,
  Send,
} from 'lucide-react'

export default function LoginPage() {
  const { login, signup, requestMagicLink, requestPasswordReset, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<'password' | 'magic' | 'signup' | 'forgot'>(
    (searchParams.get('tab') as 'password' | 'magic' | 'signup' | 'forgot') || 'password',
  )

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [magicLinkPreview, setMagicLinkPreview] = useState<string | null>(null)

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      const destination =
        (location.state as { from?: { pathname?: string } })?.from?.pathname || '/painel'
      navigate(destination, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email || !password) {
      setErrorMsg('Por favor, informe seu e-mail e senha cadastrados.')
      return
    }

    try {
      setIsLoading(true)
      await login(email, password)
      const destination =
        (location.state as { from?: { pathname?: string } })?.from?.pathname || '/painel'
      navigate(destination, { replace: true })
    } catch (err: unknown) {
      console.error('Falha de login:', err)
      setErrorMsg('E-mail ou senha incorretos. Verifique suas credenciais de membro Prime Circle.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setMagicLinkPreview(null)

    if (!email) {
      setErrorMsg('Por favor, informe o e-mail cadastrado.')
      return
    }

    try {
      setIsLoading(true)
      const res = await requestMagicLink(email)
      setSuccessMsg(res.message || 'Link seguro gerado!')
      if (res.magic_token) {
        setMagicLinkPreview(res.magic_token)
      }
    } catch (err: unknown) {
      console.error('Erro link mágico:', err)
      setErrorMsg('Não foi possível gerar o link mágico no momento.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!name || !email || !password) {
      setErrorMsg('Nome, e-mail e senha são obrigatórios.')
      return
    }

    if (password.length < 8) {
      setErrorMsg('A senha deve conter no mínimo 8 caracteres.')
      return
    }

    try {
      setIsLoading(true)
      await signup({ email, password, name, phone })
      setSuccessMsg('Cadastro realizado com sucesso! Perfil criado.')
      setTimeout(() => {
        navigate('/painel', { replace: true })
      }, 1000)
    } catch (err: unknown) {
      console.error('Erro no cadastro:', err)
      setErrorMsg('Não foi possível criar a conta. Este e-mail já pode estar cadastrado.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email) {
      setErrorMsg('Por favor, informe seu e-mail institucional.')
      return
    }

    try {
      setIsLoading(true)
      await requestPasswordReset(email)
      setSuccessMsg(
        'Se este e-mail estiver registrado, enviamos instruções para recuperação de senha.',
      )
    } catch (err: unknown) {
      console.error('Erro recuperação:', err)
      setErrorMsg('Erro ao solicitar recuperação de senha.')
    } finally {
      setIsLoading(false)
    }
  }

  // Quick fill helper for testing
  const handleQuickFill = (testEmail: string) => {
    setEmail(testEmail)
    setPassword('Skip@Pass')
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-b from-stone-900 via-stone-950 to-black p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-none bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-4 shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-white">
            Prime Circle Indica
          </h1>
          <p className="mt-2 text-sm text-stone-400 font-sans">
            Programa de Indicação Imobiliária de Alto Padrão
          </p>
        </div>

        <Card className="rounded-none border-stone-800 bg-stone-950/95 backdrop-blur shadow-2xl text-stone-100">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as any)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className="w-full"
          >
            <div className="p-4 border-b border-stone-800">
              <TabsList className="grid grid-cols-3 bg-stone-900 border border-stone-800 rounded-none h-10 text-xs">
                <TabsTrigger
                  value="password"
                  className="rounded-none data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                >
                  Senha
                </TabsTrigger>
                <TabsTrigger
                  value="magic"
                  className="rounded-none data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                >
                  Link Mágico
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-none data-[state=active]:bg-amber-600 data-[state=active]:text-white"
                >
                  Cadastro
                </TabsTrigger>
              </TabsList>
            </div>

            {errorMsg && (
              <div className="p-4 pb-0">
                <Alert
                  variant="destructive"
                  className="rounded-none bg-red-950/60 border-red-800 text-red-200"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
                </Alert>
              </div>
            )}

            {successMsg && (
              <div className="p-4 pb-0">
                <Alert className="rounded-none bg-emerald-950/60 border-emerald-800 text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="text-xs">{successMsg}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* TAB 1: SENHA */}
            <TabsContent value="password" className="m-0 focus-visible:outline-none">
              <form onSubmit={handlePasswordLogin}>
                <CardHeader className="space-y-1 pb-3">
                  <CardTitle className="text-xl font-serif text-white">Entrar com Senha</CardTitle>
                  <CardDescription className="text-stone-400 text-xs">
                    Acesse seu painel com suas credenciais cadastradas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-password" className="text-stone-300 text-xs">
                      E-mail cadastrado
                    </Label>
                    <Input
                      id="email-password"
                      type="email"
                      placeholder="exemplo@primecircle.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="rounded-none bg-stone-900 border-stone-800 text-stone-100 placeholder:text-stone-600 focus-visible:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password-input" className="text-stone-300 text-xs">
                        Senha
                      </Label>
                      <button
                        type="button"
                        onClick={() => setActiveTab('forgot')}
                        className="text-xs text-amber-500 hover:text-amber-400 hover:underline"
                      >
                        Esqueceu?
                      </button>
                    </div>
                    <Input
                      id="password-input"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="rounded-none bg-stone-900 border-stone-800 text-stone-100 placeholder:text-stone-600 focus-visible:ring-amber-500"
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold shadow-md"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Autenticando...
                      </>
                    ) : (
                      <>
                        Acessar Painel
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            {/* TAB 2: LINK MÁGICO */}
            <TabsContent value="magic" className="m-0 focus-visible:outline-none">
              <form onSubmit={handleMagicLinkRequest}>
                <CardHeader className="space-y-1 pb-3">
                  <CardTitle className="text-xl font-serif text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-amber-500" />
                    Link Mágico
                  </CardTitle>
                  <CardDescription className="text-stone-400 text-xs">
                    Receba um link de acesso direto sem precisar digitar senha.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-magic" className="text-stone-300 text-xs">
                      E-mail cadastrado
                    </Label>
                    <Input
                      id="email-magic"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="rounded-none bg-stone-900 border-stone-800 text-stone-100 placeholder:text-stone-600 focus-visible:ring-amber-500"
                    />
                  </div>

                  {magicLinkPreview && (
                    <div className="p-3 bg-amber-950/40 border border-amber-700/60 rounded-none text-xs space-y-2">
                      <p className="font-semibold text-amber-300">
                        Link mágico de acesso imediato:
                      </p>
                      <Button
                        type="button"
                        onClick={() => navigate(`/auth/confirmar?token=${magicLinkPreview}`)}
                        className="w-full rounded-none bg-amber-500 text-stone-950 hover:bg-amber-400 h-9 text-xs"
                      >
                        Entrar com 1 clique (Acesso Direto)
                      </Button>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold shadow-md"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        Enviar Link Mágico
                        <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            {/* TAB 3: CADASTRO */}
            <TabsContent value="signup" className="m-0 focus-visible:outline-none">
              <form onSubmit={handleSignup}>
                <CardHeader className="space-y-1 pb-3">
                  <CardTitle className="text-xl font-serif text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-amber-500" />
                    Criar Conta
                  </CardTitle>
                  <CardDescription className="text-stone-400 text-xs">
                    Cadastre-se para participar da rede Prime Circle.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-stone-300 text-xs">
                      Nome completo
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu Nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      required
                      className="rounded-none bg-stone-900 border-stone-800 text-stone-100 placeholder:text-stone-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-stone-300 text-xs">
                      E-mail
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                      className="rounded-none bg-stone-900 border-stone-800 text-stone-100 placeholder:text-stone-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-phone" className="text-stone-300 text-xs">
                      Telefone / WhatsApp (opcional)
                    </Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(21) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                      className="rounded-none bg-stone-900 border-stone-800 text-stone-100 placeholder:text-stone-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-pass" className="text-stone-300 text-xs">
                      Senha (mínimo 8 dígitos)
                    </Label>
                    <Input
                      id="signup-pass"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="rounded-none bg-stone-900 border-stone-800 text-stone-100 placeholder:text-stone-600"
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4 pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold shadow-md"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        Criar Conta
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            {/* ESQUECEU A SENHA */}
            {activeTab === 'forgot' && (
              <div className="p-6 pt-0 space-y-4">
                <div className="space-y-1 pb-2">
                  <h3 className="text-lg font-serif text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-500" />
                    Recuperação de Senha
                  </h3>
                  <p className="text-xs text-stone-400">
                    Informe seu e-mail para receber as instruções de recuperação.
                  </p>
                </div>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-stone-300 text-xs">
                      E-mail
                    </Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="rounded-none bg-stone-900 border-stone-800 text-stone-100 placeholder:text-stone-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('password')}
                      className="flex-1 rounded-none border-stone-800 text-stone-300"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold"
                    >
                      {isLoading ? 'Enviando...' : 'Enviar Instruções'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </Tabs>

          {/* Quick test accounts */}
          <div className="px-6 pb-6 pt-2">
            <div className="rounded-none bg-stone-900/80 border border-stone-800/80 p-3 text-xs text-stone-400">
              <div className="flex items-center gap-1.5 font-medium text-stone-300 mb-1">
                <ShieldCheck className="h-4 w-4 text-amber-500" />
                <span>Contas de teste semeadas:</span>
              </div>
              <div className="flex flex-wrap gap-2 items-center text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickFill('marcusviniciusfreitasgodoy@gmail.com')}
                  className="text-amber-400 underline hover:text-amber-300"
                >
                  Marcus Godoy (Admin)
                </button>
              </div>
            </div>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-stone-500 font-sans">
          Prime Circle • Barra da Tijuca & Recreio dos Bandeirantes
        </p>
      </div>
    </div>
  )
}
