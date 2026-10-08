import { derived, writable } from "svelte/store";
import { paymentMethodLabel, type PaymentMethod, type Product } from "../lib/types/content";
import { formatCents } from "../lib/utils/money";

// Re-exported so components keep a single import surface for cart formatting.
export { formatCents };

/**
 * Cart store — client-side shopping state (specs/002-catalog-cart).
 * Money is integer cents end-to-end (constitution Principle IV).
 */
export interface CartItem {
  product: Product;
  quantity: number; // ≥ 1
}

export const cart = writable<CartItem[]>([]);

export const itemCount = derived(cart, (items) =>
  items.reduce((count, item) => count + item.quantity, 0),
);

export const totalCents = derived(cart, (items) =>
  items.reduce((total, item) => total + item.product.priceCents * item.quantity, 0),
);

/** Adds a product; if already present, increments its quantity (FR-002, no duplicate lines). */
export function addToCart(product: Product): void {
  cart.update((items) => {
    const existing = items.find((item) => item.product.id === product.id);
    if (existing) {
      return items.map((item) =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    }
    return [...items, { product, quantity: 1 }];
  });
}

export function removeFromCart(productId: string): void {
  cart.update((items) => items.filter((item) => item.product.id !== productId));
}

/** Adjusts a line quantity; a resulting quantity ≤ 0 removes the line (data-model rule). */
export function updateQuantity(productId: string, delta: number): void {
  cart.update((items) =>
    items
      .map((item) =>
        item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item,
      )
      .filter((item) => item.product.id !== productId || item.quantity > 0),
  );
}

export function clearCart(): void {
  cart.set([]);
}

/**
 * Builds the WhatsApp checkout link (contract: specs/002-catalog-cart/contracts/cart-contract.md §2).
 * Returns `null` when the cart is empty so the UI can disable checkout (FR-008).
 */
export function buildWhatsAppLink(options: {
  phone: string;
  items: CartItem[];
  paymentMethod: PaymentMethod;
}): string | null {
  const { phone, items, paymentMethod } = options;
  if (items.length === 0) return null;
  if (!/^[0-9]+$/.test(phone)) return null;

  const lines = items.map(
    (item) => `- ${item.quantity}x ${item.product.name} (${formatCents(item.product.priceCents)})`,
  );
  const total = items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
  const message = [
    "Hola! Quiero solicitar los siguientes productos:",
    ...lines,
    `Total: ${formatCents(total)}`,
    `Método de pago de preferencia: ${paymentMethodLabel(paymentMethod)}`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}