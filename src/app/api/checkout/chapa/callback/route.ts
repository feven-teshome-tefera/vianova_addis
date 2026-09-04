import { NextResponse } from "next/server";

function comingSoon() {
  return NextResponse.json(
    { error: "Chapa payments are under construction and coming soon." },
    { status: 503 },
  );
}

export const GET = comingSoon;
export const POST = comingSoon;
