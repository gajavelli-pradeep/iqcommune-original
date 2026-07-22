import "server-only";

import type { ReactNode } from "react";

import {
  ACTIVITY_RETENTION_DAYS,
  listActivity,
  listAgreements,
  listAssignablePractitioners,
  listConfirmableSessions,
  listConsents,
  listGallery,
  listPayouts,
  listMasterData,
  listPhotoGuideSessions,
  listPhotoSubmissions,
  listPractitioners,
  listSessionRequests,
  listSessions,
  listTeam,
} from "@/services/console";

import { can, tabsFor, type ConsoleRole } from "../roles";
import { hit, type SearchHit } from "../search";
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
  /** This panel's contribution to the global search index. */
  hits: readonly SearchHit[];
}

/** Loads one panel in isolation: on any read failure it renders PanelError
 *  instead of rejecting, so the rest of the console still loads. Returns the
 *  node plus the row count for the sidebar badge.
 *
 *  `index` is optional and is applied to the SAME rows the panel rendered from,
 *  which is what makes search free: no second query, and a panel whose read
 *  failed contributes nothing rather than contributing stale entries. */
async function loadPanel<T>(
  load: () => Promise<readonly T[]>,
  render: (rows: readonly T[]) => ReactNode,
  index?: (rows: readonly T[]) => readonly SearchHit[],
): Promise<LoadedPanel> {
  try {
    const rows = await load();
    return { node: render(rows), count: rows.length, hits: index?.(rows) ?? [] };
  } catch (error) {
    return {
      node: <PanelError message={error instanceof Error ? error.message : "Read failed."} />,
      count: 0,
      hits: [],
    };
  }
}

export interface LoadedConsole {
  panels: Record<string, ReactNode>;
  /** Row count per tab id, for the sidebar badges (V7 `.sb-badge`). */
  counts: Record<string, number>;
  /**
   * Everything the header search can find, for THIS role.
   *
   * Derived from the rows already read above, so it inherits their
   * authorisation exactly — search cannot surface a record its viewer would be
   * refused if they opened the panel directly.
   */
  search: readonly SearchHit[];
}

/**
 * The activity panel, which is paged rather than a plain list — `loadPanel`
 * expects an array, and this returns a page plus a total.
 */
async function loadActivity(role: ConsoleRole): Promise<LoadedPanel> {
  try {
    const page = await listActivity();
    return {
      node: (
        <ActivityPanel initial={page} role={role} retentionDays={ACTIVITY_RETENTION_DAYS} />
      ),
      // The badge counts everything in the log, not just the page on screen.
      count: page.total,
      // Activity is a paged feed with no row detail to open, and only ever one
      // page is loaded — indexing it would search a window, not the log.
      hits: [],
    };
  } catch (error) {
    return {
      node: <PanelError message={error instanceof Error ? error.message : "Read failed."} />,
      count: 0,
      hits: [],
    };
  }
}

export async function loadConsolePanels(role: ConsoleRole): Promise<LoadedConsole> {
  // The request panel's assignment select needs the empanelled practitioners.
  // Read once here rather than per row, and degrade to an empty list rather
  // than failing the panel — an admin with no select is still better than a
  // panel that will not load.
  const [assignable, confirmable, photoGuideSessions, team, masterData] = await Promise.all([
    listAssignablePractitioners().catch(() => []),
    listConfirmableSessions().catch(() => []),
    listPhotoGuideSessions().catch(() => []),
    // Every console role sees WHO is on the team — V7 leaves the table
    // ungated and marks only the Actions column and the invite box
    // `role-team`. Gating the read as well left an Admin looking at an empty
    // table rather than a read-only one, which reads as a broken panel.
    listTeam().catch(() => []),
    listMasterData().catch(() => []),
  ]);

  const [practitioners, agreements, requests, confirmations, sessions, photos, payouts, gallery, activity] =
    await Promise.all([
      loadPanel(
        listPractitioners,
        (rows) => <PractitionersPanel rows={rows} role={role} />,
        (rows) =>
          rows.map((row) =>
            hit("practitioners", row.id, row.name, `Practitioner · ${row.status}`, [
              row.reference,
              row.email,
              row.phone,
              row.city,
              row.state,
              row.organisation,
              row.module,
              row.role,
            ]),
          ),
      ),
      loadPanel(
        listAgreements,
        (rows) => <AgreementsPanel rows={rows} role={role} />,
        (rows) =>
          rows.map((row) =>
            hit("agreements", row.id, row.practitioner, `Agreement ${row.reference} · ${row.status}`, [
              row.reference,
              row.modules,
              row.method,
            ]),
          ),
      ),
      loadPanel(
        listSessionRequests,
        (rows) => <RequestsPanel rows={rows} role={role} practitioners={assignable} />,
        (rows) =>
          rows.map((row) =>
            hit("requests", row.id, row.name, `Session request · ${row.city} · ${row.status}`, [
              row.organisation,
              row.email,
              row.phone,
              row.topic,
              row.audience,
              row.city,
              row.state,
              row.venue,
              row.assignedTo,
            ]),
          ),
      ),
      loadPanel(listConsents, (rows) => (
        <ConsentPanel
          rows={rows}
          role={role}
          confirmable={confirmable}
          photoGuideSessions={photoGuideSessions}
        />
      )),
      loadPanel(
        listSessions,
        (rows) => <SessionsPanel rows={rows} role={role} />,
        (rows) =>
          rows.map((row) =>
            hit("sessions", row.id, row.reference, `Session · ${row.sessionDate} · ${row.status}`, [
              row.module,
              row.requester,
              row.requesterOrganisation,
              row.practitioner,
              row.audience,
              row.sessionDate,
            ]),
          ),
      ),
      loadPanel(listPhotoSubmissions, (rows) => <PhotosPanel rows={rows} role={role} />),
      loadPanel(listPayouts, (rows) => <PayoutsPanel rows={rows} role={role} />),
      loadPanel(listGallery, (rows) => <GalleryPanel rows={rows} role={role} />),
      can(role, "viewActivity")
        ? loadActivity(role)
        : Promise.resolve<LoadedPanel>({ node: null, count: 0, hits: [] }),
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
    settings: <SettingsPanel role={role} team={team} masterData={masterData} />,
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

  /**
   * Only tabs this role actually has. `loadConsolePanels` builds every panel
   * regardless of role — the sidebar is what narrows them — so without this
   * filter a User could search their way to a row on a tab they have no way to
   * open, and land on a blank panel.
   */
  const openable = new Set(tabsFor(role).map((tab) => tab.id));
  const search = [practitioners, agreements, requests, sessions]
    .flatMap((panel) => panel.hits)
    .filter((entry) => openable.has(entry.tab));

  return { panels, counts, search };
}
