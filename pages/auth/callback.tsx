// pages/auth/callback.tsx
// Dijalankan di NEW TAB setelah OAuth/login selesai.
// Kirim pesan ke window opener (iframe di Blogger) lalu tutup tab ini.

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const handle = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus('error');
        notifyAndClose({ type: 'AUTH_RESULT', success: false, error: error?.message });
        return;
      }

      setStatus('success');
      notifyAndClose({ type: 'AUTH_RESULT', success: true });
    };

    handle();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <div className="text-center px-6">
        {status === 'loading' && (
          <>
            <div className="flex gap-2 justify-center mb-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-purple-300">Memproses login...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <p className="text-green-400 font-semibold">Login berhasil!</p>
            <p className="text-zinc-500 text-sm mt-2">Tab ini akan menutup otomatis...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <p className="text-red-400 font-semibold">Login gagal</p>
            <p className="text-zinc-500 text-sm mt-2">Silakan tutup tab ini dan coba lagi.</p>
            <button onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-gray-700 text-zinc-300 rounded-lg text-sm hover:bg-gray-600 transition">
              Tutup Tab
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function notifyAndClose(message: object, delayMs = 1200) {
  const targetOrigin = process.env.NEXT_PUBLIC_APP_URL || '*';

  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(message, targetOrigin);
    } catch {
      window.opener.postMessage(message, '*');
    }
  }

  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage(message, targetOrigin);
    } catch {
      window.parent.postMessage(message, '*');
    }
  }

  setTimeout(() => {
    window.close();
    window.location.href = process.env.NEXT_PUBLIC_APP_URL || '/';
  }, delayMs);
}
