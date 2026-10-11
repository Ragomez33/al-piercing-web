# Contract: Admin "Horarios/Bloqueos" UI

**Feature**: `017-availability-schedule-blocks` | Covers `src/components/admin/AdminSchedule.svelte`
(new island), `AdminPanel.svelte` wiring, `AdminCalendar.svelte` consolidation and
`src/lib/utils/calendar.ts` adaptation.

## 1. Tab wiring (`AdminPanel.svelte`)

- `AdminTab` union gains `"schedule"`.
- Sidebar: new entry **Horarios** (lucide `Clock` icon) between **Calendario** and **Inventario**.
- `switchTab("schedule")` calls `void refreshSchedule()`; `onMount` parses `?tab=schedule`; the auth reset
  path clears schedule/blocks state on sign-out. `tab === "schedule"` renders `<AdminSchedule />`.

## 2. AdminSchedule island — structure

A single island (`client:load` via the existing `/admin` mount, consistent with `AdminCalendar`). It owns
three internal sections and delegates all reads/writes to `dataStore` (never Supabase directly):

1. **Horario semanal** — seven weekday rows (Lun→Dom). Each row: an open/closed switch
   (`role="switch"`, `aria-checked`), two `<input type="time">` (open/close) enabled only while open, and
   a per-row busy state. Validation before save:
   - open day without times → `DataError("Completá la hora de apertura y cierre")`;
   - open day with `close <= open` → `DataError("El cierre debe ser posterior a la apertura")`.
   Validation is atomic: the single **"Guardar horario semanal"** button at the bottom of the card
   persists the whole seven-day schedule via `dataStore.updateSchedule(...)` (one batched
   upsert / storage write), rejects any invalid day without partial writes, and shows a brief
   "Horario actualizado" notice with the button's inline loading state.
2. **Nuevo bloqueo** — mode selector:
   - **Rango de horas**: one `date` input + `time` start + `time` end (→ `startDatetime`/`endDatetime`,
     `isFullDay: false`);
   - **Días completos**: `date` start + `date` end (→ local dates, `isFullDay: true`);
   - **Motivo** text input (optional).
   Validation: end strictly after start → `DataError("El fin debe ser posterior al inicio")`.
   On success, the new block is appended in place; if it overlaps any existing non-cancelled booking, an
   inline **non-blocking** notice is shown (`collisionNotice`) — never auto-cancelling (FR-011).
3. **Lista de bloqueos activos** — every block as a row showing range (or full-day dates + badge) and
   reason, with a delete action behind a confirmation dialog. Deletion patches the list in place; failures
   keep the previous list and show an inline error.

## 3. Flicker-free guarantees (feature-015 pattern)

- List state `{ loaded, loading, error }`: the "Cargando horario…" placeholder renders only while
  `loaded === false`; after first load no full-list re-render/blanking occurs.
- Per-row/per-block `busy: Record<string, boolean>` drives `class:busy` + `aria-busy`, and the affected
  control is disabled while in flight.
- Mutations patch `schedule`/`blocks` arrays from mutation returns (no `reload()` of the whole list).
- Errors map through `DataError` and are shown inline; previous data is retained.
- `prefers-reduced-motion` disables transitions on the rows/modal.

## 4. AdminCalendar consolidation

- **Removed**: the fixed-slot "Nuevo bloqueo" modal, the fixed-slot manage/delete modal, and the
  `nb*`/`managing` state. Creation/deletion of blocks moves exclusively to the Horarios tab.
- **Kept (adapted)**: the monthly grid, bookings day list and booking modal (approve/reject/reschedule).
  Day status summaries (`dayStatusSummary`) are unchanged (bookings only).
- **Blocks in the day list**: render as **read-only** rows (range label or "Día completo", reason) built
  from `dataStore.listBlocks()` — no editing controls, plus a hint pointing to the Horarios tab.
- **Reschedule slots**: computed with the schedule-aware engine (`getDayAvailability`) instead of the
  fixed `calendarRows()` window, so reschedule honours working hours and range blocks too.
- Offspring imports: `TimeBlock` import is replaced by `AvailabilityBlock`; `buildOccupancies` in
  `calendar.ts` is adapted to the range shape (or `AdminCalendar` switches to the new availability
  service for slot lists).

## 5. Tokens & accessibility

All styling uses project tokens (`--bg-card-light`, `--border-card`, `--accent-primary`, `--radius-*`,
`--shadow-glow`, `--accent-negative`); no raw hex outside `tokens.css`. Controls ≥44×44px; labels bound to
inputs; switch states announced via `aria-checked`; modals use `role="dialog"`/`aria-modal` with focus
moved in and restored on close (mirrors `AdminCalendar` modals). Responsive from 320px; no horizontal page
scroll.

## 6. Acceptance mapping

FR-001…FR-003 (schedule editor), FR-005…FR-011 (block manager + warning), FR-017, FR-010/FR-009
(flicker-free), verified by `quickstart.md` scenarios 2–4.