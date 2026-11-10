"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  Ellipsis,
  FileQuestion,
  GraduationCap,
  HandCoins,
  Images,
  Info,
  Landmark,
  Loader2,
  MapPin,
  Megaphone,
  RefreshCw,
  Shield,
  ShieldCheck,
  Store,
  User,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { iniciarSolicitacao, type EntradaPedido } from "@/app/acoes-publicas";
import { mascaraTelefone } from "@/components/form-cliente";
import { rastrear } from "@/components/pixel-meta";
import {
  BotaoDourado,
  CARTAO,
  CARTAO_ATIVO,
  CARTAO_OURO,
  CirculoIcone,
  Etapas,
  FundoPremium,
  IconeInstagram,
  IconeWhatsApp,
  Marca,
  OURO_TEXTO,
  Rodape,
  TituloDestaque,
} from "@/components/publico/visual";
import { calcularJuros } from "@/lib/emprestimo/calculo";
import { formatarMoeda, lerMoeda, linkWhatsApp, mascaraMoeda, somenteDigitos } from "@/lib/formato";
import { lerUtms } from "@/lib/utm";
import { CIDADES_ATENDIDAS, ORIGENS, TIPOS_RENDA, UF_ATENDIDA, type OrigemPedido, type TipoRenda } from "@/lib/pedido";

const ICONE_RENDA: Record<TipoRenda, LucideIcon> = {
  clt: Briefcase,
  informal: Store,
  autonomo: UserRound,
  beneficiario: HandCoins,
  estagiario: GraduationCap,
  servidor: Landmark,
  seguro: Shield,
  sem_comprovacao: FileQuestion,
};

const ICONE_ORIGEM: Record<OrigemPedido, LucideIcon> = {
  anuncio: Megaphone,
  instagram: Images,
  indicacao: Users,
  outro: Ellipsis,
};

const VALORES_RAPIDOS = ["300,00", "500,00", "1.000,00", "2.000,00"];
const ETAPAS = ["Simulação", "Tipo de renda", "Cadastro"];
const entrada = "w-full min-w-0 bg-transparent text-[17px] text-white outline-none placeholder:text-white/40";

