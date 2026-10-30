import { Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'
import { BrandPublicHeader, BrandPublicFooter, Eyebrow } from '@/components/brand'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: Rota não encontrada:', location.pathname)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BrandPublicHeader />

      <main className="flex flex-1 items-center justify-center text-center px-4 py-12">
        <div className="max-w-md space-y-4">
          <Eyebrow className="justify-center">ERRO 404</Eyebrow>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">
            Página <em>não encontrada</em>
          </h1>
          <p className="text-muted-foreground text-sm font-sans">
            A página que você está procurando não existe ou foi movida para outro endereço.
          </p>
          <div className="pt-4">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" strokeWidth={1.5} />
                Voltar ao Início
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <BrandPublicFooter />
    </div>
  )
}

export default NotFound
