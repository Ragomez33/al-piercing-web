/**
 * Fixed service catalog for ALPIERCING (single-store).
 * Setmore-style list grouped by the categories shown at the physical stand:
 * NOSTRIL, HELIX, NAVEL and TITANIO (premium ASTM F-136 titanium line).
 * Money is stored as integer cents (constitution Principle IV).
 */
export type PiercingServiceCategory = "NOSTRIL" | "HELIX" | "NAVEL" | "TITANIO";

export interface PiercingService {
  id: string;
  name: string;
  category: PiercingServiceCategory;
  priceCents: number;
  durationMinutes: number;
  description: string;
  requiresDeposit: boolean;
}

export interface PiercingServiceCategoryInfo {
  id: PiercingServiceCategory;
  label: string;
  description: string;
}

export const PIERCING_SERVICE_CATEGORIES: PiercingServiceCategoryInfo[] = [
  { id: "NOSTRIL", label: "NOSTRIL", description: "Piercing de Nariz" },
  { id: "HELIX", label: "HELIX", description: "Cartílago de Oreja" },
  { id: "NAVEL", label: "NAVEL", description: "Piercing de Ombligo" },
  {
    id: "TITANIO",
    label: "TITANIO",
    description: "Perforación + Joyería Premium Titanio ASTM F-136",
  },
];

export const PIERCING_SERVICES: PiercingService[] = [
  {
    id: "nostril",
    name: "Nostril Piercing",
    category: "NOSTRIL",
    priceCents: 2500, // $25.00
    durationMinutes: 30,
    description: "Perforación lateral de la nariz con joya inicial de titanio.",
    requiresDeposit: true,
  },
  {
    id: "septum",
    name: "Septum Piercing",
    category: "NOSTRIL",
    priceCents: 3000, // $30.00
    durationMinutes: 30,
    description: "Perforación del tabique nasal con argolla o herradura de titanio.",
    requiresDeposit: true,
  },
  {
    id: "helix",
    name: "Helix Piercing",
    category: "HELIX",
    priceCents: 2500, // $25.00
    durationMinutes: 30,
    description: "Perforación en el cartílago superior de la oreja.",
    requiresDeposit: true,
  },
  {
    id: "conch",
    name: "Conch Piercing",
    category: "HELIX",
    priceCents: 3000, // $30.00
    durationMinutes: 30,
    description: "Perforación en la concha del cartílago auricular con joya de titanio.",
    requiresDeposit: true,
  },
  {
    id: "navel",
    name: "Navel Piercing",
    category: "NAVEL",
    priceCents: 3200, // $32.00
    durationMinutes: 35,
    description: "Perforación del ombligo con navel ring de titanio.",
    requiresDeposit: true,
  },
  {
    id: "titanio-premium",
    name: "Perforación Premium + Titanio ASTM F-136",
    category: "TITANIO",
    priceCents: 4500, // $45.00
    durationMinutes: 45,
    description:
      "Perforación con joyería premium de titanio ASTM F-136 (grado implante) y zirconia.",
    requiresDeposit: true,
  },
];
