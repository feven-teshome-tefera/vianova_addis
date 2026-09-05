import {Suspense} from "react";import {Loader2} from "lucide-react";import {db} from "@/lib/db";import {LoginForm} from "./login-form";
export const dynamic="force-dynamic";
export default async function Login(){const settings=await db.storeSettings.findUnique({where:{id:"default"},select:{storeName:true}});return <main className="grid min-h-screen place-items-center bg-[#fbfcfb] p-4"><Suspense fallback={<Loader2 size={20} className="animate-spin text-[#176b4d]"/>}><LoginForm brand={settings?.storeName??"Via Nova"}/></Suspense></main>}
