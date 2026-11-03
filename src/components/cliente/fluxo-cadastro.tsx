"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Hash,
  House,
  IdCard,
  Images,
  Loader2,
  MapPin,
  Phone,
  User,
  UserRound,
  Users,
  Video,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { confirmarEnvio, enviarParaAnalise, prepararEnvio, salvarDados, type DadosCadastro } from "@/app/s/[token]/actions";
import { buscarCep, mascaraCep, mascaraCpf, mascaraTelefone } from "@/components/form-cliente";
import {
  BotaoDourado,
  CARTAO,
  CirculoIcone,
  Etapas,
  FundoPremium,
  Marca,
  TituloDestaque,
} from "@/components/publico/visual";
import { BUCKET_DOCUMENTOS, DOCUMENTO_POR_TIPO } from "@/lib/documentos";
import { mascaraMoeda, somenteDigitos } from "@/lib/formato";
import { CIDADES_ATENDIDAS, TIPO_RENDA_POR_VALOR, UF_ATENDIDA, cidadeAtendida, type TipoRenda } from "@/lib/pedido";
import { criarClienteNavegador } from "@/lib/supabase/browser";
import type { TipoDocumento } from "@/lib/tipos";
import { CameraFoto, CameraVideo, comprimirImagem, obterLocalizacao, type Localizacao } from "./captura";

export type SituacaoItem = { tipo: TipoDocumento; estado: "faltando" | "enviado" | "recusado"; motivo?: string | null };

type Etapa = "dados" | "documentos" | "concluido";

/** O que o cliente já informou no pedido (página de divulgação ou atendente). */
export type PedidoInformado = {
  nome: string | null;
  telefone: string | null;
  valorCentavos: number | null;
  rendaCentavos: number | null;
  cidade: string | null;
  tipoRenda: TipoRenda | null;
};

const paraMoeda = (centavos: number | null) => (centavos ? mascaraMoeda(String(centavos)) : "");

// Mesma identidade visual da página de divulgação.
const cartao = CARTAO;

const ICONE_DOCUMENTO: Record<TipoDocumento, LucideIcon> = {
  rg_segurando: UserRound,
  rg_frente: IdCard,
  rg_verso: IdCard,
  comprovante_residencia: House,
  foto_residencia: House,
  video_residencia: Video,
  selfie_residencia: User,
  comprovante_renda: FileText,
};

