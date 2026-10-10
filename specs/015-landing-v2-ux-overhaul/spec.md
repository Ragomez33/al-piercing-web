# Feature Specification: Landing V2 UX Overhaul, Copy Alignment & Admin Loading States

**Feature Branch**: `015-landing-v2-ux-overhaul`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "Por favor ejecuta el siguiente lote de correcciones críticas de UX, copy y reestructuración de Landing V2: 1. Reestructuración Fiel de Landing V2 (src/pages/landing-v2.astro - Estilo Setmore): Layout continuo (scroll vertical + sidebar fijo) en lugar de pestañas; barra superior con enlaces de ancla (#servicios, #equipo, #acerca-de, #galeria, #direccion) con scroll suave; grid de 2 columnas (columna izquierda: política de reservas, servicios agrupados en acordeón, equipo, acerca de, galería, dirección/contacto; columna derecha sticky card con logo/avatar, horario 'Abierto • Cierra a las XX:XX', dirección 'El Tigre, Anzoátegui', valoración/reseñas y botón 'Reservar cita'); remover Instagram y WhatsApp de la card inicial; suscribirse a cambios del dataStore (subscribeToProductChanges / servicios / equipo) para actualización en tiempo real sin recarga. 2. Ajustes en Landing V1 (src/pages/index.astro): montar e integrar TeamSection.svelte. 3. Ajustes Globales de Copy & Configuración: reemplazar 'Seña' por 'Adelanto'/'Apartado' en todos los textos, BookingFlow, correos, WhatsApp y tooltips; actualizar STUDIO_PROFILE en src/lib/config.ts de 'CDMX / Ciudad de México' a 'El Tigre, Anzoátegui'; cambiar 'Reservar mi turno' por 'Reservar mi cita'. 4. UX de Eliminación & Loadings: corregir el flicker al eliminar o actualizar productos/servicios en /admin, mostrando loading inline o skeletons breves en la lista mientras el dataStore re-obtiene datos. Ejecutar npx astro check al finalizar."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the studio and book from a single continuous page (Priority: P1)

A first-time visitor opens the alternative landing page and sees the entire studio profile as one continuous, scrollable page. A compact top bar lets them jump straight to Services, Team, About, Gallery, Reviews or Address. On desktop, the main content scrolls on the left while a fixed summary card on the right always shows who the studio is, when it closes, where it is, how it is rated, and a prominent "Reservar cita" button. Services are grouped and can be expanded cleanly, and each service starts a booking.

**Why this priority**: This is the core re-imagining of the page (Setmore-style continuous profile) and delivers the page's primary value — discover the studio and book — on its own.

**Independent Test**: Open the alternative landing page on desktop and confirm the single-column continuous content plus the fixed sidebar card render; use each top-bar link and confirm the page scrolls smoothly to the matching section; scroll to a service and confirm booking starts with that service selected; shrink to mobile and confirm the layout collapses to one column with the sidebar content still reachable.

**Acceptance Scenarios**:

1. **Given** the alternative landing page, **When** it loads, **Then** all content sections appear in one continuous vertical page in the order: booking-policy notice, Services, Team, About, Gallery, Address/Contact — with no tab controls.
2. **Given** the top navigation, **When** a visitor activates "Equipo" (or any section link), **Then** the page scrolls smoothly to that section and the section becomes identifiable.
3. **Given** a desktop viewport, **When** the visitor scrolls the main content, **Then** the right summary card stays fixed and keeps showing the studio identity, closing time, location, rating/reviews and the "Reservar cita" action.
4. **Given** a service row, **When** the visitor activates its booking action, **Then** the booking experience opens with that service pre-selected.
5. **Given** the initial profile card, **When** it renders, **Then** it contains no redundant Instagram or WhatsApp actions.

---

### User Story 2 - Consistent, trustworthy copy about payment, location and booking (Priority: P1)

