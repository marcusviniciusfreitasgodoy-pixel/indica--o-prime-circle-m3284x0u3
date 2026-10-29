import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { SimpleMarkdown } from '@/components/SimpleMarkdown'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Shield, AlertTriangle } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      {/* Faixa provisória obrigatória quando is_provisional = true */}
      {doc?.is_provisional && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-300 py-2.5 px-4 text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>Texto provisório, em revisão jurídica.</span>
        </div>
      )}

      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between max-w-4xl">
          <Link
            to="/painel"
            className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar ao Painel
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="h-3.5 w-3.5 text-amber-500" />
            <span>Godoy Prime Realty</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 pt-6 sm:pt-8 max-w-4xl space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">
            <span>Documento Legal Oficial</span>
            {doc?.version && (
              <>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-slate-400">Versão {doc.version}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
            {doc?.title || defaultTitle}
          </h1>
        </div>

        <Card className="bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl overflow-hidden">
          <CardContent className="p-5 sm:p-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
                <p className="text-xs text-slate-400">Carregando documento oficial...</p>
              </div>
            ) : errorMessage || !doc ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-slate-300 text-sm">
                  {errorMessage || 'Documento em atualização pela equipe jurídica.'}
                </p>
                <Button asChild variant="outline" className="border-slate-700 text-xs">
                  <Link to="/painel">Voltar ao Painel</Link>
                </Button>
              </div>
            ) : (
              <SimpleMarkdown content={doc.content_markdown} />
            )}
          </CardContent>
        </Card>
      </main>
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