export function FluxoCadastro({
  token,
  empresa,
  etapaInicial,
  correcao,
  itensIniciais,
  pedido,
}: {
  token: string;
  empresa: string;
  etapaInicial: Etapa;
  correcao: boolean;
  itensIniciais: SituacaoItem[];
  pedido: PedidoInformado;
}) {
  const [etapa, setEtapa] = useState<Etapa>(etapaInicial);
  const [itens, setItens] = useState(itensIniciais);

  return (
    <div className="relative min-h-dvh text-white" aria-label={empresa}>
      <FundoPremium />
      <div className="mx-auto w-full max-w-md px-5 pt-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <header className="mb-5 flex flex-col items-center gap-3">
          <Marca />
          {pedido.tipoRenda && (
            <span className="rounded-full border border-[#e3b54e]/50 bg-[#0a2618]/70 px-3 py-1 text-xs text-white/70">
              Perfil: <span className="font-semibold text-[#f1d58a]">{TIPO_RENDA_POR_VALOR[pedido.tipoRenda].rotulo}</span>
            </span>
          )}
        </header>

        {!correcao && (
          <div className="mb-6">
            <Etapas
              nomes={["Cadastro", "Documentos", "Análise"]}
              atual={etapa === "dados" ? 0 : etapa === "documentos" ? 1 : 2}
            />
          </div>
        )}

        {etapa === "dados" && (
          <EtapaDados token={token} pedido={pedido} onConcluir={() => setEtapa("documentos")} />
        )}
        {etapa === "documentos" && (
          <EtapaDocumentos
            token={token}
            correcao={correcao}
            tipoRenda={pedido.tipoRenda}
            itens={itens}
            setItens={setItens}
            onConcluir={() => {
              setEtapa("concluido");
              window.location.replace("/obrigado");
            }}
          />
        )}
        {etapa === "concluido" && (
          <div className={`${cartao} mt-4 p-6 text-center`}>
            <CheckCircle2 className="mx-auto mb-3 size-14 text-[#e8bb52]" />
            <h1 className="text-2xl font-extrabold">Documentação enviada!</h1>
            <p className="mt-2 text-sm text-white/70">
              Recebemos tudo. Nossa equipe vai conferir e falar com você pelo WhatsApp. Você já pode fechar esta página.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CampoEscuro({
  rotulo,
  icone: Icone,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { rotulo: string; icone?: LucideIcon }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold">{rotulo}</span>
      <span className={`${cartao} flex items-center gap-3 px-4 py-3 focus-within:border-[#e3b54e]/70`}>
        {Icone && (
          <>
            <Icone className="size-5 shrink-0 text-[#e8bb52]" />
            <span className="h-5 w-px bg-white/15" />
          </>
        )}
        <input
          className="w-full min-w-0 bg-transparent text-base text-white outline-none placeholder:text-white/35"
          {...props}
        />
      </span>
    </label>
  );
}

function MensagemErro({ texto }: { texto: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
      <AlertCircle className="mt-0.5 size-4 shrink-0" /> {texto}
    </p>
  );
}

function EtapaDados({
  token,
  pedido,
  onConcluir,
}: {
  token: string;
  pedido: PedidoInformado;
  onConcluir: () => void;
}) {
  // Renda e valor já informados no pedido pelo site: não pergunta de novo.
  const jaInformouValores = !!pedido.valorCentavos && !!pedido.rendaCentavos;
  const [avisoCidade, setAvisoCidade] = useState<string | null>(null);
  const [d, setD] = useState<DadosCadastro>({
    nome: pedido.nome ?? "",
    cpf: "",
    telefone: pedido.telefone ? mascaraTelefone(pedido.telefone) : "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: cidadeAtendida(pedido.cidade) ?? "",
    uf: UF_ATENDIDA,
    renda: paraMoeda(pedido.rendaCentavos),
    valorDesejado: paraMoeda(pedido.valorCentavos),
    referencias: [
      { nome: "", telefone: "", relacao: "" },
      { nome: "", telefone: "", relacao: "" },
    ],
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const set = (campo: keyof DadosCadastro) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setD({ ...d, [campo]: e.target.value });
  const setRef = (i: number, campo: "nome" | "telefone" | "relacao", valor: string) =>
    setD({ ...d, referencias: d.referencias.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)) });

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErro(null);
        setSalvando(true);
        const r = await salvarDados(token, d);
        setSalvando(false);
        if (r.ok) {
          window.scrollTo({ top: 0 });
          onConcluir();
        } else setErro(r.mensagem);
      }}
    >
      <div className="mb-1">
        <TituloDestaque inicio="Informe seus" destaque="dados" subtitulo="Preencha as informações para continuar." />
      </div>

      <CampoEscuro rotulo="Nome completo" icone={User} value={d.nome} onChange={set("nome")} required autoComplete="name" />
      <CampoEscuro
          rotulo="CPF"
          icone={Hash}
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={d.cpf}
          onChange={(e) => setD({ ...d, cpf: mascaraCpf(e.target.value) })}
          required
        />
        <CampoEscuro
          rotulo="WhatsApp"
          icone={Phone}
          inputMode="tel"
          value={d.telefone}
          onChange={(e) => setD({ ...d, telefone: mascaraTelefone(e.target.value) })}
          required
          autoComplete="tel"
        />

      <h2 className="pt-3 text-xl font-extrabold">Endereço</h2>
      <CampoEscuro
        rotulo="CEP"
        icone={MapPin}
        inputMode="numeric"
        placeholder="00000-000"
        value={d.cep}
        required
        autoComplete="postal-code"
        onChange={async (e) => {
          const cep = mascaraCep(e.target.value);
          setD((atual) => ({ ...atual, cep }));
          if (somenteDigitos(cep).length === 8) {
            const end = await buscarCep(cep);
            if (!end) return;
            const cidade = cidadeAtendida(end.cidade);
            setAvisoCidade(cidade ? null : `No momento atendemos apenas: ${CIDADES_ATENDIDAS.join(", ")}.`);
            setD((atual) => ({
              ...atual,
              logradouro: end.logradouro || atual.logradouro,
              bairro: end.bairro || atual.bairro,
              cidade: cidade ?? atual.cidade,
            }));
          }
        }}
      />
      <CampoEscuro rotulo="Rua" value={d.logradouro} onChange={set("logradouro")} required />
      <div className="grid grid-cols-5 gap-3">
        <CampoEscuro rotulo="Número" value={d.numero} onChange={set("numero")} required className="col-span-2" />
        <CampoEscuro rotulo="Complemento" value={d.complemento} onChange={set("complemento")} className="col-span-3" />
      </div>
      <CampoEscuro rotulo="Bairro" value={d.bairro} onChange={set("bairro")} required />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Cidade</span>
        <select
          className={`${cartao} w-full appearance-none px-4 py-3 text-base text-white outline-none focus:border-[#d9b45a]/60`}
          value={d.cidade}
          onChange={(e) => setD({ ...d, cidade: e.target.value })}
          required
        >
          <option value="" className="bg-[#0b1f18]">
            Selecione
          </option>
          {CIDADES_ATENDIDAS.map((c) => (
            <option key={c} value={c} className="bg-[#0b1f18]">
              {c} - {UF_ATENDIDA}
            </option>
          ))}
        </select>
      </label>
      {avisoCidade && <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">{avisoCidade}</p>}

      {!jaInformouValores && (
        <>
          <h2 className="pt-3 text-xl font-extrabold">Renda e valor</h2>
          <div className="grid grid-cols-2 gap-3">
            <CampoEscuro
              rotulo="Renda mensal (R$)"
              inputMode="numeric"
              value={d.renda}
              onChange={(e) => setD({ ...d, renda: mascaraMoeda(e.target.value) })}
              required
              placeholder="0,00"
            />
            <CampoEscuro
              rotulo="Valor desejado (R$)"
              inputMode="numeric"
              value={d.valorDesejado}
              onChange={(e) => setD({ ...d, valorDesejado: mascaraMoeda(e.target.value) })}
              required
              placeholder="0,00"
            />
          </div>
        </>
      )}

      <div className="pt-3">
        <h2 className="text-xl font-extrabold">Referências</h2>
        <p className="text-sm text-white/60">Duas pessoas que conheçam você (parente, amigo, colega).</p>
      </div>
      {d.referencias.map((r, i) => (
        <div key={i} className={`${cartao} space-y-3 p-3`}>
          <p className="flex items-center gap-2 text-sm font-semibold text-[#f1d58a]">
            <Users className="size-4" /> Referência {i + 1}
          </p>
          <CampoEscuro rotulo="Nome" value={r.nome} onChange={(e) => setRef(i, "nome", e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <CampoEscuro
              rotulo="Telefone"
              inputMode="tel"
              value={r.telefone}
              onChange={(e) => setRef(i, "telefone", mascaraTelefone(e.target.value))}
              required
            />
            <CampoEscuro
              rotulo="Relação"
              placeholder="Mãe, amigo…"
              value={r.relacao}
              onChange={(e) => setRef(i, "relacao", e.target.value)}
            />
          </div>
        </div>
      ))}

      {erro && <MensagemErro texto={erro} />}
      <BotaoDourado tipo="submit" disabled={salvando}>
        {salvando ? <Loader2 className="size-5 animate-spin" /> : null}
        {salvando ? "Salvando…" : "Continuar"}
        {!salvando && <ArrowRight className="size-5" />}
      </BotaoDourado>
    </form>
  );
}

type Captura = { tipo: TipoDocumento; local: Localizacao | null };

function Selo({ estado, carregando }: { estado: SituacaoItem["estado"]; carregando: boolean }) {
  if (carregando) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80">
        <Loader2 className="size-3 animate-spin" /> Enviando
      </span>
    );
  }
  if (estado === "enviado") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
        <CheckCircle2 className="size-3" /> Enviado
      </span>
    );
  }
  if (estado === "recusado") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">
        <XCircle className="size-3" /> Reenviar
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
      <Clock className="size-3" /> Pendente
    </span>
  );
}

