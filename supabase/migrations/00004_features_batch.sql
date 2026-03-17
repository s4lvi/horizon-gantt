-- ============================================================
-- ACTIVITY: add description and notes fields
-- ============================================================
ALTER TABLE public.activities
  ADD COLUMN description TEXT,
  ADD COLUMN notes TEXT;

-- ============================================================
-- ACTIVITY ATTACHMENTS
-- ============================================================
CREATE TABLE public.activity_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   INTEGER,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_attachments_activity ON public.activity_attachments(activity_id);

ALTER TABLE public.activity_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_attachments_select" ON public.activity_attachments FOR SELECT USING (true);
CREATE POLICY "activity_attachments_insert" ON public.activity_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "activity_attachments_delete" ON public.activity_attachments FOR DELETE USING (true);

-- ============================================================
-- PROJECT COMMENTS (charts = projects)
-- ============================================================
CREATE TABLE public.project_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id   UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_comments_chart ON public.project_comments(chart_id);

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_comments_select" ON public.project_comments FOR SELECT USING (true);
CREATE POLICY "project_comments_insert" ON public.project_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "project_comments_update" ON public.project_comments FOR UPDATE USING (true);
CREATE POLICY "project_comments_delete" ON public.project_comments FOR DELETE USING (true);

-- ============================================================
-- ORGANIZATION: add logo, description, location
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN description TEXT,
  ADD COLUMN location TEXT,
  ADD COLUMN logo_url TEXT;
