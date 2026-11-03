"use client";

import { useState } from "react";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, CampoSelecao, LinhaInfo } from "@/components/ui";
import type { Resultado } from "@/lib/acao";
import { aplicarPagamento, situacao, type EstadoEmprestimo } from "@/lib/emprestimo/calculo";
import { formatarData } from "@/lib/datas";
import { formatarMoeda, lerMoeda } from "@/lib/formato";
import { FORMA_PAGAMENTO, TIPO_PAGAMENTO } from "@/lib/rotulos";

const paraCampo = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

export function FormPagamento({
  acao,
  estado,
  hoje,
}: {
  acao: (anterior: Resultado, fd: FormData) => Promise<Resultado>;
  estado: EstadoEmprestimo;
  hoje: string;
}) {
  const [data, setData] = useState(hoje);
  const [valor, setValor] = useState("");
  const s = situacao(estado, data || hoje);
  const centavos = lerMoeda(valor);

  let previa: ReturnType<typeof aplicarPagamento> | null = null;
  let erro: string | null = null;
  if (centavos) {
    try {
      previa = aplicarPagamento(estado, centavos, data || hoje);
    } catch (e) {
      erro = (e as Error).message.replace(/\(\d+ centavos\)/, `(${formatarMoeda(s.quitarCentavos)})`);
    }
  }

  return (
    <Formulario acao={acao} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn flex-col gap-0 py-2" onClick={() => setValor(paraCampo(s.soJurosCentavos))}>
          <span className="text-xs text-suave">Só juros</span>
          <span className="font-semibold tabular-nums">{formatarMoeda(s.soJurosCentavos)}</span>
        </button>
        <button type="button" className="btn flex-col gap-0 py-2" onClick={() => setValor(paraCampo(s.quitarCentavos))}>
          <span className="text-xs text-suave">Quitar</span>
          <span className="font-semibold tabular-nums">{formatarMoeda(s.quitarCentavos)}</span>
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo
          rotulo="Valor recebido (R$)"
          name="valor"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          required
        />
        <Campo rotulo="Data" name="data" type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} required />
        <CampoSelecao
          rotulo="Forma"
          name="forma"
          defaultValue="pix"
          opcoes={Object.entries(FORMA_PAGAMENTO).map(([valor, rotulo]) => ({ valor, rotulo }))}
        />
        <Campo rotulo="Observação" name="observacao" />
      </div>

      {erro && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>}
      {previa && (
        <div className="rounded-lg bg-fundo p-3">
          <p className="mb-1 text-sm font-semibold">{TIPO_PAGAMENTO[previa.tipo]}</p>
          {previa.diariasCentavos > 0 && <LinhaInfo rotulo="Diárias">{formatarMoeda(previa.diariasCentavos)}</LinhaInfo>}
          <LinhaInfo rotulo="Juros">{formatarMoeda(previa.jurosCentavos)}</LinhaInfo>
          {previa.principalCentavos > 0 && (
            <LinhaInfo rotulo="Abate do principal">{formatarMoeda(previa.principalCentavos)}</LinhaInfo>
          )}
          {previa.tipo === "quitacao" ? (
            <p className="pt-2 text-sm font-medium text-marca">Empréstimo será quitado.</p>
          ) : previa.tipo === "parcial" ? (
            <p className="pt-2 text-sm text-alerta">
              Pagamento parcial: não renova. Faltará {formatarMoeda(s.soJurosCentavos - centavos!)} para renovar.
            </p>
          ) : (
            <p className="pt-2 text-sm text-suave">
              Novo vencimento {formatarData(previa.estado.vencimento)} · principal{" "}
              {formatarMoeda(previa.estado.principalCentavos)}
            </p>
          )}
        </div>
      )}

      <BotaoEnviar className="btn btn-primario w-full" pendente="Registrando…">
        Registrar pagamento
      </BotaoEnviar>
    </Formulario>
  );
}
