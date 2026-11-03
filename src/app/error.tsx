"use client";

export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="cartao w-full max-w-md text-center">
        <h1 className="text-lg font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-suave">
          Não foi possível carregar esta página. Verifique sua conexão e tente de novo.
        </p>
        <button className="btn btn-primario mt-4" onClick={reset}>
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
