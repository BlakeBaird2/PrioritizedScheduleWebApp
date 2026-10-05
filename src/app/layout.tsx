import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prio — Prioritized Schedule",
  description: "Your classes, work and life on one calendar, and a plan for exactly what to work on in every free gap.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Applies the saved theme before first paint so there is no flash.
const themeScript = `(function(){try{var t=localStorage.getItem('prio:theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}})();`;

// The home page is for newcomers. Opening it in a browser that already has calendars
// goes straight to the plan before anything is drawn, and a setup link made before
// the app moved to /app still lands there. Only full page loads of "/" run this, so a
// link to the home page from inside the app still shows it.
const homeScript = `(function(){try{if(location.pathname!=='/')return;var h=location.hash;if(h.indexOf('#setup=')===0){location.replace('/app'+h);return}var w=JSON.parse(localStorage.getItem('prio:ws')||'null');if(w&&w.feeds&&w.feeds.length)location.replace('/app')}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: homeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
