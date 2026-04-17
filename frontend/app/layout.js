import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { SideNavBar } from "@/components/layout/SideNavBar";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { getDashboardData } from "@/lib/mockData";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata = {
  title: "Agri-AI Lab Prototype",
  description: "Global Intelligence Overview - Technical Terroir Engine",
};

export default function RootLayout({ children }) {
  const data = getDashboardData();
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="flex h-screen overflow-hidden bg-background">
        <SideNavBar navItems={data.navigation} />
        <div className="ml-64 flex-1 flex flex-col h-screen overflow-hidden relative">
          <TopAppBar />
          {children}
        </div>
      </body>
    </html>
  );
}
