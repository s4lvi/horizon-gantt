-- Checklist items attached to activities (todo list per activity).
CREATE TABLE public.activity_checklist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  is_done     BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX activity_checklist_items_activity_idx
  ON public.activity_checklist_items(activity_id);

ALTER TABLE public.activity_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_items_select" ON public.activity_checklist_items FOR SELECT USING (true);
CREATE POLICY "checklist_items_insert" ON public.activity_checklist_items FOR INSERT WITH CHECK (true);
CREATE POLICY "checklist_items_update" ON public.activity_checklist_items FOR UPDATE USING (true);
CREATE POLICY "checklist_items_delete" ON public.activity_checklist_items FOR DELETE USING (true);
