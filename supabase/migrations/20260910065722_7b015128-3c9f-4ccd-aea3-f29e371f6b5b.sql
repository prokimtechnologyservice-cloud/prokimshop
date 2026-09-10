CREATE TABLE public.app_sessions (
  token text PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days'
);

CREATE INDEX app_sessions_user_idx ON public.app_sessions(user_id);
CREATE INDEX app_sessions_expires_idx ON public.app_sessions(expires_at);

REVOKE ALL ON public.app_sessions FROM anon, authenticated;
GRANT ALL ON public.app_sessions TO service_role;

ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;