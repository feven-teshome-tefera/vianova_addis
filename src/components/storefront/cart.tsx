"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { CartValidationResult } from "@/lib/cart-reconciliation";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: "ETB" | "USD";
  stock: number;
  image?: string;
  sizeId?: string;
  sizeLabel?: string;
};
export type CartItem = CartProduct & { lineId: string; quantity: number };
export type StoreSize = { id: string; label: string; stock: number };
type CartContextValue = {
  items: CartItem[];
  count: number;
  open: boolean;
  ready: boolean;
  validating: boolean;
  notice: string;
  setOpen: (open: boolean) => void;
  add: (product: CartProduct) => void;
  update: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  reconcile: () => Promise<void>;
  dismissNotice: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "via-nova-cart-v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpenState] = useState(false);
  const [ready, setReady] = useState(false);
  const [validating, setValidating] = useState(false);
  const [notice, setNotice] = useState("");
  const itemsRef = useRef<CartItem[]>([]);
  const validationVersion = useRef(0);
  const reconcileRef = useRef<() => Promise<void>>(async () => {});

  const commitItems = useCallback((update: (current: CartItem[]) => CartItem[]) => {
    setItems((current) => {
      const next = update(current);
      itemsRef.current = next;
      return next;
    });
  }, []);

  const reconcile = useCallback(async () => {
    const snapshot = itemsRef.current;
    if (!snapshot.length) return;

    const version = ++validationVersion.current;
    const signature = cartSignature(snapshot);
    setValidating(true);
    try {
      const response = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: snapshot.map(({ id, sizeId, quantity }) => ({ id, sizeId, quantity })),
        }),
      });
      if (!response.ok || version !== validationVersion.current) return;

      const result = parseValidationResult(await response.json());
      if (!result) return;
      if (signature !== cartSignature(itemsRef.current)) {
        queueMicrotask(() => void reconcileRef.current());
        return;
      }

      const changed = cartDetailsChanged(snapshot, result.items);
      commitItems(() => result.items);
      const messages: string[] = [];
      if (result.removed.length === 1) {
        messages.push("An unavailable item was removed from your bag.");
      } else if (result.removed.length > 1) {
        messages.push(`${result.removed.length} unavailable items were removed from your bag.`);
      }
      if (result.adjusted.length === 1) {
        messages.push("One quantity was adjusted to match current stock.");
      } else if (result.adjusted.length > 1) {
        messages.push("Some quantities were adjusted to match current stock.");
      }
      if (!messages.length && changed) {
        messages.push("Your bag was updated with the latest product details.");
      }
      if (messages.length) setNotice(messages.join(" "));
    } catch {
      // Keep the saved bag when the availability check cannot connect.
    } finally {
      if (version === validationVersion.current) setValidating(false);
    }
  }, [commitItems]);
  reconcileRef.current = reconcile;

  useEffect(() => {
    const saved = readSavedCart();
    itemsRef.current = saved;
    setItems(saved);
    if (saved.length) {
      void reconcileRef.current().finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [commitItems]);
  useEffect(() => {
    if (ready) localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, ready]);
  useEffect(() => {
    const refreshOnFocus = () => {
      if (itemsRef.current.length) void reconcileRef.current();
    };
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((count, item) => count + item.quantity, 0),
      open,
      ready,
      validating,
      notice,
      setOpen(next) {
        setOpenState(next);
        if (next) void reconcile();
      },
      add(product) {
        const lineId = cartLineId(product);
        commitItems((current) => {
          const existing = current.find((item) => item.lineId === lineId);
          return existing
            ? current.map((item) =>
                item.lineId === lineId
                  ? { ...item, quantity: Math.min(item.quantity + 1, item.stock) }
                  : item,
              )
            : [...current, { ...product, lineId, quantity: 1 }];
        });
      },
      update(lineId, quantity) {
        commitItems((current) =>
          current.map((item) =>
            item.lineId === lineId
              ? { ...item, quantity: Math.max(1, Math.min(quantity, item.stock)) }
              : item,
          ),
        );
      },
      remove(lineId) {
        commitItems((current) => current.filter((item) => item.lineId !== lineId));
      },
      clear() {
        commitItems(() => []);
      },
      reconcile,
      dismissNotice() {
        setNotice("");
      },
    }),
    [commitItems, items, notice, open, ready, reconcile, validating],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button
      className="sf-cart-button"
      onClick={() => setOpen(true)}
      aria-label={`Open cart with ${count} items`}
    >
      <ShoppingBag size={18} />
      {count > 0 && <em>{count}</em>}
    </button>
  );
}

