import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
