import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  getPendingAcceptances,
  acceptDocuments,
  PendingAcceptanceDoc,
} from '@/services/legalDocuments'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { GodoyLogo, Eyebrow, BrandPublicFooter } from '@/components/brand'
import { Loader2, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react'

const DOC_LINKS: Record<string, string> = {
  termos_de_uso: '/termos',
  politica_de_privacidade: '/privacidade',
  regulamento_do_programa: '/regulamento',
  declaracao_ausencia_impedimento: '/regulamento',
}

export const AcceptanceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading, roles } = useAuth()
  const [checking, setChecking] = useState(true)
  const [pending, setPending] = useState<PendingAcceptanceDoc[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isInternal = roles.length > 0

  useEffect(() => {
    let isMounted = true
    const check = async () => {
      if (authLoading) return
      if (!isAuthenticated || isInternal) {
        setPending([])
        setChecking(false)
        return
      }
      setChecking(true)
      try {
        const res = await getPendingAcceptances()
        if (isMounted) {
          setPending(res.pending || [])
        }
      } catch (err: unknown) {
        // Falha na checagem não deve travar o painel: libera com aviso.
        console.warn('Não foi possível verificar aceites pendentes:', err)
        if (isMounted) setPending([])
      } finally {
        if (isMounted) setChecking(false)
      }
    }
    check()
    return () => {
      isMounted = false
    }
  }, [isAuthenticated, authLoading, isInternal])

  const allChecked = pending.length > 0 && pending.every((d) => checked[d.document_id])

  const handleAccept = async () => {
    if (!allChecked) {
      setError('É obrigatório ler e aceitar todos os documentos listados.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await acceptDocuments(pending.map((d) => d.document_id))
      setPending([])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao gravar o aceite.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !isAuthenticated || isInternal || (!checking && pending.length === 0)) {
    return <>{children}</>
  }

  if (checking) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-2" />
        <p className="text-sm text-stone-500 font-medium">Verificando aceites de documentos...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="mx-auto w-full max-w-lg">
          <Card className="rounded-[1px] border border-border bg-card shadow-luxury text-card-foreground p-6 sm:p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <GodoyLogo variant="oficial" className="h-10 w-auto mb-1" />
              <Eyebrow>ATUALIZAÇÃO DOS DOCUMENTOS</Eyebrow>
              <h2 className="text-xl sm:text-2xl font-serif text-foreground font-semibold">
                Nova versão dos documentos do programa
              </h2>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                Os documentos do programa foram atualizados. Para continuar usando o painel, é
                necessário ler e aceitar a versão vigente de cada documento abaixo.
              </p>

              <div className="w-full space-y-3 mt-2 text-left">
                {pending.map((doc) => {
                  const link = DOC_LINKS[doc.slug] || '/regulamento'
                  return (
                    <div
                      key={doc.document_id}
                      className="flex items-start gap-3 border border-border rounded-[1px] p-3"
                    >
                      <Checkbox
                        id={`accept-${doc.document_id}`}
                        checked={!!checked[doc.document_id]}
                        onCheckedChange={(v) =>
                          setChecked((prev) => ({ ...prev, [doc.document_id]: v === true }))
                        }
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={`accept-${doc.document_id}`}
                        className="text-sm leading-relaxed cursor-pointer"
                      >
                        Li e aceito o documento{' '}
                        <Link
                          to={link}
                          target="_blank"
                          className="font-medium text-primary underline underline-offset-2 inline-flex items-center gap-1"
                        >
                          {doc.title} (versão {doc.version})
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        {doc.is_provisional && (
                          <span className="block text-xs text-warning mt-1">
                            (texto provisório, sujeito a revisão jurídica)
                          </span>
                        )}
                      </label>
                    </div>
                  )
                })}
              </div>

              {error && (
                <div className="w-full border border-destructive/30 bg-destructive/10 text-destructive text-sm p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={!allChecked || submitting}
                onClick={handleAccept}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-1" strokeWidth={1.5} />
                    Aceitar e continuar
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      </main>
      <BrandPublicFooter />
    </div>
  )
}
