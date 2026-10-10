# ALPIERCING — Web

Mono-tienda para un estudio de perforaciones y joyería corporal. Construida con **Astro + Svelte 5 + TypeScript**, con salida estática (`output: "static"`).

## Módulos

| Ruta | Módulo | Descripción |
| --- | --- | --- |
| `/` | Landing | Hero, lista de servicios estilo Setmore (por categoría), galería de trabajos, bloque de proceso y sección **Nuestro Equipo / Artistas** (desde los datos gestionados) |
| `/landing-v2` | Landing alternativa | Variante minimalista estilo Setmore (perfil compacto + pestañas Servicios / Equipo / Proceso & Galería). Reutiliza la misma capa de datos y `/` queda intacta, para comparar ambas |
| `/catalog` | Catálogo | Argollas/labrets, zirconia & navel y aftercare con carrito flotante y checkout por WhatsApp |
| `/booking` | Reservar | Flujo servicio → fecha/hora (bloquea slots ocupados) → datos → seña 50%. Al enviar **persiste la solicitud como `PENDING`** (bloquea el horario al instante) y muestra un panel de éxito con un aviso opcional por WhatsApp (ya no abre WhatsApp automáticamente) |
| `/admin` | Panel | Protegido por login (Supabase Auth): layout **dashboard** con sidebar lateral (o drawer en móvil) y navegación vertical. **Calendario** mensual (grilla con badges/dots por día, detalle del día, aprobar/cancelar/reagendar, bloqueos), **Inventario** (stock inline, publicar/ocultar, alta de productos), **Servicios** (CRUD completo del menú) y **Equipo** (CRUD del staff con avatar, activar/desactivar y eliminar) |

## Datos (capa híbrida)

Todo se lee/escribe mediante `src/lib/data/store.ts`:

- **Modo Demo** (por defecto): si no hay `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`, usa
  `localStorage` (`alpi:bookings:v1` / `alpi:timeblocks:v1` / `alpi:products:v1` / `alpi:services:v1` /
  `alpi:team:v1`) sembrado con el contenido estático.
- **Modo Producción**: si ambos `PUBLIC_*` existen, conmuta automáticamente a Supabase (migraciones en
  `supabase/migrations/`: `0001`–`0004` del esquema base + `0005_services.sql` del menú de servicios +
  `0006_team_members.sql` del equipo).
- Los servicios y el equipo son datos gestionados: el frontend (`BookingFlow`, landing, `AdminCalendar`,
  `TeamSection`) los lee con `dataStore.listServices()` / `dataStore.listTeamMembers()` (nunca importa las
  listas hardcodeadas); si la consulta falla, cae al seed demo servido por la capa de datos.
- Las transiciones de estado de las reservas pasan por el servicio de dominio
  `src/lib/services/booking.ts` (`submitBookingRequest` / `approveBooking` / `cancelBooking`); los
  componentes no llaman a Supabase directamente.

## Estructura

```text
src/
├── components/
│   ├── admin/AdminPanel.svelte       # Island del panel (login + calendario + inventario + servicios + equipo)
│   ├── admin/AdminCalendar.svelte    # Calendario mensual (grilla escritorio + franja/lista móvil)
│   ├── booking/BookingFlow.svelte    # Island del flujo de reserva + seña
│   ├── canvas/InkBackgroundCanvas.svelte
│   ├── catalog/CatalogGrid.svelte    # Grilla store-driven (fallback SSR)
│   ├── catalog/ProductCard.svelte
│   ├── catalog/CartDrawer.svelte
│   ├── team/TeamSection.svelte       # Island de la sección "Nuestro Equipo" (client:visible)
│   └── ui/{AppHeader.astro,MobileNav.svelte}  # Header público + drawer hamburguesa (client:load)
├── layouts/BaseLayout.astro
├── lib/
│   ├── config.ts                     # WhatsApp y datos de pago (env-overridable)
│   ├── data/store.ts                 # Capa híbrida unificada (modo demo/producción)
│   ├── data/adapters/{local,supabase}.ts
│   ├── data/services.ts              # PiercingService/NewServiceInput + seed PIERCING_SERVICES (UUIDs)
│   ├── data/team.ts                  # Seed TEAM_MEMBERS del equipo (UUIDs)
│   ├── services/{booking,storage}.ts # Dominio (reservas) + subida de imágenes (producto/avatar)
│   ├── types/{content,domain}.ts     # Contenido + Booking/ProductRecord/TeamMember/DataStore
│   └── utils/{money,booking,dates,calendar}.ts
├── pages/{index,catalog,booking,admin}.astro
├── stores/cart.ts
└── styles/tokens.css                # Única fuente de estilo (CSS Custom Properties)
```

