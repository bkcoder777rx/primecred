"use client";

import { useState } from "react";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, CampoTexto, LinhaInfo } from "@/components/ui";
import type { Resultado } from "@/lib/acao";
import { calcularJuros } from "@/lib/emprestimo/calculo";
import { adicionarDias, formatarData } from "@/lib/datas";
import { formatarMoeda, lerMoeda } from "@/lib/formato";

type OpcaoCliente = { id: string; nome: string; cpf: string | null };

export function FormEmprestimo({
  acao,
  clientes,
  clienteInicial,
  padrao,
  hoje,
}: {
  acao: (anterior: Resultado, fd: FormData) => Promise<Resultado>;
  clientes: OpcaoCliente[];
  clienteInicial?: string;
  padrao: { taxa: number; prazo: number; diariaCentavos: number };
  hoje: string;
}) {
  const [valor, setValor] = useState("");
  const [taxa, setTaxa] = useState(String(padrao.taxa).replace(".", ","));
  const [prazo, setPrazo] = useState(String(padrao.prazo));
  const [inicio, setInicio] = useState(hoje);
  const [vencimento, setVencimento] = useState(adicionarDias(hoje, padrao.prazo));
  const [vencimentoEditado, setVencimentoEditado] = useState(false);

  const principal = lerMoeda(valor) ?? 0;
  const taxaNum = Number(taxa.replace(",", ".")) || 0;
  const juros = calcularJuros(principal, taxaNum);

  function atualizarVencimento(novoInicio: string, novoPrazo: string) {
    const p = Number(novoPrazo);
    if (!vencimentoEditado && novoInicio && p > 0) setVencimento(adicionarDias(novoInicio, p));
  }

  return (
    <Formulario acao={acao} className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <section className="cartao space-y-4">
          <label className="block">
            <span className="rotulo">Cliente</span>
            <select name="cliente_id" className="campo" defaultValue={clienteInicial ?? ""} required>
              <option value="" disabled>
                Selecione…
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.cpf ? ` — ${c.cpf.slice(0, 3)}.***.***-${c.cpf.slice(9)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Valor emprestado (R$)"
              name="valor"
              inputMode="decimal"
              placeholder="1.000,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
            <Campo
              rotulo="Juros por período (%)"
              name="taxa"
              inputMode="decimal"
              value={taxa}
              onChange={(e) => setTaxa(e.target.value)}
              required
            />
            <Campo
              rotulo="Prazo (dias)"
              name="prazo"
              type="number"
              min={1}
              value={prazo}
              onChange={(e) => {
                setPrazo(e.target.value);
                atualizarVencimento(inicio, e.target.value);
              }}
              required
            />
            <Campo
              rotulo="Diária de atraso (R$)"
              name="diaria"
              inputMode="decimal"
              defaultValue={(padrao.diariaCentavos / 100).toFixed(2).replace(".", ",")}
              required
            />
            <Campo
              rotulo="Data do empréstimo"
              name="data_inicio"
              type="date"
              value={inicio}
              max={hoje}
              onChange={(e) => {
                setInicio(e.target.value);
                atualizarVencimento(e.target.value, prazo);
              }}
              required
            />
            <Campo
              rotulo="Primeiro vencimento"
              name="vencimento"
              type="date"
              value={vencimento}
              onChange={(e) => {
                setVencimento(e.target.value);
                setVencimentoEditado(true);
              }}
              ajuda="Calculado pelo prazo. Altere só para lançar empréstimos antigos que já foram renovados."
              required
            />
          </div>
          <CampoTexto rotulo="Observações" name="observacoes" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="registrar_caixa" defaultChecked className="size-4 accent-[var(--marca)]" />
            Registrar a saída do dinheiro no caixa
          </label>
        </section>
      </div>

      <aside className="cartao h-fit space-y-1 lg:sticky lg:top-8">
        <h2 className="mb-2 font-semibold">Resumo</h2>
        <LinhaInfo rotulo="Emprestado">{formatarMoeda(principal)}</LinhaInfo>
        <LinhaInfo rotulo="Juros do período">{formatarMoeda(juros)}</LinhaInfo>
        <LinhaInfo rotulo="Vencimento">{formatarData(vencimento)}</LinhaInfo>
        <LinhaInfo rotulo="Para renovar (só juros)">{formatarMoeda(juros)}</LinhaInfo>
        <LinhaInfo rotulo="Para quitar">{formatarMoeda(principal + juros)}</LinhaInfo>
        <div className="pt-3">
          <BotaoEnviar className="btn btn-primario w-full" pendente="Criando…">
            Criar empréstimo
          </BotaoEnviar>
        </div>
      </aside>
    </Formulario>
  );
}
