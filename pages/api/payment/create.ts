// pages/api/payment/create.ts
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabase';
import { createSnapTransaction } from '../../../lib/midtrans';

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

  const { packageId } = req.body;
  if (!packageId) return res.status(400).json({ error: 'packageId required' });

  // Get package details
  const { data: pkg } = await supabaseAdmin
    .from('credit_packages')
    .select('*')
    .eq('id', packageId)
    .eq('is_active', true)
    .single();

  if (!pkg) return res.status(404).json({ error: 'Paket tidak ditemukan' });

  // Get user profile
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();

  const orderId = `SCM-${user.id.slice(0, 8)}-${Date.now()}`;

  // Create transaction record
  await supabaseAdmin.from('transactions').insert({
    user_id: user.id,
    package_id: packageId,
    credits: pkg.credits,
    amount_idr: pkg.price_idr,
    midtrans_order_id: orderId,
    status: 'pending',
  });

  // Create Midtrans Snap token
  const snap = await createSnapTransaction({
    orderId,
    amount: pkg.price_idr,
    customerName: profile?.username || 'User',
    customerEmail: user.email || '',
    packageName: `ScriptMate ${pkg.name} - ${pkg.credits} Kredit`,
  });

  return res.status(200).json({ token: snap.token, orderId });
}
