// pages/api/admin/add-credits.ts
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabase';

async function isAdmin(token: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin' ? user.id : null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const adminId = await isAdmin(token);
  if (!adminId) return res.status(403).json({ error: 'Forbidden' });

  const { userId, credits, note } = req.body;
  if (!userId || !credits || credits < 1) return res.status(400).json({ error: 'Invalid params' });

  // Add credits
  await supabaseAdmin.rpc('add_credits', { p_user_id: userId, p_amount: credits });

  // Log admin action
  await supabaseAdmin.from('admin_credit_logs').insert({
    admin_id: adminId,
    user_id: userId,
    credits_added: credits,
    note: note || 'Manual top-up by admin',
  });

  // Upgrade to Pro if free
  await supabaseAdmin
    .from('profiles')
    .update({ role: 'pro' })
    .eq('id', userId)
    .eq('role', 'free');

  return res.status(200).json({ success: true });
}
