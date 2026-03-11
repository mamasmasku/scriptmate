// components/UserMenu.tsx
import { useState } from 'react';
import { Profile, UserCredits } from '../lib/supabase';

interface Props {
  profile: Profile | null;
  credits: UserCredits | null;
  onBuyCredits: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}

export default function UserMenu({ profile, credits, onBuyCredits, onSettings, onSignOut }: Props) {
  const [open, setOpen] = useState(false);

  const roleLabel = profile?.role === 'admin' ? '👑 Admin' : profile?.role === 'pro' ? '⚡ Pro' : '🆓 Free';
  const roleColor = profile?.role === 'admin' ? 'text-yellow-300' : profile?.role === 'pro' ? 'text-purple-300' : 'text-zinc-400';

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 bg-gray-800/70 border border-gray-700 rounded-lg px-3 py-2 hover:border-purple-500 transition">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
          {profile?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-zinc-200 leading-tight">{profile?.username || 'User'}</p>
          <p className={`text-xs leading-tight ${roleColor}`}>{roleLabel}</p>
        </div>
        {(profile?.role === 'pro' || profile?.role === 'admin') && (
          <div className="flex items-center gap-1 ml-1 bg-purple-900/50 border border-purple-700 rounded-md px-2 py-0.5">
            <span className="text-xs text-yellow-400 font-bold">{credits?.balance ?? 0}</span>
            <span className="text-xs text-zinc-500">kredit</span>
          </div>
        )}
        <span className="text-zinc-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-40">
          <div className="p-4 border-b border-gray-800">
            <p className="text-sm font-semibold text-white">{profile?.username}</p>
            <p className={`text-xs mt-0.5 ${roleColor}`}>{roleLabel}</p>
            {(profile?.role === 'pro' || profile?.role === 'admin') && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Saldo kredit</span>
                <span className="text-sm font-bold text-yellow-400">{credits?.balance ?? 0} kredit</span>
              </div>
            )}
          </div>

          <div className="p-2">
            {profile?.role === 'free' && (
              <div className="mb-2 p-2 bg-yellow-900/20 border border-yellow-700/40 rounded-lg">
                <p className="text-xs text-yellow-400 font-semibold">⚡ Upgrade ke Pro</p>
                <p className="text-xs text-zinc-500 mt-0.5">Akses semua mode & gunakan API key kami</p>
                <button onClick={() => { onBuyCredits(); setOpen(false); }}
                  className="mt-2 w-full bg-yellow-500 text-gray-900 text-xs font-bold py-1.5 rounded-lg hover:bg-yellow-400 transition">
                  Beli Kredit
                </button>
              </div>
            )}

            {(profile?.role === 'pro' || profile?.role === 'admin') && (
              <button onClick={() => { onBuyCredits(); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-gray-800 rounded-lg transition flex items-center gap-2">
                💎 Beli Kredit
              </button>
            )}

            <button onClick={() => { onSettings(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-gray-800 rounded-lg transition flex items-center gap-2">
              ⚙️ Pengaturan Akun
            </button>

            {profile?.role === 'admin' && (
              <a href="/admin"
                className="block px-3 py-2 text-sm text-yellow-400 hover:bg-gray-800 rounded-lg transition">
                👑 Admin Panel
              </a>
            )}

            <hr className="border-gray-800 my-1" />

            <button onClick={onSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg transition flex items-center gap-2">
              🚪 Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
