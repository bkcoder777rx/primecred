"use client";

import Script from "next/script";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Registra um evento no Pixel da Meta (Lead, CompleteRegistration, Contact…), se o Pixel estiver configurado. */
export function rastrear(evento: string, dados?: Record<string, unknown>) {
  if (PIXEL && typeof window !== "undefined" && window.fbq) window.fbq("track", evento, dados);
}

/** Carrega o Pixel da Meta e registra a visita (PageView). Sem NEXT_PUBLIC_META_PIXEL_ID, não faz nada. */
export function PixelMeta({ evento }: { evento?: "CompleteRegistration" | "Lead" } = {}) {
  if (!PIXEL) return null;
  return (
    <Script id="pixel-meta" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL.replace(/\D/g, "")}');fbq('track','PageView');${evento ? `fbq('track','${evento}');` : ""}`}
    </Script>
  );
}
