import React, { useState, useEffect } from 'react'
import { AdminNavbar } from '@/components/AdminNavbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Settings,
  Plus,
  Coins,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Unlock,
  Copy,
  Layers,
  Building,
  Tag,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { listRewardRules, RewardRule } from '@/services/rewards'

export function AdminSettingsPage() {
  const { userRoles } = useAuth()
  const { toast } = useToast()
  const isAdmin = userRoles.includes('admin')

  const [activeTab, setActiveTab] = useState<'recompensas' | 'geral'>('recompensas')
  const [rules, setRules] = useState<RewardRule[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [condos, setCondos] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Nova Regra / Versionamento
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [referralType, setReferralType] = useState('todos')
  const [milestone, setMilestone] = useState<'captada' | 'fechamento'>('captada')
  const [beneficiaryType, setBeneficiaryType] = useState<'indicador' | 'cliente'>('indicador')
  const [rewardType, setRewardType] = useState('valor_fixo')
  const [fixedAmount, setFixedAmount] = useState('100')
  const [percentageValue, setPercentageValue] = useState('')
  const [bracketsJson, setBracketsJson] = useState('[]')
  const [catalogDesc, setCatalogDesc] = useState('')
  const [condoId, setCondoId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [savingRule, setSavingRule] = useState(false)

  // Configurações gerais
  const [reckoningDay, setReckoningDay] = useState('10')
  const [dueDay, setDueDay] = useState('25')
  const [attributionDays, setAttributionDays] = useState('90')
  const [savingSettings, setSavingSettings] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [rList, cats, cList, camps, settings] = await Promise.all([
        listRewardRules(),
        pb.collection('participant_categories').getFullList({ sort: 'name' }),
        pb.collection('condominiums').getFullList({ sort: 'name' }),
        pb.collection('campaigns').getFullList({ sort: 'name' }),
        pb.collection('program_settings').getFullList(),
      ])
      setRules(rList)
      setCategories(cats)
      setCondos(cList)
      setCampaigns(camps)

      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id)
      }

      // Preenche settings
      settings.forEach((s: any) => {
        try {
          const val = JSON.parse(s.value_json)
          if (s.key === 'monthly_reckoning_day') setReckoningDay(String(val))
          if (s.key === 'batch_payment_due_day') setDueDay(String(val))
          if (s.key === 'capture_attribution_window_days') setAttributionDays(String(val))
        } catch {
          /* intentionally ignored */
        }
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: err?.message || 'Falha ao buscar configurações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreateRule = () => {
    setEditingRuleId(null)
    setReferralType('todos')
    setMilestone('captada')
    setBeneficiaryType('indicador')
    setRewardType('valor_fixo')
    setFixedAmount('100')
    setPercentageValue('')
    setBracketsJson('[]')
    setCatalogDesc('')
    setCondoId('')
    setCampaignId('')
    setRuleModalOpen(true)
  }

  const handleOpenVersionRule = (r: RewardRule) => {
    setEditingRuleId(r.id)
    setSelectedCategory(r.category_id)
    setReferralType(r.referral_type || 'todos')
    setMilestone(r.milestone as any)
    setBeneficiaryType(r.beneficiary_type as any)
    setRewardType(r.reward_type)
    setFixedAmount(String(r.fixed_amount_brl || ''))
    setPercentageValue(String(r.percentage_value || ''))
    setBracketsJson(r.brackets || '[]')
    setCatalogDesc(r.catalog_description || '')
    setCondoId(r.condominium_id || '')
    setCampaignId(r.campaign_id || '')
    setRuleModalOpen(true)
  }

  const handleSaveRule = async () => {
    if (!selectedCategory) {
      toast({ title: 'Categoria obrigatória', variant: 'destructive' })
      return
    }

    // Validação: percentual_comissao exige CRECI na categoria
    const catObj = categories.find((c) => c.id === selectedCategory)
    if (rewardType === 'percentual_comissao' && !catObj?.requires_creci) {
      toast({
        title: 'Regra de conformidade violada',
        description:
          'Percentual de comissão só é permitido para categorias com exigência de CRECI.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSavingRule(true)
      // Se estiver versionando regra existente
      let nextVersion = 1
      if (editingRuleId) {
        const currentRule = rules.find((r) => r.id === editingRuleId)
        nextVersion = (currentRule?.version || 1) + 1
      } else {
        const existingRules = rules.filter(
          (r) =>
            r.category_id === selectedCategory &&
            r.milestone === milestone &&
            r.beneficiary_type === beneficiaryType,
        )
        const maxV = existingRules.reduce((max, r) => Math.max(max, r.version || 1), 0)
        nextVersion = maxV + 1
      }

      const data: any = {
        category_id: selectedCategory,
        referral_type: referralType,
        milestone,
        beneficiary_type: beneficiaryType,
        reward_type: rewardType,
        fixed_amount_brl: rewardType === 'valor_fixo' ? Number(fixedAmount || 0) : null,
        percentage_value:
          rewardType === 'percentual_comissao' ? Number(percentageValue || 0) : null,
        brackets: rewardType === 'tabela_faixas' ? bracketsJson : null,
        catalog_description: rewardType === 'beneficio_catalogo' ? catalogDesc : null,
        condominium_id: condoId || null,
        campaign_id: campaignId || null,
        version: nextVersion,
        active: true,
        released_for_use: false, // Nova versão inicia sempre como DRAFT / falso
        valid_from: new Date().toISOString(),
      }

      await pb.collection('reward_rules').create(data)

      // Grava log de auditoria
      try {
        await pb.collection('audit_logs').create({
          action: 'reward_rule_created_versioned',
          resource_type: 'reward_rules',
          resource_id: '',
          details: JSON.stringify({
            category_id: selectedCategory,
            version: nextVersion,
            reward_type: rewardType,
          }),
        })
      } catch {
        /* intentionally ignored */
      }

      toast({
        title: 'Regra criada com sucesso',
        description: `Regra v${nextVersion} criada em modo de rascunho. Ative o botão 'Liberar para Uso' quando validada.`,
      })
      setRuleModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar regra',
        description: err?.message || 'Falha na requisição.',
        variant: 'destructive',
      })
    } finally {
      setSavingRule(false)
    }
  }

  // Alternar released_for_use (somente admin)
  const handleToggleReleased = async (r: RewardRule) => {
    if (!isAdmin) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem liberar regras para uso.',
        variant: 'destructive',
      })
      return
    }

    try {
      const nextState = !r.released_for_use
      await pb.collection('reward_rules').update(r.id, {
        released_for_use: nextState,
      })

      // Grava auditoria
      try {
        await pb.collection('audit_logs').create({
          action: nextState ? 'reward_rule_released' : 'reward_rule_unreleased',
          resource_type: 'reward_rules',
          resource_id: r.id,
          details: JSON.stringify({ released_for_use: nextState, version: r.version }),
        })
      } catch {
        /* intentionally ignored */
      }

      toast({
        title: nextState ? 'Regra liberada para uso' : 'Regra bloqueada (Rascunho)',
        description: nextState
          ? 'Recompensas geradas sob esta regra agora podem ser aprovadas pelo financeiro.'
          : 'Recompensas desta regra não poderão ser aprovadas até nova liberação.',
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar liberação',
        description: err?.message || 'Falha na requisição.',
        variant: 'destructive',
      })
    }
  }

  // Salvar program_settings
  const handleSaveSettings = async () => {
    if (!isAdmin) return
    try {
      setSavingSettings(true)
      const updates = [
        { key: 'monthly_reckoning_day', val: Number(reckoningDay) },
        { key: 'batch_payment_due_day', val: Number(dueDay) },
        { key: 'capture_attribution_window_days', val: Number(attributionDays) },
      ]

      for (const item of updates) {
        try {
          const rec = await pb
            .collection('program_settings')
            .getFirstListItem(`key = '${item.key}'`)
          await pb.collection('program_settings').update(rec.id, {
            value_json: JSON.stringify(item.val),
          })
        } catch (_) {
          await pb.collection('program_settings').create({
            key: item.key,
            value_json: JSON.stringify(item.val),
            description: `Configuração ${item.key}`,
          })
        }
      }

      toast({
        title: 'Parâmetros atualizados',
        description: 'Dias de apuração, vencimento e janela de atribuição gravados.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar parâmetros',
        description: err?.message || 'Falha na requisição.',
        variant: 'destructive',
      })
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      <AdminNavbar />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-amber-500" />
              <h1 className="text-xl font-bold tracking-tight text-white uppercase">
                Configurações do Programa Prime Circle
              </h1>
            </div>
            <p className="text-xs text-stone-400">
              Versionamento de regras de recompensas, parâmetros de apuração e limites do
              regulamento.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                size="sm"
                onClick={handleOpenCreateRule}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs rounded-none"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nova Regra de Recompensa
              </Button>
            )}
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('recompensas')}
            className={`px-3 py-1.5 transition-colors flex items-center gap-2 ${
              activeTab === 'recompensas'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Regras de Recompensas ({rules.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-3 py-1.5 transition-colors flex items-center gap-2 ${
              activeTab === 'geral'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Parâmetros de Apuração e Prazos</span>
          </button>
        </div>

        {/* Conteúdo Aba Recompensas */}
        {activeTab === 'recompensas' && (
          <div className="space-y-4">
            <div className="bg-stone-900/40 p-3 border border-stone-800 text-xs text-stone-400 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Regras de Governança:</strong> Recompensas criadas mantêm o valor histórico
                gravado no momento da criação. Nenhuma regra pode depender de exclusividade da
                captação. Apenas regras com{' '}
                <span className="text-emerald-400 font-semibold">
                  Liberada para Uso (released_for_use)
                </span>{' '}
                podem ter recompensas aprovadas pelo financeiro.
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-stone-500">Carregando regras...</div>
            ) : rules.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-stone-800 text-stone-500 text-xs">
                Nenhuma regra cadastrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {rules.map((r) => {
                  const cat = r.expand?.category_id
                  const camp = r.expand?.campaign_id
                  const condo = r.expand?.condominium_id

                  return (
                    <Card
                      key={r.id}
                      className="bg-stone-900/60 border-stone-800 rounded-none hover:border-stone-700 transition-colors"
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-stone-800/60 pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px] rounded-none font-mono">
                              v{r.version}
                            </Badge>
                            <Badge className="bg-stone-800 text-stone-200 text-[10px] rounded-none">
                              {cat?.name || 'Categoria'}
                            </Badge>
                            <Badge className="bg-stone-800 text-stone-300 text-[10px] rounded-none uppercase">
                              Marco: {r.milestone}
                            </Badge>
                            <Badge className="bg-stone-800 text-stone-300 text-[10px] rounded-none uppercase">
                              Beneficiário: {r.beneficiary_type}
                            </Badge>
                            <Badge className="bg-stone-800 text-stone-300 text-[10px] rounded-none uppercase">
                              Tipo Ref: {r.referral_type}
                            </Badge>
                            {camp && (
                              <Badge className="bg-purple-950 text-purple-300 border-purple-800 text-[10px] rounded-none">
                                Campanha: {camp.name}
                              </Badge>
                            )}
                            {condo && (
                              <Badge className="bg-blue-950 text-blue-300 border-blue-800 text-[10px] rounded-none">
                                Condomínio: {condo.name}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Status de Liberação */}
                            <button
                              disabled={!isAdmin}
                              onClick={() => handleToggleReleased(r)}
                              className={`text-[11px] font-semibold px-2.5 py-1 border flex items-center gap-1.5 transition-colors ${
                                r.released_for_use
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                                  : 'bg-amber-950/60 text-amber-400 border-amber-800/80 hover:bg-amber-900/50'
                              } disabled:opacity-50`}
                              title={
                                isAdmin
                                  ? 'Clique para alternar liberação'
                                  : 'Apenas administradores podem alterar liberação'
                              }
                            >
                              {r.released_for_use ? (
                                <>
                                  <Lock className="w-3 h-3 text-emerald-400" />
                                  <span>Liberada para Uso</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3 text-amber-400" />
                                  <span>Rascunho (Não Liberada)</span>
                                </>
                              )}
                            </button>

                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenVersionRule(r)}
                                className="bg-stone-900 border-stone-800 text-xs rounded-none h-7 px-2.5 text-stone-300"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Nova Versão
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-stone-500">
                              Tipo de Recompensa
                            </span>
                            <div className="font-mono text-stone-200 uppercase">
                              {r.reward_type}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-stone-500">
                              Valor ou Parâmetro
                            </span>
                            <div className="font-mono text-emerald-400 font-bold">
                              {r.reward_type === 'valor_fixo' &&
                                `R$ ${Number(r.fixed_amount_brl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              {r.reward_type === 'percentual_comissao' &&
                                `${r.percentage_value}% da comissão recebida`}
                              {r.reward_type === 'tabela_faixas' && 'Tabela progressiva de faixas'}
                              {r.reward_type === 'beneficio_catalogo' &&
                                (r.catalog_description || 'Catálogo')}
                              {r.reward_type === 'nao_monetaria' && 'Não monetária'}
                              {r.reward_type === 'nenhuma' && 'Nenhuma (0)'}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-semibold text-stone-500">
                              Vigência
                            </span>
                            <div className="text-stone-300 text-[11px]">
                              A partir de:{' '}
                              {r.valid_from
                                ? new Date(r.valid_from).toLocaleDateString('pt-BR')
                                : 'Criação'}
                              {r.valid_to &&
                                ` até ${new Date(r.valid_to).toLocaleDateString('pt-BR')}`}
                            </div>
                          </div>
                        </div>

                        {r.reward_type === 'tabela_faixas' && r.brackets && (
                          <div className="mt-2 p-2 bg-stone-950 border border-stone-800/60 font-mono text-[11px] text-stone-400">
                            <strong>Faixas cadastradas:</strong> {r.brackets}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo Aba Geral */}
        {activeTab === 'geral' && (
          <Card className="bg-stone-900/60 border-stone-800 rounded-none max-w-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">
                Parâmetros Operacionais e Governança
              </CardTitle>
              <CardDescription className="text-xs text-stone-400">
                Prazos do ciclo de apuração e atribuição de captações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label className="text-xs text-stone-300">
                  Dia de Apuração Mensal do Lote (Reckoning Day)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={reckoningDay}
                  onChange={(e) => setReckoningDay(e.target.value)}
                  disabled={!isAdmin}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono"
                />
                <p className="text-[11px] text-stone-500">
                  Dia do mês em que o job agendado monta o lote com as recompensas aprovadas
                  (padrão: dia 10).
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">
                  Dia de Vencimento do Lote (Due Date)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  disabled={!isAdmin}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono"
                />
                <p className="text-[11px] text-stone-500">
                  Data prevista de pagamento exibida aos participantes (padrão: dia 25 do mês).
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">
                  Janela de Atribuição de Captação (Dias)
                </Label>
                <Input
                  type="number"
                  value={attributionDays}
                  onChange={(e) => setAttributionDays(e.target.value)}
                  disabled={!isAdmin}
                  className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono"
                />
                <p className="text-[11px] text-stone-500">
                  Janela máxima em dias entre a indicação e a formalização da captação para gerar
                  recompensa (padrão: 90 dias).
                </p>
              </div>

              {isAdmin && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    disabled={savingSettings}
                    onClick={handleSaveSettings}
                    className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-none text-xs"
                  >
                    {savingSettings ? 'Salvando...' : 'Salvar Parâmetros'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal Nova Regra */}
        <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
          <DialogContent className="bg-stone-900 border-stone-800 text-stone-100 rounded-none sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                {editingRuleId ? 'Criar Nova Versão de Regra' : 'Nova Regra de Recompensa'}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-400">
                Regras são versionadas e salvas em modo rascunho até liberação pelo administrador.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Categoria de Participante</Label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.requires_creci ? '(Exige CRECI)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-stone-300">Marco da Recompensa</Label>
                  <select
                    value={milestone}
                    onChange={(e) => setMilestone(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
                  >
                    <option value="captada">Captada (Formalização)</option>
                    <option value="fechamento">Fechamento (Negócio Concluído)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-stone-300">Beneficiário</Label>
                  <select
                    value={beneficiaryType}
                    onChange={(e) => setBeneficiaryType(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
                  >
                    <option value="indicador">Indicador</option>
                    <option value="cliente">Cliente (Cashback)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Tipo de Indicação Aplicável</Label>
                <select
                  value={referralType}
                  onChange={(e) => setReferralType(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
                >
                  <option value="todos">Todos os tipos</option>
                  <option value="proprietario_venda">Proprietário - Venda</option>
                  <option value="proprietario_locacao">Proprietário - Locação</option>
                  <option value="comprador">Comprador</option>
                  <option value="inquilino">Inquilino</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-stone-300">Tipo de Recompensa</Label>
                <select
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
                >
                  <option value="valor_fixo">Valor Fixo (BRL)</option>
                  <option value="tabela_faixas">Tabela de Faixas Progressivas</option>
                  <option value="percentual_comissao">Percentual da Comissão (Exige CRECI)</option>
                  <option value="beneficio_catalogo">Benefício de Catálogo</option>
                  <option value="nao_monetaria">Não Monetária</option>
                  <option value="nenhuma">Nenhuma</option>
                </select>
              </div>

              {rewardType === 'valor_fixo' && (
                <div className="space-y-1">
                  <Label className="text-xs text-stone-300">Valor Fixo (R$)</Label>
                  <Input
                    type="number"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono"
                  />
                </div>
              )}

              {rewardType === 'percentual_comissao' && (
                <div className="space-y-1">
                  <Label className="text-xs text-stone-300">
                    Percentual da Comissão Recebida (%)
                  </Label>
                  <Input
                    type="number"
                    value={percentageValue}
                    onChange={(e) => setPercentageValue(e.target.value)}
                    placeholder="Ex: 10"
                    className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono"
                  />
                </div>
              )}

              {rewardType === 'tabela_faixas' && (
                <div className="space-y-1">
                  <Label className="text-xs text-stone-300">
                    Faixas em JSON (min, max, amount)
                  </Label>
                  <Textarea
                    value={bracketsJson}
                    onChange={(e) => setBracketsJson(e.target.value)}
                    placeholder='[{"min": 1500000, "max": 3000000, "amount": 10000}]'
                    className="bg-stone-950 border-stone-800 rounded-none text-xs font-mono"
                    rows={4}
                  />
                </div>
              )}

              {rewardType === 'beneficio_catalogo' && (
                <div className="space-y-1">
                  <Label className="text-xs text-stone-300">
                    Descrição do Benefício / Catálogo
                  </Label>
                  <Input
                    value={catalogDesc}
                    onChange={(e) => setCatalogDesc(e.target.value)}
                    placeholder="Ex: Voucher Decoração R$ 5.000"
                    className="bg-stone-950 border-stone-800 rounded-none text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800">
                <div className="space-y-1">
                  <Label className="text-xs text-stone-300">Escopo: Campanha (Opcional)</Label>
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
                  >
                    <option value="">Geral (Sem campanha)</option>
                    {campaigns.map((camp) => (
                      <option key={camp.id} value={camp.id}>
                        {camp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-stone-300">Escopo: Condomínio (Opcional)</Label>
                  <select
                    value={condoId}
                    onChange={(e) => setCondoId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-none px-3 py-2 text-xs text-stone-200"
                  >
                    <option value="">Geral (Sem condomínio)</option>
                    {condos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRuleModalOpen(false)}
                className="bg-stone-950 border-stone-800 rounded-none text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={savingRule}
                onClick={handleSaveRule}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-none text-xs"
              >
                {savingRule ? 'Salvando...' : 'Salvar Regra'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
export default AdminSettingsPage
