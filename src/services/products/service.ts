import { Availability } from "@prisma/client";
import { db } from "@/lib/db";
import { productSchema, type ProductInput } from "@/lib/validation/product";
import { slugify } from "@/lib/api";

type SizeInput = ProductInput["sizes"][number];

export async function createProduct(input: unknown) {
  const data = productSchema.parse(input);
  const sizes = normalizeSizes(data.sizes);
  const stock = sizes.length ? totalSizeStock(sizes) : data.stock;
  const availability = stock === 0 ? Availability.OUT_OF_STOCK : data.availability;

  return db.product.create({
    data: {
      name: data.name,
      slug: `${slugify(data.name)}-${Date.now().toString(36)}`,
      description: data.description,
      shortDescription: data.shortDescription || null,
      sku: data.sku || null,
      price: data.price,
      currency: data.currency,
      stock,
      availability,
      categoryId: data.categoryId,
      sizes: {
        create: sizes.map((size, position) => ({ ...size, position })),
      },
      platformContent: {
        create: (data.platformContent ?? []).map((content) => ({
          ...content,
          ctaUrl: content.ctaUrl || null,
        })),
      },
    },
    include: { category: true, media: true, sizes: true, platformContent: true },
  });
}

export async function updateProduct(id: string, input: unknown) {
  const data = productSchema.partial().parse(input) as Partial<ProductInput>;

  return db.$transaction(async (tx) => {
    const current = await tx.product.findUniqueOrThrow({ where: { id } });
    const sizes = data.sizes === undefined ? undefined : normalizeSizes(data.sizes);
    const stock = sizes
      ? sizes.length
        ? totalSizeStock(sizes)
        : data.stock ?? current.stock
      : data.stock;
    const availability =
      stock === 0
        ? Availability.OUT_OF_STOCK
        : data.availability ?? current.availability;

    const product = await tx.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        shortDescription:
          data.shortDescription === undefined ? undefined : data.shortDescription || null,
        sku: data.sku === undefined ? undefined : data.sku || null,
        price: data.price,
        currency: data.currency,
        stock,
        availability,
        categoryId: data.categoryId,
      },
    });

    if (sizes) {
      const activeLabels: string[] = [];
      for (const [position, size] of sizes.entries()) {
        activeLabels.push(size.label);
        await tx.productSize.upsert({
          where: { productId_label: { productId: id, label: size.label } },
          create: { productId: id, ...size, position, isActive: true },
          update: { stock: size.stock, position, isActive: true },
        });
      }
      await tx.productSize.updateMany({
        where: {
          productId: id,
          isActive: true,
          ...(activeLabels.length ? { label: { notIn: activeLabels } } : {}),
        },
        data: { isActive: false, stock: 0 },
      });
    }

    if (data.platformContent) {
      for (const content of data.platformContent) {
        await tx.platformContent.upsert({
          where: { productId_platform: { productId: id, platform: content.platform } },
          create: { productId: id, ...content, ctaUrl: content.ctaUrl || null },
          update: {
            caption: content.caption,
            hashtags: content.hashtags,
            ctaText: content.ctaText,
            ctaUrl: content.ctaUrl || null,
          },
        });
      }
    }

    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      include: {
        category: true,
        media: true,
        sizes: { where: { isActive: true }, orderBy: { position: "asc" } },
        platformContent: true,
      },
    });
  });
}

function normalizeSizes(sizes: SizeInput[]) {
  return sizes.map((size) => ({
    label: size.label.trim().toLocaleUpperCase(),
    stock: size.stock,
  }));
}

function totalSizeStock(sizes: Array<{ stock: number }>) {
  return sizes.reduce((total, size) => total + size.stock, 0);
}
