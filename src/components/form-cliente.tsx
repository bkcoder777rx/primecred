"use client";

import { useState } from "react";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { Campo, CampoTexto } from "@/components/ui";
import type { Resultado } from "@/lib/acao";
import { formatarCpf, formatarTelefone, somenteDigitos } from "@/lib/formato";
import type { Cliente, Referencia } from "@/lib/tipos";

type Endereco = { logradouro: string; bairro: string; cidade: string; uf: string };

/** Busca rua/bairro/cidade pelo CEP (ViaCEP). */
export async function buscarCep(cep: string): Promise<Endereco | null> {
  const d = somenteDigitos(cep);
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    const j = await r.json();
    if (j.erro) return null;
    return { logradouro: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: j.localidade ?? "", uf: j.uf ?? "" };
  } catch {
    return null;
  }
}

export function mascaraCpf(v: string) {
  const d = somenteDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function mascaraTelefone(v: string) {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCep(v: string) {
  const d = somenteDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function FormCliente({
  acao,
  cliente,
  referencias = [],
}: {
  acao: (anterior: Resultado, fd: FormData) => Promise<Resultado>;
  cliente?: Cliente;
  referencias?: Referencia[];
}) {
  const [cpf, setCpf] = useState(formatarCpf(cliente?.cpf ?? "") === "—" ? "" : formatarCpf(cliente?.cpf ?? ""));
  const [telefone, setTelefone] = useState(cliente?.telefone ? formatarTelefone(cliente.telefone) : "");
  const [cep, setCep] = useState(mascaraCep(cliente?.cep ?? ""));
  const [end, setEnd] = useState<Endereco>({
    logradouro: cliente?.logradouro ?? "",
    bairro: cliente?.bairro ?? "",
    cidade: cliente?.cidade ?? "",
    uf: cliente?.uf ?? "",
  });
  const refs = [...referencias, ...Array(Math.max(0, 2 - referencias.length)).fill(null)] as (Referencia | null)[];

  return (
    <Formulario acao={acao} className="space-y-5">
      <section className="cartao grid gap-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Dados pessoais</h2>
        <Campo rotulo="Nome completo" name="nome" required defaultValue={cliente?.nome} className="sm:col-span-2" />
        <Campo
          rotulo="CPF"
          name="cpf"
          inputMode="numeric"
          value={cpf}
          onChange={(e) => setCpf(mascaraCpf(e.target.value))}
          placeholder="000.000.000-00"
        />
        <Campo
          rotulo="Telefone / WhatsApp"
          name="telefone"
          inputMode="tel"
          value={telefone}
          onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
          placeholder="(00) 00000-0000"
        />
        <Campo
          rotulo="Renda mensal (R$)"
          name="renda"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={cliente?.renda_centavos != null ? (cliente.renda_centavos / 100).toFixed(2).replace(".", ",") : ""}
        />
      </section>

      <section className="cartao grid gap-4 sm:grid-cols-6">
        <h2 className="font-semibold sm:col-span-6">Endereço</h2>
        <Campo
          rotulo="CEP"
          name="cep"
          inputMode="numeric"
          value={cep}
          className="sm:col-span-2"
          onChange={async (e) => {
            const v = mascaraCep(e.target.value);
            setCep(v);
            if (somenteDigitos(v).length === 8) {
              const r = await buscarCep(v);
              if (r) setEnd(r);
            }
          }}
          placeholder="00000-000"
        />
        <Campo
          rotulo="Rua"
          name="logradouro"
          value={end.logradouro}
          onChange={(e) => setEnd({ ...end, logradouro: e.target.value })}
          className="sm:col-span-4"
        />
        <Campo rotulo="Número" name="numero" defaultValue={cliente?.numero ?? ""} className="sm:col-span-2" />
        <Campo rotulo="Complemento" name="complemento" defaultValue={cliente?.complemento ?? ""} className="sm:col-span-4" />
        <Campo
          rotulo="Bairro"
          name="bairro"
          value={end.bairro}
          onChange={(e) => setEnd({ ...end, bairro: e.target.value })}
          className="sm:col-span-2"
        />
        <Campo
          rotulo="Cidade"
          name="cidade"
          value={end.cidade}
          onChange={(e) => setEnd({ ...end, cidade: e.target.value })}
          className="sm:col-span-3"
        />
        <Campo
          rotulo="UF"
          name="uf"
          maxLength={2}
          value={end.uf}
          onChange={(e) => setEnd({ ...end, uf: e.target.value.toUpperCase() })}
          className="sm:col-span-1"
        />
      </section>

      <section className="cartao space-y-4">
        <h2 className="font-semibold">Referências</h2>
        {refs.map((r, i) => (
          <div key={r?.id ?? i} className="grid gap-3 sm:grid-cols-3">
            <Campo rotulo={`Nome da referência ${i + 1}`} name="ref_nome" defaultValue={r?.nome ?? ""} />
            <Campo
              rotulo="Telefone"
              name="ref_telefone"
              inputMode="tel"
              defaultValue={r ? formatarTelefone(r.telefone) : ""}
            />
            <Campo rotulo="Relação (mãe, amigo…)" name="ref_relacao" defaultValue={r?.relacao ?? ""} />
          </div>
        ))}
      </section>

      <section className="cartao">
        <CampoTexto rotulo="Observações" name="observacoes" defaultValue={cliente?.observacoes ?? ""} />
      </section>

      <div className="flex justify-end">
        <BotaoEnviar>{cliente ? "Salvar alterações" : "Cadastrar cliente"}</BotaoEnviar>
      </div>
    </Formulario>
  );
}
