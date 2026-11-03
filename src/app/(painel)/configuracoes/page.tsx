import type { Metadata } from "next";
import { AtivarNotificacoes } from "@/components/ativar-notificacoes";
import { BotaoEnviar, Formulario } from "@/components/formulario";
import { CabecalhoPagina, Campo, CampoTexto, Cartao } from "@/components/ui";
import { carregarConfiguracoes } from "@/lib/consultas";
import { exigirAdmin } from "@/lib/supabase/server";
import { salvarConfiguracoes } from "./actions";
import { Settings } from "lucide-react";

export const metadata: Metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  const supabase = await exigirAdmin();
  const c = await carregarConfiguracoes(supabase);

  return (
    <>
      <CabecalhoPagina rotulo="Sistema" icone={Settings} titulo="Configurações" descricao="Taxas padrão, mensagens de cobrança, notificações e aplicativo." />
      <div className="grid gap-5 lg:grid-cols-3">
        <Formulario acao={salvarConfiguracoes} className="space-y-5 lg:col-span-2">
          <Cartao titulo="Empresa">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome da empresa" name="nome_empresa" defaultValue={c.nome_empresa} required />
              <Campo rotulo="Chave Pix (vai na mensagem de cobrança)" name="chave_pix" defaultValue={c.chave_pix ?? ""} />
            </div>
          </Cartao>
          <Cartao titulo="Padrões de novos empréstimos">
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo rotulo="Juros (%)" name="taxa_padrao" inputMode="decimal" defaultValue={String(c.taxa_padrao).replace(".", ",")} required />
              <Campo rotulo="Prazo (dias)" name="prazo_padrao" type="number" min={1} defaultValue={c.prazo_padrao} required />
              <Campo
                rotulo="Diária de atraso (R$)"
                name="diaria_padrao"
                inputMode="decimal"
                defaultValue={(Number(c.diaria_padrao_centavos) / 100).toFixed(2).replace(".", ",")}
                required
              />
            </div>
          </Cartao>
          <Cartao titulo="Avisos e links">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                rotulo="Avisar vencimentos com quantos dias de antecedência"
                name="dias_aviso"
                type="number"
                min={0}
                defaultValue={c.dias_aviso}
                required
              />
              <Campo
                rotulo="Validade do link do cliente (dias)"
                name="validade_link_dias"
                type="number"
                min={1}
                defaultValue={c.validade_link_dias}
                required
              />
            </div>
          </Cartao>
          <Cartao titulo="Mensagem de cobrança (WhatsApp)">
            <CampoTexto rotulo="Modelo" name="mensagem_cobranca" defaultValue={c.mensagem_cobranca} rows={6} required />
            <p className="mt-2 text-xs text-suave">
              Variáveis: {"{nome}"} {"{empresa}"} {"{vencimento}"} {"{so_juros}"} {"{quitar}"} {"{principal}"} {"{pix}"}
            </p>
          </Cartao>
          <div className="flex justify-end">
            <BotaoEnviar>Salvar configurações</BotaoEnviar>
          </div>
        </Formulario>

        <div className="space-y-5">
          <Cartao titulo="Notificações no celular">
            <div id="notificacoes" className="space-y-3">
              <p className="text-sm text-suave">
                Receba todo dia às 8h os vencimentos e atrasos, e um aviso quando um cliente enviar documentos. Ative em cada
                aparelho (celular e computador).
              </p>
              <AtivarNotificacoes />
            </div>
          </Cartao>
          <Cartao titulo="Instalar como aplicativo">
            <p className="text-sm text-suave">
              <strong>Android (Chrome):</strong> menu ⋮ → “Instalar app”.
              <br />
              <strong>iPhone (Safari):</strong> Compartilhar → “Adicionar à Tela de Início”.
              <br />
              <strong>Computador (Chrome/Edge):</strong> ícone de instalar na barra de endereço.
            </p>
          </Cartao>
        </div>
      </div>
    </>
  );
}
