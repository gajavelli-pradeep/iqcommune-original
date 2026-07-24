import type { ReactNode } from "react";

import type {
  AgreementRow,
  AssignablePractitioner,
  ConfirmableSession,
  ConsentRow,
  GalleryRow,
  PayoutRow,
  PhotoRow,
  PractitionerRow,
  SessionRequestRow,
  SessionRow,
} from "@/services/console";

import type { ConsoleRole } from "../roles";
import { AgreementsPanel } from "./AgreementsPanel";
import { ConsentPanel } from "./ConsentPanel";
import { GalleryPanel } from "./GalleryPanel";
import { PayoutsPanel } from "./PayoutsPanel";
import { PhotosPanel } from "./PhotosPanel";
import { PractitionersPanel } from "./PractitionersPanel";
import { RequestsPanel } from "./RequestsPanel";
import { SessionsPanel } from "./SessionsPanel";

/**
 * "Tab id -> rendered panel", in one place.
 *
 * Every simple-row tab used to inline its own render callback inside
 * `loadPanels.tsx`. `CachedPanel` (a client component) now needs to run that
 * SAME rendering — once for a live read, again for a cached one after a
 * failure — and a function cannot cross the server->client boundary as a
 * prop. Centralizing the wiring here, importable by either side, is the
 * alternative to writing it out twice.
 *
 * Only the 8 tabs that go through `loadPanel` as a plain row array are wired
 * here. `activity` is paged, not a row array, and `settings` isn't row data at
 * all — both stay exactly as they render today.
 */
export interface PanelExtra {
  assignable?: readonly AssignablePractitioner[];
  confirmable?: readonly ConfirmableSession[];
  photoGuideSessions?: readonly ConfirmableSession[];
}

export const PANEL_RENDERERS: Record<
  string,
  (rows: readonly unknown[], role: ConsoleRole, extra: PanelExtra) => ReactNode
> = {
  practitioners: (rows, role) => (
    <PractitionersPanel rows={rows as readonly PractitionerRow[]} role={role} />
  ),
  agreements: (rows, role) => <AgreementsPanel rows={rows as readonly AgreementRow[]} role={role} />,
  requests: (rows, role, extra) => (
    <RequestsPanel
      rows={rows as readonly SessionRequestRow[]}
      role={role}
      practitioners={extra.assignable ?? []}
    />
  ),
  confirmations: (rows, role, extra) => (
    <ConsentPanel
      rows={rows as readonly ConsentRow[]}
      role={role}
      confirmable={extra.confirmable ?? []}
      photoGuideSessions={extra.photoGuideSessions ?? []}
    />
  ),
  sessions: (rows, role) => <SessionsPanel rows={rows as readonly SessionRow[]} role={role} />,
  photos: (rows, role) => <PhotosPanel rows={rows as readonly PhotoRow[]} role={role} />,
  payouts: (rows, role) => <PayoutsPanel rows={rows as readonly PayoutRow[]} role={role} />,
  gallery: (rows, role) => <GalleryPanel rows={rows as readonly GalleryRow[]} role={role} />,
};
