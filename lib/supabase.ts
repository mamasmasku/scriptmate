// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client (pakai service role key)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type UserRole = 'free' | 'pro' | 'admin';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface UserCredits {
  user_id: string;
  balance: number;
  total_purchased: number;
  total_used: number;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_idr: number;
  is_active: boolean;
  sort_order: number;
}
