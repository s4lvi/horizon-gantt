-- Soft delete for charts/projects
ALTER TABLE public.charts
  ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_charts_deleted ON public.charts(deleted_at);
