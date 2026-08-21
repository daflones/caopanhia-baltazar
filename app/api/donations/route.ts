import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { createCharge } from "@/lib/mercosulpay";
import { randomUUID } from "crypto";

const MANUAL_PIX_KEY = process.env.MANUAL_PIX_KEY || "21968053672";
const MANUAL_PIX_KEY_TYPE = process.env.MANUAL_PIX_KEY_TYPE || "phone";
const AUTOMATIC_PIX_MIN_AMOUNT = parseFloat(process.env.AUTOMATIC_PIX_MIN_AMOUNT || "5.00");

interface CreateDonationRequest {
  amount: number;
  donor_name?: string;
  donor_email?: string;
}

function generateReferenceId(): string {
  return `don_${Date.now()}_${randomUUID().replace(/-/g, "").substring(0, 8)}`;
}

function validateAmount(amount: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(amount)) {
    return { valid: false, error: "Amount must be a finite number" };
  }
  if (amount <= 0) {
    return { valid: false, error: "Amount must be greater than zero" };
  }
  if (Math.round(amount * 100) !== amount * 100) {
    return { valid: false, error: "Amount must have at most 2 decimal places" };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateDonationRequest = await request.json();
    const { amount, donor_name, donor_email } = body;

    const validation = validateAmount(amount);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const publicId = randomUUID();
    const referenceId = generateReferenceId();
    const isManualPix = amount < AUTOMATIC_PIX_MIN_AMOUNT;

    if (isManualPix) {
      // Manual Pix flow for amounts < R$ 5
      const { error: dbError } = await supabase.from("donations").insert({
        public_id: publicId,
        reference_id: referenceId,
        payment_method: "manual_pix",
        status: "awaiting_manual_payment",
        amount: amount,
        pix_key: MANUAL_PIX_KEY,
        donor_name: donor_name || null,
        donor_email: donor_email || null,
      });

      if (dbError) {
        console.error("Supabase error creating manual donation:", dbError);
        return NextResponse.json(
          { error: "Failed to create donation record" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        donation_id: publicId,
        reference_id: referenceId,
        payment_method: "manual_pix",
        status: "awaiting_manual_payment",
        amount: amount,
        pix_key: MANUAL_PIX_KEY,
        pix_key_type: MANUAL_PIX_KEY_TYPE,
      });
    }

    // MercosulPay flow for amounts >= R$ 5
    const { error: dbError } = await supabase.from("donations").insert({
      public_id: publicId,
      reference_id: referenceId,
      payment_method: "mercosulpay_pix",
      status: "pending",
      amount: amount,
      donor_name: donor_name || null,
      donor_email: donor_email || null,
    });

    if (dbError) {
      console.error("Supabase error creating donation:", dbError);
      return NextResponse.json(
        { error: "Failed to create donation record" },
        { status: 500 }
      );
    }

    try {
      const charge = await createCharge({
        amount: Math.round(amount),
        description: "Cãopanhia Baltazar",
        reference_id: referenceId,
      });

      console.log("MercosulPay charge response:", JSON.stringify(charge, null, 2));

      // Update donation with MercosulPay charge ID
      const { error: updateError } = await supabase
        .from("donations")
        .update({
          mercosulpay_charge_id: charge.id,
          fee_amount: charge.fee,
          net_amount: charge.net_amount,
        })
        .eq("reference_id", referenceId);

      if (updateError) {
        console.error("Supabase error updating donation with charge ID:", updateError);
        // Don't fail the request, but log the error
      }

      return NextResponse.json({
        donation_id: publicId,
        reference_id: referenceId,
        payment_method: "mercosulpay_pix",
        status: "pending",
        amount: amount,
        qr_code: charge.qr_code,
        qr_code_image: charge.qr_code_image,
      });
    } catch (mercosulError) {
      console.error("MercosulPay error:", mercosulError);

      // Update donation status to failed
      await supabase
        .from("donations")
        .update({ status: "failed" })
        .eq("reference_id", referenceId);

      return NextResponse.json(
        { error: "Failed to create payment charge" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