function BotaoArquivo({
  icone: Icone,
  rotulo,
  accept,
  capture,
  disabled,
  onArquivo,
}: {
  icone: LucideIcon;
  rotulo: string;
  accept: string;
  capture?: "environment" | "user";
  disabled: boolean;
  onArquivo: (f: File) => void;
}) {
  return (
    <label
      className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/20 py-2.5 text-sm font-medium transition hover:border-[#d9b45a]/50 ${
        disabled ? "pointer-events-none opacity-40" : ""
      }`}
    >
      <Icone className="size-4 text-white/80" /> {rotulo}
      <input
        type="file"
        accept={accept}
        capture={capture}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onArquivo(f);
        }}
      />
    </label>
  );
}

function EtapaDocumentos({
  token,
  correcao,
  tipoRenda,
  itens,
  setItens,
  onConcluir,
}: {
  token: string;
  correcao: boolean;
  tipoRenda: TipoRenda | null;
  itens: SituacaoItem[];
  setItens: React.Dispatch<React.SetStateAction<SituacaoItem[]>>;
  onConcluir: () => void;
}) {
  const [captura, setCaptura] = useState<Captura | null>(null);
  const [ocupado, setOcupado] = useState<{ tipo: TipoDocumento; texto: string } | null>(null);
  const [erros, setErros] = useState<Partial<Record<TipoDocumento, string>>>({});
  const [erroFinal, setErroFinal] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);

  const faltam = itens.filter((i) => i.estado !== "enviado").length;
  const setErro = (tipo: TipoDocumento, msg?: string) => setErros((e) => ({ ...e, [tipo]: msg }));

  async function abrir(tipo: TipoDocumento) {
    setErro(tipo);
    const def = DOCUMENTO_POR_TIPO[tipo];
    let local: Localizacao | null = null;
    if (def.gps) {
      setOcupado({ tipo, texto: "Obtendo sua localização…" });
      try {
        local = await obterLocalizacao();
      } catch (e) {
        setOcupado(null);
        setErro(tipo, (e as Error).message);
        return;
      }
      setOcupado(null);
    }
    setCaptura({ tipo, local });
  }

  async function enviar(tipo: TipoDocumento, arquivo: Blob, mime: string, local: Localizacao | null) {
    setCaptura(null);
    setErro(tipo);
    try {
      let blob = arquivo;
      if (mime.startsWith("image/") && mime !== "image/heic" && mime !== "image/heif") {
        setOcupado({ tipo, texto: "Preparando imagem…" });
        blob = await comprimirImagem(arquivo);
        if (blob !== arquivo) mime = "image/jpeg";
      }
      setOcupado({ tipo, texto: "Enviando…" });
      const prep = await prepararEnvio(token, tipo, mime, blob.size);
      if (!prep.ok) throw new Error(prep.mensagem);
      const { error } = await criarClienteNavegador()
        .storage.from(BUCKET_DOCUMENTOS)
        .uploadToSignedUrl(prep.dados!.path, prep.dados!.tokenUpload, blob, { contentType: mime });
      if (error) throw new Error("Falha no envio. Verifique sua internet e tente de novo.");
      const conf = await confirmarEnvio(token, tipo, prep.dados!.path, {
        mime,
        ...(local ?? {}),
        capturadoEm: new Date().toISOString(),
      });
      if (!conf.ok) throw new Error(conf.mensagem);
      setItens((lista) => lista.map((i) => (i.tipo === tipo ? { ...i, estado: "enviado" } : i)));
    } catch (e) {
      setErro(tipo, (e as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  const defCaptura = captura ? DOCUMENTO_POR_TIPO[captura.tipo] : null;

  return (
    <div className="space-y-3">
      <div className="mb-1">
        <TituloDestaque
          inicio={correcao ? "Reenviar" : "Enviar"}
          destaque="documentos"
          subtitulo={correcao ? "Envie de novo só os itens abaixo." : "Mande os arquivos para análise."}
        />
      </div>
      <p className="pb-1 text-xs text-white/55">
        Fotos nítidas, sem cortes e com as informações legíveis. Fotos e vídeo da residência são feitos na hora, em frente
        ao imóvel, com a localização do celular ligada.
      </p>

      {itens.map((item) => {
        const def = DOCUMENTO_POR_TIPO[item.tipo];
        const Icone = ICONE_DOCUMENTO[item.tipo];
        const carregando = ocupado?.tipo === item.tipo;
        const bloqueado = !!ocupado || finalizando;
        const instrucao =
          item.tipo === "comprovante_renda" && tipoRenda ? TIPO_RENDA_POR_VALOR[tipoRenda].comprovante : def.instrucao;
        return (
          <section
            key={item.tipo}
            className={`${cartao} p-3.5 ${item.estado === "enviado" ? "border-emerald-400/30" : item.estado === "recusado" ? "border-red-400/40" : ""}`}
          >
            <div className="flex items-start gap-3">
              <CirculoIcone icone={Icone} tamanho="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold leading-snug">{def.titulo}</h2>
                  <Selo estado={item.estado} carregando={carregando} />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-white/55">{instrucao}</p>
                {def.gps && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#f1d58a]">
                    <MapPin className="size-3" /> Feito na hora, com a localização ligada
                  </p>
                )}
              </div>
            </div>

            {item.estado === "recusado" && item.motivo && (
              <p className="mt-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-200">Motivo: {item.motivo}</p>
            )}
            {erros[item.tipo] && (
              <div className="mt-2">
                <MensagemErro texto={erros[item.tipo]!} />
              </div>
            )}
            {carregando && <p className="mt-2 text-xs text-white/60">{ocupado.texto}</p>}

            <div className="mt-3 flex gap-2">
              {def.modo === "arquivo" ? (
                <>
                  <BotaoArquivo
                    icone={Camera}
                    rotulo="Foto"
                    accept="image/*"
                    capture="environment"
                    disabled={bloqueado}
                    onArquivo={(f) => enviar(item.tipo, f, f.type || "image/jpeg", null)}
                  />
                  <BotaoArquivo
                    icone={Images}
                    rotulo="Galeria"
                    accept="image/*"
                    disabled={bloqueado}
                    onArquivo={(f) => enviar(item.tipo, f, f.type || "image/jpeg", null)}
                  />
                  <BotaoArquivo
                    icone={FileText}
                    rotulo="PDF"
                    accept="application/pdf"
                    disabled={bloqueado}
                    onArquivo={(f) => enviar(item.tipo, f, "application/pdf", null)}
                  />
                </>
              ) : (
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => abrir(item.tipo)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/20 px-5 py-2.5 text-sm font-medium transition hover:border-[#d9b45a]/50 disabled:opacity-40"
                >
                  {def.modo === "video" ? <Video className="size-4" /> : <Camera className="size-4" />}
                  {def.modo === "video" ? "Gravar vídeo" : item.estado === "enviado" ? "Tirar outra" : "Foto"}
                </button>
              )}
            </div>
          </section>
        );
      })}

      {erroFinal && <MensagemErro texto={erroFinal} />}
      <div className="pt-2">
        <BotaoDourado
          tipo="button"
          disabled={faltam > 0 || finalizando || !!ocupado}
          onClick={async () => {
            setErroFinal(null);
            setFinalizando(true);
            const r = await enviarParaAnalise(token);
            setFinalizando(false);
            if (r.ok) {
              window.scrollTo({ top: 0 });
              onConcluir();
            } else setErroFinal(r.mensagem);
          }}
        >
          {finalizando ? (
            <>
              <Loader2 className="size-5 animate-spin" /> Enviando…
            </>
          ) : faltam > 0 ? (
            `Faltam ${faltam} ${faltam === 1 ? "item" : "itens"}`
          ) : (
            <>
              Enviar para análise <ArrowRight className="size-5" />
            </>
          )}
        </BotaoDourado>
      </div>

      {captura && defCaptura && defCaptura.modo === "video" && (
        <CameraVideo
          titulo={defCaptura.titulo}
          onCancelar={() => setCaptura(null)}
          onCapturar={(blob, mime) => enviar(captura.tipo, blob, mime, captura.local)}
        />
      )}
      {captura && defCaptura && (defCaptura.modo === "foto" || defCaptura.modo === "selfie") && (
        <CameraFoto
          titulo={defCaptura.titulo}
          frontal={defCaptura.modo === "selfie"}
          onCancelar={() => setCaptura(null)}
          onCapturar={(blob) => enviar(captura.tipo, blob, "image/jpeg", captura.local)}
        />
      )}
    </div>
  );
}
