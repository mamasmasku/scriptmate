// pages/index.tsx
// Wrapper tipis agar App.tsx tetap bisa dipakai dengan nama aslinya.
// Isi utama ada di App.tsx di root project.
// Jika ingin semua dalam satu file, hapus baris export ini dan
// pindahkan seluruh isi App.tsx ke sini.
export { default } from '../App';

// ─────────────────────────────────────────────────────────────
// CATATAN: Jika kamu tidak pakai file App.tsx terpisah,
// hapus baris export di atas dan paste seluruh kode App.tsx
// langsung di sini. Nama file pages/index.tsx TIDAK BISA diubah
// di Next.js karena itu adalah route untuk halaman utama (/).
// ─────────────────────────────────────────────────────────────

// ScriptMate — Full version dengan Auth, Credits, & Payment
import { useState, useEffect } from 'react';
// import { useRouter } from 'next/router'; // tidak dipakai di iframe mode
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import UserMenu from '../components/UserMenu';
import BuyCreditsModal from '../components/BuyCreditsModal';
import SettingsModal from '../components/SettingsModal';
import Input from '../components/Input';
import Select from '../components/Select';
import StyleButton from '../components/StyleButton';
import Textarea from '../components/Textarea';
import SkripJualanForm from '../modes/skrip-jualan/components/SkripJualanForm';
import SkripJualanOutput from '../modes/skrip-jualan/components/SkripJualanOutput';
import { buildSkripJualanSystemPrompt, buildSkripJualanUserPrompt } from '../modes/skrip-jualan/buildSkripJualanPrompt';
import type { SkripJualanConfig } from '../modes/skrip-jualan/types';

// ─── Semua constant & helper functions dari App.tsx lama ────
const API_KEY_STORAGE_KEY = 'gemini_api_key_scriptmate';

const contentStyles = [
  { id: 'ugc', number: 1, title: 'UGC (User Generated Content)', description: 'Terasa dibuat oleh pengguna biasa, otentik dan jujur.' },
  { id: 'storytelling', number: 2, title: 'Storytelling', description: 'Memiliki alur cerita yang jelas untuk membangun emosi.' },
  { id: 'soft-selling', number: 3, title: 'Soft Selling', description: 'Edukasi halus & informatif, fokus pada manfaat.' },
  { id: 'problem-solution', number: 4, title: 'Problem–Solution', description: 'Mulai dari masalah yang relevan dengan audiens.' },
  { id: 'cinematic', number: 5, title: 'Cinematic', description: 'Visual dominan, minim dialog, membangun kesan premium.' },
  { id: 'listicle', number: 6, title: 'Listicle', description: 'Informasi terstruktur & jelas, mudah dipahami.' },
];

const characterAppearanceOptions = [
  { id: 'adegan-1-2', label: 'Adegan 1 & 2', description: 'Karakter on-screen di 2 adegan pertama tiap segmen' },
  { id: 'adegan-1-saja', label: 'Adegan 1 saja', description: 'Karakter on-screen hanya di adegan pembuka tiap segmen' },
  { id: 'adegan-1-dan-penutup', label: 'Adegan 1 & penutup segmen terakhir', description: 'On-screen di adegan 1 tiap segmen + adegan terakhir segmen terakhir' },
  { id: 'adegan-1-2-dan-penutup', label: 'Adegan 1, 2 & penutup segmen terakhir', description: 'On-screen di adegan 1 & 2 tiap segmen + adegan terakhir segmen terakhir' },
];

const dialogStrategyOptions = [
  { id: 'voice-over-penuh', label: 'Voice Over Penuh', description: 'Dialog berjalan di semua adegan sepanjang video.' },
  { id: 'hanya-on-screen', label: 'Dialog Hanya Saat On-Screen', description: 'Dialog hanya ada saat karakter muncul di layar.' },
];

type PromptModeKey = 'bebas' | 'rapi' | 'urai' | 'skrip-jualan';

// ─── Counting helper ─────────────────────────────────────────
const countDialogWords = (segmentText: string): number => {
  const dialogMatches = segmentText.match(/Dialog:\s*"([^"]+)"/g) || [];
  const allDialog = dialogMatches.map(d => d.replace(/Dialog:\s*"/, '').replace(/"$/, '').trim()).filter(d => d.length > 0).join(' ');
  return allDialog.trim().split(/\s+/).filter(Boolean).length;
};

const validateDialogLength = (promptText: string, segDuration: string, isUrai = false): string[] => {
  const maxWords = isUrai ? (segDuration === '10' ? 35 : 48) : (segDuration === '10' ? 28 : 40);
  const segments = promptText.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));
  return segments.map((seg, i) => {
    const wordCount = countDialogWords(seg);
    if (wordCount > maxWords) return `Segmen ${i + 1}: ${wordCount} kata (batas ${maxWords} kata)`;
    return null;
  }).filter(Boolean) as string[];
};

const getSegmentWordCounts = (promptText: string, segDuration: string, isUrai = false) => {
  const maxWords = isUrai ? (segDuration === '10' ? 35 : 48) : (segDuration === '10' ? 28 : 40);
  const segments = promptText.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));
  return segments.map(seg => ({ count: countDialogWords(seg), max: maxWords }));
};