export function CartNotice() {
  const { notice, dismissNotice } = useCart();
  if (!notice) return null;
  return (
    <div className="sf-cart-notice" role="status">
      <span>{notice}</span>
      <button type="button" onClick={dismissNotice} aria-label="Dismiss bag update"><X /></button>
    </div>
  );
}

export function AddToCartButton({
  product,
  sizes = [],
  compact = false,
}: {
  product: CartProduct;
  sizes?: StoreSize[];
  compact?: boolean;
}) {
  const { items, add, update, remove } = useCart();
  const [selectedSizeId, setSelectedSizeId] = useState("");
  const selectedSize = sizes.find((size) => size.id === selectedSizeId);
  const selectedProduct = selectedSize
    ? {
        ...product,
        stock: selectedSize.stock,
        sizeId: selectedSize.id,
        sizeLabel: selectedSize.label,
      }
    : product;
  const lineId = cartLineId(selectedProduct);
  const item = items.find((value) => value.lineId === lineId);

  const action = item ? (
    <div
      className={`sf-inline-quantity ${compact ? "compact" : ""}`}
      aria-label={`${product.name}${selectedSize ? ` size ${selectedSize.label}` : ""} quantity`}
    >
      <button
        onClick={() =>
          item.quantity === 1 ? remove(item.lineId) : update(item.lineId, item.quantity - 1)
        }
        aria-label={item.quantity === 1 ? `Remove ${product.name}` : `Decrease ${product.name} quantity`}
      >
        <Minus />
      </button>
      <span>{item.quantity}</span>
      <button
        onClick={() => update(item.lineId, item.quantity + 1)}
        disabled={item.quantity >= item.stock}
        aria-label={`Increase ${product.name} quantity`}
      >
        <Plus />
      </button>
    </div>
  ) : (
    <button
      className={compact ? "sf-card-add" : "sf-button sf-button-dark sf-add-cart"}
      disabled={sizes.length ? !selectedSize || selectedSize.stock < 1 : product.stock < 1}
      onClick={() => add(selectedProduct)}
    >
      {product.stock < 1 ? "Sold out" : sizes.length && !selectedSize ? "Choose a size" : "Add to bag"}
    </button>
  );

  if (!sizes.length) return action;
  return (
    <div className="sf-size-purchase">
      <div className="sf-size-heading">
        <span>Select size</span>
        {selectedSize && <small>{selectedSize.stock} available</small>}
      </div>
      <div className="sf-size-options">
        {sizes.map((size) => (
          <button
            type="button"
            key={size.id}
            className={selectedSizeId === size.id ? "selected" : ""}
            disabled={size.stock < 1}
            aria-pressed={selectedSizeId === size.id}
            onClick={() => setSelectedSizeId(size.id)}
          >
            {size.label}
            {size.stock < 1 && <small>Sold out</small>}
          </button>
        ))}
      </div>
      {action}
    </div>
  );
}

