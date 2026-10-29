import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Loader2 } from 'lucide-react'

export default function RedirectLegacyCapture() {
  const { slugOrId } = useParams<{ slugOrId: string }>()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    const resolveDestination = async () => {
      if (!slugOrId) {
        navigate('/painel', { replace: true })
        return
      }

      try {
        // Tenta achar participante por referral_code, user_id ou id
        const clean = slugOrId.trim()
        const partRec = await pb
          .collection('participants')
          .getFirstListItem(`referral_code = '${clean}' || id = '${clean}' || user_id = '${clean}'`)

        if (!isMounted) return

        if (partRec && partRec.referral_code) {
          navigate(`/i/${partRec.referral_code}`, { replace: true })
          return
        }
      } catch {
        // Não encontrou participante por código
      }

      // Tenta achar usuário por public_slug ou id
      try {
        const clean = slugOrId.trim()
        const userRec = await pb
          .collection('users')
          .getFirstListItem(`public_slug = '${clean}' || id = '${clean}'`)
        if (!isMounted) return
        if (userRec) {
          // Buscar participante correspondente
          try {
            const p = await pb
              .collection('participants')
              .getFirstListItem(`user_id = '${userRec.id}'`)
            if (p && p.referral_code) {
              navigate(`/i/${p.referral_code}`, { replace: true })
              return
            }
          } catch {
            /* intentionally ignored */
          }
          navigate(`/i/${userRec.public_slug || userRec.id}`, { replace: true })
          return
        }
      } catch {
        /* intentionally ignored */
      }

      if (isMounted) {
        // Fallback: redireciona para /i/:slugOrId
        navigate(`/i/${slugOrId}`, { replace: true })
      }
    }

    resolveDestination()

    return () => {
      isMounted = false
    }
  }, [slugOrId, navigate])

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
      <p className="text-sm text-slate-400">Redirecionando para a página oficial da indicação...</p>
    </div>
  )
}
