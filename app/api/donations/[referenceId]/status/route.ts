import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function GET(
  request: NextRequest,
  { params }: { params: { referenceId: string } }
) {
  try {
    const { referenceId } = params;

    const { data: donation, error } = await supabase
      .from("donations")
      .select("public_id, reference_id, payment_method, status, amount, created_at, completed_at")
      .eq("reference_id", referenceId)
      .single();

    if (error || !donation) {
      return NextResponse.json(
        { error: "Donation not found" },
        { status: 404 }
      );
    }

    // Return only safe fields
    return NextResponse.json({
      donation_id: donation.public_id,
      reference_id: donation.reference_id,
      payment_method: donation.payment_method,
      status: donation.status,
      amount: donation.amount,
      created_at: donation.created_at,
      completed_at: donation.completed_at,
    });
  } catch (error) {
    console.error("Error fetching donation status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
