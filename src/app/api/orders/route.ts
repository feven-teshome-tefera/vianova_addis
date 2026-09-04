import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { resolveCheckout } from "@/lib/checkout";

const requestSchema = z.object({ requestId: z.string().uuid() });
const orderSelect = { id: true, orderNumber: true } as const;

export async function POST(request: NextRequest) {
  let requestId: string | undefined;
  try {
    const input: unknown = await request.json();
    requestId = requestSchema.parse(input).requestId;

    const existing = await db.order.findUnique({ where: { requestId }, select: orderSelect });
    if (existing) return NextResponse.json(existing);

    const cart = await resolveCheckout(input);
    const orderNumber = `VN-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    const order = await db.order.create({
      data: {
        requestId,
        orderNumber,
        recipientFirstName: cart.customer.firstName,
        recipientLastName: cart.customer.lastName,
        recipientPhone: cart.customer.phone,
        email: cart.customer.email || null,
        deliveryAddress: cart.customer.address || null,
        latitude: cart.customer.latitude,
        longitude: cart.customer.longitude,
        deliveryNotes: cart.customer.deliveryNotes || null,
        subtotal: cart.total,
        total: cart.total,
        currency: cart.currency,
        items: {
          create: cart.lines.map((line) => ({
            productId: line.id,
            productSizeId: line.sizeId,
            productName: line.name,
            sizeLabel: line.sizeLabel,
            sku: line.sku,
            unitPrice: line.unitAmount,
            quantity: line.quantity,
            currency: line.currency,
          })),
        },
      },
      select: orderSelect,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (
      requestId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      try {
        const existing = await db.order.findUnique({ where: { requestId }, select: orderSelect });
        if (existing) return NextResponse.json(existing);
      } catch (lookupError) {
        return apiError(lookupError, {
          context:"find-repeated-order",
          defaultMessage:"We couldn’t confirm whether this order was already received. Contact Via Nova before placing it again.",
        });
      }
    }
    return apiError(error, {
      context:"create-order",
      defaultMessage:"We couldn’t place your order. Your bag is still saved; check the delivery details and try again.",
    });
  }
}
