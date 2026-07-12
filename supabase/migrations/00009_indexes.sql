-- Indexes for common query paths: the schedule view (assignee lookups),
-- dependency cascades, and per-resource authorization checks.
CREATE INDEX idx_activities_assignee_id ON public.activities(assignee_id);
CREATE INDEX idx_dependencies_predecessor ON public.dependencies(predecessor_id);
CREATE INDEX idx_dependencies_successor ON public.dependencies(successor_id);
CREATE INDEX idx_org_members_org_user ON public.organization_members(organization_id, user_id);
CREATE INDEX idx_chart_shares_chart_user ON public.chart_shares(chart_id, user_id);
