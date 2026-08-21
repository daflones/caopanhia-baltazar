import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabase } from "@/lib/supabase-server";

const WEBHOOK_SECRET = process.env.MERCOSULPAY_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  throw new Error("Missing MERCOSULPAY_WEBHOOK_SECRET environment variable");
}

interface WebhookPayload {
  event: string;
  data: {
    status: string;
    reference_id: string;
    transaction_id?: string;
    amount?: number;
    fee?: number;
    net_amount?: number;
  };
}

function verifySignature(rawBody: string, signature: string, timestamp: string): boolean {
  const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET!)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  if (signature.length !== expected.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function isTimestampFresh(timestamp: string): boolean {
  const ts = Number(timestamp);
  if (isNaN(ts)) {
    return false;
  }
  const now = Date.now() / 1000;
  return Math.abs(now - ts) < 300; // 5 minutes
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-mercosulpay-signature") || "";
  const timestamp = request.headers.get("x-mercosulpay-timestamp") || "";
  const deliveryId = request.headers.get("x-mercosulpay-delivery") || "";
  const eventType = request.headers.get("x-mercosulpay-event") || "";

  // Verify signature
  if (!verifySignature(rawBody, signature, timestamp)) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Verify timestamp freshness
  if (!isTimestampFresh(timestamp)) {
    console.error("Webhook timestamp too old");
    return NextResponse.json({ error: "Timestamp too old" }, { status: 401 });
  }

  // Check for duplicate delivery
  const { data: existingDelivery } = await supabase
    .from("webhook_deliveries")
    .select("id")
    .eq("delivery_id", deliveryId)
    .single();

  if (existingDelivery) {
    return NextResponse.json({ status: "already_processed" }, { status: 200 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process pix.received events with completed status
  if (eventType !== "pix.received" || payload.data.status !== "completed") {
    // Still record the delivery to prevent replay
    await supabase.from("webhook_deliveries").insert({
      provider: "mercosulpay",
      delivery_id: deliveryId,
      event: eventType,
      transaction_id: payload.data.transaction_id || null,
    });
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  // Find donation by reference_id
  const { data: donation, error: donationError } = await supabase
    .from("donations")
    .select("*")
    .eq("reference_id", payload.data.reference_id)
    .single();

  if (donationError || !donation) {
    console.error("Donation not found for reference_id:", payload.data.reference_id);
    // Record delivery even if donation not found
    await supabase.from("webhook_deliveries").insert({
      provider: "mercosulpay",
      delivery_id: deliveryId,
      event: eventType,
      transaction_id: payload.data.transaction_id || null,
    });
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  // Verify payment method is mercosulpay_pix
  if (donation.payment_method !== "mercosulpay_pix") {
    console.error("Wrong payment method for webhook:", donation.payment_method);
    await supabase.from("webhook_deliveries").insert({
      provider: "mercosulpay",
      delivery_id: deliveryId,
      event: eventType,
      transaction_id: payload.data.transaction_id || null,
    });
    return NextResponse.json({ error: "Wrong payment method" }, { status: 400 });
  }

  // Verify amount matches
  if (payload.data.amount && Math.abs(payload.data.amount - Number(donation.amount)) > 0.01) {
    console.error("Amount mismatch:", payload.data.amount, donation.amount);
    await supabase.from("webhook_deliveries").insert({
      provider: "mercosulpay",
      delivery_id: deliveryId,
      event: eventType,
      transaction_id: payload.data.transaction_id || null,
    });
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  // Check for duplicate transaction
  if (payload.data.transaction_id) {
    const { data: existingTransaction } = await supabase
      .from("webhook_deliveries")
      .select("id")
      .eq("transaction_id", payload.data.transaction_id)
      .single();

    if (existingTransaction) {
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }
  }

  // Update donation to completed
  const { error: updateError } = await supabase
    .from("donations")
    .update({
      status: "completed",
      mercosulpay_transaction_id: payload.data.transaction_id || null,
      fee_amount: payload.data.fee || donation.fee_amount,
      net_amount: payload.data.net_amount || donation.net_amount,
      completed_at: new Date().toISOString(),
    })
    .eq("reference_id", payload.data.reference_id);

  if (updateError) {
    console.error("Error updating donation:", updateError);
    return NextResponse.json({ error: "Failed to update donation" }, { status: 500 });
  }

  // Record successful delivery
  await supabase.from("webhook_deliveries").insert({
    provider: "mercosulpay",
    delivery_id: deliveryId,
    event: eventType,
    transaction_id: payload.data.transaction_id || null,
  });

  return NextResponse.json({ status: "processed" }, { status: 200 });
}
