"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Square, Video, X } from "lucide-react";
import { useNavegador } from "@/lib/use-navegador";

export type Localizacao = { latitude: number; longitude: number; precisao: number };

export function obterLocalizacao(): Promise<Localizacao> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Seu aparelho não permite obter a localização."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, precisao: p.coords.accuracy }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Você precisa permitir a localização. Toque no cadeado ao lado do endereço do site, libere a localização e tente de novo."
              : "Não foi possível obter sua localização. Verifique se o GPS está ligado e tente de novo.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });
}

/** Reduz fotos grandes para no máximo `max` px e JPEG, economizando dados do cliente. */
export async function comprimirImagem(arquivo: Blob, max = 2000, qualidade = 0.85): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(arquivo);
    const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", qualidade));
    return blob && blob.size < arquivo.size ? blob : arquivo;
  } catch {
    return arquivo; // formato que o navegador não decodifica (ex.: HEIC no Android): envia o original
  }
}

function useCamera(frontal: boolean, comAudio: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [negado, setNegado] = useState(false);
  const semSuporte = useNavegador(() => !navigator.mediaDevices?.getUserMedia, false);
  const erro = semSuporte ? "sem-suporte" : negado ? "negado" : null;

  useEffect(() => {
    let ativo = true;
    let atual: MediaStream | null = null;
    if (semSuporte) return;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: frontal ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: comAudio,
      })
      .then((s) => {
        if (!ativo) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        atual = s;
        setStream(s);
      })
      .catch(() => setNegado(true));
    return () => {
      ativo = false;
      atual?.getTracks().forEach((t) => t.stop());
    };
  }, [frontal, comAudio, semSuporte]);

  // Ref de callback: religa a câmera sempre que o <video> é montado de novo (ex.: "tirar outra").
  const anexar = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      if (el && stream && el.srcObject !== stream) el.srcObject = stream;
    },
    [stream],
  );

  return { videoRef, anexar, stream, erro };
}

function Tela({ titulo, onCancelar, children }: { titulo: string; onCancelar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium">{titulo}</span>
        <button onClick={onCancelar} aria-label="Fechar" className="p-1">
          <X className="size-6" />
        </button>
      </div>
      {children}
    </div>
  );
}

function AvisoCamera({ erro }: { erro: string }) {
  return (
    <p className="mx-4 rounded-lg bg-white/10 p-3 text-sm">
      {erro === "negado"
        ? "Não conseguimos acessar a câmera. Libere a permissão da câmera para este site (toque no cadeado ao lado do endereço) ou use o botão abaixo."
        : "Seu navegador não permite usar a câmera por aqui. Use o botão abaixo para abrir a câmera do aparelho."}
    </p>
  );
}

/** Foto tirada na hora pela câmera (sem galeria). */
export function CameraFoto({
  titulo,
  frontal,
  onCapturar,
  onCancelar,
}: {
  titulo: string;
  frontal: boolean;
  onCapturar: (foto: Blob) => void;
  onCancelar: () => void;
}) {
  const { videoRef, anexar, stream, erro } = useCamera(frontal, false);
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => () => {
    if (foto) URL.revokeObjectURL(foto.url);
  }, [foto]);

  function capturar() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    canvas.toBlob((b) => b && setFoto({ blob: b, url: URL.createObjectURL(b) }), "image/jpeg", 0.88);
  }

  return (
    <Tela titulo={titulo} onCancelar={onCancelar}>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob)
          <img src={foto.url} alt="Prévia" className="max-h-full max-w-full object-contain" />
        ) : erro ? (
          <AvisoCamera erro={erro} />
        ) : (
          <video
            ref={anexar}
            autoPlay
            playsInline
            muted
            className={`max-h-full max-w-full object-contain ${frontal ? "-scale-x-100" : ""}`}
          />
        )}
      </div>
      <div className="flex items-center justify-center gap-6 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {foto ? (
          <>
            <button onClick={() => setFoto(null)} className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3">
              <RefreshCw className="size-5" /> Tirar outra
            </button>
            <button onClick={() => onCapturar(foto.blob)} className="rounded-full bg-emerald-500 px-6 py-3 font-semibold">
              Usar esta foto
            </button>
          </>
        ) : erro ? (
          <label className="rounded-full bg-emerald-500 px-6 py-3 font-semibold">
            Abrir câmera
            <input
              type="file"
              accept="image/*"
              capture={frontal ? "user" : "environment"}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFoto({ blob: f, url: URL.createObjectURL(f) });
              }}
            />
          </label>
        ) : (
          <button
            onClick={capturar}
            disabled={!stream}
            aria-label="Tirar foto"
            className="grid size-18 place-items-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
          >
            <Camera className="size-7" />
          </button>
        )}
      </div>
    </Tela>
  );
}

