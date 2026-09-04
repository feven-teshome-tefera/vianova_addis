import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { PageHead, Status } from "@/components/admin/common";
import { OrderStatusControl } from "../status-control";

export const dynamic = "force-dynamic";

const title = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = (value: unknown, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "ETB" ? 0 : 2 }).format(Number(value));

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await db.order.findUnique({ where: { id: (await params).id }, include: { items: true } });
  if (!order) notFound();
  const mapUrl = order.latitude !== null && order.longitude !== null ? `https://www.google.com/maps?q=${order.latitude},${order.longitude}` : null;

  return <>
    <Link href="/admin/orders" className="mb-5 flex items-center gap-2 text-sm"><ArrowLeft size={15}/>Back to orders</Link>
    <PageHead title={order.orderNumber} description={`Placed ${new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" }).format(order.createdAt)}`} action={<OrderStatusControl id={order.id} status={order.status}/>}/>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card p-5">
        <h3 className="section-title">Delivery recipient</h3>
        <dl className="mt-5 grid gap-4 text-sm">
          <div><dt className="muted">Name</dt><dd className="font-semibold">{order.recipientFirstName} {order.recipientLastName}</dd></div>
          <div><dt className="muted">Phone</dt><dd><a href={`tel:${order.recipientPhone}`}>{order.recipientPhone}</a></dd></div>
          {order.email && <div><dt className="muted">Email</dt><dd><a href={`mailto:${order.email}`}>{order.email}</a></dd></div>}
          <div><dt className="muted">Delivery address</dt><dd>{order.deliveryAddress || "Shared GPS location"}</dd></div>
          {mapUrl && <a className="btn w-fit" href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={15}/>Open location in Maps</a>}
          {order.deliveryNotes && <div><dt className="muted">Delivery notes</dt><dd>{order.deliveryNotes}</dd></div>}
        </dl>
      </section>
      <section className="card p-5">
        <div className="flex items-center justify-between"><h3 className="section-title">Order summary</h3><div className="flex gap-2"><Status value={title(order.status)}/><Status value={title(order.paymentStatus)}/></div></div>
        <div className="mt-5 divide-y">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 py-4 text-sm"><span><strong className="block">{item.productName}</strong>{item.sizeLabel && <small className="muted block">Size {item.sizeLabel}</small>}<small className="muted">{item.quantity} × {money(item.unitPrice, item.currency)}</small></span><strong>{money(Number(item.unitPrice) * item.quantity, item.currency)}</strong></div>)}</div>
        <div className="mt-4 flex justify-between border-t pt-4"><strong>Total</strong><strong>{money(order.total, order.currency)}</strong></div>
      </section>
    </div>
  </>;
}
