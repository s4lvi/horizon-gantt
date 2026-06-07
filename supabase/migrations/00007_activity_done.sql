-- Mark activities as done. "Past due" is derived (end_date in the past and not done).
ALTER TABLE public.activities
  ADD COLUMN is_done BOOLEAN NOT NULL DEFAULT false;
