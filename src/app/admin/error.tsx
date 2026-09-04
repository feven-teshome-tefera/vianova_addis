"use client";

import { useEffect } from "react";

export default function ErrorPage({error,reset}:{error:Error & {digest?:string};reset:()=>void}){
  useEffect(()=>{console.error("[Admin] Dashboard page failed to load",error)},[error]);
  return <div className="card p-8 text-center" role="alert">
    <h2 className="text-lg font-bold">The dashboard data didn&apos;t load.</h2>
    <p className="muted mx-auto my-2 max-w-xl text-sm">Your products and orders have not been changed. Try loading the page again; if it still fails, wait a moment and retry.</p>
    <button className="btn btn-primary" onClick={reset}>Reload dashboard data</button>
  </div>
}
