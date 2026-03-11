// pages/api/gemini.ts
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userPrompt, systemInstruction, temperature = 0.8, useSearch = false, apiKey: clientApiKey } = req.body;

  if (!userPrompt || !systemInstruction) {
    return res.status(400).json({ error: 'userPrompt dan systemInstruction wajib diisi' });
  }

  // ── Tentukan API key yang dipakai ────────────────────────
  let useServerKey = false;
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role === 'pro' || profile?.role === 'admin') {
        useServerKey = true;
      }
    }
  }

  // Pro/admin → server API key. Free → client-provided key
  const finalApiKey = useServerKey ? process.env.GEMINI_API_KEY! : clientApiKey;
  if (!finalApiKey) {
    return res.status(401).json({ error: 'API Key diperlukan. Masukkan Gemini API Key kamu.' });
  }

  try {
    const client = new OpenAI({
      apiKey: finalApiKey,
      baseURL: useServerKey
        ? 'https://litellm.koboi2026.biz.id/v1'
        : 'https://litellm.koboi2026.biz.id/v1', // atau langsung Gemini API jika free user
    });

    const response = await client.chat.completions.create({
      model: 'gemini-2.5-flash',
      temperature,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
    });

    const text = response.choices[0]?.message?.content || '';
    return res.status(200).json({ text });
  } catch (error: any) {
    console.error('API error:', error);

    if (error?.status === 401 || error?.message?.includes('API_KEY') || error?.message?.includes('Invalid')) {
      return res.status(401).json({ error: 'API Key tidak valid. Periksa kembali API Key kamu.' });
    }

    return res.status(500).json({ error: error.message || 'Terjadi kesalahan pada server' });
  }
}
