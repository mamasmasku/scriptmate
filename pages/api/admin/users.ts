// pages/api/admin/users.ts
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
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const adminId = await isAdmin(token);
  if (!adminId) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    // List all users with credits
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, role, created_at, user_credits(balance, total_purchased, total_used)')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ users: data });
  }

  if (req.method === 'POST') {
    // Admin register user
    const { email, password, username, role } = req.body;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (error) return res.status(400).json({ error: error.message });

    // Update role if not free
    if (role && role !== 'free') {
      await supabaseAdmin.from('profiles').update({ role }).eq('id', data.user.id);
    }
    return res.status(200).json({ user: data.user });
  }

  if (req.method === 'PATCH') {
    // Update user role
    const { userId, role } = req.body;
    await supabaseAdmin.from('profiles').update({ role }).eq('id', userId);
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
