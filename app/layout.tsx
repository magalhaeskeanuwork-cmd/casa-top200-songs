import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { SiteHeader } from "./site-header";
import CasaIntro from "@/components/CasaIntro";
import CasaAds from "@/components/CasaAds";

export const metadata: Metadata = {
  title: "CASA | Música Angolana",
  description:
    "Classificação Angolana de Sons e Audiências. Charts, artistas e dados da música angolana.",
  applicationName: "CASA",
  keywords: [
    "CASA",
    "Música Angolana",
    "Charts Angolanos",
    "Artistas Angolanos",
    "Singles",
    "Álbuns",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body>
        <CasaIntro />
        <ThemeProvider>
          <SiteHeader />
          {children}
          <CasaAds />
        </ThemeProvider>
      </body>
    </html>
  );
}
