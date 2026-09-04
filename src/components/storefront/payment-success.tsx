"use client";
import Link from "next/link";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { useCart } from "./cart";
export function PaymentSuccess({orderNumber}:{orderNumber?:string}){const{items,clear}=useCart();useEffect(()=>{if(items.length)clear()},[items.length,clear]);return <div className="sf-success"><span><Check/></span><p className="sf-kicker">Thank you</p><h1>Order received.</h1>{orderNumber&&<strong className="sf-order-number">{orderNumber}</strong>}<p>Via Nova will contact the delivery recipient to confirm the order, delivery and payment.</p><Link className="sf-button sf-button-dark" href="/shop">Continue shopping</Link></div>}
