// components/BuyCreditsModal.tsx
import { useState, useEffect } from 'react';
import { supabase, CreditPackage } from '../lib/supabase';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

declare global {
  interface Window { snap: any; }
}

export default function BuyCreditsModal({ onClose, onSuccess }: Props) {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('credit_packages').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setPackages(data || []));
  }, []);

  const handleBuy = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ packageId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Load Midtrans Snap
      if (typeof window.snap !== 'undefined') {
        window.snap.pay(data.token, {
          onSuccess: () => { onSuccess(); onClose(); },
          onPending: () => { onClose(); },
          onError: () => setLoading(false),
          onClose: () => setLoading(false),
        });
      }
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-purple-700 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-yellow-400">💎 Beli Kredit</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        <p className="text-xs text-zinc-500 mb-4">1 kredit = 1 segmen video yang dihasilkan. Kredit tidak expired.</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {packages.map(pkg => (
            <button key={pkg.id} onClick={() => setSelected(pkg.id)}
              className={`flex flex-col items-center p-4 rounded-xl border transition-all ${selected === pkg.id ? 'border-yellow-400 bg-yellow-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-purple-500'}`}>
              <span className="text-2xl font-bold text-white">{pkg.credits}</span>
              <span className="text-xs text-zinc-400 mb-1">kredit</span>
              <span className="text-sm font-bold text-yellow-400">{fmt(pkg.price_idr)}</span>
              <span className="text-xs text-zinc-600 mt-1">{pkg.name}</span>
              {pkg.credits >= 300 && (
                <span className="mt-2 text-xs bg-green-900/50 text-green-400 border border-green-700 px-2 py-0.5 rounded-full">
                  Hemat {Math.round((1 - (pkg.price_idr / pkg.credits) / (packages[0]?.price_idr / packages[0]?.credits)) * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg px-4 py-3 mb-5">
          <p className="text-xs text-blue-300 font-semibold mb-1">💳 Metode Pembayaran</p>
          <p className="text-xs text-zinc-400">DANA, OVO, GoPay, QRIS, Transfer Bank, Kartu Kredit/Debit, dan lainnya via Midtrans.</p>
        </div>

        <button onClick={handleBuy} disabled={!selected || loading}
          className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-yellow-400 hover:to-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? 'Memproses...' : selected ? `Bayar ${fmt(packages.find(p => p.id === selected)?.price_idr || 0)}` : 'Pilih Paket'}
        </button>
      </div>
    </div>
  );
}
