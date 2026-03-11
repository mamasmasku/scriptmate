// pages/auth/register.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const validateEmail = (e: string) => {
    const domain = e.split('@')[1]?.toLowerCase();
    return domain === 'gmail.com' || domain === 'yahoo.com' || domain === 'yahoo.co.id';
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(email)) {
      setError('Hanya email Gmail atau Yahoo yang diizinkan');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
    else setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-800/60 border border-green-600 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">Pendaftaran Berhasil!</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Cek email kamu di <span className="text-yellow-400">{email}</span> untuk verifikasi akun.
          </p>
          <a href="/auth/login" className="text-yellow-400 hover:text-yellow-300 text-sm font-semibold">
            → Kembali ke halaman login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-500">
            ScriptMate
          </h1>
          <p className="text-purple-300 mt-1 text-sm">Buat akun baru</p>
        </div>

        <div className="bg-gray-800/60 border border-purple-700 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Daftar Akun</h2>

          <button onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-100 transition mb-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Daftar dengan Google (Gmail)
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-700"/>
            <span className="text-zinc-500 text-xs">atau daftar dengan email</span>
            <div className="flex-1 h-px bg-gray-700"/>
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-600 rounded-lg px-4 py-2 mb-4 text-sm text-red-300">{error}</div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
                className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="username kamu" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Email <span className="text-yellow-500">(Gmail atau Yahoo)</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="email@gmail.com atau email@yahoo.com" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Password (min. 8 karakter)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Min. 8 karakter" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-yellow-400 hover:to-purple-500 transition disabled:opacity-50">
              {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/40 rounded-lg">
            <p className="text-xs text-blue-300">📌 Akun baru otomatis masuk ke <strong>Free Plan</strong>. Upgrade ke Pro untuk akses semua mode.</p>
          </div>

          <p className="text-center text-sm text-zinc-500 mt-6">
            Sudah punya akun?{' '}
            <a href="/auth/login" className="text-yellow-400 hover:text-yellow-300 font-semibold">Masuk di sini</a>
          </p>
        </div>
      </div>
    </div>
  );
}
