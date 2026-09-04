export const CATALOG_CATEGORIES = [
  { slug: "mens", name: "Men's" },
  { slug: "womens", name: "Women's" },
  { slug: "children", name: "Children" },
  { slug: "accessories", name: "Accessories" },
] as const;

export const CATALOG_CATEGORY_SLUGS = CATALOG_CATEGORIES.map(({ slug }) => slug);
export const CATALOG_CATEGORY_NAMES = CATALOG_CATEGORIES.map(({ name }) => name);

const categoryOrder = new Map<string, number>(
  CATALOG_CATEGORY_SLUGS.map((slug, index) => [slug, index]),
);

export function sortCatalogCategories<T extends { slug: string }>(categories: T[]) {
  return [...categories].sort(
    (left, right) =>
      (categoryOrder.get(left.slug) ?? Number.MAX_SAFE_INTEGER) -
      (categoryOrder.get(right.slug) ?? Number.MAX_SAFE_INTEGER),
  );
}
