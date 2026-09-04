import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Stripe payments are under construction and coming soon." },
    { status: 503 },
  );
}
