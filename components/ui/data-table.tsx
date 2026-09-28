import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  /** Stable key for the <th>/<td>. */
  key: string;
  /** Column header label. */
  header: string;
  align?: "left" | "center" | "right";
  /** Cell content for a row. */
  render: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyOf: (row: T, index: number) => string;
  emptyMessage?: string;
};

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

/**
 * Simple responsive table. Wraps in a horizontal scroller on small screens.
 * Render an <EmptyState> yourself when rows is empty and you need an action;
 * otherwise emptyMessage is shown.
 */
export function DataTable<T>({
  columns,
  rows,
  keyOf,
  emptyMessage = "No rows to display.",
}: DataTableProps<T>) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-hud-line">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-hud-muted ${alignClass[col.align ?? "left"]}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={keyOf(row, i)}
              className="border-b border-hud-line/60 transition last:border-0 hover:bg-white/[0.03]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2.5 align-top text-hud-ink ${alignClass[col.align ?? "left"]}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-sm text-hud-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
