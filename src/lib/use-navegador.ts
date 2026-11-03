import { useSyncExternalStore } from "react";

const semAssinatura = () => () => {};

/** Lê um valor do navegador (ex.: userAgent) com valor fixo na renderização do servidor, sem erro de hidratação. */
export function useNavegador<T>(ler: () => T, noServidor: T): T {
  return useSyncExternalStore(semAssinatura, ler, () => noServidor);
}
