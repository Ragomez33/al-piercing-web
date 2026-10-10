/**
 * Demo seed for the studio's team (feature 012).
 *
 * Static data collection consumed by the local (demo) adapter, which persists it
 * under `alpi:team:v1` when the key is absent. The domain type lives in
 * `src/lib/types/domain.ts` (constitution: entities in `types/`, seeds in `data/`).
 * `avatarUrl` is empty so the public card renders the elegant placeholder.
 */
import type { TeamMember } from "../types/domain";

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Alba Pineda",
    role: "Piercer Principal",
    avatarUrl: "",
    bio: "Fundadora del estudio. Especialista en perforaciones de nariz y joyería de titanio ASTM F-136.",
    instagramHandle: "alpiercing",
    isActive: true,
    createdAt: "2024-01-10T10:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "Nicole Ríos",
    role: "Joyería Corporal",
    avatarUrl: "",
    bio: "Asesora de joyería y curaduría de combinaciones. Te ayuda a elegir la pieza ideal para tu anatomía.",
    instagramHandle: "nicole.joyeria",
    isActive: true,
    createdAt: "2024-03-22T10:00:00.000Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    name: "Diego Salas",
    role: "Técnico de Aftercare",
    avatarUrl: "",
    bio: "Seguimiento post-perforación y cuidados. Garantiza una cicatrización sana y acompañada.",
    instagramHandle: "",
    isActive: true,
    createdAt: "2024-06-05T10:00:00.000Z",
  },
];