A visitor reads every page, the booking flow, tooltips and WhatsApp confirmation and sees one consistent vocabulary: the deposit is called "Adelanto"/"Apartado", the studio is in "El Tigre, Anzoátegui", and the primary action everywhere is "Reservar mi cita". No outdated "Seña", "CDMX"/"Ciudad de México" or "Reservar mi turno" wording remains.

**Why this priority**: Inconsistent payment or location wording directly erodes trust and can cause booking confusion, so it must be corrected everywhere, not only on the new page.

**Independent Test**: Search all user-facing copy (landing pages, booking flow, WhatsApp message text, email templates and tooltips) and confirm zero remaining occurrences of "Seña", "CDMX"/"Ciudad de México" and "Reservar mi turno", and that the deposit terminology is consistent throughout the booking journey.

**Acceptance Scenarios**:

1. **Given** the booking flow, **When** a visitor reaches the deposit summary and confirmation step, **Then** the deposit is referred to as "Adelanto"/"Apartado" and never as "Seña".
2. **Given** the studio profile and page metadata, **When** location is displayed, **Then** it reads "El Tigre, Anzoátegui" and never "CDMX" or "Ciudad de México".
3. **Given** any primary booking call to action, **When** it renders, **Then** its label is "Reservar mi cita".
4. **Given** a booking confirmation sent by WhatsApp/email, **When** it is generated, **Then** the deposit wording and studio location match the corrected terms.

---

### User Story 3 - See studio changes reflected live without reloading (Priority: P2)

While an operator adds, edits, reorders or deactivates a service or team member, a visitor already viewing the alternative landing page sees the published content update automatically, without a manual page refresh.

**Why this priority**: It keeps the public page accurate and avoids stale content, but the page is fully usable without it (US1).

**Independent Test**: With the alternative landing page open, change a service and a team member through the admin, and confirm the page reflects the new names/prices/status within a short delay without any manual reload.

**Acceptance Scenarios**:

1. **Given** the alternative landing page is open, **When** an operator publishes a new service, **Then** the Services area reflects it without a page reload.
2. **Given** the alternative landing page is open, **When** an operator edits or deactivates a service or team member, **Then** the affected content updates (or disappears) without a manual reload.
3. **Given** the live update mechanism fails or is unavailable, **When** content cannot be refreshed live, **Then** the page keeps showing the last known content and remains usable.

---

### User Story 4 - Manage the catalog and services without flicker (Priority: P2)

An operator deletes or edits a service, product or team member in the admin area. The list does not blank out or flash; instead the affected row shows an inline busy/disabled state and, while the data is being re-fetched, brief skeletons or a stable placeholder keep the layout in place.

**Why this priority**: It removes a confusing visual glitch that makes the admin feel unreliable, but it does not block any core public journey.

**Independent Test**: In the admin, delete a service/product and edit another, and observe that the list never collapses to an empty/blank frame; a pending/indeterminate state is visible on the affected row until the re-fetch completes, and no error silently drops items.

**Acceptance Scenarios**:

1. **Given** a populated admin list, **When** an operator confirms a deletion, **Then** the list does not blank or flash and the deleted item is removed only once the change is confirmed.
2. **Given** a deletion or edit is in progress, **When** the data layer is re-fetching, **Then** the affected row shows an inline busy state (or a brief skeleton) and other rows remain stable.
3. **Given** a deletion or edit fails, **When** the error returns, **Then** the previous data remains visible and a non-blocking inline error is shown.
4. **Given** rapid successive deletions, **When** the operator acts quickly, **Then** the list stays visually stable with no flicker or duplicated/missing rows.

---

### User Story 5 - Team parity on the first landing page (Priority: P3)

A visitor on the original landing page sees the studio's artists/piercers, with each active member's name and role/specialty, exactly as on the alternative landing page.

**Why this priority**: It brings the original landing to feature parity for social proof, but both pages already work without it.

**Independent Test**: Open the original landing page and confirm the team/artists section renders active members with name/role (or an elegant empty state when none exist), consistent with the alternative landing page.

**Acceptance Scenarios**:

