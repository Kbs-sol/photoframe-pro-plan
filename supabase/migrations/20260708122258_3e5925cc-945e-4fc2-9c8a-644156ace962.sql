CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view admin list" ON public.admin_users FOR SELECT TO authenticated USING (true);
INSERT INTO public.admin_users (email, role) VALUES ('admin@chitraframe.test', 'owner') ON CONFLICT (email) DO UPDATE SET role = 'owner';