function escolherMimeVideo(): string {
  const opcoes = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp8,opus", "video/webm"];
  return opcoes.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

/** Vídeo gravado na hora pela câmera traseira, com limite de duração. */
export function CameraVideo({
  titulo,
  maxSegundos = 60,
  onCapturar,
  onCancelar,
}: {
  titulo: string;
  maxSegundos?: number;
  onCapturar: (video: Blob, mime: string) => void;
  onCancelar: () => void;
}) {
  const { anexar, stream, erro } = useCamera(false, true);
  const gravador = useRef<MediaRecorder | null>(null);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [video, setVideo] = useState<{ blob: Blob; url: string; mime: string } | null>(null);

  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => {
      setSegundos((s) => {
        if (s + 1 >= maxSegundos) gravador.current?.stop();
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [gravando, maxSegundos]);

  useEffect(() => () => {
    if (video) URL.revokeObjectURL(video.url);
  }, [video]);

  function iniciar() {
    if (!stream) return;
    const mime = escolherMimeVideo();
    const rec = new MediaRecorder(stream, {
      ...(mime ? { mimeType: mime } : {}),
      videoBitsPerSecond: 1_500_000,
      audioBitsPerSecond: 64_000,
    });
    const partes: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && partes.push(e.data);
    rec.onstop = () => {
      setGravando(false);
      const tipo = (rec.mimeType || mime || "video/webm").split(";")[0];
      const blob = new Blob(partes, { type: tipo });
      setVideo({ blob, url: URL.createObjectURL(blob), mime: tipo });
    };
    gravador.current = rec;
    setSegundos(0);
    rec.start(1000);
    setGravando(true);
  }

  return (
    <Tela titulo={titulo} onCancelar={onCancelar}>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {video ? (
          <video src={video.url} controls playsInline className="max-h-full max-w-full" />
        ) : erro ? (
          <AvisoCamera erro={erro} />
        ) : (
          <>
            <video ref={anexar} autoPlay playsInline muted className="max-h-full max-w-full object-contain" />
            {gravando && (
              <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-3 py-1 text-sm font-semibold tabular-nums">
                ● {segundos}s / {maxSegundos}s
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-center gap-6 px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {video ? (
          <>
            <button onClick={() => setVideo(null)} className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3">
              <RefreshCw className="size-5" /> Gravar de novo
            </button>
            <button
              onClick={() => onCapturar(video.blob, video.mime)}
              className="rounded-full bg-emerald-500 px-6 py-3 font-semibold"
            >
              Usar este vídeo
            </button>
          </>
        ) : erro ? (
          <label className="rounded-full bg-emerald-500 px-6 py-3 font-semibold">
            Abrir câmera
            <input
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setVideo({ blob: f, url: URL.createObjectURL(f), mime: f.type || "video/mp4" });
              }}
            />
          </label>
        ) : gravando ? (
          <button
            onClick={() => gravador.current?.stop()}
            aria-label="Parar gravação"
            className="grid size-18 place-items-center rounded-full border-4 border-white bg-red-600"
          >
            <Square className="size-6 fill-white" />
          </button>
        ) : (
          <button
            onClick={iniciar}
            disabled={!stream}
            aria-label="Começar a gravar"
            className="grid size-18 place-items-center rounded-full border-4 border-white bg-red-600/80 disabled:opacity-40"
          >
            <Video className="size-7" />
          </button>
        )}
      </div>
    </Tela>
  );
}
