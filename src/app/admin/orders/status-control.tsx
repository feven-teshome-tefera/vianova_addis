"use client";

import { OrderStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminResponseMessage } from "@/components/admin/user-errors";

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

export function OrderStatusControl({ id, status }: { id: string; status: OrderStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const options = [status, ...transitions[status]];

  return (
    <select
      aria-label="Order status"
      className="input min-w-40"
      value={status}
      disabled={busy || transitions[status].length === 0}
      onChange={async (event) => {
        setBusy(true);
        try {
          const response = await fetch(`/api/admin/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: event.target.value }),
          });
          if (!response.ok) {
            const message=await adminResponseMessage(response,"update order status","We couldn’t update the order status. Refresh the page and try again.");
            alert(message);
            router.refresh();
            return;
          }
          router.refresh();
        } catch (error) {
          console.error("[Admin] update order status request failed", error);
          alert("The app could not connect to update this order. Check your internet connection and try again.");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>{label(option)}</option>
      ))}
    </select>
  );
}

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
