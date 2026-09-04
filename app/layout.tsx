import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cãopanhia Baltazar | Ajude a salvar vidas",
  description: "Faça uma doação para ajudar cães e gatos com alimentação, tratamentos veterinários, resgate e acolhimento.",
  openGraph: {
    title: "Cãopanhia Baltazar",
    description: "Ajude a salvar vidas.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cãopanhia Baltazar",
    description: "Ajude a salvar vidas.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.jpg", shortcut: "/favicon.jpg", apple: "/favicon.jpg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
