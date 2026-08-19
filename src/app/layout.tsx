import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PrefsProvider } from "@/lib/i18n/provider";
import { PortalProvider } from "@/lib/data/store";

export const metadata: Metadata = {
  title: "ONE SPACE · Enterprise Portal",
  description:
    "A single, permission-aware entry point to every ERP system your company runs.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#080c16" },
  ],
};

const noFlash = `
(function(){
  try {
    var t = localStorage.getItem('nexus.theme');
    var l = localStorage.getItem('nexus.lang') || 'th';
    if (t === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.lang = l;
    document.documentElement.style.colorScheme = t === 'dark' ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body className="antialiased">
        <PrefsProvider>
          <PortalProvider>{children}</PortalProvider>
        </PrefsProvider>
      </body>
    </html>
  );
}
