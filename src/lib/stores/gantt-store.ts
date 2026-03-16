import { create } from "zustand";
import { Activity, Dependency, ViewMode, DragState, LinkState } from "@/lib/types";

interface GanttStore {
  activities: Activity[];
  dependencies: Dependency[];
  viewMode: ViewMode;
  dragState: DragState;
  linkState: LinkState;
  selectedActivityId: string | null;
  canEdit: boolean;
  collapsedGroupIds: Set<string>;

  setActivities: (activities: Activity[]) => void;
  setDependencies: (dependencies: Dependency[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setDragState: (state: DragState) => void;
  setLinkState: (state: LinkState) => void;
  setSelectedActivityId: (id: string | null) => void;
  setCanEdit: (canEdit: boolean) => void;
  toggleGroupCollapsed: (groupId: string) => void;

  updateActivity: (id: string, updates: Partial<Activity>) => void;
  addActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  reorderActivities: (oldIndex: number, newIndex: number) => void;
  reorderWithinParent: (activityId: string, newParentId: string | null, targetSiblingId: string | null, position: "before" | "after") => void;

  addDependency: (dep: Dependency) => void;
  removeDependency: (id: string) => void;
}

export const useGanttStore = create<GanttStore>((set) => ({
  activities: [],
  dependencies: [],
  viewMode: "months-days",
  dragState: null,
  linkState: null,
  selectedActivityId: null,
  canEdit: false,
  collapsedGroupIds: new Set<string>(),

  setActivities: (activities) => set({ activities }),
  setDependencies: (dependencies) => set({ dependencies }),
  setViewMode: (viewMode) => set({ viewMode }),
  setDragState: (dragState) => set({ dragState }),
  setLinkState: (linkState) => set({ linkState }),
  setSelectedActivityId: (selectedActivityId) => set({ selectedActivityId }),
  setCanEdit: (canEdit) => set({ canEdit }),

  toggleGroupCollapsed: (groupId) =>
    set((state) => {
      const next = new Set(state.collapsedGroupIds);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return { collapsedGroupIds: next };
    }),

  updateActivity: (id, updates) =>
    set((state) => ({
      activities: state.activities.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  addActivity: (activity) =>
    set((state) => ({
      activities: [...state.activities, activity],
    })),

  removeActivity: (id) =>
    set((state) => ({
      // Remove the activity and all its children
      activities: state.activities.filter(
        (a) => a.id !== id && a.parent_id !== id
      ),
      dependencies: state.dependencies.filter(
        (d) => d.predecessor_id !== id && d.successor_id !== id
      ),
    })),

  reorderActivities: (_oldIndex, _newIndex) =>
    set((state) => state), // No-op — reordering is handled directly in the sidebar

  reorderWithinParent: (activityId: string, newParentId: string | null, targetSiblingId: string | null, position: "before" | "after") =>
    set((state) => {
      const activities = state.activities.map((a) => ({ ...a }));
      const moved = activities.find((a) => a.id === activityId);
      if (!moved) return state;

      // Update parent
      moved.parent_id = newParentId;

      // Get siblings (other activities with the same parent, excluding the moved one)
      const siblings = activities
        .filter((a) => a.parent_id === newParentId && a.id !== activityId)
        .sort((a, b) => a.sort_order - b.sort_order);

      // Insert at the right position
      let insertIndex = siblings.length; // default: end
      if (targetSiblingId) {
        const targetIdx = siblings.findIndex((a) => a.id === targetSiblingId);
        if (targetIdx !== -1) {
          insertIndex = position === "before" ? targetIdx : targetIdx + 1;
        }
      }
      siblings.splice(insertIndex, 0, moved);

      // Reassign sort_order for all siblings
      siblings.forEach((a, i) => {
        a.sort_order = i;
      });

      return { activities };
    }),

  addDependency: (dep) =>
    set((state) => ({
      dependencies: [...state.dependencies, dep],
    })),

  removeDependency: (id) =>
    set((state) => ({
      dependencies: state.dependencies.filter((d) => d.id !== id),
    })),
}));
