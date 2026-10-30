import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ExternalLink,
  ArrowRight,
  FileText,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { BrandPublicHeader, BrandPublicFooter, Eyebrow } from '@/components/brand'
import {
  getPublicFormData,
  registerParticipant,
  PublicCategoryItem,
  PublicLegalDocumentItem,
  RegisterParticipantResponse,
} from '@/services/operations'

export default function CadastroPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Convite via query param ?convite=CODIGO
  const conviteParam = (searchParams.get('convite') || searchParams.get('invite') || '').trim()

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  // Form fields
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  // Conditional fields
  const [condominiumId, setCondominiumId] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [creci, setCreci] = useState('')
  const [conselhoFiscalNotifiedAt, setConselhoFiscalNotifiedAt] = useState('')

  // Arquivo da Ata para Entidade Condominial
  const [ataFile, setAtaFile] = useState<File | null>(null)
  const [ataBase64, setAtaBase64] = useState<string>('')

  // Checkboxes gerais e de elegibilidade
  const [declarouMaioridade, setDeclarouMaioridade] = useState(false)
  const [declarouVinculoEmpregador, setDeclarouVinculoEmpregador] = useState(false)
  const [declarouNaoUsoSistemas, setDeclarouNaoUsoSistemas] = useState(false)
  const [declarouEntregaEmMaos, setDeclarouEntregaEmMaos] = useState(false)

  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [acceptedRegulamento, setAcceptedRegulamento] = useState(false)
  const [acceptedImpedimento, setAcceptedImpedimento] = useState(false)

  const [whatsappOptin, setWhatsappOptin] = useState(true)
  const [marketingOptin, setMarketingOptin] = useState(false)

  // Honeypot anti-robô
  const [website, setWebsite] = useState('')

  // Data loading
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [categories, setCategories] = useState<PublicCategoryItem[]>([])
  const [condominiums, setCondominiums] = useState<
    Array<{ id: string; name: string; neighborhood?: string }>
  >([])
  const [legalDocs, setLegalDocs] = useState<Record<string, PublicLegalDocumentItem>>({})

  // Modal de leitura de documento legal
  const [activeDocModal, setActiveDocModal] = useState<PublicLegalDocumentItem | null>(null)

  // Submissão
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<RegisterParticipantResponse | null>(null)

  // Carregar dados públicos
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        setIsLoadingData(true)
        const data = await getPublicFormData()
        if (!isMounted) return

        if (data.categories) {
          setCategories(data.categories)
        }
        if (data.condominiums) {
          setCondominiums(data.condominiums)
        }
        if (data.legal_documents) {
          const map: Record<string, PublicLegalDocumentItem> = {}
          data.legal_documents.forEach((d) => {
            map[d.slug] = d
          })
          setLegalDocs(map)
        }
      } catch (err) {
        console.error('Erro ao carregar dados do formulário:', err)
      } finally {
        if (isMounted) setIsLoadingData(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  // Textos em linguagem comum por slug com os 6 textos EXATOS da especificação C3a-fix2d
  const CATEGORY_COMMON_LABELS: Record<string, string> = {
    cliente: 'Sou morador, proprietário ou cliente',
    porteiro_zelador: 'Trabalho em um condomínio (porteiro, zelador)',
    prestador_residencial: 'Presto serviços em residências (diarista, eletricista, jardineiro…)',
    sindico: 'Sou síndico',
    entidade_condominial: 'Represento uma associação ou condomínio',
    parceiro_profissional: 'Sou profissional liberal (arquiteto, engenheiro, contador…)',
  }

  // Filtrar somente as categorias do piloto com textos mapeados
  const availableCategories = categories.filter((c) => Boolean(CATEGORY_COMMON_LABELS[c.slug]))

  // Categoria atualmente selecionada
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)

  // Determinar regras condicionais
  const selectedSlug = selectedCategory?.slug || ''
  const exigeCondominio =
    selectedSlug === 'porteiro_zelador' ||
    selectedSlug === 'sindico' ||
    selectedSlug === 'entidade_condominial'

  const isPorteiroPrestadorSindico =
    selectedSlug === 'porteiro_zelador' ||
    selectedSlug === 'prestador_residencial' ||
    selectedSlug === 'sindico'

  const isSindico = selectedSlug === 'sindico'
  const isEntidadeCondominial = selectedSlug === 'entidade_condominial'

  const exigeEntidadeEmpresa =
    selectedSlug === 'entidade_condominial' ||
    selectedSlug === 'administradora' ||
    selectedSlug === 'empresa_parceira'

  const exigeCreci = selectedSlug === 'corretor_parceiro'

  const handleAtaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setAtaFile(null)
      setAtaBase64('')
      return
    }
    setAtaFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Extrair base64 puro após data:...;base64,
      const base64Clean = result.includes(',') ? result.split(',')[1] : result
      setAtaBase64(base64Clean)
    }
    reader.readAsDataURL(file)
  }

  // Formatar máscaras leves
  const handleCpfChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11)
    if (raw.length <= 3) setCpf(raw)
    else if (raw.length <= 6) setCpf(`${raw.slice(0, 3)}.${raw.slice(3)}`)
    else if (raw.length <= 9) setCpf(`${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`)
    else setCpf(`${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`)
  }

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11)
    if (raw.length <= 2) setTelefone(raw)
    else if (raw.length <= 7) setTelefone(`(${raw.slice(0, 2)}) ${raw.slice(2)}`)
    else setTelefone(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`)
  }

  const handleCnpjChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 14)
    if (raw.length <= 2) setCnpj(raw)
    else if (raw.length <= 5) setCnpj(`${raw.slice(0, 2)}.${raw.slice(2)}`)
    else if (raw.length <= 8) setCnpj(`${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`)
    else if (raw.length <= 12)
      setCnpj(`${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`)
    else
      setCnpj(
        `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12)}`,
      )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // 1. Honeypot check
    if (website.trim() !== '') {
      // Simula sucesso sem registrar robô
      setSuccessResult({
        success: true,
        message: 'Cadastro recebido. Você receberá a confirmação por e-mail e WhatsApp.',
      })
      return
    }

    // 2. Validações locais
    if (!selectedCategoryId) {
      setErrorMessage('Por favor, selecione a categoria de participação.')
      return
    }

    if (!nome.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido.')
      return
    }

    if (!senha || senha.length < 8) {
      setErrorMessage('A senha de acesso deve conter no mínimo 8 caracteres.')
      return
    }

    if (exigeCondominio && !condominiumId) {
      setErrorMessage('A categoria selecionada exige a indicação de um condomínio associado.')
      return
    }

    if (exigeEntidadeEmpresa && !cnpj.trim()) {
      setErrorMessage('Por favor, informe o CNPJ da entidade ou empresa.')
      return
    }

    if (exigeCreci && !creci.trim()) {
      setErrorMessage('Para corretores parceiros, o número do CRECI é obrigatório.')
      return
    }

    // Validação de Maioridade (18+ anos)
    if (!declarouMaioridade) {
      setErrorMessage('É obrigatório declarar ter 18 anos ou mais.')
      return
    }

    // Validações específicas para porteiro, prestador e síndico
    if (isPorteiroPrestadorSindico) {
      if (!declarouVinculoEmpregador) {
        setErrorMessage(
          'É obrigatório declarar que seu contrato de trabalho e o regimento do condomínio ou empregador não vedam esta atividade.',
        )
        return
      }
      if (!declarouNaoUsoSistemas) {
        setErrorMessage(
          'É obrigatório declarar que não usará dados, cadastros, sistemas ou câmeras do condomínio ou empregador.',
        )
        return
      }
      if (!declarouEntregaEmMaos) {
        setErrorMessage('É obrigatório declarar que apenas entregará o link de indicação em mãos.')
        return
      }
    }

    // Síndico: data da comunicação ao conselho fiscal
    if (isSindico && !conselhoFiscalNotifiedAt) {
      setErrorMessage('Por favor, informe a data em que comunicou a adesão ao conselho fiscal.')
      return
    }

    // Entidade condominial: upload obrigatório de ata
    if (isEntidadeCondominial && (!ataFile || !ataBase64)) {
      setErrorMessage('Para associação ou condomínio, o envio da ata de assembleia é obrigatório.')
      return
    }

    // Validação dos documentos legais obrigatórios
    if (!acceptedTerms) {
      setErrorMessage('É necessário aceitar os Termos de Uso da Plataforma.')
      return
    }
    if (!acceptedPrivacy) {
      setErrorMessage('É necessário aceitar a Política de Privacidade e Proteção de Dados.')
      return
    }
    if (!acceptedRegulamento) {
      setErrorMessage('É necessário aceitar o Regulamento Geral do Programa de Indicação.')
      return
    }
    if (!acceptedImpedimento) {
      setErrorMessage('É necessário declarar a ausência de impedimento legal e ético.')
      return
    }

    // Montar lista de documentos aceitos com os IDs vigentes
    const acceptedDocuments: Array<{ id: string; slug: string; version: number }> = []
    const docSlugs = [
      'termos_de_uso',
      'politica_de_privacidade',
      'regulamento_do_programa',
      'declaracao_ausencia_impedimento',
    ]

    docSlugs.forEach((slug) => {
      const doc = legalDocs[slug]
      if (doc) {
        acceptedDocuments.push({
          id: doc.id,
          slug: doc.slug,
          version: doc.version,
        })
      }
    })

    try {
      setIsSubmitting(true)
      const res = await registerParticipant({
        category_id: selectedCategoryId,
        invitation_code: conviteParam || undefined,
        nome: nome.trim(),
        cpf: cpf.trim(),
        telefone: telefone.trim(),
        email: email.trim().toLowerCase(),
        senha,
        condominium_id: condominiumId || undefined,
        cnpj: cnpj.trim() || undefined,
        role_title: roleTitle.trim() || undefined,
        creci: creci.trim() || undefined,
        conselho_fiscal_notified_at: conselhoFiscalNotifiedAt || undefined,
        declarou_maioridade: declarouMaioridade,
        declarou_vinculo_empregador: declarouVinculoEmpregador,
        declarou_nao_uso_sistemas: declarouNaoUsoSistemas,
        declarou_entrega_em_maos: declarouEntregaEmMaos,
        ata_file_name: ataFile ? ataFile.name : undefined,
        ata_file_base64: ataBase64 || undefined,
        ata_file_type: ataFile ? ataFile.type || 'application/pdf' : undefined,
        whatsapp_optin: whatsappOptin,
        marketing_optin: marketingOptin,
        accepted_documents: acceptedDocuments,
        website: website.trim(),
      })

      setSuccessResult(res)
    } catch (err: unknown) {
      console.error('Falha no cadastro de participante:', err)
      const msg = err instanceof Error ? err.message : 'Não foi possível concluir o cadastro.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // TELA DE SUCESSO
  if (successResult) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <BrandPublicHeader />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="mx-auto w-full max-w-md">
            <Card className="rounded-[1px] border border-border bg-card shadow-luxury text-card-foreground p-6 sm:p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <Eyebrow>ETAPA CONCLUÍDA</Eyebrow>
                <div className="w-12 h-12 rounded-[1px] bg-success/15 border border-success/30 flex items-center justify-center text-success">
                  <CheckCircle2 className="w-6 h-6" strokeWidth={1.5} />
                </div>

                <h2 className="text-xl sm:text-2xl font-serif text-foreground font-semibold">
                  Cadastro <em>recebido</em>
                </h2>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                  Cadastro recebido. Você receberá a confirmação por e-mail e WhatsApp.
                </p>

                <div className="pt-4 w-full">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/entrar">Voltar para a Página de Login</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </main>
        <BrandPublicFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <BrandPublicHeader />

      <main className="flex-1 py-10 px-3 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-lg space-y-6">
          {/* Brand header */}
          <div className="text-center space-y-2">
            <Eyebrow className="justify-center">CADASTRO DE PARCEIRO</Eyebrow>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
              Cadastro de <em>Indicador</em>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans max-w-sm mx-auto">
              Faça parte da rede de indicação imobiliária de alto padrão da Barra da Tijuca e
              Recreio dos Bandeirantes.
            </p>
          </div>

          <Card className="rounded-[1px] border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
            <form onSubmit={handleSubmit} noValidate>
              {/* Campo Oculto Honeypot Anti-robô */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website (deixe em branco)</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              {/* PERGUNTA ÚNICA DE CATEGORIA EM LINGUAGEM COMUM */}
              <div className="p-4 sm:p-5 border-b border-border bg-secondary/50 space-y-3">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="category-select"
                    className="text-xs uppercase tracking-wider text-gold-deep font-heading font-semibold block"
                  >
                    1. Como você conhece os imóveis que vai indicar?{' '}
                    <span className="text-gold">*</span>
                  </Label>
                  {isLoadingData && (
                    <span className="text-[11px] text-muted-foreground flex items-center shrink-0">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" strokeWidth={1.5} />
                      Carregando...
                    </span>
                  )}
                </div>

                <select
                  id="category-select"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={isLoadingData}
                  className="w-full h-11 px-3 text-xs sm:text-sm bg-background border border-input text-foreground rounded-[1px] focus:outline-none focus:ring-1 focus:ring-gold font-sans"
                >
                  <option value="">Selecione uma opção...</option>
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {CATEGORY_COMMON_LABELS[cat.slug] || cat.name}
                    </option>
                  ))}
                </select>

                {/* Linha explicando a recompensa da categoria escolhida */}
                {selectedCategory && (
                  <div className="p-3 bg-card border-l-2 border-gold-deep text-xs text-foreground font-sans">
                    <div className="font-heading font-semibold text-foreground">
                      {selectedCategory.front === 'comunidade'
                        ? 'Você recebe recompensa em dinheiro por indicação convertida'
                        : 'Você recebe benefícios e reciprocidade'}
                    </div>
                    {selectedCategory.description && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {selectedCategory.description}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Alerta de erro se houver */}
              {errorMessage && (
                <div className="p-4 pb-0">
                  <Alert variant="destructive" className="rounded-[1px]">
                    <AlertCircle className="h-4 w-4" strokeWidth={1.5} />
                    <AlertDescription className="text-xs font-sans">
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <CardContent className="space-y-5 p-4 sm:p-6">
                {/* DADOS BÁSICOS */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <span className="text-xs uppercase tracking-wider text-gold-deep font-heading font-semibold block">
                    2. Seus Dados Pessoais
                  </span>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="nome-input"
                      className="text-xs text-foreground font-heading font-medium"
                    >
                      Nome Completo <span className="text-gold">*</span>
                    </Label>
                    <Input
                      id="nome-input"
                      type="text"
                      placeholder="Ex: Carlos Eduardo Silveira"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="h-10 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="cpf-input"
                        className="text-xs text-foreground font-heading font-medium"
                      >
                        CPF
                      </Label>
                      <Input
                        id="cpf-input"
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => handleCpfChange(e.target.value)}
                        className="h-10 text-xs sm:text-sm font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="telefone-input"
                        className="text-xs text-foreground font-heading font-medium"
                      >
                        Telefone / WhatsApp
                      </Label>
                      <Input
                        id="telefone-input"
                        type="text"
                        placeholder="(21) 99999-9999"
                        value={telefone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="h-10 text-xs sm:text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email-input"
                      className="text-xs text-foreground font-heading font-medium"
                    >
                      E-mail <span className="text-gold">*</span>
                    </Label>
                    <Input
                      id="email-input"
                      type="email"
                      placeholder="seu.email@exemplo.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="senha-input"
                      className="text-xs text-foreground font-heading font-medium"
                    >
                      Senha de Acesso <span className="text-gold">*</span>
                    </Label>
                    <Input
                      id="senha-input"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      className="h-10 text-xs sm:text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground font-sans">
                      Você usará este e-mail e senha para entrar no seu painel.
                    </p>
                  </div>
                </div>

                {/* CAMPOS CONDICIONAIS */}
                {(exigeCondominio ||
                  exigeEntidadeEmpresa ||
                  exigeCreci ||
                  isSindico ||
                  isEntidadeCondominial) && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <span className="text-xs uppercase tracking-wider text-gold-deep font-heading font-semibold block">
                      3. Informações da Categoria
                    </span>

                    {/* Condomínio Obrigatório */}
                    {exigeCondominio && (
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="condo-select"
                          className="text-xs text-foreground font-heading font-medium flex items-center gap-1.5"
                        >
                          <Building2 className="w-3.5 h-3.5 text-gold-deep" strokeWidth={1.5} />
                          Condomínio Associado <span className="text-gold">*</span>
                        </Label>
                        <select
                          id="condo-select"
                          value={condominiumId}
                          onChange={(e) => setCondominiumId(e.target.value)}
                          className="w-full h-10 px-3 text-xs sm:text-sm bg-background border border-input text-foreground rounded-[1px] focus:outline-none focus:ring-1 focus:ring-gold font-sans"
                          required
                        >
                          <option value="">Selecione o condomínio...</option>
                          {condominiums.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.neighborhood ? `(${c.neighborhood})` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-muted-foreground font-sans">
                          Obrigatório para a categoria selecionada para correta apuração e
                          aprovação.
                        </p>
                      </div>
                    )}

                    {/* Síndico */}
                    {isSindico && (
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="conselho-fiscal-date"
                          className="text-xs text-foreground font-heading font-medium"
                        >
                          Data em que comunicou a adesão ao conselho fiscal{' '}
                          <span className="text-gold">*</span>
                        </Label>
                        <Input
                          id="conselho-fiscal-date"
                          type="date"
                          value={conselhoFiscalNotifiedAt}
                          onChange={(e) => setConselhoFiscalNotifiedAt(e.target.value)}
                          required
                          className="h-10 text-xs sm:text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground font-sans">
                          Exigido para validação de transparência e governança condominial.
                        </p>
                      </div>
                    )}

                    {/* Entidade Condominial: Upload da Ata */}
                    {isEntidadeCondominial && (
                      <div className="space-y-2 p-3 bg-secondary/40 border border-border">
                        <Label
                          htmlFor="ata-upload"
                          className="text-xs text-foreground font-heading font-medium block"
                        >
                          Ata de Assembleia Geral <span className="text-gold">*</span>
                        </Label>
                        <Input
                          id="ata-upload"
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleAtaUpload}
                          required
                          className="text-xs"
                        />
                        <p className="text-[11px] text-muted-foreground font-sans">
                          Envie a ata de eleição ou ata de assembleia autorizando a representação
                          condominial (PDF ou imagem). O registro fica pendente de verificação.
                        </p>
                        {ataFile && (
                          <div className="text-[11px] text-success font-mono">
                            Arquivo selecionado: {ataFile.name} ({(ataFile.size / 1024).toFixed(1)}{' '}
                            KB)
                          </div>
                        )}
                      </div>
                    )}

                    {/* CNPJ e Cargo */}
                    {exigeEntidadeEmpresa && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="cnpj-input"
                            className="text-xs text-foreground font-heading font-medium"
                          >
                            CNPJ da Entidade / Empresa <span className="text-gold">*</span>
                          </Label>
                          <Input
                            id="cnpj-input"
                            type="text"
                            placeholder="00.000.000/0000-00"
                            value={cnpj}
                            onChange={(e) => handleCnpjChange(e.target.value)}
                            required
                            className="h-10 text-xs sm:text-sm font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label
                            htmlFor="cargo-input"
                            className="text-xs text-foreground font-heading font-medium"
                          >
                            Cargo / Função
                          </Label>
                          <Input
                            id="cargo-input"
                            type="text"
                            placeholder="Ex: Diretor, Gerente Predial"
                            value={roleTitle}
                            onChange={(e) => setRoleTitle(e.target.value)}
                            className="h-10 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {/* CRECI */}
                    {exigeCreci && (
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="creci-input"
                          className="text-xs text-foreground font-heading font-medium"
                        >
                          Número de Registro CRECI <span className="text-gold">*</span>
                        </Label>
                        <Input
                          id="creci-input"
                          type="text"
                          placeholder="Ex: CRECI-RJ 12345/F"
                          value={creci}
                          onChange={(e) => setCreci(e.target.value)}
                          required
                          className="h-10 text-xs sm:text-sm font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground font-sans">
                          O cadastro de corretor parceiro passa por validação do registro
                          profissional ativo no CRECI-RJ.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* DECLARAÇÕES OBRIGATÓRIAS DO TERMO DE ADESÃO */}
                {isPorteiroPrestadorSindico && (
                  <div className="space-y-3 pt-2 border-t border-border bg-secondary/40 p-3">
                    <span className="text-xs uppercase tracking-wider text-gold-deep font-heading font-semibold block">
                      Declarações do Termo de Adesão ({selectedCategory?.name})
                    </span>

                    <div className="flex items-start space-x-2.5">
                      <Checkbox
                        id="dec-vinculo"
                        checked={declarouVinculoEmpregador}
                        onCheckedChange={(c) => setDeclarouVinculoEmpregador(c === true)}
                        className="mt-0.5 rounded-[1px]"
                      />
                      <label
                        htmlFor="dec-vinculo"
                        className="text-foreground text-xs cursor-pointer font-sans leading-relaxed"
                      >
                        Declaro que meu contrato de trabalho e o regimento do condomínio ou
                        empregador não vedam esta atividade. <span className="text-gold">*</span>
                      </label>
                    </div>

                    <div className="flex items-start space-x-2.5">
                      <Checkbox
                        id="dec-sistemas"
                        checked={declarouNaoUsoSistemas}
                        onCheckedChange={(c) => setDeclarouNaoUsoSistemas(c === true)}
                        className="mt-0.5 rounded-[1px]"
                      />
                      <label
                        htmlFor="dec-sistemas"
                        className="text-foreground text-xs cursor-pointer font-sans leading-relaxed"
                      >
                        Declaro que não usarei dados, cadastros, sistemas ou câmeras do condomínio
                        ou do empregador. <span className="text-gold">*</span>
                      </label>
                    </div>

                    <div className="flex items-start space-x-2.5">
                      <Checkbox
                        id="dec-entrega"
                        checked={declarouEntregaEmMaos}
                        onCheckedChange={(c) => setDeclarouEntregaEmMaos(c === true)}
                        className="mt-0.5 rounded-[1px]"
                      />
                      <label
                        htmlFor="dec-entrega"
                        className="text-foreground text-xs cursor-pointer font-sans leading-relaxed"
                      >
                        Declaro que apenas entregarei o link de indicação em mãos.{' '}
                        <span className="text-gold">*</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* TERMOS LEGAIS E CONSENTIMENTO */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <span className="text-xs uppercase tracking-wider text-gold-deep font-heading font-semibold block">
                    4. Termos e Elegibilidade
                  </span>

                  {/* Declaração de Maioridade */}
                  <div className="flex items-start space-x-2.5 p-2.5 bg-secondary/30 border border-border">
                    <Checkbox
                      id="maioridade-check"
                      checked={declarouMaioridade}
                      onCheckedChange={(c) => setDeclarouMaioridade(c === true)}
                      className="mt-0.5 rounded-[1px]"
                    />
                    <div className="grid gap-1 leading-none text-xs">
                      <label
                        htmlFor="maioridade-check"
                        className="text-foreground cursor-pointer font-sans"
                      >
                        Declaro ter 18 anos ou mais. <span className="text-gold">*</span>
                      </label>
                    </div>
                  </div>

                  {/* 1. Termos de Uso */}
                  <div className="flex items-start space-x-2.5 p-2.5 bg-secondary/30 border border-border">
                    <Checkbox
                      id="terms-check"
                      checked={acceptedTerms}
                      onCheckedChange={(c) => setAcceptedTerms(c === true)}
                      className="mt-0.5 rounded-[1px]"
                    />
                    <div className="grid gap-1 leading-none text-xs">
                      <label
                        htmlFor="terms-check"
                        className="text-foreground cursor-pointer font-sans"
                      >
                        Li e concordo com os{' '}
                        <button
                          type="button"
                          onClick={() => setActiveDocModal(legalDocs['termos_de_uso'] || null)}
                          className="text-gold-deep hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          Termos de Uso da Plataforma
                          <ExternalLink className="w-3 h-3 ml-0.5" strokeWidth={1.5} />
                        </button>
                      </label>
                    </div>
                  </div>

                  {/* 2. Privacidade */}
                  <div className="flex items-start space-x-2.5 p-2.5 bg-secondary/30 border border-border">
                    <Checkbox
                      id="privacy-check"
                      checked={acceptedPrivacy}
                      onCheckedChange={(c) => setAcceptedPrivacy(c === true)}
                      className="mt-0.5 rounded-[1px]"
                    />
                    <div className="grid gap-1 leading-none text-xs">
                      <label
                        htmlFor="privacy-check"
                        className="text-foreground cursor-pointer font-sans"
                      >
                        Li e concordo com a{' '}
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDocModal(legalDocs['politica_de_privacidade'] || null)
                          }
                          className="text-gold-deep hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          Política de Privacidade (LGPD)
                          <ExternalLink className="w-3 h-3 ml-0.5" strokeWidth={1.5} />
                        </button>
                      </label>
                    </div>
                  </div>

                  {/* 3. Regulamento */}
                  <div className="flex items-start space-x-2.5 p-2.5 bg-secondary/30 border border-border">
                    <Checkbox
                      id="regulamento-check"
                      checked={acceptedRegulamento}
                      onCheckedChange={(c) => setAcceptedRegulamento(c === true)}
                      className="mt-0.5 rounded-[1px]"
                    />
                    <div className="grid gap-1 leading-none text-xs">
                      <label
                        htmlFor="regulamento-check"
                        className="text-foreground cursor-pointer font-sans"
                      >
                        Li e aceito o{' '}
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDocModal(legalDocs['regulamento_do_programa'] || null)
                          }
                          className="text-gold-deep hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          Regulamento Geral do Programa
                          <ExternalLink className="w-3 h-3 ml-0.5" strokeWidth={1.5} />
                        </button>
                      </label>
                    </div>
                  </div>

                  {/* 4. Declaração de Ausência de Impedimento */}
                  <div className="flex items-start space-x-2.5 p-2.5 bg-secondary/30 border border-border">
                    <Checkbox
                      id="impedimento-check"
                      checked={acceptedImpedimento}
                      onCheckedChange={(c) => setAcceptedImpedimento(c === true)}
                      className="mt-0.5 rounded-[1px]"
                    />
                    <div className="grid gap-1 leading-none text-xs">
                      <label
                        htmlFor="impedimento-check"
                        className="text-foreground cursor-pointer font-sans"
                      >
                        Declaro sob as penas da lei a{' '}
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDocModal(legalDocs['declaracao_ausencia_impedimento'] || null)
                          }
                          className="text-gold-deep hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          Ausência de Impedimento Legal e Ético
                          <ExternalLink className="w-3 h-3 ml-0.5" strokeWidth={1.5} />
                        </button>
                      </label>
                    </div>
                  </div>

                  {/* 5. Opt-in de WhatsApp */}
                  <div className="flex items-start space-x-2.5 p-2.5 bg-secondary/30 border border-border">
                    <Checkbox
                      id="wa-optin-check"
                      checked={whatsappOptin}
                      onCheckedChange={(c) => setWhatsappOptin(c === true)}
                      className="mt-0.5 rounded-[1px]"
                    />
                    <div className="grid gap-1 leading-none text-xs font-sans">
                      <label htmlFor="wa-optin-check" className="text-foreground cursor-pointer">
                        Aceito receber atualizações operacionais e avisos sobre minhas indicações
                        via WhatsApp.
                      </label>
                    </div>
                  </div>

                  {/* 6. Consentimento de Marketing */}
                  <div className="flex items-start space-x-2.5 p-2.5 bg-secondary/30 border border-border">
                    <Checkbox
                      id="mkt-optin-check"
                      checked={marketingOptin}
                      onCheckedChange={(c) => setMarketingOptin(c === true)}
                      className="mt-0.5 rounded-[1px]"
                    />
                    <div className="grid gap-1 leading-none text-xs font-sans">
                      <label
                        htmlFor="mkt-optin-check"
                        className="text-muted-foreground cursor-pointer"
                      >
                        Desejo receber novidades, campanhas especiais de incentivo e comunicações de
                        marketing do Prime Circle.
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 p-4 sm:p-6 pt-0">
                <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-sm">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
                      Processando Cadastro...
                    </>
                  ) : (
                    <>
                      Concluir Meu Cadastro
                      <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
                    </>
                  )}
                </Button>

                <div className="text-center text-xs text-muted-foreground font-sans">
                  Já possui uma conta de indicador?{' '}
                  <Link
                    to="/entrar"
                    className="text-gold-deep hover:underline font-heading font-medium"
                  >
                    Faça login aqui
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>

      {/* DIALOG DE LEITURA DO TEXTO VIGENTE DO DOCUMENTO LEGAL */}
      <Dialog open={!!activeDocModal} onOpenChange={(open) => !open && setActiveDocModal(null)}>
        <DialogContent className="max-w-lg w-[92vw] max-h-[85vh] flex flex-col rounded-[1px] bg-card border border-border text-card-foreground p-4 sm:p-6 font-sans">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="text-base sm:text-lg font-serif text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold-deep shrink-0" strokeWidth={1.5} />
              <span className="truncate">{activeDocModal?.title || 'Documento Legal'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">
              Versão vigente: {activeDocModal?.version || 1} • Programa Prime Circle Indica
            </DialogDescription>
          </DialogHeader>

          {activeDocModal?.is_provisional && (
            <div className="bg-warning/15 border-l-2 border-warning text-warning px-3 py-2 text-xs font-medium">
              Texto provisório, em revisão jurídica.
            </div>
          )}

          <div className="my-3 flex-1 overflow-y-auto pr-1 text-xs text-foreground leading-relaxed space-y-3 whitespace-pre-wrap font-sans bg-secondary/40 p-3.5 border border-border">
            {activeDocModal?.content || 'Conteúdo do documento em carregamento...'}
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveDocModal(null)}
              className="text-xs h-9 px-4"
            >
              Compreendi e Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BrandPublicFooter />
    </div>
  )
}
