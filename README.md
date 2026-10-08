# ALPIERCING — Web

Mono-tienda para un estudio de perforaciones y joyería corporal. Construida con **Astro + Svelte 5 + TypeScript**, con salida estática (`output: "static"`).

## Módulos

| Ruta | Módulo | Descripción |
| --- | --- | --- |
| `/` | Landing | Hero, lista de servicios estilo Setmore (por categoría), galería de trabajos y bloque de proceso |
| `/catalog` | Catálogo | Joyería de titanio, aftercare e insumos con carrito flotante y checkout por WhatsApp |
| `/booking` | Reservar | Flujo servicio → fecha/hora → datos → seña 50% → mensaje pre-llenado a WhatsApp |
| `/admin` | Panel | Vista privada del estudio (servicios, catálogo y stock) |

## Estructura

```text
src/
├── components/
│   ├── booking/BookingFlow.svelte   # Island del flujo de reserva + seña
│   ├── canvas/InkBackgroundCanvas.svelte
│   ├── catalog/ProductCard.svelte
│   ├── catalog/CartDrawer.svelte
│   └── ui/AppHeader.astro
├── layouts/BaseLayout.astro
├── lib/
│   ├── config.ts                    # WHATSAPP_PHONE
│   ├── data/services.ts             # PIERCING_SERVICES (menú fijo)
│   ├── types/content.ts             # Perfil, galería, proceso y productos
│   └── utils/{money,booking}.ts     # Centavos enteros + mensaje de reserva
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
