// pages/admin/index.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

interface UserRow {
  id: string;
  username: string;
  role: string;
  created_at: string;
  user_credits: { balance: number; total_purchased: number; total_used: number }[];
}

export default function AdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addCreditsUser, setAddCreditsUser] = useState<UserRow | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState('');
  const [addNote, setAddNote] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState('');
  const [registerMode, setRegisterMode] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', username: '', role: 'free' });
  const [regLoading, setRegLoading] = useState(false);
  const [regMsg, setRegMsg] = useState('');

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const fetchUsers = async () => {
    const token = await getToken();
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403) { router.push('/'); return; }
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAddCredits = async () => {
    if (!addCreditsUser || !creditsToAdd) return;
    setAddLoading(true);
    const token = await getToken();
    const res = await fetch('/api/admin/add-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: addCreditsUser.id, credits: parseInt(creditsToAdd), note: addNote }),
    });
    const data = await res.json();
    if (data.success) {
      setAddMessage(`✅ Berhasil menambahkan ${creditsToAdd} kredit ke ${addCreditsUser.username}`);
      setCreditsToAdd('');
      setAddNote('');
      fetchUsers();
    }
    setAddLoading(false);
  };

  const handleChangeRole = async (userId: string, role: string) => {
    const token = await getToken();
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, role }),
    });
    fetchUsers();
  };

  const handleRegisterUser = async () => {
    setRegLoading(true);
    setRegMsg('');
    const token = await getToken();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newUser),
    });
    const data = await res.json();
    if (data.user) { setRegMsg('✅ User berhasil didaftarkan!'); setNewUser({ email: '', password: '', username: '', role: 'free' }); fetchUsers(); }
    else setRegMsg(`❌ ${data.error}`);
    setRegLoading(false);
  };

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.id.includes(search)
  );

  const roleColor = (r: string) => r === 'admin' ? 'bg-yellow-700 text-yellow-200' : r === 'pro' ? 'bg-purple-700 text-purple-200' : 'bg-gray-700 text-zinc-300';

  return (
    <div className="min-h-screen bg-gray-950 text-zinc-200 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">👑 Admin Panel</h1>
            <p className="text-zinc-500 text-sm mt-1">ScriptMate Management</p>
          </div>
          <a href="/" className="text-sm text-purple-400 hover:text-purple-300">← Kembali ke App</a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total User', value: users.length },
            { label: 'Free User', value: users.filter(u => u.role === 'free').length },
            { label: 'Pro User', value: users.filter(u => u.role === 'pro').length },
            { label: 'Total Kredit', value: users.reduce((s, u) => s + (u.user_credits?.[0]?.balance || 0), 0) },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Register User */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <button onClick={() => setRegisterMode(v => !v)}
            className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
            {registerMode ? '▲' : '▼'} ➕ Daftarkan User Baru
          </button>
          {registerMode && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} placeholder="Username"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              <input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Password"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={handleRegisterUser} disabled={regLoading}
                className="sm:col-span-2 bg-yellow-500 text-gray-900 font-bold py-2 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50">
                {regLoading ? 'Mendaftarkan...' : 'Daftarkan User'}
              </button>
              {regMsg && <p className="sm:col-span-2 text-sm text-center text-zinc-300">{regMsg}</p>}
            </div>
          )}
        </div>

        {/* Add Credits Panel */}
        {addCreditsUser && (
          <div className="bg-gray-900 border border-yellow-700 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-bold text-yellow-400 mb-4">
              💎 Tambah Kredit → <span className="text-white">{addCreditsUser.username}</span>
              <span className="ml-2 text-xs text-zinc-500">(saldo saat ini: {addCreditsUser.user_credits?.[0]?.balance || 0})</span>
            </h3>
            {addMessage && <p className="text-sm text-green-400 mb-3">{addMessage}</p>}
            <div className="flex gap-3 flex-wrap">
              <input type="number" value={creditsToAdd} onChange={e => setCreditsToAdd(e.target.value)} placeholder="Jumlah kredit"
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-zinc-200 w-32 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              <input value={addNote} onChange={e => setAddNote(e.target.value)} placeholder="Catatan (opsional)"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-yellow-500" />
              <button onClick={handleAddCredits} disabled={addLoading || !creditsToAdd}
                className="bg-yellow-500 text-gray-900 font-bold px-4 py-2 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50">
                {addLoading ? '...' : 'Tambahkan'}
              </button>
              <button onClick={() => { setAddCreditsUser(null); setAddMessage(''); }}
                className="bg-gray-700 text-zinc-300 px-4 py-2 rounded-lg hover:bg-gray-600 transition text-sm">
                Batal
              </button>
            </div>
          </div>
        )}

        {/* User List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Cari username..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-zinc-200 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <span className="text-xs text-zinc-500">{filtered.length} user</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-zinc-500 text-xs">
                    <th className="text-left px-4 py-3">Username</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-right px-4 py-3">Kredit</th>
                    <th className="text-right px-4 py-3">Dipakai</th>
                    <th className="text-left px-4 py-3">Daftar</th>
                    <th className="text-right px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-zinc-200">{u.username || '-'}</td>
                      <td className="px-4 py-3">
                        <select value={u.role} onChange={e => handleChangeRole(u.id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${roleColor(u.role)} bg-transparent`}>
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-yellow-400">{u.user_credits?.[0]?.balance ?? 0}</td>
                      <td className="px-4 py-3 text-right text-zinc-500">{u.user_credits?.[0]?.total_used ?? 0}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setAddCreditsUser(u); setAddMessage(''); }}
                          className="text-xs bg-purple-700 text-purple-200 px-3 py-1 rounded-lg hover:bg-purple-600 transition">
                          + Kredit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