function CartDrawer() {
  const { items, count, open, setOpen, update, remove, validating } = useCart();
  const currencies = [...new Set(items.map((item) => item.currency))];
  const total =
    currencies.length === 1
      ? items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      : null;
  const checkoutBlocked = total === null || validating;

  return (
    <>
      <button
        aria-label="Close cart"
        className={`sf-cart-backdrop ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />
      <aside className={`sf-cart-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="sf-cart-head">
          <span>Your bag ({count})</span>
          <button onClick={() => setOpen(false)} aria-label="Close cart"><X /></button>
        </div>
        {validating && items.length > 0 && <p className="sf-cart-checking">Checking current availability…</p>}
        <CartNotice />
        {items.length === 0 ? (
          <div className="sf-cart-empty">
            <ShoppingBag />
            <h2>Your bag is empty.</h2>
            <button onClick={() => setOpen(false)}>Continue shopping</button>
          </div>
        ) : (
          <>
            <div className="sf-cart-items">
              {items.map((item) => (
                <article key={item.lineId}>
                  <div className="sf-cart-image">
                    {item.image ? <img src={item.image} alt="" /> : <span>{item.name.slice(0, 2)}</span>}
                  </div>
                  <div>
                    <Link href={`/shop/${item.slug}`} onClick={() => setOpen(false)}>{item.name}</Link>
                    {item.sizeLabel && <small>Size {item.sizeLabel}</small>}
                    <small>{money(item.price, item.currency)}</small>
                    <div className="sf-quantity">
                      <button onClick={() => item.quantity === 1 ? remove(item.lineId) : update(item.lineId, item.quantity - 1)}>
                        {item.quantity === 1 ? <Trash2 /> : <Minus />}
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => update(item.lineId, item.quantity + 1)} disabled={item.quantity >= item.stock}>
                        <Plus />
                      </button>
                    </div>
                  </div>
                  <button className="sf-remove" onClick={() => remove(item.lineId)} aria-label={`Remove ${item.name}`}><X /></button>
                </article>
              ))}
            </div>
            <div className="sf-cart-foot">
              <span className="sf-checkout-label">Ready to order?</span>
              <div><span>Subtotal</span><strong>{total === null ? "Separate currencies" : money(total, currencies[0])}</strong></div>
              {total === null && <p>Products with different currencies must be checked out separately.</p>}
              <Link
                className={`sf-button sf-button-dark sf-checkout-button ${checkoutBlocked ? "disabled" : ""}`}
                href={checkoutBlocked ? "#" : "/checkout"}
                onClick={() => !checkoutBlocked && setOpen(false)}
              >
                {validating ? "Checking bag…" : "Proceed to checkout"}
              </Link>
              <small>Enter delivery details and place the order. Online payments are coming soon.</small>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function cartLineId(product: Pick<CartProduct, "id" | "sizeId">) {
  return `${product.id}:${product.sizeId ?? "default"}`;
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "ETB" ? 0 : 2,
  }).format(value);
}

function readSavedCart() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    const items = new Map<string, CartItem>();
    for (const entry of value) {
      const item = cartItemFromUnknown(entry);
      if (item && !items.has(item.lineId)) items.set(item.lineId, item);
    }
    return [...items.values()];
  } catch {
    return [];
  }
}

function parseValidationResult(value: unknown): CartValidationResult | null {
  if (!isRecord(value) || !Array.isArray(value.items) || !Array.isArray(value.removed) || !Array.isArray(value.adjusted)) {
    return null;
  }
  const items = value.items.map(cartItemFromUnknown);
  if (items.some((item) => !item)) return null;
  return {
    items: items as CartItem[],
    removed: value.removed as CartValidationResult["removed"],
    adjusted: value.adjusted as CartValidationResult["adjusted"],
  };
}

function cartItemFromUnknown(value: unknown): CartItem | null {
  if (!isRecord(value)) return null;
  const { id, slug, name, price, currency, stock, quantity } = value;
  if (
    typeof id !== "string" || !id ||
    typeof slug !== "string" || !slug ||
    typeof name !== "string" || !name ||
    typeof price !== "number" || !Number.isFinite(price) || price < 0 ||
    (currency !== "ETB" && currency !== "USD") ||
    typeof stock !== "number" || !Number.isInteger(stock) || stock < 0 ||
    typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1
  ) return null;
  const sizeId = typeof value.sizeId === "string" && value.sizeId ? value.sizeId : undefined;
  return {
    id,
    slug,
    name,
    price,
    currency,
    stock,
    quantity,
    lineId: cartLineId({ id, sizeId }),
    image: typeof value.image === "string" && value.image ? value.image : undefined,
    sizeId,
    sizeLabel: typeof value.sizeLabel === "string" && value.sizeLabel ? value.sizeLabel : undefined,
  };
}

function cartSignature(items: CartItem[]) {
  return items.map(({ id, sizeId, quantity }) => `${id}:${sizeId ?? "default"}:${quantity}`).join("|");
}

function cartDetailsChanged(previous: CartItem[], next: CartItem[]) {
  if (previous.length !== next.length) return true;
  const current = new Map(previous.map((item) => [item.lineId, item]));
  return next.some((item) => {
    const before = current.get(item.lineId);
    return !before || before.slug !== item.slug || before.name !== item.name ||
      before.price !== item.price || before.currency !== item.currency ||
      before.stock !== item.stock || before.image !== item.image ||
      before.sizeLabel !== item.sizeLabel || before.quantity !== item.quantity;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
