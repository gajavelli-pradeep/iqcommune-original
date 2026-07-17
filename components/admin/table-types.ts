/**
 * Shared prop types for the admin table chrome.
 *
 * These live apart from any component because their only consumers are the
 * toolbar (`PendingBar`) and the row-action renderer (`RowActionsInline`) —
 * they previously hung off two components that nothing rendered.
 */

/** Year + Month picker state, applied by each table to its own date column. */
export interface DateFilterControl {
  year: string;
  month: string;
  years: number[];
  active: boolean;
  label: string;
  onYear: (v: string) => void;
  onMonth: (v: string) => void;
  onClear: () => void;
}

/** One action offered on a table row. */
export interface RowAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
  /** Gold primary emphasis — used by RowActionsInline. */
  primary?: boolean;
  /** Optional leading icon, rendered before the label by RowActionsInline to
   *  match the V5 mockup's icon buttons (View / Download / Send reminder). */
  icon?: React.ReactNode;
}
