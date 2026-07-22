import "server-only";

import type { ReactNode } from "react";

import {
  listActivity,
  listAgreements,
  listConsents,
  listGallery,
  listPayouts,
  listPhotoSubmissions,
  listPractitioners,
  listSessionRequests,
  listSessions,
} from "@/services/console";

import { can, type ConsoleRole } from "../roles";
import { ActivityPanel } from "./ActivityPanel";
import { AgreementsPanel } from "./AgreementsPanel";
import { ConsentPanel } from "./ConsentPanel";
import { GalleryPanel } from "./GalleryPanel";
import { PayoutsPanel } from "./PayoutsPanel";
import { PhotosPanel } from "./PhotosPanel";
import { PractitionersPanel } from "./PractitionersPanel";
import { RequestsPanel } from "./RequestsPanel";
import { SessionsPanel } from "./SessionsPanel";
import { SettingsPanel } from "./SettingsPanel";

/**
 * Builds every console panel for a role, keyed by tab id (matches
 * `CONSOLE_TABS`). One loader for all three console routes — they differ only in
 * the role they pass, so the fetch-and-wire is here rather than copied per page.
 *
 * The reads run in parallel. The activity log is a privileged read, so it is
 * fetched only for a role that can open the tab — a `user` never triggers it.
 */
/** A panel whose data read failed — shown in place of that one panel so a
 *  single unmigrated table or bad read never takes the whole console down. */
function PanelError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-flag-warn-edge bg-flag-warn px-6 py-8 text-center">
      <p className="text-base font-medium text-gold-dark">This section couldn&apos;t load.</p>
      <p className="mt-1 text-sm text-ink-muted">{message}</p>
    </div>
  );
}

interface LoadedPanel {
  node: ReactNode;
  count: number;
}

/** Loads one panel in isolation: on any read failure it renders PanelError
 *  instead of rejecting, so the rest of the console still loads. Returns the
 *  node plus the row count for the sidebar badge. */
async function loadPanel<T>(
  load: () => Promise<readonly T[]>,
  render: (rows: readonly T[]) => ReactNode,
): Promise<LoadedPanel> {
  try {
    const rows = await load();
    return { node: render(rows), count: rows.length };
  } catch (error) {
    return { node: <PanelError message={error instanceof Error ? error.message : "Read failed."} />, count: 0 };
  }
}

export interface LoadedConsole {
  panels: Record<string, ReactNode>;
  /** Row count per tab id, for the sidebar badges (V7 `.sb-badge`). */
  counts: Record<string, number>;
}

export async function loadConsolePanels(role: ConsoleRole): Promise<LoadedConsole> {
  const [practitioners, agreements, requests, confirmations, sessions, photos, payouts, gallery, activity] =
    await Promise.all([
      loadPanel(listPractitioners, (rows) => <PractitionersPanel rows={rows} role={role} />),
      loadPanel(listAgreements, (rows) => <AgreementsPanel rows={rows} role={role} />),
      loadPanel(listSessionRequests, (rows) => <RequestsPanel rows={rows} role={role} />),
      loadPanel(listConsents, (rows) => <ConsentPanel rows={rows} role={role} />),
      loadPanel(listSessions, (rows) => <SessionsPanel rows={rows} role={role} />),
      loadPanel(listPhotoSubmissions, (rows) => <PhotosPanel rows={rows} role={role} />),
      loadPanel(listPayouts, (rows) => <PayoutsPanel rows={rows} role={role} />),
      loadPanel(listGallery, (rows) => <GalleryPanel rows={rows} role={role} />),
      can(role, "viewActivity")
        ? loadPanel(listActivity, (rows) => <ActivityPanel rows={rows} role={role} />)
        : Promise.resolve<LoadedPanel>({ node: null, count: 0 }),
    ]);

  const panels: Record<string, ReactNode> = {
    practitioners: practitioners.node,
    agreements: agreements.node,
    requests: requests.node,
    confirmations: confirmations.node,
    sessions: sessions.node,
    photos: photos.node,
    payouts: payouts.node,
    gallery: gallery.node,
    settings: <SettingsPanel />,
  };
  const counts: Record<string, number> = {
    practitioners: practitioners.count,
    agreements: agreements.count,
    requests: requests.count,
    confirmations: confirmations.count,
    sessions: sessions.count,
    photos: photos.count,
    payouts: payouts.count,
    gallery: gallery.count,
  };
  if (activity.node) {
    panels.activity = activity.node;
    counts.activity = activity.count;
  }
  return { panels, counts };
}
