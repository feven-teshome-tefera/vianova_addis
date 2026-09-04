import { Availability, OrderStatus, ProductStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, PublicApiError } from "@/lib/api";
import { db } from "@/lib/db";

const schema = z.object({ status: z.nativeEnum(OrderStatus) });
const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  OUT_FOR_DELIVERY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

class OrderConflictError extends PublicApiError {
  constructor(message: string) { super(409, message, "ORDER_CONFLICT"); }
}
class OrderNotFoundError extends PublicApiError {
  constructor() { super(404, "This order no longer exists. Refresh the order list.", "ORDER_NOT_FOUND"); }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { status } = schema.parse(await request.json());

    const order = await db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id },
        include: {
          items: {
            include: { productSize: { select: { isActive: true } } },
          },
        },
      });
      if (!current) throw new OrderNotFoundError();
      if (status === current.status) return current;
      if (!transitions[current.status].includes(status)) {
        throw new OrderConflictError(
          `${label(current.status)} orders cannot be changed to ${label(status)}.`,
        );
      }

      if (status === OrderStatus.CONFIRMED) {
        for (const item of current.items) {
          if (!item.productId) {
            throw new OrderConflictError(`${item.productName} is no longer in the catalog.`);
          }
          if (item.sizeLabel && !item.productSizeId) {
            throw new OrderConflictError(
              `${item.productName} size ${item.sizeLabel} is no longer available.`,
            );
          }
          if (item.productSizeId) {
            const sizeReserved = await tx.productSize.updateMany({
              where: {
                id: item.productSizeId,
                productId: item.productId,
                isActive: true,
                stock: { gte: item.quantity },
              },
              data: { stock: { decrement: item.quantity } },
            });
            if (sizeReserved.count !== 1) {
              throw new OrderConflictError(
                `${item.productName} size ${item.sizeLabel} no longer has enough stock.`,
              );
            }
          } else {
            const nowHasSizes = await tx.productSize.count({
              where: { productId: item.productId, isActive: true },
            });
            if (nowHasSizes) {
              throw new OrderConflictError(
                `${item.productName} now requires a size, but this order has no size selected.`,
              );
            }
          }
          const reserved = await tx.product.updateMany({
            where: {
              id: item.productId,
              status: ProductStatus.PUBLISHED,
              availability: Availability.IN_STOCK,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (reserved.count !== 1) {
            throw new OrderConflictError(`${item.productName} no longer has enough stock.`);
          }
          await tx.product.updateMany({
            where: { id: item.productId, stock: 0 },
            data: { availability: Availability.OUT_OF_STOCK },
          });
        }
      }

      if (
        status === OrderStatus.CANCELLED &&
        current.status !== OrderStatus.PENDING
      ) {
        for (const item of current.items) {
          if (!item.productId) continue;
          if (item.productSizeId) {
            await tx.productSize.updateMany({
              where: { id: item.productSizeId, productId: item.productId },
              data: { stock: { increment: item.quantity } },
            });
            if (!item.productSize?.isActive) {
              const activeSizeCount = await tx.productSize.count({
                where: { productId: item.productId, isActive: true },
              });
              if (activeSizeCount > 0) continue;
            }
          }
          await tx.product.updateMany({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              availability: Availability.IN_STOCK,
            },
          });
        }
      }

      const changed = await tx.order.updateMany({
        where: { id, status: current.status },
        data: { status },
      });
      if (changed.count !== 1) {
        throw new OrderConflictError("This order was updated by another request. Refresh and try again.");
      }
      return tx.order.findUniqueOrThrow({ where: { id } });
    });

    return NextResponse.json(order);
  } catch (error) {
    return apiError(error, {
      context:"admin-order-status",
      defaultMessage:"We couldn’t update this order. Refresh the page and try again.",
      notFoundMessage:"This order no longer exists. Refresh the order list.",
    });
  }
}

function label(value: OrderStatus) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
