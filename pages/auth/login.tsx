// pages/auth/login.tsx
// Halaman ini dibuka di NEW TAB dari iframe Blogger.
// Setelah login, callback.tsx akan kirim postMessage ke opener lalu tutup tab.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Setelah login email berhasil, kirim postMessage ke opener & tutup tab
  const notifySuccess = () => {
    const msg = { type: 'AUTH_RESULT', success: true };
    const origin = process.env.NEXT_PUBLIC_APP_URL || '*';
    if (window.opener && !window.opener.closed) {
      try { window.opener.postMessage(msg, origin); } catch { window.opener.postMessage(msg, '*'); }
    }
    if (window.parent && window.parent !== window) {
      try { window.parent.postMessage(msg, origin); } catch { window.parent.postMessage(msg, '*'); }
    }
    setTimeout(() => {
      window.close();
      window.location.href = origin === '*' ? '/' : origin;
    }, 800);
  };

  const handleGoogleLogin = async () => {
    // Google OAuth: redirect ke callback, yang lalu kirim postMessage
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    notifySuccess();
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formatted = phone.startsWith('0') ? '+62' + phone.slice(1) : phone;
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
    if (error) setError(error.message);
    else { setOtpSent(true); setMessage('Kode OTP dikirim ke WhatsApp kamu'); }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formatted = phone.startsWith('0') ? '+62' + phone.slice(1) : phone;
    const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: 'sms' });
    if (error) { setError(error.message); setLoading(false); return; }
    notifySuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-500">ScriptMate</h1>
          <p className="text-purple-300 mt-1 text-sm">AI Generator Skrip & Prompt Video</p>
        </div>

        <div className="bg-gray-800/60 border border-purple-700 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Masuk ke Akun</h2>

          <button onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-100 transition mb-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Lanjutkan dengan Google (Gmail)
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-700"/>
            <span className="text-zinc-500 text-xs">atau</span>
            <div className="flex-1 h-px bg-gray-700"/>
          </div>

          <div className="flex gap-2 mb-5">
            <button onClick={() => { setMode('email'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === 'email' ? 'bg-purple-700 text-white' : 'bg-gray-700/50 text-zinc-400 hover:text-white'}`}>
              📧 Email
            </button>
            <button onClick={() => { setMode('phone'); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === 'phone' ? 'bg-purple-700 text-white' : 'bg-gray-700/50 text-zinc-400 hover:text-white'}`}>
              📱 WhatsApp
            </button>
          </div>

          {error && <div className="bg-red-900/40 border border-red-600 rounded-lg px-4 py-2 mb-4 text-sm text-red-300">{error}</div>}
          {message && <div className="bg-green-900/40 border border-green-600 rounded-lg px-4 py-2 mb-4 text-sm text-green-300">{message}</div>}

          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Email (Gmail / Yahoo)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="email@gmail.com" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Password kamu" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-yellow-400 hover:to-purple-500 transition disabled:opacity-50">
                {loading ? 'Masuk...' : 'Masuk'}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Nomor WhatsApp</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required disabled={otpSent}
                  className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  placeholder="08xxxxxxxxxx" />
              </div>
              {otpSent && (
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Kode OTP (6 digit)</label>
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6}
                    className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="123456" />
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-yellow-400 hover:to-purple-500 transition disabled:opacity-50">
                {loading ? '...' : otpSent ? 'Verifikasi OTP' : 'Kirim Kode OTP'}
              </button>
              {otpSent && (
                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setMessage(''); }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 text-center">
                  Ganti nomor
                </button>
              )}
            </form>
          )}

          <p className="text-center text-sm text-zinc-500 mt-6">
            Belum punya akun?{' '}
            <a href="/auth/register" className="text-yellow-400 hover:text-yellow-300 font-semibold">Daftar di sini</a>
          </p>
        </div>

        {/* Info untuk user yang buka dari iframe */}
        <p className="text-center text-xs text-zinc-600 mt-4">
          Setelah login, tab ini akan menutup otomatis dan kamu kembali ke aplikasi.
        </p>
      </div>
    </div>
  );
}
