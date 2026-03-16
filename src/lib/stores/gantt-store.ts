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

  setActivities: (activities: Activity[]) => void;
  setDependencies: (dependencies: Dependency[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setDragState: (state: DragState) => void;
  setLinkState: (state: LinkState) => void;
  setSelectedActivityId: (id: string | null) => void;
  setCanEdit: (canEdit: boolean) => void;

  updateActivity: (id: string, updates: Partial<Activity>) => void;
  addActivity: (activity: Activity) => void;
  removeActivity: (id: string) => void;
  reorderActivities: (oldIndex: number, newIndex: number) => void;

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

  setActivities: (activities) => set({ activities }),
  setDependencies: (dependencies) => set({ dependencies }),
  setViewMode: (viewMode) => set({ viewMode }),
  setDragState: (dragState) => set({ dragState }),
  setLinkState: (linkState) => set({ linkState }),
  setSelectedActivityId: (selectedActivityId) => set({ selectedActivityId }),
  setCanEdit: (canEdit) => set({ canEdit }),

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
      activities: state.activities.filter((a) => a.id !== id),
      dependencies: state.dependencies.filter(
        (d) => d.predecessor_id !== id && d.successor_id !== id
      ),
    })),

  reorderActivities: (oldIndex, newIndex) =>
    set((state) => {
      const items = [...state.activities].sort(
        (a, b) => a.sort_order - b.sort_order
      );
      const [moved] = items.splice(oldIndex, 1);
      items.splice(newIndex, 0, moved);
      return {
        activities: items.map((item, i) => ({ ...item, sort_order: i })),
      };
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
