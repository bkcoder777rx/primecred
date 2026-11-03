import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROTAS_RESERVADAS } from "@/lib/rotas";

// Rotas que não exigem login: páginas de divulgação, login, link do cliente e rotina diária.
const PUBLICAS_EXATAS = ["/", "/login", "/obrigado"];
const PUBLICAS_PREFIXO = ["/s/", "/api/cron/"];
// Qualquer "/<algo>" que não seja uma rota do sistema é a página de uma empresa.
function ehPaginaDeEmpresa(caminho: string) {
  const m = caminho.match(/^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
  return !!m && !ROTAS_RESERVADAS.has(m[1]);
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(lista, headers) {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const caminho = request.nextUrl.pathname;
  const publica =
    PUBLICAS_EXATAS.includes(caminho) || PUBLICAS_PREFIXO.some((p) => caminho.startsWith(p)) || ehPaginaDeEmpresa(caminho);

  if (!data?.claims && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
