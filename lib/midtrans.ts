// lib/midtrans.ts
import crypto from 'crypto';

export const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY!;
export const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!;
export const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

export const MIDTRANS_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

export async function createSnapTransaction(params: {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  packageName: string;
}) {
  const body = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    item_details: [
      {
        id: params.orderId,
        price: params.amount,
        quantity: 1,
        name: params.packageName,
      },
    ],
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
    },
    callbacks: {
      finish: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    },
  };

  const encoded = Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64');
  const res = await fetch(MIDTRANS_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encoded}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Midtrans error: ${err}`);
  }

  return res.json() as Promise<{ token: string; redirect_url: string }>;
}

// Verifikasi signature dari Midtrans webhook
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const raw = orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY;
  const hash = crypto.createHash('sha512').update(raw).digest('hex');
  return hash === signatureKey;
}
