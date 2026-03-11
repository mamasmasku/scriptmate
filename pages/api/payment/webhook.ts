// pages/api/payment/webhook.ts
import { supabaseAdmin } from '../../../lib/supabase';
import { verifyMidtransSignature } from '../../../lib/midtrans';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    order_id,
    transaction_status,
    payment_type,
    transaction_id,
    status_code,
    gross_amount,
    signature_key,
    fraud_status,
  } = req.body;

  // Verify signature
  const isValid = verifyMidtransSignature(order_id, status_code, gross_amount, signature_key);
  if (!isValid) {
    console.error('Invalid Midtrans signature', order_id);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Get transaction from DB
  const { data: tx } = await supabaseAdmin
    .from('transactions')
    .select('*, profiles!transactions_user_id_fkey(id)')
    .eq('midtrans_order_id', order_id)
    .single();

  if (!tx) return res.status(404).json({ error: 'Transaction not found' });

  // Determine new status
  let newStatus = tx.status;
  if (transaction_status === 'capture' && fraud_status === 'accept') newStatus = 'success';
  else if (transaction_status === 'settlement') newStatus = 'success';
  else if (transaction_status === 'cancel' || transaction_status === 'deny') newStatus = 'failed';
  else if (transaction_status === 'expire') newStatus = 'expired';
  else if (transaction_status === 'pending') newStatus = 'pending';

  // Update transaction
  await supabaseAdmin.from('transactions').update({
    status: newStatus,
    payment_type,
    midtrans_transaction_id: transaction_id,
    updated_at: new Date().toISOString(),
  }).eq('midtrans_order_id', order_id);

  // Add credits if success and not already processed
  if (newStatus === 'success' && tx.status !== 'success') {
    await supabaseAdmin.rpc('add_credits', {
      p_user_id: tx.user_id,
      p_amount: tx.credits,
    });

    // Upgrade user to Pro if they were free
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'pro' })
      .eq('id', tx.user_id)
      .eq('role', 'free');

    console.log(`✅ Credits added: ${tx.credits} for user ${tx.user_id}`);
  }

  return res.status(200).json({ status: 'OK' });
}
