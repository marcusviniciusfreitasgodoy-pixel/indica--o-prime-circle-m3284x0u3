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
  ArrowRight,
  Loader2,
  Sparkles,
  AlertCircle,
  Mail,
  KeyRound,
  CheckCircle2,
  Send,
} from 'lucide-react'

export default function LoginPage({
  defaultTab,
}: {
  defaultTab?: 'password' | 'magic' | 'forgot'
}) {
  const { login, requestOTP, loginWithOTP, requestPasswordReset, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const initialTabParam = searchParams.get('tab')
  const initialTab: 'password' | 'magic' | 'forgot' =
    defaultTab === 'password' || defaultTab === 'magic' || defaultTab === 'forgot'
      ? defaultTab
      : initialTabParam === 'magic' || initialTabParam === 'forgot'
        ? initialTabParam
        : 'password'

  const [activeTab, setActiveTab] = useState<'password' | 'magic' | 'forgot'>(initialTab)

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpId, setOtpId] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

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

  const handleOTPRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!email) {
      setErrorMsg('Por favor, informe o e-mail cadastrado.')
      return
    }

    try {
      setIsLoading(true)
      const res = await requestOTP(email)
      setSuccessMsg(res.message || 'Código de acesso enviado!')
      if (res.otpId) {
        setOtpId(res.otpId)
      }
      setOtpSent(true)
    } catch (err: any) {
      console.error('Erro ao pedir OTP:', err)
      setErrorMsg(err?.message || 'Não foi possível solicitar o código de acesso no momento.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!otpCode || otpCode.trim().length < 6) {
      setErrorMsg('Por favor, digite o código de 6 dígitos recebido por e-mail.')
      return
    }

    if (!otpId) {
      setErrorMsg('Sessão de código expirada ou inválida. Solicite um novo código.')
      return
    }

    try {
      setIsLoading(true)
      await loginWithOTP(otpId, otpCode)
      const destination =
        (location.state as { from?: { pathname?: string } })?.from?.pathname || '/painel'
      navigate(destination, { replace: true })
    } catch (err: unknown) {
      console.error('Falha na validação do OTP:', err)
      setErrorMsg('Código incorreto ou expirado. Verifique o código e tente novamente.')
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
              <TabsList className="grid grid-cols-2 bg-stone-900 border border-stone-800 rounded-none h-10 text-xs">
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
                  Código de Acesso
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

            {/* TAB 2: CÓDIGO DE ACESSO OTP */}
            <TabsContent value="magic" className="m-0 focus-visible:outline-none">
              {!otpSent ? (
                <form onSubmit={handleOTPRequest}>
                  <CardHeader className="space-y-1 pb-3">
                    <CardTitle className="text-xl font-serif text-white flex items-center gap-2">
                      <Mail className="w-5 h-5 text-amber-500" />
                      Código de Acesso por E-mail
                    </CardTitle>
                    <CardDescription className="text-stone-400 text-xs">
                      Receba um código de uso único (OTP) no seu e-mail para entrar com segurança
                      sem senha.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-otp" className="text-stone-300 text-xs">
                        E-mail cadastrado
                      </Label>
                      <Input
                        id="email-otp"
                        type="email"
                        placeholder="seu.email@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                          Enviando código...
                        </>
                      ) : (
                        <>
                          Solicitar Código de Acesso
                          <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              ) : (
                <form onSubmit={handleOTPVerify}>
                  <CardHeader className="space-y-1 pb-3">
                    <CardTitle className="text-xl font-serif text-white flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-amber-500" />
                      Digite o Código de Acesso
                    </CardTitle>
                    <CardDescription className="text-stone-400 text-xs">
                      Enviamos um código de 6 dígitos para{' '}
                      <span className="text-amber-400">{email}</span>. Válido por 15 minutos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp-code-input" className="text-stone-300 text-xs">
                        Código de 6 dígitos
                      </Label>
                      <Input
                        id="otp-code-input"
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                        disabled={isLoading}
                        autoFocus
                        required
                        className="rounded-none bg-stone-900 border-stone-800 text-stone-100 text-center tracking-widest text-lg font-mono placeholder:text-stone-600 focus-visible:ring-amber-500"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false)
                          setOtpCode('')
                          setOtpId(null)
                        }}
                        className="text-stone-400 hover:text-stone-200 underline"
                      >
                        Trocar e-mail
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={handleOTPRequest}
                        className="text-amber-500 hover:text-amber-400 underline"
                      >
                        Reenviar código
                      </button>
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
                          Validando código...
                        </>
                      ) : (
                        <>
                          Entrar com Código
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              )}
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
        </Card>

        {/* Link para novo fluxo de cadastro em /cadastro */}
        <div className="mt-6 text-center">
          <p className="text-sm text-stone-400">
            Ainda não tem acesso?{' '}
            <Link
              to="/cadastro"
              className="text-amber-500 hover:text-amber-400 font-medium underline underline-offset-4 transition-colors"
            >
              Cadastre-se
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-stone-500 font-sans">
          Prime Circle • Barra da Tijuca & Recreio dos Bandeirantes
        </p>
      </div>
    </div>
  )
}
