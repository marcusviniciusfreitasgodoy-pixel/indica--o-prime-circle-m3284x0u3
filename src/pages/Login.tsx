import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
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
import { ShieldCheck, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      const destination =
        (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'
      navigate(destination, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email || !password) {
      setErrorMsg('Por favor, informe seu e-mail e senha cadastrados.')
      return
    }

    try {
      setIsLoading(true)
      await login(email, password)
      const destination =
        (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'
      navigate(destination, { replace: true })
    } catch (err: unknown) {
      console.error('Falha de login:', err)
      setErrorMsg('E-mail ou senha incorretos. Verifique suas credenciais de membro Prime Circle.')
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
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4 shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
            Prime Circle Indica
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Rede colaborativa de indicações imobiliárias para corretores e imobiliárias parceiras
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur shadow-2xl text-slate-100">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-white">Entrar na Rede</CardTitle>
            <CardDescription className="text-slate-400">
              Digite suas credenciais de membro para acessar o painel de indicações.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMsg && (
                <Alert variant="destructive" className="bg-red-950/60 border-red-800 text-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  E-mail institucional
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@primecircle.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" text-slate-200>
                    Senha
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando no painel...
                  </>
                ) : (
                  <>
                    Acessar Painel
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  <span>Acesso de Membro Ativo</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400 mb-2">
                  Porteiros, síndicos e parceiros enviam indicações através dos links públicos
                  individuais de cada membro.
                </p>
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 items-center text-[11px]">
                  <span className="text-slate-400 font-medium">Contas disponíveis:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('marcusviniciusfreitasgodoy@gmail.com')}
                    className="text-amber-400 underline hover:text-amber-300"
                  >
                    Marcus Godoy
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('corretor.parceiro@primecircle.com.br')}
                    className="text-amber-400 underline hover:text-amber-300"
                  >
                    Ana Carolina
                  </button>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          Prime Circle • Rede Imobiliária de Alto Padrão
        </p>
      </div>
    </div>
  )
}
