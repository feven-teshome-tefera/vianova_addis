"use client";
import Link from "next/link";
import {Archive,Copy,ExternalLink,MoreHorizontal,Pencil,RotateCcw,Trash2} from "lucide-react";
import {useRouter} from "next/navigation";
import {createPortal} from "react-dom";
import {useRef,useState} from "react";
import {logAdminResponseFailure} from "./user-errors";

export function ProductActions({id,name,status}:{id:string;name:string;status:string}){
  const router=useRouter();
  const trigger=useRef<HTMLButtonElement>(null);
  const[open,setOpen]=useState(false);
  const[busy,setBusy]=useState("");
  const rect=trigger.current?.getBoundingClientRect();
  const menuTop=rect?(window.innerHeight-rect.bottom<230?Math.max(8,rect.top-218):rect.bottom+4):0;
  const menuLeft=rect?Math.max(8,rect.right-192):0;

  async function action(kind:"duplicate"|"archive"|"restore"){
    setBusy(kind);
    try {
      const endpoint=kind==="duplicate"?`/api/admin/products/${id}/duplicate`:`/api/admin/products/${id}/archive`;
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:kind==="duplicate"?undefined:JSON.stringify({archived:kind==="archive"})});
      if(response.ok){
        const body=await response.json() as {id?:string};
        setOpen(false);
        if(kind==="duplicate"){
          if(body.id)router.push(`/admin/products/${body.id}`);
          else{console.error("[Admin] duplicate response did not include a product ID");alert("The product may have been duplicated, but its edit page could not be opened. Refresh the product list before trying again.")}
        }else router.refresh();
        return;
      }

      await logAdminResponseFailure(response,`${kind} product`);
      if(response.status===404){alert("This product no longer exists. Refresh the product list and try again.");return}
      const messages={duplicate:"We couldn’t duplicate this product. Check your connection and try again.",archive:"We couldn’t archive this product. Try again in a moment.",restore:"We couldn’t restore this product. Try again in a moment."};
      alert(messages[kind]);
    } catch(error) {
      console.error(`[Admin] ${kind} product request failed`,error);
      alert("The app could not connect to complete this action. Check your internet connection and try again.");
    } finally {
      setBusy("");
    }
  }

  async function remove(){
    if(!confirm(`Delete “${name}”? Connected social posts will also be removed where possible. This cannot be undone.`))return;
    setBusy("delete");
    try {
      const response=await fetch(`/api/admin/products/${id}`,{method:"DELETE"});
      if(response.ok){setOpen(false);router.refresh();return}

      await logAdminResponseFailure(response,"delete product");
      if(response.status===404)alert("This product has already been removed. Refresh the product list.");
      else if(response.status===409)alert("This product is linked to existing orders and cannot be deleted. Archive it instead.");
      else alert("We couldn’t delete this product. Try again, or archive it if it has existing orders.");
    } catch(error) {
      console.error("[Admin] delete product request failed",error);
      alert("The app could not connect to delete this product. Check your internet connection and try again.");
    } finally {
      setBusy("");
    }
  }

  return <>
    <button ref={trigger} onClick={()=>setOpen(value=>!value)} className="rounded p-1 hover:bg-[#eef1ef]" aria-label={`Actions for ${name}`} aria-expanded={open}><MoreHorizontal size={18}/></button>
    {open&&createPortal(<>
      <button className="fixed inset-0 z-40 cursor-default" onClick={()=>setOpen(false)} aria-label="Close product actions"/>
      <div className="fixed z-50 w-48 rounded-lg border bg-white p-1 shadow-xl" style={{top:menuTop,left:menuLeft}}>
        <Link href={`/admin/products/${id}`} className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-[#f2f4f2]"><Pencil size={14}/>Edit product</Link>
        <Link href={`/admin/products/${id}#publishing-history`} className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-[#f2f4f2]"><ExternalLink size={14}/>Publishing history</Link>
        <button disabled={!!busy} onClick={()=>action("duplicate")} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-[#f2f4f2]"><Copy size={14}/>{busy==="duplicate"?"Duplicating…":"Duplicate"}</button>
        <button disabled={!!busy} onClick={()=>action(status==="Archived"?"restore":"archive")} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-[#f2f4f2]">{status==="Archived"?<RotateCcw size={14}/>:<Archive size={14}/>}{busy==="archive"||busy==="restore"?"Updating…":status==="Archived"?"Restore":"Archive"}</button>
        <button disabled={!!busy} onClick={remove} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14}/>{busy==="delete"?"Deleting…":"Delete"}</button>
      </div>
    </>,document.body)}
  </>;
}
