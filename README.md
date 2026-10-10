# ALPIERCING — Web

Mono-tienda para un estudio de perforaciones y joyería corporal. Construida con **Astro + Svelte 5 + TypeScript**, con salida estática (`output: "static"`).

## Módulos

| Ruta | Módulo | Descripción |
| --- | --- | --- |
| `/` | Landing | Hero, lista de servicios estilo Setmore (por categoría), **galería gestionada "Nuestro trabajo"** (mosaico + lightbox, live-sync), bloque de proceso y sección **Nuestro Equipo / Artistas** (datos gestionados) |
| `/landing-v2` | Landing alternativa | Variante Setmore de **scroll continuo**: barra de anclas + grid de 2 columnas con **tarjeta lateral sticky** (horario en vivo, valoración, "Reservar mi cita"). Reutiliza la misma capa de datos y sincroniza servicios/equipo/galería en vivo; `/` queda intacta para comparar |
| `/catalog` | Catálogo | Argollas/labrets, zirconia & navel y aftercare con carrito flotante y checkout por WhatsApp |
| `/booking` | Reservar | Flujo servicio → fecha/hora (bloquea slots ocupados) → datos → adelanto 50%. Al enviar **persiste la solicitud como `PENDING`** (bloquea el horario al instante) y muestra un panel de éxito con un aviso opcional por WhatsApp (ya no abre WhatsApp automáticamente) |
| `/admin` | Panel | Protegido por login (Supabase Auth): layout **dashboard** con sidebar lateral (o drawer en móvil) y navegación vertical. **Calendario** mensual (grilla con badges/dots por día, detalle del día, aprobar/cancelar/reagendar, bloqueos), **Inventario** (stock inline, publicar/ocultar, alta de productos), **Servicios** (CRUD del menú), **Galería** (subir/activar/desactivar/eliminar fotos) y **Equipo** (CRUD del staff) |

## Datos (capa híbrida)

Todo se lee/escribe mediante `src/lib/data/store.ts`:

- **Modo Demo** (por defecto): si no hay `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`, usa
  `localStorage` (`alpi:bookings:v1` / `alpi:timeblocks:v1` / `alpi:products:v1` / `alpi:services:v1` /
  `alpi:team:v1` / `alpi:gallery:v1`) sembrado con el contenido estático.
- **Modo Producción**: si ambos `PUBLIC_*` existen, conmuta automáticamente a Supabase (migraciones en
  `supabase/migrations/`: `0001`–`0004` del esquema base + `0005_services.sql` del menú de servicios +
  `0006_team_members.sql` del equipo + `0007_gallery.sql` de la galería).
- Los servicios, el equipo y la galería son datos gestionados: el frontend (`BookingFlow`, landings,
  `AdminCalendar`, `TeamSection`, `LandingGallery`) los lee con `dataStore.listServices()` /
  `dataStore.listTeamMembers()` / `dataStore.listGalleryItems()` (nunca importa listas hardcodeadas);
  si la consulta falla, cae al seed demo servido por la capa de datos.
- Las transiciones de estado de las reservas pasan por el servicio de dominio
  `src/lib/services/booking.ts` (`submitBookingRequest` / `approveBooking` / `cancelBooking`); los
  componentes no llaman a Supabase directamente.

## Estructura

