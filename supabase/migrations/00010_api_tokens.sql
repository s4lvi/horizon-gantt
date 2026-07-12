-- Personal API tokens for the MCP server (bearer auth on /api/mcp).
-- Only the SHA-256 hash is stored; the plaintext token is shown once at creation.
CREATE TABLE public.api_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_api_tokens_user ON public.api_tokens(user_id);

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_tokens_select" ON public.api_tokens FOR SELECT USING (true);
CREATE POLICY "api_tokens_insert" ON public.api_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "api_tokens_delete" ON public.api_tokens FOR DELETE USING (true);
