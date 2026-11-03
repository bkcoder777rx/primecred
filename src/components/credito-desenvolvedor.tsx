/** Logo BK-CODER pequena e discreta, sem competir com a marca do cliente. */
export function MarcaBkCoder() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- imagem estática pequena com transparência
    <img
      src="/marca/bk-coder.webp"
      alt="BK-CODER"
      width={220}
      height={202}
      loading="lazy"
      className="h-12 w-auto opacity-85 transition-opacity hover:opacity-100"
    />
  );
}

export function CreditoDesenvolvedor() {
  return (
    <footer className="mt-4 shrink-0 border-t border-borda/70 pt-3 text-center">
      <p className="text-[11px] leading-5 text-suave">Prime-Cred Versão 1.0.0</p>
      <p className="mt-1 flex flex-col items-center gap-1">
        <span className="text-[10px] leading-4 text-suave">Desenvolvido por</span>
        <MarcaBkCoder />
      </p>
    </footer>
  );
}
