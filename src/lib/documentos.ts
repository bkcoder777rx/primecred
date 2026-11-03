import type { TipoDocumento } from "@/lib/tipos";

export const BUCKET_DOCUMENTOS = "documentos";

/** Como o item é capturado no formulário do cliente. */
export type ModoCaptura = "selfie" | "foto" | "video" | "arquivo";

export type DefinicaoDocumento = {
  tipo: TipoDocumento;
  titulo: string;
  instrucao: string;
  modo: ModoCaptura;
  /** Exige localização GPS no momento da captura. */
  gps: boolean;
};

// Ordem = ordem em que aparecem para o cliente.
export const DOCUMENTOS: DefinicaoDocumento[] = [
  {
    tipo: "rg_segurando",
    titulo: "Foto segurando o RG",
    instrucao: "Tire uma selfie segurando o RG ao lado do rosto. O documento precisa estar visível e legível.",
    modo: "selfie",
    gps: false,
  },
  {
    tipo: "rg_frente",
    titulo: "RG — frente",
    instrucao: "Foto nítida da frente do RG, sem cortes e sem reflexo.",
    modo: "arquivo",
    gps: false,
  },
  {
    tipo: "rg_verso",
    titulo: "RG — verso",
    instrucao: "Foto nítida do verso do RG, sem cortes e sem reflexo.",
    modo: "arquivo",
    gps: false,
  },
  {
    tipo: "comprovante_residencia",
    titulo: "Comprovante de residência",
    instrucao: "Conta de luz, água, gás ou internet dos últimos 3 meses. Pode ser foto ou PDF.",
    modo: "arquivo",
    gps: false,
  },
  {
    tipo: "foto_residencia",
    titulo: "Foto da residência",
    instrucao: "Esteja em frente ao imóvel e fotografe a parte externa (fachada e número, se houver).",
    modo: "foto",
    gps: true,
  },
  {
    tipo: "video_residencia",
    titulo: "Vídeo entrando na residência",
    instrucao: "Grave um vídeo curto (até 60 segundos) mostrando a fachada e você entrando no imóvel.",
    modo: "video",
    gps: true,
  },
  {
    tipo: "selfie_residencia",
    titulo: "Selfie em frente à residência",
    instrucao: "Tire uma selfie em frente ao imóvel, com a casa visível ao fundo.",
    modo: "selfie",
    gps: true,
  },
  {
    tipo: "comprovante_renda",
    titulo: "Comprovante de renda",
    instrucao: "Holerite, extrato bancário ou outro documento atualizado que comprove sua renda. Pode ser foto ou PDF.",
    modo: "arquivo",
    gps: false,
  },
];

export const DOCUMENTO_POR_TIPO = Object.fromEntries(DOCUMENTOS.map((d) => [d.tipo, d])) as Record<
  TipoDocumento,
  DefinicaoDocumento
>;

export const TIPOS_DOCUMENTO = DOCUMENTOS.map((d) => d.tipo);

export const MIMES_PERMITIDOS: Record<ModoCaptura, string[]> = {
  selfie: ["image/jpeg"],
  foto: ["image/jpeg"],
  video: ["video/webm", "video/mp4", "video/quicktime"],
  arquivo: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"],
};

export const TAMANHO_MAXIMO_BYTES = 50 * 1024 * 1024;

export function extensaoDoMime(mime: string): string {
  const mapa: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "application/pdf": "pdf",
    "video/webm": "webm",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return mapa[mime] ?? "bin";
}
