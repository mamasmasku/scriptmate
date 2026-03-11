// pages/_app.tsx
// File wajib Next.js — global CSS + script Midtrans Snap

import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const snapUrl = isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>ScriptMate — AI Generator Skrip & Prompt Video</title>
        <meta name="description" content="AI Generator Skrip Narasi & Prompt Video Sinematik untuk konten TikTok GO & Produk Affiliate" />
      </Head>

      {/* Midtrans Snap.js — dimuat setelah halaman interaktif */}
      <Script
        src={snapUrl}
        data-client-key={midtransClientKey}
        strategy="afterInteractive"
      />

      <Component {...pageProps} />
    </>
  );
}
