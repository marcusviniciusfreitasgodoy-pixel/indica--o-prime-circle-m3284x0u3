import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { SimpleMarkdown } from '@/components/SimpleMarkdown'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Shield, AlertTriangle } from 'lucide-react'
import { BrandPublicFooter, Eyebrow } from '@/components/brand'

interface LegalDocument {
  id: string
  doc_type: 'regulamento' | 'termos' | 'privacidade'
  title: string
  version: string
  content_markdown: string
  is_active: boolean
  is_provisional: boolean
  updated: string
}

interface LegalPageProps {
  type: 'regulamento' | 'termos' | 'privacidade'
  defaultTitle: string
}

export const LegalDocumentPage: React.FC<LegalPageProps> = ({ type, defaultTitle }) => {
  const [doc, setDoc] = useState<LegalDocument | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    // Garantir meta tag noindex, nofollow dinamicamente
    let metaRobots = document.querySelector('meta[name="robots"]')
    let createdMeta = false
    if (!metaRobots) {
      metaRobots = document.createElement('meta')
      metaRobots.setAttribute('name', 'robots')
      document.head.appendChild(metaRobots)
      createdMeta = true
    }
    const previousContent = metaRobots.getAttribute('content')
    metaRobots.setAttribute('content', 'noindex, nofollow')

    return () => {
      if (createdMeta && metaRobots) {
        metaRobots.remove()
      } else if (metaRobots && previousContent) {
        metaRobots.setAttribute('content', previousContent)
      }
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const fetchDoc = async () => {
      setIsLoading(true)
      try {
        const record = await pb
          .collection('legal_documents')
          .getFirstListItem(`doc_type = '${type}' && is_active = true`, { sort: '-created' })
        if (isMounted) {
          setDoc(record as unknown as LegalDocument)
        }
      } catch (err: unknown) {
        console.warn('Documento legal ativo não encontrado:', err)
        if (isMounted) {
          setErrorMessage('Documento em atualização.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchDoc()
    return () => {
      isMounted = false
    }
  }, [type])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      {/* Faixa provisória obrigatória quando is_provisional = true */}
      {doc?.is_provisional && (
        <div className="bg-warning/15 border-b border-warning/30 text-warning py-2.5 px-4 text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" strokeWidth={1.5} />
          <span>Texto provisório, em revisão jurídica.</span>
        </div>
      )}

      <header className="navy border-b border-border/20 sticky top-0 z-20">
        <div className="container mx-auto px-3 sm:px-6 h-14 flex items-center justify-between max-w-4xl gap-2">
          <Link
            to="/painel"
            className="inline-flex items-center text-xs font-heading font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 h-10 min-h-[44px] sm:min-h-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5 text-primary shrink-0" strokeWidth={1.5} />
            Voltar ao Painel
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-muted-foreground shrink-0 truncate">
            <Shield className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={1.5} />
            <span className="text-primary font-semibold truncate">CRECI-RJ PJ 11.841</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-6 pt-5 sm:pt-8 pb-16 max-w-4xl space-y-5 sm:space-y-6 flex-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Eyebrow>DOCUMENTO LEGAL OFICIAL</Eyebrow>
            {doc?.version && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="font-mono text-xs text-muted-foreground">
                  Versão {doc.version}
                </span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold tracking-tight text-foreground break-words">
            {doc?.title || defaultTitle}
          </h1>
        </div>

        <Card className="bg-card border-border text-card-foreground shadow-luxury overflow-hidden rounded-[1px]">
          <CardContent className="p-4 sm:p-8 font-sans overflow-x-hidden">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <Loader2 className="h-7 w-7 animate-spin text-gold-deep" strokeWidth={1.5} />
                <p className="text-xs text-muted-foreground font-sans">
                  Carregando documento oficial...
                </p>
              </div>
            ) : errorMessage || !doc ? (
              <div className="text-center py-12 space-y-3 font-sans">
                <p className="text-foreground text-sm">
                  {errorMessage || 'Documento em atualização pela equipe jurídica.'}
                </p>
                <Button asChild variant="outline" className="text-xs rounded-[1px] h-9">
                  <Link to="/painel">Voltar ao Painel</Link>
                </Button>
              </div>
            ) : (
              <SimpleMarkdown content={doc.content_markdown} />
            )}
          </CardContent>
        </Card>
      </main>

      <BrandPublicFooter />
    </div>
  )
}

export function RegulamentoPage() {
  return (
    <LegalDocumentPage type="regulamento" defaultTitle="Regulamento do Programa de Indicação" />
  )
}

export function TermosPage() {
  return <LegalDocumentPage type="termos" defaultTitle="Termos de Uso e Participação" />
}

export function PrivacidadePage() {
  return (
    <LegalDocumentPage
      type="privacidade"
      defaultTitle="Política de Privacidade e Proteção de Dados"
    />
  )
}
