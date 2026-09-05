"use client";
import {Suspense,useState} from "react";import {useRouter,useSearchParams} from "next/navigation";import {Globe2,Loader2} from "lucide-react";import {supabaseBrowser} from "@/lib/supabase/client";
const field="w-full rounded-lg border border-[#dfe4e0] px-3 py-2.5 text-sm outline-none focus:border-[#176b4d]";
function LoginForm(){const router=useRouter();const params=useSearchParams();const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");const {error}=await supabaseBrowser().auth.signInWithPassword({email,password});if(error){setError(error.message);setBusy(false);return}
/* refresh() so the server re-renders with the session cookie the client just set. */
const next=params.get("next");router.replace(next?.startsWith("/admin")?next:"/admin");router.refresh()}
return <form onSubmit={submit} className="w-full max-w-[380px] rounded-xl border border-[#e1e6e2] bg-white p-6"><div className="flex items-center gap-2 font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-lg bg-[#176b4d] text-white"><Globe2 size={17}/></span> Channelly</div><h1 className="mt-5 text-lg font-semibold">Sign in</h1><p className="mt-1 text-sm text-[#68736d]">Admin access for Via Nova Addis.</p>
<label htmlFor="email" className="mt-5 block text-sm font-medium">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className={`mt-1.5 ${field}`}/>
<label htmlFor="password" className="mt-4 block text-sm font-medium">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className={`mt-1.5 ${field}`}/>
{error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
<button type="submit" disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#176b4d] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy&&<Loader2 size={16} className="animate-spin"/>}{busy?"Signing in…":"Sign in"}</button></form>}
export default function Login(){return <main className="grid min-h-screen place-items-center bg-[#fbfcfb] p-4"><Suspense fallback={<Loader2 size={20} className="animate-spin text-[#176b4d]"/>}><LoginForm/></Suspense></main>}
