import {
  Availability,
  Currency,
  Platform,
  PrismaClient,
  ProductStatus,
  PublicationStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const categories = {
  mens: "Men's",
  womens: "Women's",
  children: "Children",
  accessories: "Accessories",
} as const;

const catalog = [
  ["Italian Linen Blazer", "mens", 8500, Currency.ETB, 12, ProductStatus.PUBLISHED],
  ["Classic Oxford Shirt", "mens", 4200, Currency.ETB, 20, ProductStatus.PUBLISHED],
  ["Silk Midi Dress", "womens", 9800, Currency.ETB, 8, ProductStatus.PUBLISHED],
  ["Tailored Wool Coat", "womens", 14500, Currency.ETB, 5, ProductStatus.SCHEDULED],
  ["Children's Cotton Cardigan", "children", 3200, Currency.ETB, 15, ProductStatus.PUBLISHED],
  ["Kids Leather Sneakers", "children", 4600, Currency.ETB, 10, ProductStatus.DRAFT],
  ["Italian Leather Handbag", "accessories", 11800, Currency.ETB, 7, ProductStatus.PUBLISHED],
  ["Printed Silk Scarf", "accessories", 2800, Currency.ETB, 18, ProductStatus.PUBLISHED],
] as const;

async function main() {
  await prisma.publication.deleteMany();
  await prisma.productMedia.deleteMany();
  await prisma.platformContent.deleteMany();
  await prisma.productSize.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  for (const [slug, name] of Object.entries(categories)) {
    await prisma.category.create({ data: { slug, name } });
  }

  for (const [name, categorySlug, price, currency, stock, status] of catalog) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: categorySlug } });
    const product = await prisma.product.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""),
        description: `A thoughtfully selected ${name.toLowerCase()} from our Italian collection.`,
        shortDescription: `Discover our ${name.toLowerCase()}.`,
        price,
        currency,
        stock,
        availability: stock ? Availability.IN_STOCK : Availability.OUT_OF_STOCK,
        status,
        categoryId: category.id,
      },
    });

    if (status === ProductStatus.PUBLISHED) {
      await prisma.publication.createMany({
        data: [
          { productId: product.id, platform: Platform.WEBSITE, status: PublicationStatus.PUBLISHED, publishedAt: new Date() },
          { productId: product.id, platform: Platform.TELEGRAM, status: PublicationStatus.PUBLISHED, publishedAt: new Date() },
        ],
      });
    }

    if (status === ProductStatus.SCHEDULED) {
      await prisma.publication.create({
        data: {
          productId: product.id,
          platform: Platform.INSTAGRAM,
          status: PublicationStatus.SCHEDULED,
          scheduledAt: new Date(Date.now() + 86_400_000),
        },
      });
    }
  }

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "Amina Mohammed" },
  });
}

main().finally(() => prisma.$disconnect());