1. **Given** active team members, **When** a visitor opens the original landing page, **Then** each active member is shown with name and role/specialty.
2. **Given** no active team members, **When** the original landing page renders, **Then** the team area is hidden or shows an elegant empty state and the page remains unaffected.

---

### Edge Cases

- **No published services** → the Services area shows an elegant empty state; the page remains fully usable and the nav link still resolves.
- **No active team members** → the Team area is hidden or shows an elegant empty state (consistent across both landing pages).
- **No gallery items / broken images** → an elegant placeholder is shown and the mosaic layout does not break.
- **Missing hours or address configuration** → the sidebar omits those fields or shows an unavailable state; no empty rows or broken layout.
- **Very long service names, bios, addresses or review text** → content wraps within its container; no horizontal page scroll.
- **Small viewport (320px)** → single-column layout, anchor navigation and all actions keep touch targets of at least 44×44px; sidebar content is still reachable.
- **Reduced-motion preference** → smooth scrolling, skeleton shimmer and any transition are suppressed.
- **Data read failure** → the page falls back to locally available demo content and shows a non-blocking notice instead of a blank area.
- **Direct deep link to a section anchor** (e.g. `/landing-v2#galeria`) → the page opens positioned at that section and remains coherent.
- **Live update mechanism unavailable** → the page keeps the last known content and stays usable.
- **Admin delete/edit failure** → the previous row data is preserved and an inline error is shown (no silent data loss).
- **Rapid successive deletions** → no flicker, no duplicated or missing rows.

## Requirements *(mandatory)*

### Functional Requirements

**Landing V2 — continuous layout**

- **FR-001**: The alternative landing page MUST present all its content as a single continuous vertical page and MUST NOT use tab-based or hidden-panel navigation.
- **FR-002**: The page MUST provide a top navigation with links for Servicios, Equipo, Acerca de, Galería, Reseñas and Dirección that scroll smoothly to the matching section, and each section MUST be deep-linkable by anchor.
- **FR-003**: On desktop-sized viewports, the page MUST use a two-column layout: a scrollable main content column on the left and a fixed (sticky) summary card on the right.
- **FR-004**: The left column MUST contain these sections in order: (1) booking-policy/advisory notice, (2) Services grouped by category in a clean, collapsible/accordion list, (3) Team cards for artists/piercers, (4) About — studio description, (5) Gallery mosaic, (6) Address/Contact.
- **FR-005**: The right summary card MUST show the studio logo/avatar, an open/closed status with the next closing time (e.g., "Abierto • Cierra a las XX:XX"), the address "El Tigre, Anzoátegui", a rating/reviews indicator, and a prominent "Reservar cita" action.
- **FR-006**: The initial profile card MUST NOT include redundant Instagram or WhatsApp actions.
- **FR-007**: The layout MUST collapse to a single column on small viewports, keeping the summary card content reachable and the navigation operable.
- **FR-008**: Services MUST be read from the studio's managed data source (not a fixed, code-defined list) and MUST show only published/active services, each with its duration, price and a clear deposit-required indicator.

**Landing V2 — real-time synchronization**

- **FR-009**: While the alternative landing page is open, changes made by an operator to services or team members MUST be reflected on the page without a manual reload, within a short delay.
- **FR-010**: If the live update mechanism is unavailable or fails, the page MUST keep the last known content and remain fully usable with a non-blocking notice where appropriate.

**Landing V1 — team parity**

- **FR-011**: The original landing page MUST present the studio team/artists section showing active members with name and role/specialty (or an elegant empty state), consistent with the alternative landing page.

**Global copy & configuration**

- **FR-012**: All user-facing copy MUST refer to the booking payment as "Adelanto"/"Apartado" and MUST NOT use "Seña", across landing pages, the booking flow, WhatsApp message text, email templates, badges and tooltips.
- **FR-013**: The studio location shown across all user-facing copy and page metadata MUST read "El Tigre, Anzoátegui" and MUST NOT contain "CDMX" or "Ciudad de México".
- **FR-014**: Every primary booking call to action MUST read "Reservar mi cita" (replacing "Reservar mi turno" and equivalent variants).
- **FR-015**: The deposit amount/rule (50%) and its monetary behavior MUST remain unchanged; only the terminology changes.

