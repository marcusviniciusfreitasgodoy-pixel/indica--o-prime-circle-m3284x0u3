import React from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

import { BrandPublicHeader, BrandPublicFooter, Eyebrow } from '@/components/brand'

export default function AccessDeniedPage() {
  const { user, roles, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BrandPublicHeader />

      <main className="flex flex-1 items-center justify-center py-10 px-4">
        <Card className="max-w-md w-full rounded-[1px] border border-border bg-card text-card-foreground shadow-luxury">
          <CardHeader className="text-center pb-2">
            <Eyebrow className="justify-center">CONTROLE DE ACESSO</Eyebrow>
            <div className="mx-auto my-2 w-12 h-12 rounded-[1px] bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive">
              <ShieldAlert className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <CardTitle className="font-serif text-2xl font-bold text-foreground">
              Acesso <em>Negado</em>
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs font-sans">
              Esta área é restrita à equipe interna autorizada do Godoy Prime Indica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground font-sans">
            <div className="p-3 bg-secondary/50 border border-border rounded-[1px] space-y-1">
              <p>
                <strong className="text-foreground">Usuário conectado:</strong>{' '}
                <span className="font-mono text-foreground">{user?.email}</span>
              </p>
              <p>
                <strong className="text-foreground">Papéis atribuídos:</strong>{' '}
                {roles.length > 0 ? roles.join(', ') : 'Nenhum papel interno (participante comum)'}
              </p>
            </div>
            <p className="leading-relaxed">
              Se você é membro da equipe interna e necessita de privilégios de administrador ou
              operador, solicite a atribuição ao administrador do sistema.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 pt-2">
            <Button asChild className="w-full">
              <Link to="/painel">
                <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Voltar ao Painel do Indicador
              </Link>
            </Button>
            <Button variant="outline" onClick={logout} className="w-full">
              Sair da Conta
            </Button>
          </CardFooter>
        </Card>
      </main>

      <BrandPublicFooter />
    </div>
  )
}
