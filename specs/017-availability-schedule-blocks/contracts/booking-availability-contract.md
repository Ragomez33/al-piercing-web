# Contract: Public Booking Availability & Live Sync

**Feature**: `017-availability-schedule-blocks` | Covers `src/lib/utils/availability.ts`,
`src/lib/services/availability.ts`, `src/lib/services/booking.ts`, `src/components/booking/BookingFlow.svelte`
and the `booking`/`blocks`/`schedule` realtime resources.

## 1. Pure engine — `src/lib/utils/availability.ts`

```ts
interface SlotInterval { start: Date; end: Date }

resolveSlotInterval(date: string, slot: string, durationMinutes: number): SlotInterval;
// Local Date from local date + "HH:mm" (research R5). Invalid input → null-ish/guarded.

isSlotFree(
  date: string,
  slot: string,
  durationMinutes: number,
  scheduleDay: StudioScheduleDay | null,
  bookings: { date: string; timeSlot: string; status: BookingStatus; durationMinutes: number }[],
  blocks: AvailabilityBlock[],
): boolean;
// Free ⇔ (scheduleDay?.isOpen && openTime ≤ slot && slot+duration ≤ closeTime) &&
//          no non-cancelled booking interval [t, t+dur) overlaps [slot, slot+dur) &&
//          no block interval (start, end] — full-day blocks cover the whole local day —
//          overlaps [slot, slot+dur).

buildFreeSlots(
  date: string,
  scheduleDay: StudioScheduleDay | null,
  bookings: { date: string; timeSlot: string; status: BookingStatus; durationMinutes: number }[],
  blocks: AvailabilityBlock[],
  options?: { durationMinutes?: number; stepMin?: number },
): string[];
// Ordered "HH:mm" starts from openTime..closeTime (30-min steps) that pass isSlotFree.
// No schedule / closed day → []. A block entirely covering the day → [].
```

Both functions are pure (exported for unit testing) and never touch the store.

## 2. Domain service — `src/lib/services/availability.ts`

```ts
interface DayAvailability {
  date: string;
  slots: string[];
  hasSchedule: boolean;          // false → no schedule configured (fail closed, FR-004)
  closedReason: "closed" | "blocked" | null; // why the day offers no slots, when applicable
}

getDayAvailability(date: string, durationMinutes?: number): Promise<DayAvailability>;
```

Orchestrates `dataStore.getSchedule()` + `listBookings({ date })` + `listBlocks({ date })`; bookings'
durations come from `listServices(...)` id→duration map (the existing `durations` pattern in
AdminCalendar). On a schedule read failure it uses `listFallbackSchedule()`; on total failure the
caller keeps the last known availability. Components never call the engine/store directly for this
computation.

## 3. Booking guard — `src/lib/services/booking.ts`

`submitBookingRequest(input, phone)`:
1. Resolves the day's schedule, bookings and blocks; builds the slot interval
   `[date · timeSlot, + service.durationMinutes)`.
2. If `!isSlotFree(...)` → throw `DataError("Este horario ya no se encuentra disponible")` **before**
   persisting (FR-014).
3. Otherwise persist as today (PENDING). The persistent race is still enforced: the DB partial unique
   index / local duplicate guard maps to the **same** message, and `BookingFlow` refreshes availability
   on failure.

`approveBooking` / `cancelBooking` / reschedule paths are unchanged except that `updateBookingSchedule`
moves only to free slots (the admin UI already selects them via the engine).

## 4. BookingFlow.svelte

- Replaces `getBookedSlots` + `getBlockedSlots` (both removed from the `DataStore` surface) with
  `getDayAvailability(date, selected.durationMinutes)`.
  `bookedSlots` becomes the derived set of unavailable times produced by the engine (unavailable either
  because booked, blocked, or out-of-hours).
- Unavailable slots render `disabled` and cannot be selected (already enforced by `isUnavailable`
  disabled buttons — FR-013).
- On submit the service re-validates (see §3); the catch block maps the typed message and keeps the last
  known availability (existing `refreshAvailability` semantics).
- **Live sync (FR-019)**: subscribe once in `onMount` via
  `subscribeToDataChanges(["blocks", "bookings", "schedule"], handler)`; handler refetches
  `getDayAvailability(date)` (debounced ~250ms) and patches `bookedSlots` in place — no reload, no scroll
  jump. If the refresh fails, the previous slots list is retained. Unsubscribe in `onDestroy`.
- No-schedule day: engine returns `[]` and the flow shows the existing "No hay horarios libres para esta
  fecha."-style empty state plus the close notice; the page never breaks (FR-004).

## 5. Realtime wiring recap (with availability-data-contract §6)

`"bookings"` events cover client creates (self) and admin approve/cancel/reschedule; `"blocks"` covers
admin create/delete; `"schedule"` covers schedule edits. The Supabase channel entries for
`availability_blocks`, `bookings` and `studio_schedule` feed these resources; BroadcastChannel/storage
fallbacks and the focus refresh keep demo mode and degraded transports functional.

## 6. Acceptance mapping

FR-012…FR-016 (+ FR-019 via §4/§5) → this contract; verified by `quickstart.md` scenarios 5–6.