import {createServerClient} from "@supabase/ssr";import {NextResponse,type NextRequest} from "next/server";
export async function middleware(request:NextRequest){let response=NextResponse.next({request});const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll(){return request.cookies.getAll()},setAll(list){for(const {name,value} of list)request.cookies.set(name,value);response=NextResponse.next({request});for(const {name,value,options} of list)response.cookies.set(name,value,options)}}});
/* getUser revalidates against Supabase; getSession only reads the cookie and is spoofable. */
const {data:{user}}=await supabase.auth.getUser();
if(!user){
/* API callers get a status they can act on; only page requests are worth redirecting. */
if(request.nextUrl.pathname.startsWith("/api/"))return NextResponse.json({error:"Sign in to use the admin API."},{status:401});
const to=new URL("/login",request.url);to.searchParams.set("next",request.nextUrl.pathname);return NextResponse.redirect(to)}
return response}
export const config={matcher:["/admin/:path*","/api/admin/:path*"]};
