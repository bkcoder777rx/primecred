import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prime Cred",
    short_name: "Prime Cred",
    description: "Controle de empréstimos e documentação de clientes",
    start_url: "/painel",
    display: "standalone",
    background_color: "#07180f",
    theme_color: "#05110c",
    lang: "pt-BR",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
