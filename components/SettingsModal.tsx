// components/SettingsModal.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/supabase';

const API_KEY_STORAGE = 'gemini_api_key_scriptmate';

interface Props {
  profile: Profile | null;
  onClose: () => void;
  onUpdated: () => void;
}

export default function SettingsModal({ profile, onClose, onUpdated }: Props) {
  const [username, setUsername] = useState(profile?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem(API_KEY_STORAGE) || ''; } catch { return ''; }
  });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      // Update username
      if (username !== profile?.username) {
        const { error } = await supabase.from('profiles').update({ username, updated_at: new Date().toISOString() }).eq('id', profile?.id);
        if (error) throw error;
      }
      // Update password
      if (newPassword.length >= 8) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      } else if (newPassword.length > 0) {
        throw new Error('Password minimal 8 karakter');
      }
      // Save API key to localStorage (free user)
      if (profile?.role === 'free') {
        try {
          if (apiKey.trim()) localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
          else localStorage.removeItem(API_KEY_STORAGE);
        } catch {}
      }
      setMessage('✅ Pengaturan berhasil disimpan!');
      onUpdated();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-purple-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-yellow-400">⚙️ Pengaturan Akun</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        {error && <div className="bg-red-900/40 border border-red-600 rounded-lg px-4 py-2 mb-4 text-sm text-red-300">{error}</div>}
        {message && <div className="bg-green-900/40 border border-green-600 rounded-lg px-4 py-2 mb-4 text-sm text-green-300">{message}</div>}

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Password Baru (kosongkan jika tidak ingin ubah)</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 karakter"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          {/* API Key (only for free users) */}
          {profile?.role === 'free' && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">
                🔑 Gemini API Key <span className="text-yellow-500">(Free Plan — tersimpan di browser)</span>
              </label>
              <div className="relative">
                <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder="Masukkan API Key Gemini kamu"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 pr-10 text-sm text-zinc-200 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <button onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs">
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-xs text-zinc-600 mt-1">
                Dapatkan gratis di{' '}
                <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline">
                  aistudio.google.com/api-keys
                </a>
              </p>
            </div>
          )}

          {profile?.role === 'pro' && (
            <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3">
              <p className="text-xs text-purple-300">⚡ Kamu menggunakan API key server (Pro Plan). Tidak perlu input API key sendiri.</p>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={loading}
          className="mt-6 w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-yellow-400 hover:to-purple-500 transition disabled:opacity-50">
          {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
}
