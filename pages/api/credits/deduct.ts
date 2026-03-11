// pages/api/credits/deduct.ts
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { amount, mode, description } = req.body;
  if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });

  // Check role - only pro/admin can use server-side API key
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || (profile.role !== 'pro' && profile.role !== 'admin')) {
    return res.status(403).json({ error: 'Upgrade ke Pro untuk menggunakan fitur ini' });
  }

  // Call the Postgres function (atomic deduction)
  const { data, error } = await supabaseAdmin.rpc('deduct_credits', {
    p_user_id: user.id,
    p_amount: amount,
    p_mode: mode || 'unknown',
    p_description: description || '',
  });

  if (error) return res.status(500).json({ error: error.message });

  const result = data as any;
  if (!result.success) {
    return res.status(402).json({ error: result.error, balance: result.balance });
  }

  return res.status(200).json({ success: true, new_balance: result.new_balance });
}
