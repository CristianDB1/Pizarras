import { Inter } from "next/font/google";
import "./globals.css";
import { TotalVentaProvider } from "@/context/TotalVentasContext";
import TotalVentasModal from "@/components/custom/modal/TotalVentaModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SorteoTrebol",
  description: "Loteria",

};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
      </head>
      <body className={inter.className}>
        <TotalVentaProvider>
        {children}
          <TotalVentasModal/>
        </TotalVentaProvider>
      </body>
    </html>
  );
}
