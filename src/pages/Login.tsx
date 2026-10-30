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
import { ArrowRight, Loader2, AlertCircle, Mail, KeyRound, CheckCircle2, Send } from 'lucide-react'
import { BrandPublicHeader, BrandPublicFooter, Eyebrow } from '@/components/brand'

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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BrandPublicHeader showLoginLink={false} />

      <main className="flex flex-1 items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          {/* Brand header */}
          <div className="text-center space-y-2">
            <Eyebrow className="justify-center">ACESSO RESTRITO</Eyebrow>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
              Portal do <em>Indicador</em>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans">
              Programa de Indicação Imobiliária de Alto Padrão
            </p>
          </div>

          <Card className="rounded-[1px] border border-border bg-card text-card-foreground shadow-sm">
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val as any)
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              className="w-full"
            >
              <div className="p-4 border-b border-border">
                <TabsList className="grid grid-cols-2 bg-secondary border border-border rounded-[1px] h-10 text-xs font-heading">
                  <TabsTrigger
                    value="password"
                    className="rounded-[1px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Senha
                  </TabsTrigger>
                  <TabsTrigger
                    value="magic"
                    className="rounded-[1px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Código de Acesso
                  </TabsTrigger>
                </TabsList>
              </div>

              {errorMsg && (
                <div className="p-4 pb-0">
                  <Alert variant="destructive" className="rounded-[1px]">
                    <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
                    <AlertDescription className="text-xs font-sans">{errorMsg}</AlertDescription>
                  </Alert>
                </div>
              )}

              {successMsg && (
                <div className="p-4 pb-0">
                  <Alert className="rounded-[1px] border-success/30 bg-success/10 text-success">
                    <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.5} />
                    <AlertDescription className="text-xs font-sans">{successMsg}</AlertDescription>
                  </Alert>
                </div>
              )}

              {/* TAB 1: SENHA */}
              <TabsContent value="password" className="m-0 focus-visible:outline-none">
                <form onSubmit={handlePasswordLogin}>
                  <CardHeader className="space-y-1 pb-3">
                    <CardTitle className="text-xl font-serif text-foreground">
                      Entrar com Senha
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-xs font-sans">
                      Acesse seu painel com suas credenciais cadastradas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email-password"
                        className="text-foreground text-xs font-heading font-medium"
                      >
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
                        className="font-mono text-xs sm:text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="password-input"
                          className="text-foreground text-xs font-heading font-medium"
                        >
                          Senha
                        </Label>
                        <button
                          type="button"
                          onClick={() => setActiveTab('forgot')}
                          className="text-xs text-gold-deep hover:underline font-heading font-medium"
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
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col space-y-4 pt-2">
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                          Autenticando...
                        </>
                      ) : (
                        <>
                          Acessar Painel
                          <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
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
                      <CardTitle className="text-xl font-serif text-foreground flex items-center gap-2">
                        <Mail className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
                        Código de Acesso por E-mail
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-xs font-sans">
                        Receba um código de uso único (OTP) no seu e-mail para entrar com segurança
                        sem senha.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="email-otp"
                          className="text-foreground text-xs font-heading font-medium"
                        >
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
                          className="font-mono text-xs sm:text-sm"
                        />
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4 pt-2">
                      <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                            Enviando código...
                          </>
                        ) : (
                          <>
                            Solicitar Código de Acesso
                            <Send className="ml-2 h-4 w-4" strokeWidth={1.5} />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                ) : (
                  <form onSubmit={handleOTPVerify}>
                    <CardHeader className="space-y-1 pb-3">
                      <CardTitle className="text-xl font-serif text-foreground flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
                        Digite o Código de Acesso
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-xs font-sans">
                        Enviamos um código de 6 dígitos para{' '}
                        <span className="font-mono text-foreground font-semibold">{email}</span>.
                        Válido por 15 minutos.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="otp-code-input"
                          className="text-foreground text-xs font-heading font-medium"
                        >
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
                          className="text-center tracking-widest text-lg font-mono"
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs font-heading">
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false)
                            setOtpCode('')
                            setOtpId(null)
                          }}
                          className="text-muted-foreground hover:text-foreground underline"
                        >
                          Trocar e-mail
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={handleOTPRequest}
                          className="text-gold-deep hover:underline font-medium"
                        >
                          Reenviar código
                        </button>
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col space-y-4 pt-2">
                      <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                            Validando código...
                          </>
                        ) : (
                          <>
                            Entrar com Código
                            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
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
                    <h3 className="text-lg font-serif text-foreground flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-gold-deep" strokeWidth={1.5} />
                      Recuperação de Senha
                    </h3>
                    <p className="text-xs text-muted-foreground font-sans">
                      Informe seu e-mail para receber as instruções de recuperação.
                    </p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="forgot-email"
                        className="text-foreground text-xs font-heading font-medium"
                      >
                        E-mail
                      </Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu.email@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="font-mono text-xs sm:text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setActiveTab('password')}
                        className="flex-1"
                      >
                        Voltar
                      </Button>
                      <Button type="submit" disabled={isLoading} className="flex-1">
                        {isLoading ? 'Enviando...' : 'Enviar Instruções'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </Tabs>
          </Card>

          {/* Link para novo fluxo de cadastro em /cadastro */}
          <div className="text-center font-sans">
            <p className="text-sm text-muted-foreground">
              Ainda não tem acesso?{' '}
              <Link
                to="/cadastro"
                className="text-gold-deep hover:underline font-medium font-heading transition-colors"
              >
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </main>

      <BrandPublicFooter />
    </div>
  )
}