## Personalización de marca

Todos los colores, radios y sombras viven en **`src/styles/tokens.css`**. Cambiar la paleta del cliente
es editar ese único archivo: los componentes consumen exclusivamente `var(--token)`.

- **Isotipo/logo**: `public/images/logo.png`, referenciado como `BRAND_LOGO` en `src/lib/config.ts`;
  se usa en favicon/apple-touch, el dock de navegación pública, el header de administración
  ("ALPIERCING Admin") y el footer junto a la firma FORGE Labs.
- **Header público**: barra superior full-width sticky (dark glass, blur, borde inferior sutil) con la
  marca a la izquierda y la navegación a la derecha, estado activo en dorado; no se renderiza en
  `/admin`.
- **Footer**: sección independiente full-width con grilla de 3 columnas (marca + descripción, redes,
  créditos FORGE Labs).
- **Controles de formulario**: skin compartido `.input`/`.field` en `tokens.css` (superficie refinada,
  borde definido, foco dorado suave), compacto pero con alto mínimo de 44px.
- **Botones**: sistema Dark Gold con tokens (`--radius-btn`, `--glow-btn-primary`,
  `--bg-btn-secondary`, `--border-btn-secondary{,-hover}`).

Antes de publicar, reemplaza el placeholder de WhatsApp en `src/lib/config.ts` (`WHATSAPP_PHONE`, solo
dígitos con código de país).

## Comandos

```bash
npm install
npm run dev       # servidor de desarrollo
npm run check     # astro check (TypeScript estricto)
npm run lint      # ESLint (Svelte + TS)
npm run build     # build estático a dist/
npm run preview
```

> **Troubleshooting**: si en el navegador ves errores `ERR_ABORTED 504 (Outdated Optimize Dep)` o
> islands que no hidratan (ej. `/admin` colgado en "Verificando sesión…"), la caché de optimización
> de Vite está desactualizada. Detené el dev server y ejecutá:
>
> ```bash
> Remove-Item -Recurse -Force node_modules/.vite .astro   # PowerShell
> npm run dev
> ```
>
> Luego recargá la pestaña con `Ctrl+Shift+R`.

## Deploy

Salida estática (`dist/`). `vercel.json` y `netlify.toml` ya fueron preparados (Vercel/Netlify
autodetectan Astro).

1. Copiar `.env.example` y completar las variables (en Vercel → *Project → Settings →
   Environment Variables*; en Netlify → *Site configuration → Environment variables*).
2. Dejar `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` **vacías** para el **Modo Demo**
   (persistencia en `localStorage` del navegador).
3. Para **Modo Producción** con Supabase:
   - Crear el proyecto en Supabase.
   - Aplicar las migraciones (`supabase db push`, o ejecutarlas en el SQL Editor). El esquema base son
     `0001`–`0004`; `0005_services.sql` agrega el menú de servicios gestionado y `0006_team_members.sql`
     agrega el equipo (`public.team_members`, RLS: lectura pública de activos, escritura autenticada).
   - Cargar en el hosting `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` (clave `anon`, no la `service_role`).
4. Build: `npm run build` (directorio de publicación: `dist`).