**Admin — deletion & loading UX**

- **FR-016**: Deleting or editing a service, product or team member in the admin MUST NOT blank, flash or fully tear down the surrounding list; existing rows MUST remain mounted while the change is applied.
- **FR-017**: While a mutation is pending, the affected row MUST show an inline busy/disabled state (or a brief skeleton/placeholder) indicating progress.
- **FR-018**: When a mutation fails, the previously loaded data MUST remain visible and a non-blocking inline error MUST be shown.
- **FR-019**: After a successful mutation, the list MUST update without a visible full-list flicker, and rapid successive mutations MUST NOT produce duplicated or missing rows.

**Quality & accessibility**

- **FR-020**: The page MUST remain fully responsive from 320px to 1920px with no horizontal page scroll and interactive controls of at least 44×44px, honoring the reduced-motion preference.
- **FR-021**: The change MUST NOT alter the behavior, content or routes of unrelated existing pages, and the project's type-check gate MUST pass with zero errors and no type discrepancies.

### Key Entities *(include if feature involves data)*

- **Studio profile**: the public identity — brand, tagline, description, address (El Tigre, Anzoátegui), opening hours and a rating/reviews indicator.
- **Service**: a bookable offering — name, category, duration, price and whether a deposit is required; grouped by category and sourced from the managed catalog.
- **Team member**: an active artist/staff member — name, role/specialty and avatar.
- **Gallery item**: a featured work photo with a descriptive label/alt text.
- **Booking-policy notice**: the advisory text about how booking and the advance payment work.
- **Review/rating indicator**: an aggregate rating and/or curated testimonial content shown as social proof.
- **Admin list item state**: the per-row busy/error/loading state maintained while a mutation is pending (services, products, team members).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the alternative landing page, a visitor can reach any of the six sections via the top navigation and understand the studio identity from the fixed card on every desktop scroll position.
- **SC-002**: A visitor can start a booking for a specific service within two actions (scroll/reach the service + tap its booking action).
- **SC-003**: 0 occurrences of "Seña", "CDMX" and "Ciudad de México" remain in user-facing copy, and 100% of primary booking actions read "Reservar mi cita".
- **SC-004**: An operator change to a service or team member appears on an open alternative landing page without manual reload within 5 seconds.
- **SC-005**: During an admin deletion or edit, the list never renders an empty/blank frame and no visible full-list flicker occurs; failures leave the prior data intact.
- **SC-006**: Both landing pages show the active team/artists section (or an elegant empty state) consistently.
- **SC-007**: The project's type-check gate passes with zero errors, and the page shows no horizontal scroll from 320px to 1920px with all controls at least 44×44px.

## Assumptions

- **Address**: the alternative landing page remains reachable at `/landing-v2`; the original landing remains at `/` and both coexist.
- **Deposit term**: "Adelanto" is the default term, with "Apartado" used where a grammatical variant reads better; the two are interchangeable labels for the same 50% payment.
- **Realtime scope**: "real-time" means changes made in the admin surface on the open page without a manual reload within the same deployed session; cross-device or server-push live sync is not required. A subscription-style mechanism may be introduced in the data layer to satisfy this.
- **Reviews content**: the rating/reviews indicator is backed by curated/aggregate content (e.g., an aggregate rating and/or selected testimonials) and does not require new authoring/management workflows in admin.
- **Data source**: services and team come from the same managed data abstraction used elsewhere, with a local/demo fallback when the backend is unavailable, exactly like the current site.
- **V1 team section**: the team section component is reused on the original landing rather than reimplemented; the requirement is that it reliably renders there.
- **Copy language**: all public copy is in Spanish, following existing project conventions.
- **Styling**: no new palette is introduced; the existing Dark Luxury tokens are reused and no atomic utility framework is added.
- **Unchanged monetary rules**: prices remain integer cents and the existing deposit rules are untouched; only display terminology changes.
