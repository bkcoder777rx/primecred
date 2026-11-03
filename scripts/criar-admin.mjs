// Cria o login do dono de uma empresa no Supabase.
// Uso: npm run criar-admin -- [slug-da-empresa]   (padrão: primecred; lê as chaves do .env.local)
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env.local primeiro.");
  process.exit(1);
}

const rl = createInterface({ input: stdin, output: stdout });
const email = (await rl.question("E-mail do administrador: ")).trim();
const senha = await rl.question("Senha (mínimo 8 caracteres): ");
rl.close();
if (!email || senha.length < 8) {
  console.error("E-mail ou senha inválidos.");
  process.exit(1);
}

const supabase = createClient(url, chave, { auth: { persistSession: false } });
const { data, error } = await supabase.auth.admin.createUser({ email, password: senha, email_confirm: true });
if (error) {
  console.error("Erro ao criar usuário:", error.message);
  process.exit(1);
}
const slug = process.argv[2] || "primecred";
const { data: empresa } = await supabase.from("empresas").select("id").eq("slug", slug).maybeSingle();
if (!empresa) {
  console.error(`Usuário criado, mas a empresa "${slug}" não existe.`);
  process.exit(1);
}
const { error: errMembro } = await supabase
  .from("membros")
  .insert({ empresa_id: empresa.id, user_id: data.user.id, papel: "dono", nome: email });
if (errMembro) {
  console.error("Usuário criado, mas falhou ao vincular à empresa:", errMembro.message);
  process.exit(1);
}
console.log(`Pronto! Administrador ${email} criado. Acesse o sistema e faça login.`);
