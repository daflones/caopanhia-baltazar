import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    // Check Supabase connection
    const { error } = await supabase.from("donations").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "unhealthy", service: "supabase", error: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        supabase: "connected",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: "unhealthy", error: "Health check failed" },
      { status: 503 }
    );
  }
}
