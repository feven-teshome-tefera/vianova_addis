import { Availability, Prisma, ProductStatus } from "@prisma/client";
import { z } from "zod";
import { PublicApiError } from "@/lib/api";
import { db } from "@/lib/db";

const checkoutItemsSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      sizeId: z.string().min(1).optional(),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .min(1)
  .max(50)
  .superRefine((items, context) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      const lineId = `${item.id}:${item.sizeId ?? "default"}`;
      if (seen.has(lineId)) {
        context.addIssue({
          code: "custom",
          path: [index],
          message: "The same product and size cannot appear more than once.",
        });
      }
      seen.add(lineId);
    });
  });

const customerSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.")]).optional(),
    phone: z
      .string()
      .trim()
      .regex(
        /^(09|07)\d{8}$/,
        "Phone must start with 09 or 07 and contain exactly 10 digits.",
      ),
    address: z.string().trim().max(180).optional(),
    deliveryNotes: z.string().trim().max(300).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .superRefine((customer, context) => {
    const hasLatitude = customer.latitude !== undefined;
    const hasLongitude = customer.longitude !== undefined;
    const hasLocation = hasLatitude && hasLongitude;
    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: "custom",
        path: [hasLatitude ? "longitude" : "latitude"],
        message: "Latitude and longitude must be provided together.",
      });
    }
    if (!hasLocation && (!customer.address || customer.address.length < 5)) {
      context.addIssue({
        code: "custom",
        path: ["address"],
        message: "Enter a delivery address when location is unavailable.",
      });
    }
    if (
      hasLocation &&
      distanceFromAddis(customer.latitude!, customer.longitude!) > 30
    ) {
      context.addIssue({
        code: "custom",
        path: ["latitude"],
        message: "Via Nova currently delivers only within Addis Ababa.",
      });
    }
  });

export const checkoutSchema = z.object({
  requestId: z.string().uuid(),
  items: checkoutItemsSchema,
  customer: customerSchema,
});

export async function resolveCheckout(input: unknown) {
  const parsed = checkoutSchema.parse(input);
  const ids = [...new Set(parsed.items.map((item) => item.id))];
  const products = await db.product.findMany({
    where: {
      id: { in: ids },
      status: ProductStatus.PUBLISHED,
      availability: Availability.IN_STOCK,
    },
    include: {
      sizes: {
        where: { isActive: true },
        orderBy: { position: "asc" },
      },
    },
  });
  if (products.length !== ids.length) {
    throw new PublicApiError(
      409,
      "One or more products are no longer available. Review your bag and try again.",
      "CART_CHANGED",
    );
  }

  const lines = parsed.items.map((item) => {
    const product = products.find((value) => value.id === item.id)!;
    const size = item.sizeId
      ? product.sizes.find((value) => value.id === item.sizeId)
      : undefined;

    if (product.sizes.length && !item.sizeId) {
      throw new PublicApiError(409, `Choose a size for ${product.name}.`, "SIZE_REQUIRED");
    }
    if (!product.sizes.length && item.sizeId) {
      throw new PublicApiError(
        409,
        `${product.name} no longer uses sizes. Remove it from your bag and add it again.`,
        "CART_CHANGED",
      );
    }
    if (item.sizeId && !size) {
      throw new PublicApiError(
        409,
        `The selected size for ${product.name} is no longer available. Choose another size.`,
        "SIZE_UNAVAILABLE",
      );
    }

    const available = size?.stock ?? product.stock;
    if (item.quantity > available) {
      throw new PublicApiError(
        409,
        `${product.name}${size ? ` size ${size.label}` : ""} only has ${available} available. Update the quantity and try again.`,
        "INSUFFICIENT_STOCK",
      );
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      sizeId: size?.id,
      sizeLabel: size?.label,
      quantity: item.quantity,
      unitAmount: product.price,
      currency: product.currency,
    };
  });

  const currencies = [...new Set(lines.map((line) => line.currency))];
  if (currencies.length !== 1) {
    throw new PublicApiError(
      422,
      "Products using different currencies must be ordered separately.",
      "MIXED_CURRENCIES",
    );
  }

  return {
    ...parsed,
    lines,
    currency: currencies[0],
    total: lines.reduce(
      (sum, line) => sum.plus(line.unitAmount.mul(line.quantity)),
      new Prisma.Decimal(0),
    ),
  };
}

export function checkoutOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
}

function distanceFromAddis(latitude: number, longitude: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const center = { latitude: 9.03, longitude: 38.74 };
  const dLat = toRad(latitude - center.latitude);
  const dLon = toRad(longitude - center.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(center.latitude)) *
      Math.cos(toRad(latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
