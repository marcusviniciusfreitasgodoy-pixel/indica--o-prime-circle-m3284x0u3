import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { BrandPublicHeader, BrandPublicFooter, Eyebrow } from '@/components/brand'

export default function AuthConfirmPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [type, setType] = useState<string>('email_verify')

  useEffect(() => {
    const handleVerification = async () => {
      // Token nativo de verificação de e-mail do PocketBase
      const token = searchParams.get('token')
      const mode = searchParams.get('type') || 'verify'

      if (!token) {
        setStatus('error')
        setErrorMessage('Token de validação não encontrado no link.')
        return
      }

      // Confirmação nativa de e-mail do PocketBase
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

      // Fluxos legados descontinuados em favor do OTP nativo
      setStatus('error')
      setErrorMessage(
        'Este método de autenticação por link direto foi descontinuado por motivos de segurança. Acesse a tela de login para solicitar seu código de acesso de 6 dígitos.',
      )
    }

    handleVerification()
  }, [searchParams, refreshUser])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BrandPublicHeader />

      <main className="flex flex-1 items-center justify-center py-10 px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <Eyebrow className="justify-center">SEGURANÇA E ACESSO</Eyebrow>
            <h1 className="text-2xl font-serif font-bold text-foreground">
              Confirmação de <em>Acesso</em>
            </h1>
          </div>

          <Card className="rounded-[1px] border border-border bg-card text-card-foreground shadow-luxury">
            <CardHeader className="text-center pb-4">
              <CardTitle className="font-serif text-xl text-foreground">
                {status === 'verifying' && 'Autenticando seu Acesso...'}
                {status === 'success' && 'Autenticação Confirmada'}
                {status === 'error' && 'Falha na Validação'}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground font-sans">
                {status === 'verifying' && 'Validando credenciais e gerando sessão segura.'}
                {status === 'success' && 'Sua sessão foi iniciada com segurança.'}
                {status === 'error' && 'Não foi possível concluir a autenticação deste link.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2 pb-6 text-center">
              {status === 'verifying' && (
                <div className="flex flex-col items-center justify-center py-6 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-gold-deep" strokeWidth={1.5} />
                  <p className="text-xs text-muted-foreground font-sans">Aguarde um instante...</p>
                </div>
              )}

              {status === 'success' && (
                <div className="space-y-4">
                  <Alert className="rounded-[1px] border-success/30 bg-success/10 text-success text-left">
                    <CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.5} />
                    <AlertDescription className="text-xs font-sans">
                      {type === 'email_verify'
                        ? 'E-mail verificado com sucesso no Godoy Prime Indica.'
                        : 'Login por link mágico autenticado com sucesso!'}
                    </AlertDescription>
                  </Alert>
                  <Button onClick={() => navigate('/painel', { replace: true })} className="w-full">
                    Continuar para o Painel
                    <ArrowRight className="w-4 h-4 ml-2" strokeWidth={1.5} />
                  </Button>
                </div>
              )}

              {status === 'error' && (
                <div className="space-y-4">
                  <Alert variant="destructive" className="rounded-[1px] text-left">
                    <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
                    <AlertDescription className="text-xs font-sans">
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link to="/entrar">Ir para Login</Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link to="/entrar?tab=magic">Reenviar Link</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <BrandPublicFooter />
    </div>
  )
}
