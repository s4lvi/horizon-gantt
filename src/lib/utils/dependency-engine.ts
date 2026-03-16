import { Activity, Dependency } from "@/lib/types";
import { addDays, differenceInDays, parseISO, format } from "date-fns";

export function hasCycle(
  dependencies: Dependency[],
  newPredecessorId: string,
  newSuccessorId: string
): boolean {
  const graph = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!graph.has(dep.predecessor_id)) graph.set(dep.predecessor_id, []);
    graph.get(dep.predecessor_id)!.push(dep.successor_id);
  }
  if (!graph.has(newPredecessorId)) graph.set(newPredecessorId, []);
  graph.get(newPredecessorId)!.push(newSuccessorId);

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): boolean {
    if (inStack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    inStack.add(node);
    for (const neighbor of graph.get(node) || []) {
      if (dfs(neighbor)) return true;
    }
    inStack.delete(node);
    return false;
  }

  return dfs(newPredecessorId);
}

export function cascadeDependencies(
  activities: Activity[],
  dependencies: Dependency[],
  movedActivityId: string
): Activity[] {
  const activityMap = new Map(activities.map((a) => [a.id, { ...a }]));
  const successorMap = new Map<string, string[]>();

  for (const dep of dependencies) {
    if (!successorMap.has(dep.predecessor_id))
      successorMap.set(dep.predecessor_id, []);
    successorMap.get(dep.predecessor_id)!.push(dep.successor_id);
  }

  const visited = new Set<string>();

  function cascade(predecessorId: string) {
    if (visited.has(predecessorId)) return;
    visited.add(predecessorId);

    const predecessor = activityMap.get(predecessorId);
    if (!predecessor?.end_date) return;

    const successorIds = successorMap.get(predecessorId) || [];
    for (const successorId of successorIds) {
      const successor = activityMap.get(successorId);
      if (!successor?.start_date) continue;

      const predEnd = parseISO(predecessor.end_date);
      const succStart = parseISO(successor.start_date);

      if (succStart <= predEnd) {
        const newStart = addDays(predEnd, 1);
        const duration = successor.end_date
          ? differenceInDays(parseISO(successor.end_date), succStart)
          : 0;
        const newEnd = addDays(newStart, duration);

        successor.start_date = format(newStart, "yyyy-MM-dd");
        successor.end_date = format(newEnd, "yyyy-MM-dd");
        activityMap.set(successorId, successor);

        cascade(successorId);
      }
    }
  }

  cascade(movedActivityId);
  return Array.from(activityMap.values());
}
