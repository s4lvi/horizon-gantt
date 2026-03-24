import {
  addDays,
  addWeeks,
  differenceInDays,
  differenceInWeeks,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isSameMonth,
  isSameWeek,
  isToday,
  parseISO,
} from "date-fns";
import { ViewMode } from "@/lib/types";

export type ColumnInfo = {
  date: Date;
  label: string;
  isToday: boolean;
};

export type HeaderGroup = {
  label: string;
  span: number;
};

export function getTimelineRange(
  activities: { start_date: string | null; end_date: string | null }[]
): { start: Date; end: Date } {
  const now = new Date();
  let earliest = now;
  let latest = addDays(now, 30);

  for (const a of activities) {
    if (a.start_date) {
      const s = parseISO(a.start_date);
      if (s < earliest) earliest = s;
    }
    if (a.end_date) {
      const e = parseISO(a.end_date);
      if (e > latest) latest = e;
    }
  }

  // Less padding before today, more after — so today appears towards the left
  const start = startOfMonth(addDays(earliest, -7));
  const end = endOfMonth(addDays(latest, 30));
  return { start, end };
}

export function getOccupiedRange(
  activities: { start_date: string | null; end_date: string | null }[]
): { start: Date; end: Date } {
  const now = new Date();
  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const a of activities) {
    if (a.start_date) {
      const s = parseISO(a.start_date);
      if (!earliest || s < earliest) earliest = s;
    }
    if (a.end_date) {
      const e = parseISO(a.end_date);
      if (!latest || e > latest) latest = e;
    }
  }

  // Tight padding — just enough context
  const start = startOfMonth(addDays(earliest || now, -3));
  const end = endOfMonth(addDays(latest || now, 7));
  return { start, end };
}

export function getColumns(
  start: Date,
  end: Date,
  viewMode: ViewMode
): ColumnInfo[] {
  if (viewMode === "months-days" || viewMode === "weeks-days") {
    return eachDayOfInterval({ start, end }).map((date) => ({
      date,
      label: format(date, "d"),
      isToday: isToday(date),
    }));
  }
  // months-weeks
  return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(
    (date) => ({
      date,
      label: `W${format(date, "w")}`,
      isToday: isSameWeek(date, new Date(), { weekStartsOn: 1 }),
    })
  );
}

export function getHeaderGroups(
  columns: ColumnInfo[],
  viewMode: ViewMode
): HeaderGroup[] {
  const groups: HeaderGroup[] = [];

  if (viewMode === "months-days" || viewMode === "months-weeks") {
    let current: { label: string; span: number } | null = null;
    for (const col of columns) {
      const label = format(col.date, "MMM yyyy");
      if (current && current.label === label) {
        current.span++;
      } else {
        if (current) groups.push(current);
        current = { label, span: 1 };
      }
    }
    if (current) groups.push(current);
  } else {
    // weeks-days: group by week
    let current: { label: string; span: number } | null = null;
    for (const col of columns) {
      const weekStart = startOfWeek(col.date, { weekStartsOn: 1 });
      const label = `Week of ${format(weekStart, "MMM d")}`;
      if (current && current.label === label) {
        current.span++;
      } else {
        if (current) groups.push(current);
        current = { label, span: 1 };
      }
    }
    if (current) groups.push(current);
  }

  return groups;
}

export function getColumnWidth(viewMode: ViewMode): number {
  switch (viewMode) {
    case "months-days":
      return 32;
    case "weeks-days":
      return 40;
    case "months-weeks":
      return 80;
  }
}

export function dateToColumnIndex(
  date: Date,
  timelineStart: Date,
  viewMode: ViewMode
): number {
  if (viewMode === "months-weeks") {
    return differenceInWeeks(date, startOfWeek(timelineStart, { weekStartsOn: 1 }));
  }
  return differenceInDays(date, timelineStart);
}

export function columnIndexToDate(
  index: number,
  timelineStart: Date,
  viewMode: ViewMode
): Date {
  if (viewMode === "months-weeks") {
    return addWeeks(startOfWeek(timelineStart, { weekStartsOn: 1 }), index);
  }
  return addDays(timelineStart, index);
}

export function pixelToDate(
  pixelX: number,
  timelineStart: Date,
  viewMode: ViewMode,
  columnWidth: number
): Date {
  const index = Math.round(pixelX / columnWidth);
  return columnIndexToDate(index, timelineStart, viewMode);
}

export function dateToPixel(
  date: Date,
  timelineStart: Date,
  viewMode: ViewMode,
  columnWidth: number
): number {
  const index = dateToColumnIndex(date, timelineStart, viewMode);
  return index * columnWidth;
}

export function formatDateShort(date: string | null): string {
  if (!date) return "—";
  return format(parseISO(date), "MMM d, yyyy");
}
