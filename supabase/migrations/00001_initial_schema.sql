-- ============================================================
-- PROFILES (mirrors auth.users, populated via trigger)
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE public.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================
CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            public.org_role NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

-- ============================================================
-- ORGANIZATION INVITES
-- ============================================================
CREATE TABLE public.organization_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  invited_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

-- ============================================================
-- CHARTS
-- ============================================================
CREATE TABLE public.charts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL DEFAULT 'Untitled Chart',
  description     TEXT,
  owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CHART SHARES
-- ============================================================
CREATE TYPE public.share_permission AS ENUM ('view', 'edit');

CREATE TABLE public.chart_shares (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id    UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission  public.share_permission NOT NULL DEFAULT 'view',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chart_id, user_id)
);

-- ============================================================
-- ACTIVITIES
-- ============================================================
CREATE TABLE public.activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id    UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New Activity',
  start_date  DATE,
  end_date    DATE,
  color       TEXT NOT NULL DEFAULT '#3B82F6',
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DEPENDENCIES
-- ============================================================
CREATE TYPE public.dependency_type AS ENUM ('finish_to_start');

CREATE TABLE public.dependencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id        UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  predecessor_id  UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  successor_id    UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  dep_type        public.dependency_type NOT NULL DEFAULT 'finish_to_start',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (predecessor_id, successor_id),
  CHECK (predecessor_id != successor_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_activities_chart_id ON public.activities(chart_id);
CREATE INDEX idx_dependencies_chart_id ON public.dependencies(chart_id);
CREATE INDEX idx_chart_shares_user_id ON public.chart_shares(user_id);
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_charts_owner_id ON public.charts(owner_id);
CREATE INDEX idx_charts_org_id ON public.charts(organization_id);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_view_chart(p_chart_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.charts c
    WHERE c.id = p_chart_id
    AND (
      c.owner_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.chart_shares cs
        WHERE cs.chart_id = c.id AND cs.user_id = p_user_id
      )
      OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = c.organization_id
        AND om.user_id = p_user_id
      )
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_edit_chart(p_chart_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.charts c
    WHERE c.id = p_chart_id
    AND (
      c.owner_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM public.chart_shares cs
        WHERE cs.chart_id = c.id AND cs.user_id = p_user_id AND cs.permission = 'edit'
      )
      OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = c.organization_id
        AND om.user_id = p_user_id
      )
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ORGANIZATIONS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgs_select" ON public.organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = id AND om.user_id = auth.uid())
);
CREATE POLICY "orgs_insert" ON public.organizations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "orgs_update" ON public.organizations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin'))
);
CREATE POLICY "orgs_delete" ON public.organizations FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = id AND om.user_id = auth.uid() AND om.role = 'owner')
);

-- ORGANIZATION MEMBERS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select" ON public.organization_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_id AND om.user_id = auth.uid())
);
CREATE POLICY "org_members_insert" ON public.organization_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin'))
  OR (user_id = auth.uid() AND role = 'owner')
);
CREATE POLICY "org_members_delete" ON public.organization_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin'))
  OR user_id = auth.uid()
);

-- ORGANIZATION INVITES
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_invites_select" ON public.organization_invites FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_id AND om.user_id = auth.uid())
  OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "org_invites_insert" ON public.organization_invites FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin'))
);
CREATE POLICY "org_invites_delete" ON public.organization_invites FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.organization_members om WHERE om.organization_id = organization_id AND om.user_id = auth.uid() AND om.role IN ('owner', 'admin'))
  OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

-- CHARTS
ALTER TABLE public.charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "charts_select" ON public.charts FOR SELECT USING (public.can_view_chart(id, auth.uid()));
CREATE POLICY "charts_insert" ON public.charts FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "charts_update" ON public.charts FOR UPDATE USING (public.can_edit_chart(id, auth.uid()));
CREATE POLICY "charts_delete" ON public.charts FOR DELETE USING (auth.uid() = owner_id);

-- CHART SHARES
ALTER TABLE public.chart_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chart_shares_manage" ON public.chart_shares FOR ALL USING (
  EXISTS (SELECT 1 FROM public.charts c WHERE c.id = chart_id AND c.owner_id = auth.uid())
);
CREATE POLICY "chart_shares_view_own" ON public.chart_shares FOR SELECT USING (user_id = auth.uid());

-- ACTIVITIES
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_select" ON public.activities FOR SELECT USING (public.can_view_chart(chart_id, auth.uid()));
CREATE POLICY "activities_insert" ON public.activities FOR INSERT WITH CHECK (public.can_edit_chart(chart_id, auth.uid()));
CREATE POLICY "activities_update" ON public.activities FOR UPDATE USING (public.can_edit_chart(chart_id, auth.uid()));
CREATE POLICY "activities_delete" ON public.activities FOR DELETE USING (public.can_edit_chart(chart_id, auth.uid()));

-- DEPENDENCIES
ALTER TABLE public.dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dependencies_select" ON public.dependencies FOR SELECT USING (public.can_view_chart(chart_id, auth.uid()));
CREATE POLICY "dependencies_insert" ON public.dependencies FOR INSERT WITH CHECK (public.can_edit_chart(chart_id, auth.uid()));
CREATE POLICY "dependencies_update" ON public.dependencies FOR UPDATE USING (public.can_edit_chart(chart_id, auth.uid()));
CREATE POLICY "dependencies_delete" ON public.dependencies FOR DELETE USING (public.can_edit_chart(chart_id, auth.uid()));
