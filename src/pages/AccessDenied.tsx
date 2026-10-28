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

export default function AccessDeniedPage() {
  const { user, roles, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-950 p-4">
      <Card className="max-w-md w-full rounded-none border-stone-800 bg-stone-900 text-stone-100 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-none bg-red-950/60 border border-red-800 flex items-center justify-center text-red-400 mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <CardTitle className="font-serif text-2xl text-white">Acesso Negado</CardTitle>
          <CardDescription className="text-stone-400 text-xs">
            Esta área é restrita à equipe interna autorizada do Godoy Prime Indica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-stone-300">
          <div className="p-3 bg-stone-950 border border-stone-800 rounded-none space-y-1">
            <p>
              <strong className="text-stone-100">Usuário conectado:</strong> {user?.email}
            </p>
            <p>
              <strong className="text-stone-100">Papéis atribuídos:</strong>{' '}
              {roles.length > 0 ? roles.join(', ') : 'Nenhum papel interno (participante comum)'}
            </p>
          </div>
          <p className="text-stone-400 leading-relaxed">
            Se você é membro da equipe interna e necessita de privilégios de administrador ou
            operador, solicite a atribuição ao administrador do sistema.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 pt-2">
          <Button
            asChild
            className="w-full rounded-none bg-amber-600 hover:bg-amber-700 text-stone-950 font-semibold"
          >
            <Link to="/painel">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Painel do Participante
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={logout}
            className="w-full rounded-none border-stone-800 text-stone-400 hover:text-white"
          >
            Sair da Conta
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