```text
src/
├── components/
│   ├── admin/AdminPanel.svelte       # Island del panel (login + calendario + inventario + servicios + galería + equipo)
│   ├── admin/AdminCalendar.svelte    # Calendario mensual (grilla escritorio + franja/lista móvil)
│   ├── booking/BookingFlow.svelte    # Island del flujo de reserva + adelanto
│   ├── canvas/InkBackgroundCanvas.svelte
│   ├── catalog/CatalogGrid.svelte    # Grilla store-driven (fallback SSR)
│   ├── catalog/ProductCard.svelte
│   ├── catalog/CartDrawer.svelte
│   ├── landing/LandingV2Services.svelte # Acordeón de servicios de /landing-v2 (client:load)
│   ├── landing/LandingV2Sidebar.svelte  # Tarjeta sticky con horario en vivo (client:load)
│   ├── landing/LandingGallery.svelte    # Galería pública: mosaico + lightbox (client:load)
│   ├── team/TeamSection.svelte       # Island de la sección "Nuestro Equipo" (client:visible)
│   ├── SEO.astro                     # Metadata <head> reutilizable (OG/Twitter/canonical/robots)
│   └── ui/{AppHeader.astro,MobileNav.svelte}  # Header público + drawer hamburguesa (client:load)
├── layouts/BaseLayout.astro          # Incluye <SEO/> + JSON-LD LocalBusiness
├── lib/
│   ├── config.ts                     # WhatsApp, pagos y constantes SEO (env-overridable)
│   ├── seo.ts                        # URL del sitio, defaults y builder JSON-LD LocalBusiness
│   ├── data/store.ts                 # Capa híbrida unificada (modo demo/producción)
│   ├── data/realtime.ts              # Pub/sub de cambios (BroadcastChannel / Supabase Realtime)
│   ├── data/gallery.ts               # Seed GALLERY_SEED de la galería (demo)
│   ├── data/adapters/{local,supabase}.ts
│   ├── data/services.ts              # PiercingService/NewServiceInput + seed PIERCING_SERVICES (UUIDs)
│   ├── data/team.ts                  # Seed TEAM_MEMBERS del equipo (UUIDs)
│   ├── services/{booking,storage}.ts # Dominio (reservas) + subida de imágenes (producto/avatar)
│   ├── types/{content,domain}.ts     # Contenido + Booking/ProductRecord/TeamMember/GalleryItemRecord/DataStore
│   └── utils/{money,booking,dates,calendar,hours}.ts
├── pages/{index,landing-v2,catalog,booking,admin}.astro
├── pages/robots.txt.ts               # robots.txt generado (Sitemap absoluto desde SITE)
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

## SEO

Metadatos y rastreo centralizados (feature 014), sin coste de runtime (todo se genera en el build):

- **Metadata por página**: `src/components/SEO.astro` (usado por `BaseLayout.astro`) emite `title`,
  `description`, `robots` (`index, follow`; `noindex` para `/admin`), canonical absoluto, **OpenGraph**
  y **Twitter Cards**, con fallbacks desde `STUDIO_PROFILE` / `src/lib/config.ts`. Cada página pública
  pasa su propia `title`/`description`.
- **Datos estructurados**: `src/lib/seo.ts` construye un único JSON-LD `LocalBusiness`
  (`BeautySalon`/`TattooShop`) con nombre, logo, imagen, teléfono, dirección, `priceRange: "$$"`,
  `sameAs` (Instagram), horario y `potentialAction` de reserva; las coordenadas se incluyen solo si se
  configuran.
- **robots.txt**: generado por `src/pages/robots.txt.ts` (permite el sitio público, bloquea `/admin` y
  referencia el sitemap con URL absoluta).
- **Sitemap**: `@astrojs/sitemap` genera `sitemap-index.xml` en cada build y excluye `/admin`.
- **URL base**: variable de entorno `SITE` (ej. `SITE=https://alpiercing.com`); alimenta canonical,
  OpenGraph, JSON-LD, `robots.txt` y el sitemap. Fallback: `https://alpiercing.com`.

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
   Environment Variables*; en Netlify → *Site configuration → Environment variables*). Definí `SITE`
   con la URL pública real para que canonical, OpenGraph, JSON-LD, `robots.txt` y el sitemap usen el
   dominio correcto.
2. Dejar `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY` **vacías** para el **Modo Demo**
   (persistencia en `localStorage` del navegador).
3. Para **Modo Producción** con Supabase:
   - Crear el proyecto en Supabase.
   - Aplicar las migraciones (`supabase db push`, o ejecutarlas en el SQL Editor). El esquema base son
     `0001`–`0004`; `0005_services.sql` agrega el menú de servicios gestionado y `0006_team_members.sql`
     agrega el equipo (`public.team_members`, RLS: lectura pública de activos, escritura autenticada).
   - Cargar en el hosting `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` (clave `anon`, no la `service_role`).
4. Build: `npm run build` (directorio de publicación: `dist`).
