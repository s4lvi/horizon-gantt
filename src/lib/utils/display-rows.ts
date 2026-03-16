import { Activity, DisplayRow } from "@/lib/types";

export function buildDisplayRows(
  activities: Activity[],
  collapsedGroupIds: Set<string>
): DisplayRow[] {
  const topLevel = activities
    .filter((a) => a.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  const childrenByParent = new Map<string, Activity[]>();
  for (const a of activities) {
    if (a.parent_id) {
      if (!childrenByParent.has(a.parent_id)) {
        childrenByParent.set(a.parent_id, []);
      }
      childrenByParent.get(a.parent_id)!.push(a);
    }
  }
  // Sort children within each group
  for (const children of childrenByParent.values()) {
    children.sort((a, b) => a.sort_order - b.sort_order);
  }

  const rows: DisplayRow[] = [];

  for (const activity of topLevel) {
    if (!activity.is_group) {
      rows.push({
        activity,
        depth: 0,
        isGroup: false,
        isCollapsed: false,
        groupStartDate: null,
        groupEndDate: null,
      });
      continue;
    }

    const children = childrenByParent.get(activity.id) || [];
    const isCollapsed = collapsedGroupIds.has(activity.id);

    // Compute group span from children
    let groupStart: string | null = null;
    let groupEnd: string | null = null;
    for (const child of children) {
      if (child.start_date) {
        if (!groupStart || child.start_date < groupStart)
          groupStart = child.start_date;
      }
      if (child.end_date) {
        if (!groupEnd || child.end_date > groupEnd) groupEnd = child.end_date;
      }
    }

    rows.push({
      activity,
      depth: 0,
      isGroup: true,
      isCollapsed,
      groupStartDate: groupStart,
      groupEndDate: groupEnd,
    });

    if (!isCollapsed) {
      for (const child of children) {
        rows.push({
          activity: child,
          depth: 1,
          isGroup: false,
          isCollapsed: false,
          groupStartDate: null,
          groupEndDate: null,
        });
      }
    }
  }

  return rows;
}