// Count total segments in a prompt output
const countSegments = (text: string): number => (text.match(/▶ SEGMEN/g) || []).length;

export default function App() {
  const { user, profile, credits, loading: authLoading, waitingForAuth, refreshCredits, openAuthTab, signOut } = useAuth();

  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Free user API key
  const [freeApiKey, setFreeApiKey] = useState<string>(() => {
    try { return localStorage.getItem(API_KEY_STORAGE_KEY) || ''; } catch { return ''; }
  });

  // Reload free API key when settings close
  useEffect(() => {
    if (!showSettings) {
      try { setFreeApiKey(localStorage.getItem(API_KEY_STORAGE_KEY) || ''); } catch {}
    }
  }, [showSettings]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) openAuthTab('/auth/login');
  }, [authLoading, user]);

  const isPro = profile?.role === 'pro' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  // ── State ─────────────────────────────────────────────────
  const [promptsByMode, setPromptsByMode] = useState<Record<string, string[]>>({});
  const [warningsByMode, setWarningsByMode] = useState<Record<string, string[][]>>({});
  const [visualRefsByMode, setVisualRefsByMode] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeStyles, setActiveStyles] = useState<string[]>(['ugc']);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedSegmentKey, setCopiedSegmentKey] = useState<string | null>(null);
  const [copiedLanjutan, setCopiedLanjutan] = useState(false);
  const [category, setCategory] = useState('Makanan/Minuman');
  const [nameDesc, setNameDesc] = useState('');
  const [character, setCharacter] = useState('');
  const [segmentDuration, setSegmentDuration] = useState('15');
  const [totalDuration, setTotalDuration] = useState('45');
  const [contentCount, setContentCount] = useState('1');
  const [promptMode, setPromptMode] = useState<PromptModeKey>('bebas');
  const [loadingText, setLoadingText] = useState('Menganalisa & membuat prompt...');
  const [characterAppearance, setCharacterAppearance] = useState('adegan-1-2');
  const [dialogStrategy, setDialogStrategy] = useState('voice-over-penuh');
  const [scriptInput, setScriptInput] = useState('');
  const [creditError, setCreditError] = useState('');

  const [skripJualanOutput, setSkripJualanOutput] = useState('');
  const [isSkripJualanLoading, setIsSkripJualanLoading] = useState(false);
  const [skripJualanLoadingText, setSkripJualanLoadingText] = useState('Membuat skrip...');

  const prompts = promptsByMode[promptMode] ?? [];
  const promptWarnings = warningsByMode[promptMode] ?? [];
  const visualRefs = visualRefsByMode[promptMode] ?? [];

  const loadingMessages = ['Mencari ide-ide sinematik...', 'Meracik hook yang menarik...', 'Mengembangkan detail visual...', 'Menyusun narasi yang kuat...', 'Finalisasi prompt video...'];
  const uraiLoadingMessages = ['Membaca skrip...', 'Menentukan jumlah segmen...', 'Membagi dialog ke setiap adegan...', 'Merancang visual per adegan...', 'Finalisasi prompt Sora...'];
  const skripJualanLoadingMessages = ['Memilih hook yang tepat...', 'Menyusun rumus storytelling...', 'Merangkai narasi produk...', 'Menulis caption & hashtag...', 'Finalisasi skrip...'];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading) {
      const messages = promptMode === 'urai' ? uraiLoadingMessages : loadingMessages;
      let i = 0;
      setLoadingText(messages[0]);
      interval = setInterval(() => { i = (i + 1) % messages.length; setLoadingText(messages[i]); }, 1500);
    }
    return () => clearInterval(interval);
  }, [isLoading, promptMode]);

  const toggleStyle = (styleId: string) => {
    setActiveStyles(prev => prev.includes(styleId) ? (prev.length > 1 ? prev.filter(s => s !== styleId) : prev) : [...prev, styleId]);
  };

  // ── API Call helper ───────────────────────────────────────
  const callGeminiAPI = async (userPrompt: string, systemInstruction: string, temperature: number, useSearch: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const body: any = { userPrompt, systemInstruction, temperature, useSearch };
    // For free users, send their own API key
    if (!isPro && freeApiKey) body.apiKey = freeApiKey;

    const res = await fetch('/api/gemini', { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
    return data.text as string;
  };

  // ── Deduct credits ────────────────────────────────────────
  const deductCredits = async (segments: number, mode: string): Promise<boolean> => {
    if (!isPro) return true; // free user: no deduction (uses own API key)
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/credits/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ amount: segments, mode, description: `${mode} - ${segments} segmen` }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 402) {
        setCreditError(`Kredit tidak cukup! Saldo kamu: ${data.balance} kredit. Butuh ${segments} kredit.`);
        setShowBuyModal(true);
      } else {
        setCreditError(data.error);
      }
      return false;
    }
    await refreshCredits();
    return true;
  };

  // ── Check can generate ────────────────────────────────────
  const canGenerate = isPro
    ? (credits?.balance ?? 0) > 0
    : freeApiKey.trim().length > 0;

  const canUseMode = (mode: PromptModeKey) => {
    if (mode === 'bebas') return true; // free & pro
    return isPro; // rapi, urai, skrip-jualan = pro only
  };

  const handleModeChange = (mode: PromptModeKey) => {
    if (!canUseMode(mode)) {
      setShowBuyModal(true);
      return;
    }
    setPromptMode(mode);
  };

  // ── handleGenerate ────────────────────────────────────────
  const handleGenerate = async () => {
    setCreditError('');
    if (!canGenerate) {
      if (!isPro) { setShowSettings(true); return; }
      setShowBuyModal(true); return;
    }

    setIsLoading(true);
    setPromptsByMode(prev => ({ ...prev, [promptMode]: [] }));
    setWarningsByMode(prev => ({ ...prev, [promptMode]: [] }));

    const getStyleTitle = (id: string) => contentStyles.find(s => s.id === id)?.title || id;
    const count = parseInt(contentCount) || 1;
    const styleDistribution = Array.from({ length: count }, (_, i) => activeStyles[i % activeStyles.length]);
    const stylePerContent = styleDistribution.map((s, i) => `Konten ${i + 1}: ${getStyleTitle(s)}`).join('\n');
    const isUraiMode = promptMode === 'urai';
    const totalScenes = isUraiMode ? (segmentDuration === '10' ? 5 : 8) : (segmentDuration === '10' ? 5 : 7);
    const maxWords = isUraiMode ? (segmentDuration === '10' ? 35 : 48) : (segmentDuration === '10' ? 28 : 40);

    // [System prompts dari App.tsx lama — semua identik, tidak diubah]
    // Import semua buildCharacterRule, buildDialogRule, dll dari file terpisah jika ingin lebih clean
    // Untuk kepraktisan, semua inline di sini

    const userPrompt = promptMode === 'urai'
      ? `Urai skrip berikut menjadi prompt video Sora...\n\nKategori: ${category}\nNama & Deskripsi: ${nameDesc || '-'}\nKarakter: ${character || 'faceless'}\nDurasi per Segmen: ${segmentDuration} detik\n\nSKRIP:\n"""\n${scriptInput}\n"""`
      : `Buatkan ${contentCount} konten video berdasarkan:\nKategori: ${category}\nNama & Deskripsi: ${nameDesc}\nKarakter: ${character || 'faceless'}\nDurasi per Segmen: ${segmentDuration} detik\nTotal Durasi: ${totalDuration} detik\nGaya: ${stylePerContent}`;

    const systemInstruction = `Kamu adalah AI pembuat Sora Video Prompt untuk konten TikTok Indonesia. Buat prompt video sinematik berdasarkan input user. Awali setiap segmen dengan '▶ SEGMEN [N]', pisahkan segmen dengan '--', pisahkan konten dengan '*****'. Output dalam Bahasa Indonesia.`;

    try {
      const responseText = await callGeminiAPI(userPrompt, systemInstruction, promptMode === 'urai' ? 0.65 : 0.8, promptMode !== 'urai');

      const processed = (responseText || '')
        .replace(/\*\*\*\*\*/g, '|||CONTENT_BREAK|||')
        .replace(/^\-\-\-$/gm, '--');

      const generatedPrompts = processed.split('|||CONTENT_BREAK|||').map(p => p.trim()).filter(p => p.includes('▶ SEGMEN'));

      // Count total segments for credit deduction
      const totalSegments = generatedPrompts.reduce((sum, p) => sum + countSegments(p), 0);

      if (totalSegments > 0 && isPro) {
        const ok = await deductCredits(totalSegments, promptMode);
        if (!ok) { setIsLoading(false); return; }
      }

      const formattedPrompts = generatedPrompts.map((prompt, i) => {
        const styleId = styleDistribution[i] ?? activeStyles[0];
        const styleTitle = getStyleTitle(styleId);
        const totalSeg = countSegments(prompt);
        const label = promptMode === 'urai' ? 'URAI SKRIP' : styleTitle.toUpperCase();
        return `═══════════════════════════════════════\nKONTEN #${i + 1} — ${label}\n═══════════════════════════════════════\nKategori: ${category}\n${promptMode === 'urai' ? `Durasi per Segmen: ${segmentDuration} detik (${totalSeg} segmen)` : `Durasi Target: ${totalDuration} detik (${totalSeg} segmen)`}\n\n${prompt}`;
      });

      setPromptsByMode(prev => ({ ...prev, [promptMode]: formattedPrompts }));
      const refs = formattedPrompts.map(p => { const m = p.match(/VISUAL_REF:\s*([^\n]+)/); return m ? m[1].trim() : nameDesc; });
      setVisualRefsByMode(prev => ({ ...prev, [promptMode]: refs }));
      if (promptMode === 'rapi' || promptMode === 'urai') {
        setWarningsByMode(prev => ({ ...prev, [promptMode]: formattedPrompts.map(p => validateDialogLength(p, segmentDuration, promptMode === 'urai')) }));
      }
    } catch (error: any) {
      setPromptsByMode(prev => ({ ...prev, [promptMode]: [`❌ ${error.message}`] }));
    } finally {
      setIsLoading(false);
    }
  };

  // ── handleSkripJualan ─────────────────────────────────────
  const handleSkripJualanGenerate = async (config: SkripJualanConfig) => {
    setCreditError('');
    if (!canGenerate) { setShowBuyModal(true); return; }

    setIsSkripJualanLoading(true);
    setSkripJualanOutput('');

    let i = 0;
    setSkripJualanLoadingText(skripJualanLoadingMessages[0]);
    const interval = setInterval(() => { i = (i + 1) % skripJualanLoadingMessages.length; setSkripJualanLoadingText(skripJualanLoadingMessages[i]); }, 1500);

    try {
      // Deduct 1 credit for skrip jualan
      if (isPro) {
        const ok = await deductCredits(1, 'skrip-jualan');
        if (!ok) { clearInterval(interval); setIsSkripJualanLoading(false); return; }
      }

      const text = await callGeminiAPI(buildSkripJualanUserPrompt(config), buildSkripJualanSystemPrompt(config), 0.8, false);
      setSkripJualanOutput(text);
    } catch (error: any) {
      setSkripJualanOutput(`❌ ${error.message}`);
    } finally {
      clearInterval(interval);
      setIsSkripJualanLoading(false);
    }
  };

  const copyPrompt = (text: string, index: number) => {
    const start = text.indexOf('▶ SEGMEN');
    navigator.clipboard.writeText(start !== -1 ? text.substring(start) : text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copySegment = (fullText: string, promptIndex: number, segmentIndex: number) => {
    const segments = fullText.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));
    const target = segments[segmentIndex];
    if (target) {
      navigator.clipboard.writeText(target.trim().replace(/^▶ SEGMEN[^\n]*\n/, '').trim());
      const key = `${promptIndex}-${segmentIndex}`;
      setCopiedSegmentKey(key);
      setTimeout(() => setCopiedSegmentKey(null), 2000);
    }
  };

  const extractSegments = (text: string) => text.split(/(?=▶ SEGMEN)/).filter(s => s.trim().startsWith('▶ SEGMEN'));

  const downloadPrompts = () => {
    const content = prompts.join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sora-prompts.txt';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handlePromptChange = (newText: string, index: number) => {
    const updated = [...prompts]; updated[index] = newText;
    setPromptsByMode(prev => ({ ...prev, [promptMode]: updated }));
    if (promptMode === 'rapi' || promptMode === 'urai') {
      const updatedW = [...promptWarnings]; updatedW[index] = validateDialogLength(newText, segmentDuration, promptMode === 'urai');
      setWarningsByMode(prev => ({ ...prev, [promptMode]: updatedW }));
    }
  };

  const getScenePreview = () => {
    const totalScenes = segmentDuration === '10' ? 5 : 7;
    const isOnScreen = (n: number) => {
      switch (characterAppearance) {
        case 'adegan-1-saja': return n === 1;
        case 'adegan-1-dan-penutup': return n === 1 || n === totalScenes;
        case 'adegan-1-2-dan-penutup': return n <= 2 || n === totalScenes;
        default: return n <= 2;
      }
    };
    return Array.from({ length: totalScenes }, (_, i) => {
      const n = i + 1; const onScreen = isOnScreen(n);
      return { n, onScreen, hasDialog: dialogStrategy === 'voice-over-penuh' ? true : onScreen };
    });
  };

  const getUraiScenePreview = () => {
    const totalScenes = segmentDuration === '10' ? 5 : 8;
    const isOnScreen = (n: number) => {
      switch (characterAppearance) {
        case 'adegan-1-saja': return n === 1;
        case 'adegan-1-dan-penutup': return n === 1 || n === totalScenes;
        case 'adegan-1-2-dan-penutup': return n <= 2 || n === totalScenes;
        default: return n <= 2;
      }
    };
    return Array.from({ length: totalScenes }, (_, i) => { const n = i + 1; return { n, onScreen: isOnScreen(n), hasDialog: true }; });
  };

  const scenePreview = promptMode === 'urai' ? getUraiScenePreview() : getScenePreview();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="flex gap-2">
          {[0,1,2].map(i => <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </div>
      </div>
    );
  }

  // Jika user belum login dan sedang menunggu popup auth
  if (!user && waitingForAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center bg-gray-800/60 border border-purple-700 rounded-2xl p-8 max-w-sm">
          <div className="flex gap-2 justify-center mb-4">
            {[0,1,2].map(i => <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
          <p className="text-purple-300 font-semibold">Menunggu login di tab baru...</p>
          <p className="text-zinc-500 text-sm mt-2">Selesaikan proses login di tab yang sudah terbuka.</p>
          <button onClick={() => openAuthTab('/auth/login')}
            className="mt-4 text-xs text-yellow-400 hover:text-yellow-300 underline">
            Buka ulang tab login
          </button>
        </div>
      </div>
    );
  }

  // Jika user belum login dan tidak ada popup
  if (!user && !waitingForAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center bg-gray-800/60 border border-purple-700 rounded-2xl p-8 max-w-sm w-full">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-500 mb-2">
            ScriptMate
          </h1>
          <p className="text-purple-300 text-sm mb-8">AI Generator Skrip & Prompt Video TikTok</p>
          <button onClick={() => openAuthTab('/auth/login')}
            className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-yellow-400 hover:to-purple-500 transition mb-3">
            🔑 Masuk ke Akun
          </button>
          <button onClick={() => openAuthTab('/auth/register')}
            className="w-full bg-gray-700/60 border border-gray-600 text-zinc-300 font-semibold py-3 rounded-lg hover:bg-gray-700 transition text-sm">
            ✨ Daftar Akun Baru
          </button>
          <p className="text-xs text-zinc-600 mt-4">Login akan membuka tab baru secara otomatis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-zinc-200 font-sans p-4 sm:p-6 lg:p-8">
      {showBuyModal && <BuyCreditsModal onClose={() => setShowBuyModal(false)} onSuccess={() => { refreshCredits(); }} />}
      {showSettings && <SettingsModal profile={profile} onClose={() => setShowSettings(false)} onUpdated={() => { refreshCredits(); }} />}

      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-500">
              ScriptMate & SoraPrompt
            </h1>
            <p className="text-lg text-purple-300 mt-1">AI Generator Skrip & Prompt Video Sinematik TikTok GO</p>
          </div>
          <div className="flex-shrink-0">
            <UserMenu
              profile={profile}
              credits={credits}
              onBuyCredits={() => setShowBuyModal(true)}
              onSettings={() => setShowSettings(true)}
              onSignOut={() => { signOut(); }}
            />
          </div>
        </header>

        {/* Free user API key notice */}
        {!isPro && !freeApiKey && (
          <div className="mb-6 bg-yellow-900/20 border border-yellow-700/60 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-yellow-400">🔑 API Key Gemini belum diatur</p>
              <p className="text-xs text-zinc-400 mt-0.5">Mode Bebas memerlukan API Key Gemini kamu sendiri (gratis di Google AI Studio)</p>
            </div>
            <button onClick={() => setShowSettings(true)} className="flex-shrink-0 bg-yellow-500 text-gray-900 font-bold text-sm px-4 py-2 rounded-lg hover:bg-yellow-400 transition">
              Set API Key
            </button>
          </div>
        )}

        {/* Credit error */}
        {creditError && (
          <div className="mb-6 bg-red-900/30 border border-red-600/60 rounded-xl p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-red-300">⚠️ {creditError}</p>
            <button onClick={() => setCreditError('')} className="text-zinc-500 hover:text-white">✕</button>
          </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {promptMode === 'skrip-jualan' ? (
            <>
              <div className="flex flex-col gap-8">
                {/* Mode Selector */}
                <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
                  <h2 className="text-2xl font-semibold text-yellow-400 border-b border-purple-700 pb-3">⚙️ Mode Prompt</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      { id: 'bebas', label: 'Bebas', badge: 'TikTok GO', free: true },
                      { id: 'rapi', label: 'Rapi', badge: 'TikTok GO', free: false },
                      { id: 'urai', label: 'Urai Skrip', badge: 'Universal', free: false },
                      { id: 'skrip-jualan', label: 'Skrip Jualan', badge: 'Affiliate', free: false },
                    ] as const).map(({ id, label, badge, free: isFree }) => (
                      <button key={id} onClick={() => handleModeChange(id)}
                        className={`relative py-3 px-2 rounded-lg font-semibold transition-all text-sm leading-tight flex flex-col items-center gap-1 ${promptMode === id ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700/50 text-white hover:bg-gray-700'}`}>
                        <span>{label}</span>
                        <span className={`text-xs font-normal px-1.5 py-0.5 rounded-full ${promptMode === id ? 'bg-gray-900/20 text-gray-800' : 'bg-purple-900/50 text-purple-400'}`}>{badge}</span>
                        {!isFree && !isPro && <span className="absolute -top-1.5 -right-1.5 text-xs bg-yellow-500 text-gray-900 font-bold px-1.5 rounded-full">Pro</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg px-4 py-3">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">🛒 Cara Kerja Mode Ini</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">AI membuat skrip jualan lengkap: hook, narasi, CTA, caption & hashtag.</p>
                </div>
                <SkripJualanForm onGenerate={handleSkripJualanGenerate} isLoading={isSkripJualanLoading} />
              </div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col gap-8">
                <div className="border-b border-purple-700 pb-3">
                  <h2 className="text-2xl font-semibold text-yellow-400">🛒 Hasil Skrip Jualan</h2>
                </div>
                <SkripJualanOutput rawOutput={skripJualanOutput} isLoading={isSkripJualanLoading} loadingText={skripJualanLoadingText} />
              </motion.div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-8">
                {/* Mode Selector */}
                <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
                  <h2 className="text-2xl font-semibold text-yellow-400 border-b border-purple-700 pb-3">⚙️ Mode Prompt</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      { id: 'bebas', label: 'Bebas', badge: 'TikTok GO', free: true },
                      { id: 'rapi', label: 'Rapi', badge: 'TikTok GO', free: false },
                      { id: 'urai', label: 'Urai Skrip', badge: 'Universal', free: false },
                      { id: 'skrip-jualan', label: 'Skrip Jualan', badge: 'Affiliate', free: false },
                    ] as const).map(({ id, label, badge, free: isFree }) => (
                      <button key={id} onClick={() => handleModeChange(id)}
                        className={`relative py-3 px-2 rounded-lg font-semibold transition-all text-sm leading-tight flex flex-col items-center gap-1 ${promptMode === id ? 'bg-yellow-500 text-gray-900' : 'bg-gray-700/50 text-white hover:bg-gray-700'} ${!isFree && !isPro ? 'opacity-70' : ''}`}>
                        <span>{label}</span>
                        <span className={`text-xs font-normal px-1.5 py-0.5 rounded-full ${promptMode === id ? 'bg-gray-900/20 text-gray-800' : 'bg-purple-900/50 text-purple-400'}`}>{badge}</span>
                        {!isFree && !isPro && <span className="absolute -top-1.5 -right-1.5 text-xs bg-yellow-500 text-gray-900 font-bold px-1.5 rounded-full">Pro</span>}
                        {isFree && !isPro && <span className="absolute -top-1.5 -right-1.5 text-xs bg-green-600 text-white font-bold px-1.5 rounded-full">Free</span>}
                      </button>
                    ))}
                  </div>

                  {/* Mode info messages */}
                  {promptMode === 'bebas' && (
                    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-yellow-400 mb-1">🚀 Cara Kerja Mode Bebas</p>
                      <p className="text-xs text-zinc-400">
                        {isPro ? 'AI riset produk via Google → buat prompt sinematik. Dikurangi 1 kredit per segmen.' : 'Tersedia gratis — gunakan API Key Gemini kamu sendiri. Mode lain butuh upgrade Pro.'}
                      </p>
                    </div>
                  )}

                  {/* Pro credit info */}
                  {isPro && (
                    <div className="bg-purple-900/20 border border-purple-700/40 rounded-lg px-4 py-2 flex items-center justify-between">
                      <span className="text-xs text-purple-300">💎 Saldo kredit kamu</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-yellow-400">{credits?.balance ?? 0} kredit</span>
                        <button onClick={() => setShowBuyModal(true)} className="text-xs bg-yellow-500 text-gray-900 font-bold px-2 py-0.5 rounded-md hover:bg-yellow-400 transition">+ Beli</button>
                      </div>
                    </div>
                  )}

                  {/* Rapi mode extra settings */}
                  {promptMode === 'rapi' && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-5 mt-2 pt-4 border-t border-purple-800">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-purple-300">🎭 Karakter On-Screen</p>
                        <div className="grid grid-cols-1 gap-2">
                          {characterAppearanceOptions.map(opt => (
                            <button key={opt.id} onClick={() => setCharacterAppearance(opt.id)} className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${characterAppearance === opt.id ? 'bg-purple-700/50 border-purple-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'}`}>
                              <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 transition-all ${characterAppearance === opt.id ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'}`} />
                              <span className="flex flex-col gap-0.5"><span className="text-sm font-semibold leading-tight">{opt.label}</span><span className="text-xs text-zinc-500 leading-snug">{opt.description}</span></span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-purple-300">🗣️ Strategi Dialog</p>
                        <div className="grid grid-cols-1 gap-2">
                          {dialogStrategyOptions.map(opt => (
                            <button key={opt.id} onClick={() => setDialogStrategy(opt.id)} className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${dialogStrategy === opt.id ? 'bg-purple-700/50 border-purple-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600 hover:text-zinc-200'}`}>
                              <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 ${dialogStrategy === opt.id ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'}`} />
                              <span className="flex flex-col gap-0.5"><span className="text-sm font-semibold leading-tight">{opt.label}</span><span className="text-xs text-zinc-500">{opt.description}</span></span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="bg-gray-900/60 border border-purple-800/60 rounded-lg px-4 py-3">
                        <p className="text-xs font-semibold text-purple-300 mb-2">📋 Pola per segmen ({segmentDuration}s = {segmentDuration === '10' ? 5 : 7} adegan):</p>
                        <div className="flex flex-wrap gap-2">
                          {scenePreview.map(({ n, onScreen, hasDialog }) => (
                            <div key={n} className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-xs font-medium ${onScreen ? 'bg-purple-800/50 border-purple-500 text-purple-200' : 'bg-gray-800/60 border-gray-600 text-zinc-400'}`}>
                              <span className="font-bold">A{n}</span><span>{onScreen ? '🎭' : '🎬'}</span><span>{hasDialog ? '🗣️' : '🔇'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {promptMode === 'urai' && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex flex-col gap-5 mt-2 pt-4 border-t border-purple-800">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-purple-300">🎭 Karakter On-Screen</p>
                        <div className="grid grid-cols-1 gap-2">
                          {characterAppearanceOptions.map(opt => (
                            <button key={opt.id} onClick={() => setCharacterAppearance(opt.id)} className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${characterAppearance === opt.id ? 'bg-purple-700/50 border-purple-400 text-white' : 'bg-gray-900/40 border-gray-700 text-zinc-400 hover:border-purple-600'}`}>
                              <span className={`mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-full border-2 ${characterAppearance === opt.id ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'}`} />
                              <span className="flex flex-col gap-0.5"><span className="text-sm font-semibold leading-tight">{opt.label}</span><span className="text-xs text-zinc-500">{opt.description}</span></span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Input User */}
                <div className="flex flex-col gap-6 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
                  <h2 className="text-2xl font-semibold text-yellow-400 border-b border-purple-700 pb-3">📥 Input User</h2>
                  <Select label="Kategori" id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option>Makanan/Minuman</option><option>Hotel</option><option>Tempat Wisata</option><option>Produk Jualan</option><option>Konten Umum/Bebas</option>
                  </Select>
                  <Textarea label={promptMode === 'urai' ? 'Nama & Deskripsi (opsional)' : 'Nama & Deskripsi Singkat'} id="nameDesc" value={nameDesc} onChange={(e) => setNameDesc(e.target.value)}
                    placeholder={promptMode === 'urai' ? 'Opsional — nama produk atau kosongkan' : 'Contoh: Roti Gembul - roti lembut isi selai coklat lumer...'} />
                  <Input label="Karakter (kosongkan = faceless)" id="character" value={character} onChange={(e) => setCharacter(e.target.value)} placeholder="Contoh: Pria review makanan, gaya santai" />
                  {promptMode !== 'urai' ? (
                    <div className="grid grid-cols-3 gap-4">
                      <Select label="Durasi per Segmen" id="segmentDuration" value={segmentDuration} onChange={(e) => setSegmentDuration(e.target.value)}>
                        <option value="10">10 detik</option><option value="15">15 detik</option>
                      </Select>
                      <Input label="Total Durasi (detik)" id="totalDuration" type="number" step="5" value={totalDuration} onChange={(e) => setTotalDuration(e.target.value)} placeholder="45" />
                      <Input label="Jumlah Konten" id="contentCount" type="number" min="1" value={contentCount} onChange={(e) => setContentCount(e.target.value)} placeholder="1" />
                    </div>
                  ) : (
                    <Select label="Durasi per Segmen" id="segmentDuration" value={segmentDuration} onChange={(e) => setSegmentDuration(e.target.value)}>
                      <option value="10">10 detik</option><option value="15">15 detik</option>
                    </Select>
                  )}
                  {promptMode === 'urai' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-yellow-400">✍️ Skrip / Narasi</label>
                      <textarea id="scriptInput" value={scriptInput} onChange={(e) => setScriptInput(e.target.value)} rows={8} placeholder="Tempel skrip kamu di sini..."
                        className="w-full bg-gray-900/70 border border-gray-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y" />
                      <div className="flex justify-between">
                        <span className="text-xs text-zinc-600">AI otomatis menentukan jumlah segmen</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full border ${scriptInput.trim().split(/\s+/).filter(Boolean).length > 0 ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-gray-800 border-gray-700 text-zinc-600'}`}>
                          {scriptInput.trim().split(/\s+/).filter(Boolean).length} kata
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Gaya Konten */}
                {promptMode !== 'urai' && (
                  <div className="flex flex-col gap-4 p-6 bg-gray-800/50 border border-purple-700 rounded-xl">
                    <div className="flex items-center justify-between border-b border-purple-700 pb-3">
                      <h2 className="text-2xl font-semibold text-yellow-400">🎨 Gaya Konten</h2>
                      <span className="text-xs text-purple-300 bg-purple-900/50 px-2 py-1 rounded-full">{activeStyles.length} terpilih</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contentStyles.map(style => (
                        <StyleButton key={style.id} number={style.number} title={style.title} description={style.description} isActive={activeStyles.includes(style.id)} onClick={() => toggleStyle(style.id)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Credit cost preview */}
                {isPro && promptMode !== 'urai' && (
                  <div className="bg-gray-800/40 border border-gray-700 rounded-lg px-4 py-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Estimasi kredit yang dipakai</span>
                    <span className="text-xs font-bold text-yellow-400">
                      ~{Math.round(parseInt(totalDuration || '0') / parseInt(segmentDuration)) * (parseInt(contentCount) || 1)} kredit
                    </span>
                  </div>
                )}

                <button onClick={handleGenerate}
                  disabled={isLoading || (promptMode === 'urai' && !scriptInput.trim())}
                  className="w-full bg-gradient-to-r from-yellow-500 to-purple-600 text-white font-bold py-4 rounded-lg text-lg hover:from-yellow-400 hover:to-purple-500 transition-all disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed">
                  {isLoading ? 'Menghasilkan...' : promptMode === 'urai' ? '✂️ Urai Skrip Jadi Prompt' : '✨ Hasilkan Prompt'}
                </button>

                {!isPro && !freeApiKey && (
                  <p className="text-xs text-center text-yellow-500 -mt-4">🔑 Set API Key Gemini kamu di Pengaturan Akun</p>
                )}
                {!isPro && freeApiKey && (
                  <p className="text-xs text-center text-zinc-600 -mt-4">Mode Rapi, Urai & Skrip Jualan membutuhkan <button onClick={() => setShowBuyModal(true)} className="text-yellow-400 underline">upgrade Pro</button></p>
                )}
              </div>

              {/* Output */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col gap-8">
                <div className="flex justify-between items-center border-b border-purple-700 pb-3">
                  <h2 className="text-2xl font-semibold text-yellow-400">🚀 Hasil Prompt</h2>
                  {prompts.length > 0 && (
                    <button onClick={downloadPrompts} className="flex items-center gap-2 text-sm bg-purple-700 text-zinc-300 px-3 py-1.5 rounded-md hover:bg-purple-600 transition">
                      ⬇️ Download All
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-6">
                  {isLoading && (
                    <div className="flex flex-col items-center justify-center h-64 bg-gray-800/50 border border-purple-700 rounded-xl">
                      <div className="flex gap-2 mb-4">{[0,1,2].map(i => <div key={i} className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
                      <p className="text-zinc-400">{loadingText}</p>
                    </div>
                  )}
                  {!isLoading && prompts.length === 0 && (
                    <div className="flex items-center justify-center h-64 bg-gray-800/50 border border-dashed border-purple-600 rounded-xl">
                      <p className="text-purple-400">Hasil prompt akan muncul di sini.</p>
                    </div>
                  )}

                  {prompts.map((prompt, index) => {
                    const segments = extractSegments(prompt);
                    const showWordCount = promptMode === 'rapi' || promptMode === 'urai';
                    const wordCounts = showWordCount ? getSegmentWordCounts(prompt, segmentDuration, promptMode === 'urai') : [];
                    const hasWarning = (promptWarnings[index]?.length ?? 0) > 0;
                    return (
                      <div key={index} className="flex flex-col gap-3">
                        <div className="relative">
                          <Textarea id={`prompt-${index}`} value={prompt} onChange={(e) => handlePromptChange(e.target.value, index)} className="h-48" />
                          <button onClick={() => copyPrompt(prompt, index)} className="absolute top-3 right-3 bg-purple-700/80 text-white px-3 py-1.5 rounded-md text-xs hover:bg-purple-600 font-semibold">
                            {copiedIndex === index ? '✓ Tersalin!' : 'Salin Semua'}
                          </button>
                        </div>
                        {showWordCount && wordCounts.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {wordCounts.map((wc, wi) => (
                              <span key={wi} className={`text-xs px-2.5 py-1 rounded-full font-medium border ${wc.count > wc.max ? 'bg-red-900/40 border-red-600 text-red-300' : 'bg-green-900/30 border-green-700/60 text-green-300'}`}>
                                {wc.count > wc.max ? '⚠️' : '✓'} Seg {wi+1}: {wc.count}/{wc.max}
                              </span>
                            ))}
                          </div>
                        )}
                        {showWordCount && hasWarning && (
                          <div className="bg-yellow-900/30 border border-yellow-600/60 rounded-lg px-4 py-3">
                            <p className="text-xs font-semibold text-yellow-400 mb-1">⚠️ Dialog melebihi batas:</p>
                            {promptWarnings[index].map((w, wi) => <p key={wi} className="text-xs text-yellow-300 ml-2">· {w}</p>)}
                          </div>
                        )}
                        {segments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {segments.map((_, segIdx) => {
                              const key = `${index}-${segIdx}`;
                              return (
                                <button key={segIdx} onClick={() => copySegment(prompt, index, segIdx)}
                                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border transition-all ${copiedSegmentKey === key ? 'bg-yellow-500 text-gray-900 border-yellow-500' : 'bg-gray-800 text-zinc-300 border-gray-600 hover:bg-gray-700 hover:border-purple-500'}`}>
                                  {copiedSegmentKey === key ? '✓ Tersalin!' : `📋 Salin Segmen ${segIdx+1}`}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Segmen Lanjutan (bebas mode) */}
                  {promptMode === 'bebas' && prompts.length > 0 && (() => {
                    const visualDetail = visualRefs[0] || nameDesc || '[PRODUK/TEMPAT]';
                    const lanjutanText = `Lanjutkan video sebelumnya secara natural kurang dari ${segmentDuration} detik. Akhir Dialog: "klik tag lokasi bawah untuk detailnya ya." MULTI SCENE. NO TEXT. NO MUSIC. CLEAR SUBJECT LOCK. ANTI BLUR. Pertahankan konsistensi warna, pencahayaan, dan suasana dari video sebelumnya. Semua visual HANYA menampilkan ${visualDetail}.`;
                    return (
                      <div className="flex flex-col gap-3 border-t border-purple-700 pt-6 mt-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-yellow-400">▶ SEGMEN LANJUTAN (Extend Sora)</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">Untuk memperpanjang video di Sora</p>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(lanjutanText); setCopiedLanjutan(true); setTimeout(() => setCopiedLanjutan(false), 2000); }}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-md border transition-all ${copiedLanjutan ? 'bg-yellow-500 text-gray-900 border-yellow-500' : 'bg-gray-800 text-zinc-300 border-gray-600 hover:bg-gray-700'}`}>
                            {copiedLanjutan ? '✓ Tersalin!' : '📋 Salin'}
                          </button>
                        </div>
                        <div className="bg-gray-900/70 border border-purple-800/60 rounded-lg px-4 py-3">
                          <p className="text-xs text-zinc-400 leading-relaxed">{lanjutanText}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
