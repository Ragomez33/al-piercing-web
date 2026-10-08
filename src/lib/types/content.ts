/**
 * Typed content model for the site shell, landing page and catalog.
 * Single source of truth for the mono-store ALPIERCING content.
 */
export type Route = "/" | "/catalog" | "/booking" | "/admin";

export interface NavigationItem {
  label: string;
  href: Route;
}

export interface StudioProfile {
  brand: string;
  tagline: string;
  bio: string;
  location: string;
}

export interface GalleryItem {
  image: string; // asset reference
  alt: string; // descriptive, REQUIRED
  label?: string;
}

export interface ProcessStep {
  order: 1 | 2 | 3;
  title: string;
  description: string;
}

export const NAV_ITEMS: NavigationItem[] = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalog" },
  { label: "Reservar", href: "/booking" },
];

export const STUDIO_PROFILE: StudioProfile = {
  brand: "ALPIERCING",
  tagline: "TRAINING / PIERCING STUDIO",
  bio: "Estudio de perforaciones y joyería corporal. Trabajamos con titanio ASTM F-136 grado implante, técnica estéril y asesoría de joyería premium para cada anatomía.",
  location: "Ciudad de México, CDMX",
};

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    image: "/images/featured-1.svg",
    alt: "Piercing de helix con joyería dorada de titanio",
    label: "HELIX",
  },
  {
    image: "/images/featured-2.svg",
    alt: "Piercing de nostril con aro dorado",
    label: "NOSTRIL",
  },
  {
    image: "/images/featured-3.svg",
    alt: "Navel ring con zirconia sobre titanio",
    label: "NAVEL",
  },
  {
    image: "/images/featured-4.svg",
    alt: "Joyería premium de titanio ASTM F-136",
    label: "TITANIO",
  },
];

export const PROCESS_STEPS: ProcessStep[] = [
  {
    order: 1,
    title: "Consulta y Diseño",
    description: "Elegís la perforación y la joya de titanio; revisamos tu anatomía y los cuidados.",
  },
  {
    order: 2,
    title: "Reserva con Seña (50%)",
    description: "Seleccionás fecha y hora, y confirmás el turno abonando el 50% de la seña.",
  },
  {
    order: 3,
    title: "Perforación y Cuidados",
    description: "Perforamos con titanio ASTM F-136 estéril y te entregamos el kit de aftercare.",
  },
];

/**
 * Catalog content — typed model for the body-jewelry and aftercare shop.
 * Money fields are integer cents.
 */
export type ProductCategory = "Argollas & Labrets" | "Zirconia & Navel" | "Aftercare";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Argollas & Labrets",
  "Zirconia & Navel",
  "Aftercare",
];

export interface Product {
  /** REQUIRED, non-empty, unique across catalog */
  id: string;
  /** REQUIRED, non-empty */
  name: string;
  /** REQUIRED, integer ≥ 0 (money as integer cents) */
  priceCents: number;
  /** REQUIRED asset reference; missing media falls back to placeholder */
  image: string;
  /** REQUIRED category */
  category: ProductCategory;
  /** REQUIRED, integer ≥ 0 (units remaining) */
  stock: number;
}

export type PaymentMethod = "pago_movil" | "binance_pay" | "efectivo";

export interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "hoop-gold",
    name: "Argolla Titanio Dorado 1.2mm",
    priceCents: 1200,
    image: "/images/products/hoop-gold.svg",
    category: "Argollas & Labrets",
    stock: 15,
  },
  {
    id: "hoop-silver",
    name: "Argolla Titanio Plateado 1.2mm",
    priceCents: 1200,
    image: "/images/products/hoop-silver.svg",
    category: "Argollas & Labrets",
    stock: 12,
  },
  {
    id: "labret-gold",
    name: "Labret Titanio Dorado",
    priceCents: 1400,
    image: "/images/products/labret-gold.svg",
    category: "Argollas & Labrets",
    stock: 4,
  },
  {
    id: "navel-zirconia",
    name: "Navel Ring Zirconia",
    priceCents: 2200,
    image: "/images/products/navel-zirconia.svg",
    category: "Zirconia & Navel",
    stock: 8,
  },
  {
    id: "zirconia-top",
    name: "Top Zirconia Titanio",
    priceCents: 1800,
    image: "/images/products/zirconia-top.svg",
    category: "Zirconia & Navel",
    stock: 3,
  },
  {
    id: "aftercare-kit",
    name: "Kit Aftercare Post-Perforación",
    priceCents: 1600,
    image: "/images/products/aftercare-kit.svg",
    category: "Aftercare",
    stock: 10,
  },
  {
    id: "piercing-solution",
    name: "Solución Salina Estéril",
    priceCents: 900,
    image: "/images/products/piercing-solution.svg",
    category: "Aftercare",
    stock: 20,
  },
];

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: "pago_movil", label: "Pago Móvil" },
  { value: "binance_pay", label: "Binance Pay" },
  { value: "efectivo", label: "Efectivo" },
];

export function paymentMethodLabel(value: PaymentMethod): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}
