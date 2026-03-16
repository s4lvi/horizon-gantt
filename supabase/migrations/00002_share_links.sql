-- ============================================================
-- CHART SHARE LINKS (shareable URLs)
-- ============================================================
CREATE TABLE public.chart_share_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id    UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  permission  public.share_permission NOT NULL DEFAULT 'view',
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ
);

CREATE INDEX idx_chart_share_links_token ON public.chart_share_links(token);

-- ============================================================
-- ORGANIZATION INVITE LINKS (shareable URLs)
-- ============================================================
CREATE TABLE public.organization_invite_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_org_invite_links_token ON public.organization_invite_links(token);

-- RLS (using admin client so these are permissive, but add basic policies)
ALTER TABLE public.chart_share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chart_share_links_select" ON public.chart_share_links FOR SELECT USING (true);
CREATE POLICY "chart_share_links_insert" ON public.chart_share_links FOR INSERT WITH CHECK (true);
CREATE POLICY "chart_share_links_delete" ON public.chart_share_links FOR DELETE USING (true);

ALTER TABLE public.organization_invite_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_invite_links_select" ON public.organization_invite_links FOR SELECT USING (true);
CREATE POLICY "org_invite_links_insert" ON public.organization_invite_links FOR INSERT WITH CHECK (true);
CREATE POLICY "org_invite_links_delete" ON public.organization_invite_links FOR DELETE USING (true);
