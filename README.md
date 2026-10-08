# ALPIERCING — Web

Mono-tienda para un estudio de perforaciones y joyería corporal. Construida con **Astro + Svelte 5 + TypeScript**, con salida estática (`output: "static"`).

## Módulos

| Ruta | Módulo | Descripción |
| --- | --- | --- |
| `/` | Landing | Hero, lista de servicios estilo Setmore (por categoría), galería de trabajos y bloque de proceso |
| `/catalog` | Catálogo | Argollas/labrets, zirconia & navel y aftercare con carrito flotante y checkout por WhatsApp |
| `/booking` | Reservar | Flujo servicio → fecha/hora (bloquea slots ocupados) → datos → seña 50% → mensaje pre-llenado a WhatsApp |
| `/admin` | Panel | Protegido por PIN: pestaña Agenda/Citas (confirmar, cancelar, filtro por fecha) e Inventario (stock inline, publicar/ocultar, alta de productos) |

## Datos (capa híbrida)

Todo se lee/escribe mediante `src/lib/data/store.ts`:

- **Modo Demo** (por defecto): si no hay `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`, usa
  `localStorage` (`alpi:bookings:v1` / `alpi:products:v1`) sembrado con el contenido estático.
- **Modo Producción**: si ambos `PUBLIC_*` existen, conmuta automáticamente a Supabase (migración en
  `supabase/migrations/0001_init.sql`).

## Estructura

```text
src/
├── components/
│   ├── admin/AdminPanel.svelte       # Island del panel (PIN + agenda + inventario)
│   ├── booking/BookingFlow.svelte    # Island del flujo de reserva + seña
│   ├── canvas/InkBackgroundCanvas.svelte
│   ├── catalog/CatalogGrid.svelte    # Grilla store-driven (fallback SSR)
│   ├── catalog/ProductCard.svelte
│   ├── catalog/CartDrawer.svelte
│   └── ui/AppHeader.astro
├── layouts/BaseLayout.astro
├── lib/
│   ├── config.ts                     # WhatsApp, PIN y datos de pago (env-overridable)
│   ├── data/store.ts                 # Capa híbrida unificada (modo demo/producción)
│   ├── data/adapters/{local,supabase}.ts
│   ├── data/services.ts              # PIERCING_SERVICES (menú fijo)
│   ├── types/{content,domain}.ts     # Contenido + Booking/ProductRecord/DataStore
│   └── utils/{money,booking,dates}.ts
├── pages/{index,catalog,booking,admin}.astro
├── stores/cart.ts
└── styles/tokens.css                # Única fuente de estilo (CSS Custom Properties)
```

## Personalización de marca

Todos los colores, radios y sombras viven en **`src/styles/tokens.css`**. Cambiar la paleta del cliente
es editar ese único archivo: los componentes consumen exclusivamente `var(--token)`.

Antes de publicar, reemplaza el placeholder de WhatsApp en `src/lib/config.ts` (`WHATSAPP_PHONE`, solo
dígitos con código de país).

## Comandos

```bash
npm install
npm run dev       # servidor de desarrollo
npm run check     # astro check (TypeScript estricto)
npm run build     # build estático a dist/
npm run preview
```
