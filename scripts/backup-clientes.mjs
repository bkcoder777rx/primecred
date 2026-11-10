// Backup dos clientes no PC: cria/atualiza a pasta "Clientes" ao lado da pasta do código.
//
//   Clientes\<Empresa>\<Nome - CPF>\Dados de <Nome>.txt
//   Clientes\<Empresa>\<Nome - CPF>\Documentos de <Nome>\<arquivos enviados>
//
// Uso: npm run backup-clientes   (lê as chaves do .env.local)
// Só LÊ o Supabase. Nunca apaga nada na pasta Clientes: se um cliente for excluído
// do sistema, a pasta dele continua aqui.
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env.local primeiro.");
  process.exit(1);
}

// <pasta do código>\scripts\ -> <Prime cred - RK>\Clientes (fora do repositório git)
const RAIZ = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..", "..", "Clientes"));
const BUCKET = "documentos";
const supabase = createClient(url, chave, { auth: { persistSession: false } });

async function todos(tabela) {
  const linhas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select("*").order("criado_em").range(de, de + 999);
    if (error) throw new Error(`Erro ao ler ${tabela}: ${error.message}`);
    linhas.push(...data);
    if (data.length < 1000) return linhas;
  }
}

const porChave = (linhas, chaveFn) => {
  const m = new Map();
  for (const l of linhas) {
    const k = chaveFn(l);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(l);
  }
  return m;
};