export function PedidoWizard({
  empresaSlug,
  taxa,
  prazo,
  whatsapp,
  onFechar,
}: {
  empresaSlug: string;
  taxa: number;
  prazo: number;
  /** WhatsApp da empresa: ao enviar a análise, o cliente é levado para lá. */
  whatsapp: string;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [passo, setPasso] = useState(1);
  const [p, setP] = useState<EntradaPedido>({
    valor: "",
    formaPagamento: "a_vista",
    cidade: "",
    renda: "",
    tipoRenda: "clt",
    nome: "",
    telefone: "",
    instagram: "",
    origem: "",
    origemDetalhe: "",
    site: "",
  });
  const [escolheuRenda, setEscolheuRenda] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valor = lerMoeda(p.valor) ?? 0;
  const renda = lerMoeda(p.renda) ?? 0;
  const juros = calcularJuros(valor, taxa);
  const passo1Ok = valor > 0 && !!p.cidade && renda > 0;
  const passo3Ok = p.nome.trim().length >= 3 && [10, 11].includes(somenteDigitos(p.telefone).length) && aceite;

  function irPara(n: number) {
    setErro(null);
    setPasso(n);
    document.getElementById("pedido-topo")?.scrollIntoView();
  }

  async function enviar() {
    setErro(null);
    setEnviando(true);
    const r = await iniciarSolicitacao(empresaSlug, { ...p, utms: lerUtms() });
    if (!r.ok) {
      setEnviando(false);
      setErro(r.mensagem);
      return;
    }
    rastrear("Lead", { value: valor / 100, currency: "BRL" });
    if (whatsapp) {
      const texto = [
        "Olá! Acabei de enviar minha análise pelo site.",
        "",
        `*Nome:* ${p.nome.trim()}`,
        `*Cidade:* ${p.cidade}`,
        `*Valor do empréstimo:* ${formatarMoeda(valor)}`,
      ].join("\n");
      window.location.assign(linkWhatsApp(whatsapp, texto));
      return;
    }
    // Sem WhatsApp cadastrado para a empresa: segue para o envio de documentos.
    router.push(`/s/${r.token}`);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto text-white" role="dialog" aria-modal aria-label="Solicitar empréstimo">
      <FundoPremium />
      <div id="pedido-topo" className="mx-auto w-full max-w-md px-5 pt-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {/* Topo: voltar, marca e etapas */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => (passo === 1 ? onFechar() : irPara(passo - 1))}
            className="absolute left-0 flex items-center gap-2 py-1 text-[17px] font-medium"
          >
            <ArrowLeft className="size-6" /> Voltar
          </button>
          <div className="pl-16">
            <Marca />
          </div>
        </div>
        <div className="mt-5 mb-6">
          <Etapas nomes={ETAPAS} atual={passo - 1} />
        </div>

        {passo === 1 && (
          <section className="space-y-4">
            <TituloDestaque
              inicio="Quanto você"
              destaque="precisa?"
              subtitulo="Informe o valor e veja as condições para você."
            />

            <div className={`${CARTAO} relative overflow-hidden px-4 pt-4 pb-4`}>
              <Coins
                aria-hidden
                className="absolute top-4 right-4 size-16 text-[#e8bb52] drop-shadow-[0_0_16px_rgba(232,187,82,0.55)]"
                strokeWidth={1.4}
              />
              <label className="block text-sm text-white/70" htmlFor="valor">
                Valor desejado
              </label>
              <div className="mt-1 flex items-baseline gap-2 pr-16">
                <span className={`text-[2.6rem] leading-none font-black ${OURO_TEXTO}`}>R$</span>
                <input
                  id="valor"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={p.valor}
                  onChange={(e) => setP({ ...p, valor: mascaraMoeda(e.target.value) })}
                  className="w-full min-w-0 bg-transparent text-[2.6rem] leading-none font-black text-white outline-none placeholder:text-white"
                />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {VALORES_RAPIDOS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setP({ ...p, valor: v })}
                    className={`rounded-xl border py-2.5 text-sm font-bold transition ${
                      p.valor === v
                        ? "border-[#e3b54e] bg-[#e3b54e]/15 text-[#f7dc8f]"
                        : "border-[#2a6b49] bg-[#07190f]/60 text-white"
                    }`}
                  >
                    {v.replace(",00", "")}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className={`${CARTAO} relative flex items-center gap-2 px-2.5 py-3`}>
                <CirculoIcone icone={MapPin} tamanho="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-white/65">Cidade</span>
                  <select
                    value={p.cidade}
                    onChange={(e) => setP({ ...p, cidade: e.target.value })}
                    className="w-full appearance-none truncate bg-transparent pr-3 text-[14px] font-bold text-white outline-none"
                  >
                    <option value="" className="bg-[#07190f]">
                      Selecione
                    </option>
                    {CIDADES_ATENDIDAS.map((c) => (
                      <option key={c} value={c} className="bg-[#07190f]">
                        {c} - {UF_ATENDIDA}
                      </option>
                    ))}
                  </select>
                </span>
                <ChevronDown className="pointer-events-none absolute right-2 size-4 text-white/60" />
              </label>
              <label className={`${CARTAO} flex items-center gap-2.5 px-3 py-3`}>
                <CirculoIcone icone={Banknote} tamanho="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-white/65">Renda mensal</span>
                  <span className="flex items-baseline gap-1">
                    <span className="text-[15px] font-bold">R$</span>
                    <input
                      inputMode="numeric"
                      placeholder="0,00"
                      value={p.renda}
                      onChange={(e) => setP({ ...p, renda: mascaraMoeda(e.target.value) })}
                      className="w-full min-w-0 bg-transparent text-[15px] font-bold text-white outline-none placeholder:text-white"
                    />
                  </span>
                </span>
              </label>
            </div>

            {valor > 0 && (
              <div className={`${CARTAO} p-4`}>
                <h2 className="mb-3 text-lg font-extrabold">Resumo</h2>
                <dl className="space-y-2 text-[15px]">
                  <div className="flex justify-between">
                    <dt className="text-white/70">Valor solicitado</dt>
                    <dd className="font-bold">{formatarMoeda(valor)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-white/70">Taxa</dt>
                    <dd className="font-bold">{taxa.toLocaleString("pt-BR")}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-white/70">Prazo</dt>
                    <dd className="font-bold">{prazo} dias</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-3">
                  <span className={`text-lg font-extrabold ${OURO_TEXTO}`}>Total a pagar</span>
                  <span className={`text-2xl font-black ${OURO_TEXTO}`}>{formatarMoeda(valor + juros)}</span>
                </div>
              </div>
            )}

            <div className={`${CARTAO_OURO} relative flex items-center gap-4 overflow-hidden p-4`}>
              <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-[#e3b54e] text-[#e8bb52]">
                <RefreshCw className="size-7" strokeWidth={1.8} />
              </span>
              <div className="relative z-10">
                <p className="text-[17px] font-extrabold">Sem o valor total no vencimento?</p>
                <p className="text-[15px] text-white/75">
                  Pague {valor > 0 ? `só os juros (${formatarMoeda(juros)})` : "só os juros"} e renove por mais {prazo} dias.
                </p>
              </div>
              <CalendarDays aria-hidden className="absolute right-3 size-12 text-white/10" strokeWidth={1.4} />
            </div>

            <BotaoDourado disabled={!passo1Ok} onClick={() => irPara(2)}>
              Continuar <ArrowRight className="size-5" strokeWidth={2.5} />
            </BotaoDourado>
            <Rodape icone={ShieldCheck}>Preencha o valor, a cidade e sua renda para continuar.</Rodape>
          </section>
        )}

        {passo === 2 && (
          <section className="space-y-3">
            <div className="mb-2">
              <TituloDestaque
                inicio="Qual é seu"
                destaque="tipo de renda?"
                subtitulo="Selecione a opção que melhor descreve sua situação."
              />
            </div>
            {TIPOS_RENDA.map((t) => {
              const ativo = escolheuRenda && p.tipoRenda === t.valor;
              return (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => {
                    setP({ ...p, tipoRenda: t.valor });
                    setEscolheuRenda(true);
                    irPara(3);
                  }}
                  className={`${ativo ? CARTAO_ATIVO : CARTAO} flex w-full items-center gap-3.5 px-3.5 py-3.5 text-left transition hover:border-[#e3b54e]/70`}
                >
                  <CirculoIcone icone={ICONE_RENDA[t.valor]} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base leading-tight font-extrabold">{t.rotulo}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-white/65">{t.descricao}</span>
                  </span>
                  <ChevronRight className={`size-5 ${ativo ? "text-[#e8bb52]" : "text-white/50"}`} />
                </button>
              );
            })}
          </section>
        )}

        {passo === 3 && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (passo3Ok) enviar();
            }}
          >
            <div className="mb-2">
              <TituloDestaque inicio="Informe seus" destaque="dados" subtitulo="Preencha para continuar." />
            </div>

            <CampoCartao rotulo="Nome completo" icone={<User className="size-6" strokeWidth={1.8} />}>
              <input
                className={entrada}
                placeholder="Digite seu nome completo"
                autoComplete="name"
                value={p.nome}
                onChange={(e) => setP({ ...p, nome: e.target.value })}
                required
              />
            </CampoCartao>
            <CampoCartao rotulo="WhatsApp" icone={<IconeWhatsApp className="size-6" />}>
              <input
                className={entrada}
                placeholder="(71) 99999-9999"
                inputMode="tel"
                autoComplete="tel"
                value={p.telefone}
                onChange={(e) => setP({ ...p, telefone: mascaraTelefone(e.target.value) })}
                required
              />
            </CampoCartao>
            <CampoCartao
              rotulo={
                <>
                  Instagram <span className="font-normal text-[#e8bb52]">(opcional)</span>
                </>
              }
              extra={
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-normal text-white/70">
                  <Info className="size-3.5" /> Ajuda na análise
                </span>
              }
              icone={<IconeInstagram className="size-6" />}
            >
              <input
                className={entrada}
                placeholder="@ seu.perfil"
                autoCapitalize="none"
                value={p.instagram}
                onChange={(e) => setP({ ...p, instagram: e.target.value })}
              />
            </CampoCartao>

            <h2 className="pt-4 text-[1.6rem] leading-tight font-black">
              Como conheceu a <span className={OURO_TEXTO}>Prime Cred?</span>
            </h2>
            <div className="space-y-2.5">
              {ORIGENS.map((o) => {
                const ativo = p.origem === o.valor;
                const Icone = ICONE_ORIGEM[o.valor];
                return (
                  <div key={o.valor} className={ativo ? CARTAO_ATIVO : CARTAO}>
                    <button
                      type="button"
                      onClick={() => setP({ ...p, origem: o.valor, origemDetalhe: "" })}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left text-[15px] leading-snug"
                    >
                      <CirculoIcone icone={Icone} tamanho="sm" />
                      <span className="flex-1">{o.rotulo}</span>
                      <span
                        className={`grid size-6 place-items-center rounded-full border-2 ${
                          ativo ? "border-[#e3b54e] bg-[#e3b54e]" : "border-white/35"
                        }`}
                      >
                        {ativo && <Check className="size-3.5 text-[#1a1204]" strokeWidth={3} />}
                      </span>
                    </button>
                    {ativo && o.detalhe && (
                      <input
                        autoFocus
                        className="mx-3 mb-3 w-[calc(100%-1.5rem)] rounded-xl border border-[#1f5a3c] bg-black/25 px-3 py-2.5 text-[15px] text-white outline-none placeholder:text-white/40 focus:border-[#e3b54e]/70"
                        placeholder={o.detalhe}
                        value={p.origemDetalhe}
                        onChange={(e) => setP({ ...p, origemDetalhe: e.target.value })}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Campo-armadilha para robôs: invisível para pessoas. */}
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
              value={p.site}
              onChange={(e) => setP({ ...p, site: e.target.value })}
            />

            <label className="flex cursor-pointer items-start gap-3 pt-2 text-[15px] leading-snug text-white/80">
              <input
                type="checkbox"
                checked={aceite}
                onChange={(e) => setAceite(e.target.checked)}
                className="peer sr-only"
              />
              <span
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-2 border-[#e3b54e] peer-focus-visible:ring-2 peer-focus-visible:ring-[#e3b54e]/50 ${
                  aceite ? "bg-[#e3b54e]" : ""
                }`}
              >
                {aceite && <Check className="size-4 text-[#1a1204]" strokeWidth={3} />}
              </span>
              Autorizo o uso dos meus dados, documentos, fotos e localização exclusivamente para a análise de crédito.
            </label>

            {erro && <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{erro}</p>}

            <div className="pt-2">
              <BotaoDourado tipo="submit" disabled={!passo3Ok || enviando}>
                {enviando ? <Loader2 className="size-5 animate-spin" /> : null}
                {enviando ? "Enviando…" : "Enviar minha análise"}
                {!enviando && <ArrowRight className="size-5" strokeWidth={2.5} />}
              </BotaoDourado>
            </div>
            <Rodape icone={ShieldCheck}>
              {whatsapp
                ? "Depois de enviar, você fala com a nossa equipe pelo WhatsApp."
                : "No próximo passo você envia os documentos pelo celular."}
            </Rodape>
          </form>
        )}
      </div>
    </div>
  );
}

function CampoCartao({
  rotulo,
  extra,
  icone,
  children,
}: {
  rotulo: React.ReactNode;
  extra?: React.ReactNode;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className={`${CARTAO_OURO} flex items-center gap-3 px-3 py-3 focus-within:shadow-[0_0_28px_-6px_rgba(227,181,78,0.7)]`}>
      <CirculoIcone>{icone}</CirculoIcone>
      <span className="h-11 w-px shrink-0 bg-white/15" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-[15px] font-bold whitespace-nowrap">
          <span className="truncate">{rotulo}</span>
          {extra}
        </span>
        {children}
      </span>
    </label>
  );
}
