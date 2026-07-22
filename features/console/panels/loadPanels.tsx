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
export async function loadConsolePanels(role: ConsoleRole): Promise<Record<string, ReactNode>> {
  const [practitioners, requests, agreements, sessions, consents, payouts, photos, gallery] =
    await Promise.all([
      listPractitioners(),
      listSessionRequests(),
      listAgreements(),
      listSessions(),
      listConsents(),
      listPayouts(),
      listPhotoSubmissions(),
      listGallery(),
    ]);

  const panels: Record<string, ReactNode> = {
    practitioners: <PractitionersPanel rows={practitioners} role={role} />,
    agreements: <AgreementsPanel rows={agreements} role={role} />,
    requests: <RequestsPanel rows={requests} role={role} />,
    confirmations: <ConsentPanel rows={consents} role={role} />,
    sessions: <SessionsPanel rows={sessions} role={role} />,
    photos: <PhotosPanel rows={photos} role={role} />,
    payouts: <PayoutsPanel rows={payouts} role={role} />,
    gallery: <GalleryPanel rows={gallery} role={role} />,
    settings: <SettingsPanel />,
  };

  if (can(role, "viewActivity")) {
    panels.activity = <ActivityPanel rows={await listActivity()} role={role} />;
  }

  return panels;
}
