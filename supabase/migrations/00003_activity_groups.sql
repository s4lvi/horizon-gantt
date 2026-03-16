ALTER TABLE public.activities
  ADD COLUMN parent_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_activities_parent_id ON public.activities(parent_id);

-- Only top-level activities can be groups (no nested groups)
ALTER TABLE public.activities
  ADD CONSTRAINT chk_no_nested_groups
  CHECK (
    (is_group = false)
    OR (is_group = true AND parent_id IS NULL)
  );
