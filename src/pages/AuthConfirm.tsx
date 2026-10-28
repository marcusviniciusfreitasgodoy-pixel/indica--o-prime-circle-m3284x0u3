import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowRight } from 'lucide-react'

export default function AuthConfirmPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { verifyMagicLink, refreshUser } = useAuth()

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [type, setType] = useState<string>('magic_link')

  useEffect(() => {
    const handleVerification = async () => {
      // 1. Check for token in URL query
      const token = searchParams.get('token')
      const mode = searchParams.get('type') || 'magic' // 'magic' or 'verify' or 'reset'

      if (!token) {
        setStatus('error')
        setErrorMessage('Token de validação não encontrado no link.')
        return
      }

      // If it's a native PocketBase email confirmation token
      if (mode === 'verify') {
        setType('email_verify')
        try {
          await pb.collection('users').confirmVerification(token)
          await refreshUser()
          setStatus('success')
        } catch (err: any) {
          setStatus('error')
          setErrorMessage(err?.message || 'Token de verificação inválido ou expirado.')
        }
        return
      }

      // Otherwise, magic link flow
      try {
        await verifyMagicLink(token)
        setStatus('success')
      } catch (err: any) {
        setStatus('error')
        setErrorMessage(err?.message || 'Link de autenticação expirado ou inválido.')
      }
    }

    handleVerification()
  }, [searchParams, verifyMagicLink, refreshUser])

  return (
    <div className="flex min-h-screen flex-col justify-center items-center bg-gradient-to-b from-stone-900 via-stone-950 to-black p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-none bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-serif text-white">Godoy Prime Indica</h1>
        </div>

        <Card className="rounded-none border-stone-800 bg-stone-950/95 text-stone-100 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-serif text-xl">
              {status === 'verifying' && 'Autenticando seu Acesso...'}
              {status === 'success' && 'Autenticação Confirmada'}
              {status === 'error' && 'Falha na Validação'}
            </CardTitle>
            <CardDescription className="text-xs text-stone-400">
              {status === 'verifying' && 'Validando credenciais e gerando sessão segura.'}
              {status === 'success' && 'Sua sessão foi iniciada com segurança.'}
              {status === 'error' && 'Não foi possível concluir a autenticação deste link.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2 pb-6 text-center">
            {status === 'verifying' && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-xs text-stone-400">Aguarde um instante...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <Alert className="rounded-none bg-emerald-950/60 border-emerald-800 text-emerald-200 text-left">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="text-xs">
                    {type === 'email_verify'
                      ? 'E-mail verificado com sucesso no Godoy Prime Indica.'
                      : 'Login por link mágico autenticado com sucesso!'}
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => navigate('/painel', { replace: true })}
                  className="w-full rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold"
                >
                  Continuar para o Painel
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <Alert
                  variant="destructive"
                  className="rounded-none bg-red-950/60 border-red-800 text-red-200 text-left"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 rounded-none border-stone-800 text-stone-200"
                  >
                    <Link to="/entrar">Ir para Login</Link>
                  </Button>
                  <Button
                    asChild
                    className="flex-1 rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold"
                  >
                    <Link to="/entrar?tab=magic">Reenviar Link</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