// Nome seguro para pasta/arquivo no Windows.
const limpo = (s) =>
  String(s ?? "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 80) || "Sem nome";

const cpfFmt = (c) => (c && c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c);
const reais = (c) =>
  c == null ? "" : (Number(c) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataHora = (d) => (d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");
const dataSo = (d) => (d ? d.split("-").reverse().join("/") : "");
const dataArquivo = (d) => new Date(d).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

const TITULO_DOC = {
  rg_segurando: "Foto segurando o RG",
  rg_frente: "RG frente",
  rg_verso: "RG verso",
  comprovante_residencia: "Comprovante de residência",
  foto_residencia: "Foto da residência",
  video_residencia: "Vídeo da residência",
  selfie_residencia: "Selfie na residência",
  comprovante_renda: "Comprovante de renda",
};
const EXT = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
  "application/pdf": "pdf", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};

function linha(rotulo, valor) {
  return valor === null || valor === undefined || valor === "" ? null : `${rotulo}: ${valor}`;
}
const bloco = (titulo, linhas) => [``, `===== ${titulo} =====`, ...linhas.filter(Boolean)];

function textoCliente(nome, cliente, empresa, refs, pedidos, docsPorPedido, emprestimos, pagsPorEmp) {
  const out = [`DADOS DE ${nome.toUpperCase()}`, `Empresa: ${empresa?.nome ?? "?"}`, `Atualizado em: ${dataHora(new Date())}`];
  if (cliente) {
    const end = [cliente.logradouro, cliente.numero, cliente.complemento, cliente.bairro].filter(Boolean).join(", ");
    out.push(
      ...bloco("CADASTRO", [
        linha("Nome", cliente.nome),
        linha("CPF", cpfFmt(cliente.cpf)),
        linha("Telefone", cliente.telefone),
        linha("Endereço", end),
        linha("Cidade", [cliente.cidade, cliente.uf].filter(Boolean).join(" - ")),
        linha("CEP", cliente.cep),
        linha("Renda", reais(cliente.renda_centavos)),
        linha("Bloqueado", cliente.bloqueado ? "SIM" : "não"),
        linha("Observações", cliente.observacoes),
        linha("Cadastrado em", dataHora(cliente.criado_em)),
      ]),
    );
  }
  if (refs.length) {
    out.push(...bloco("REFERÊNCIAS", refs.map((r) => `- ${r.nome} | ${r.telefone}${r.relacao ? ` | ${r.relacao}` : ""}`)));
  }
  for (const p of pedidos) {
    const docs = docsPorPedido.get(p.id) ?? [];
    out.push(
      ...bloco(`PEDIDO DE ${dataHora(p.criado_em)}`, [
        linha("Situação", p.status),
        linha("Nome informado", p.nome_indicado),
        linha("Telefone informado", p.telefone_indicado),
        linha("Valor desejado", reais(p.valor_desejado_centavos)),
        linha("Forma de pagamento", p.forma_pagamento),
        linha("Cidade", p.cidade),
        linha("Renda", reais(p.renda_centavos)),
        linha("Tipo de renda", p.tipo_renda),
        linha("Instagram", p.instagram),
        linha("Como conheceu", [p.origem, p.origem_detalhe].filter(Boolean).join(" - ")),
        linha("Dados enviados em", dataHora(p.dados_enviados_em)),
        linha("Enviado para análise em", dataHora(p.enviada_em)),
        linha("Analisado em", dataHora(p.analisada_em)),
        linha("Observação da análise", p.observacao_admin),
        docs.length ? "Documentos:" : null,
        ...docs.map(
          (d) =>
            `  - ${TITULO_DOC[d.tipo] ?? d.tipo} (${d.status}${d.ativo ? "" : ", substituído"})` +
            (d.motivo_recusa ? ` motivo: ${d.motivo_recusa}` : "") +
            (d.latitude != null ? ` GPS: ${d.latitude}, ${d.longitude}` : "") +
            ` enviado em ${dataHora(d.criado_em)}`,
        ),
      ]),
    );
  }
  for (const e of emprestimos) {
    const pags = pagsPorEmp.get(e.id) ?? [];
    out.push(
      ...bloco(`EMPRÉSTIMO Nº ${e.numero}`, [
        linha("Situação", e.status),
        linha("Valor emprestado", reais(e.principal_inicial_centavos)),
        linha("Saldo atual", reais(e.principal_centavos)),
        linha("Taxa", `${e.taxa_percent}%`),
        linha("Prazo", `${e.prazo_dias} dias`),
        linha("Diária", reais(e.diaria_centavos)),
        linha("Início", dataSo(e.data_inicio)),
        linha("Vencimento", dataSo(e.vencimento)),
        linha("Quitado em", dataSo(e.quitado_em)),
        linha("Observações", e.observacoes),
        pags.length ? "Pagamentos:" : null,
        ...pags.map(
          (g) =>
            `  - Nº ${g.numero} ${dataSo(g.data)} ${reais(g.valor_centavos)} (${g.tipo}, ${g.forma})` +
            (g.estornado ? ` ESTORNADO: ${g.motivo_estorno ?? ""}` : "") +
            (g.observacao ? ` obs: ${g.observacao}` : ""),
        ),
      ]),
    );
  }
  return out.join("\r\n") + "\r\n";
}

const [empresas, clientes, referencias, solicitacoes, documentos, emprestimos, pagamentos] = await Promise.all(
  ["empresas", "clientes", "referencias", "solicitacoes", "documentos", "emprestimos", "pagamentos"].map(todos),
);
const empresaPorId = new Map(empresas.map((e) => [e.id, e]));
const refsPorCli = porChave(referencias, (r) => r.cliente_id);
const pedidosPorCli = porChave(solicitacoes, (s) => s.cliente_id ?? `pedido:${s.id}`);
const docsPorPedido = porChave(documentos, (d) => d.solicitacao_id);
const empsPorCli = porChave(emprestimos, (e) => e.cliente_id);
const pagsPorEmp = porChave(pagamentos, (p) => p.emprestimo_id);

// Uma "pessoa" = um cliente cadastrado, ou um pedido do site que ainda não virou cliente.
const pessoas = clientes.map((c) => ({ chave: c.id, cliente: c, empresaId: c.empresa_id, nome: c.nome, cpf: c.cpf }));
for (const s of solicitacoes) {
  if (s.cliente_id) continue;
  const temAlgo = s.nome_indicado || (docsPorPedido.get(s.id) ?? []).length || s.dados_enviados_em;
  if (!temAlgo) continue; // link gerado e nunca usado
  pessoas.push({
    chave: `pedido:${s.id}`,
    cliente: null,
    empresaId: s.empresa_id,
    nome: s.nome_indicado || "Sem nome",
    sufixo: `pedido ${dataArquivo(s.criado_em)} ${s.id.slice(0, 6)}`,
  });
}

let novosArquivos = 0;
let falhas = 0;
for (const p of pessoas) {
  const empresa = empresaPorId.get(p.empresaId);
  const nome = limpo(p.nome);
  const pasta = join(RAIZ, limpo(empresa?.nome ?? "Sem empresa"), limpo(`${nome} - ${p.cpf ? cpfFmt(p.cpf) : p.sufixo ?? p.chave.slice(0, 8)}`));
  const pastaDocs = join(pasta, `Documentos de ${nome}`);
  await mkdir(pastaDocs, { recursive: true });

  const pedidos = pedidosPorCli.get(p.chave) ?? [];
  const emps = empsPorCli.get(p.chave) ?? [];
  await writeFile(
    join(pasta, `Dados de ${nome}.txt`),
    "﻿" + textoCliente(p.nome, p.cliente, empresa, refsPorCli.get(p.chave) ?? [], pedidos, docsPorPedido, emps, pagsPorEmp),
    "utf8",
  );

  for (const pedido of pedidos) {
    for (const d of docsPorPedido.get(pedido.id) ?? []) {
      const ext = EXT[d.mime] ?? d.path.split(".").pop() ?? "bin";
      const extra = d.ativo ? "" : " (substituído)";
      const arquivo = join(pastaDocs, limpo(`${TITULO_DOC[d.tipo] ?? d.tipo} ${dataArquivo(d.criado_em)} ${d.id.slice(0, 6)}${extra}`) + `.${ext}`);
      if (existsSync(arquivo)) continue; // já baixado antes
      const { data, error } = await supabase.storage.from(BUCKET).download(d.path);
      if (error) {
        console.error(`Falha ao baixar ${d.path}: ${error.message}`);
        falhas++;
        continue;
      }
      await writeFile(arquivo, Buffer.from(await data.arrayBuffer()));
      novosArquivos++;
    }
  }
}

const resumo = `${dataHora(new Date())} | ${pessoas.length} cliente(s) | ${novosArquivos} documento(s) novo(s) | ${falhas} falha(s)`;
await mkdir(RAIZ, { recursive: true });
await writeFile(join(RAIZ, "ultimo-backup.txt"), "﻿" + resumo + "\r\n", "utf8");
console.log(`Pasta: ${RAIZ}`);
console.log(resumo);
if (falhas > 0) process.exit(1);
