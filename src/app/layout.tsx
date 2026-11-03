import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Prime Cred", template: "%s · Prime Cred" },
  description: "Controle de empréstimos e documentação de clientes",
  appleWebApp: { capable: true, title: "Prime Cred", statusBarStyle: "black-translucent" },
  icons: { icon: "/icones/icone-192.png", apple: "/icones/icone-180.png" },
};

export const viewport: Viewport = {
  themeColor: "#05110c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
