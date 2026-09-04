import {NextResponse,type NextRequest} from "next/server";
export function middleware(request:NextRequest){/* Authentication boundary: validate an Auth.js session here before production. */return NextResponse.next()}
export const config={matcher:["/admin/:path*"]};
