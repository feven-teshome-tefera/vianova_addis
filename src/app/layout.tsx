import type { Metadata } from "next"; import "./globals.css";
import { CartProvider } from "@/components/storefront/cart";
export const metadata:Metadata={title:{default:"Via Nova Addis",template:"%s | Via Nova Addis"},description:"Authentic Italian-inspired products, thoughtfully selected."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><CartProvider>{children}</CartProvider></body></html>}
