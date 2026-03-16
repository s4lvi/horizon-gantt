export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type OrgRole = "owner" | "admin" | "member";

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profiles?: Profile;
};

export type OrganizationInvite = {
  id: string;
  organization_id: string;
  email: string;
  invited_by: string;
  created_at: string;
};

export type Chart = {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  organizations?: Organization;
  chart_shares?: ChartShare[];
};

export type SharePermission = "view" | "edit";

export type ChartShare = {
  id: string;
  chart_id: string;
  user_id: string;
  permission: SharePermission;
  created_at: string;
  profiles?: Profile;
};

export type Activity = {
  id: string;
  chart_id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  color: string;
  assignee_id: string | null;
  sort_order: number;
  parent_id: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile | null;
};

export type DisplayRow = {
  activity: Activity;
  depth: number;
  isGroup: boolean;
  isCollapsed: boolean;
  groupStartDate: string | null;
  groupEndDate: string | null;
};

export type DependencyType = "finish_to_start";

export type Dependency = {
  id: string;
  chart_id: string;
  predecessor_id: string;
  successor_id: string;
  dep_type: DependencyType;
  created_at: string;
};

export type ViewMode = "months-days" | "months-weeks" | "weeks-days";

export type DragState = {
  activityId: string;
  type: "move" | "resize-start" | "resize-end";
  startX: number;
  originalStart: string;
  originalEnd: string;
} | null;

export type LinkState = {
  fromActivityId: string;
} | null;
