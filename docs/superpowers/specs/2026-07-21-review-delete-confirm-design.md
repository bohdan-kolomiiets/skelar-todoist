# Design — Confirm before removing a task on Review

> **Status: approved (brainstorm, 2026-07-21).** Small, single-screen UX safety change.
> Chosen mechanism: **confirmation dialog (Option A)** reusing the existing `BottomSheet`.

## 1. Goal

On the **Review** screen, tapping a task card's ✕ ("Remove") deletes it **immediately**, with
no confirmation and no undo ([ReviewScreen.tsx:53-60](../../../src/components/screens/ReviewScreen.tsx)).
A stray tap silently drops a task the AI just proposed. This change puts a **confirmation gate**
in front of that removal so accidental taps can't destroy a task.

## 2. Scope

- **In scope:** the ✕ on each Review card. Tapping it opens a confirm dialog; the task is only
  removed after the user taps **Remove** in that dialog.
- **Out of scope (explicitly):**
  - The **"Delete task"** action inside `TaskEditorSheet` (used by Today/Inbox to delete *saved*
    tasks — [TaskEditorSheet.tsx:84](../../../src/components/task/TaskEditorSheet.tsx)). It deletes
    higher-stakes *persisted* data and arguably deserves the same guard, but the user scoped this
    work to the Review page. Tracked as a natural follow-up, not built here.
  - Undo/snackbar patterns (considered and rejected — see §7).

## 3. Approach — confirmation dialog (Option A)

Reuse the app's existing `BottomSheet` modal primitive (backdrop tap, Escape, focus management,
`role="dialog"` already handled — [BottomSheet.tsx](../../../src/components/ui/BottomSheet.tsx)),
the same idiom as `TipsSheet` and the voice teaser. Wrap it in a small, generic **`ConfirmSheet`**
primitive so the confirm UI is one focused, testable unit (and reusable for the editor-delete
follow-up later).

### New component — `src/components/ui/ConfirmSheet.tsx`

```tsx
interface Props {
  open: boolean;
  title: string;              // e.g. "Remove this task?"
  description?: string;       // e.g. the task title, for context
  confirmLabel: string;       // e.g. "Remove"
  cancelLabel?: string;       // default "Cancel"
  destructive?: boolean;      // default false; true → danger styling on confirm
  onConfirm(): void;
  onCancel(): void;           // also fired on backdrop tap / Escape
}
```

- Renders inside `<BottomSheet open={open} onClose={onCancel} ariaLabel={title}>`.
- Body: `<h2>` title, optional `<p>` description, then a **Cancel** + **Confirm** button row.
- **Cancel** = neutral, safe default (`border border-border`, secondary text). **Confirm** when
  `destructive` = tinted danger using existing tokens (`bg-bg-danger text-text-danger
  border border-border-danger`); non-destructive falls back to the accent style
  (`bg-fill-accent text-on-accent`). No new design tokens needed.
- Both buttons are ≥44px touch targets (`min-h-11`), side by side, each `flex-1`.

### Wiring — `ReviewScreen.tsx`

- New state: `const [pendingRemoval, setPendingRemoval] = useState<ParsedTask | null>(null)`.
- The card ✕ button: `onClick={() => removeAt(task)}` → `onClick={() => setPendingRemoval(task)}`.
  Its `aria-label` becomes `Remove ${task.title}` (mirrors the existing `Edit ${task.title}`
  pattern; improves screen-reader context **and** disambiguates it from the dialog's plain
  "Remove" button in tests).
- Render once, below the editor sheet:

  ```tsx
  <ConfirmSheet
    open={pendingRemoval !== null}
    title="Remove this task?"
    description={pendingRemoval?.title}
    confirmLabel="Remove"
    destructive
    onConfirm={() => { if (pendingRemoval) removeAt(pendingRemoval); setPendingRemoval(null); }}
    onCancel={() => setPendingRemoval(null)}
  />
  ```

- `removeAt` is unchanged (still filters by object identity). Cancel/Escape/backdrop just clear
  `pendingRemoval` — nothing is removed.

## 4. Behavior

| Action | Result |
|---|---|
| Tap ✕ on a card | Confirm dialog opens; nothing removed yet |
| Tap **Remove** in dialog | Task removed, dialog closes, counts/commit label update |
| Tap **Cancel** / backdrop / Escape | Dialog closes, task **kept** |
| ✕ tap | Does **not** open the task editor (unchanged from today) |

## 5. Accessibility

- `BottomSheet` already gives `role="dialog"`, `aria-modal`, an accessible name (the title),
  focus moves to the panel on open, and Escape closes. No extra work needed there.
- Card ✕ gets a per-task accessible name (`Remove <title>`); dialog confirm is plain `Remove`.

## 6. Test plan (TDD)

**New — `ConfirmSheet.test.tsx` (component):**
- Renders title + description when `open`; renders nothing when closed.
- **Confirm** click fires `onConfirm`; **Cancel** click fires `onCancel`.
- Escape / backdrop fire `onCancel` (delegated to `BottomSheet` — one representative test).

**Updated — `ReviewScreen.test.tsx`:**
- "removing a card" → now: click card ✕ → dialog appears → click dialog **Remove** → count/commit
  label drop. Add assertion that after ✕ (before confirming) the count is **unchanged**.
- New: clicking ✕ then **Cancel** keeps the task (count unchanged, dialog gone).
- "removing a card does not also open the editor" → clicking ✕ opens the confirm, not the editor;
  keep the assertion that the title input never appears.

**e2e (Playwright):** none needed — audited `e2e/smoke.spec.ts` and `e2e/core-flow.spec.ts`;
neither touches the ✕/remove affordance, so the graded flow is unaffected. Still run the full
e2e suite in the verification sweep to confirm no regression.

## 7. Alternatives considered

- **Undo snackbar** (remove now, offer "Undo ~5s"): lower friction and modern, but it's
  remove-then-regret (not the "ask for confirmation" the user requested), needs a new toast
  primitive the app lacks, and "undo" is a weak model for not-yet-saved proposals. Rejected.
- **Inline two-step** (✕ morphs into "Remove?" in place): lightest, but least discoverable and
  most mis-tappable — the confirm lands where the finger already is — which partly defeats the
  goal. Rejected.

## 8. Verification

Full sweep before PR: `npm run lint && npm run typecheck && npm test && npm run test:e2e`.
Manual: `npm run dev`, open Review, confirm ✕ → dialog → Remove deletes, Cancel/Escape keep.
