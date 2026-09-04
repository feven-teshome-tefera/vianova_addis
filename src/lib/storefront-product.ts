export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: "ETB" | "USD";
  stock: number;
  availability: "IN_STOCK" | "OUT_OF_STOCK";
  category: { name: string };
  media: Array<{
    id: string;
    type: "IMAGE" | "VIDEO";
    url: string;
    isPrimary: boolean;
  }>;
  sizes: Array<{
    id: string;
    label: string;
    stock: number;
  }>;
};

export function toStoreProduct(product: {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: unknown;
  currency: StoreProduct["currency"];
  stock: number;
  availability: StoreProduct["availability"];
  category: { name: string };
  media: StoreProduct["media"];
  sizes: StoreProduct["sizes"];
}): StoreProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    currency: product.currency,
    stock: product.stock,
    availability: product.availability,
    category: { name: product.category.name },
    media: product.media.map(({ id, type, url, isPrimary }) => ({
      id,
      type,
      url,
      isPrimary,
    })),
    sizes: product.sizes.map(({ id, label, stock }) => ({ id, label, stock })),
  };
}
