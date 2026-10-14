import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata = {
  title:"LUMI Studio — Cria bots. Amplifica possibilidades.",
  description:"Cria assistentes de IA, automatiza o teu dia e prepara conteúdo para redes sociais numa única plataforma.",
  openGraph:{title:"LUMI Studio",description:"A tua ideia. O teu bot. A tua próxima criação.",type:"website"}
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-PT"><body>{children}</body></html>;
}