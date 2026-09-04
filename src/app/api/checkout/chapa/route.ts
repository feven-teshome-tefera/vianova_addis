import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Chapa payments are under construction and coming soon." },
    { status: 503 },
  );
}
