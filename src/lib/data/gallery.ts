/**
 * Fixed gallery seed for ALPIERCING (feature 016, demo data).
 * Reuses the original featured images so the demo gallery looks identical to the
 * old static teaser. Components never import this list directly — only the local
 * adapter (`createLocalAdapter`) seeds `alpi:gallery:v1` from it.
 */
import type { GalleryItemRecord } from "../types/domain";

export const GALLERY_SEED: GalleryItemRecord[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    title: "Helix Piercing",
    category: "HELIX",
    imageUrl: "/images/featured-1.svg",
    isActive: true,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    title: "Nostril Piercing",
    category: "NOSTRIL",
    imageUrl: "/images/featured-2.svg",
    isActive: true,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    title: "Navel Ring",
    category: "NAVEL",
    imageUrl: "/images/featured-3.svg",
    isActive: true,
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    title: "Joyería Titanio Premium",
    category: "TITANIO",
    imageUrl: "/images/featured-4.svg",
    isActive: true,
    createdAt: new Date(0).toISOString(),
  },
];