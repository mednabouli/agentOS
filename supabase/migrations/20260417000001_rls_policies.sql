-- AgentOS Row Level Security policies
-- Each table is locked to the owning user via auth.uid() → users.auth_id

-- Enable RLS on all tables
ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts    ENABLE ROW LEVEL SECURITY;

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth_id = auth.uid());

-- ─── teams ───────────────────────────────────────────────────────────────────
CREATE POLICY teams_select_member ON public.teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.team_members tm
      JOIN public.users u ON u.id = tm.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY teams_insert_own ON public.teams
  FOR INSERT WITH CHECK (
    owner_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY teams_update_owner ON public.teams
  FOR UPDATE USING (
    owner_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY teams_delete_owner ON public.teams
  FOR DELETE USING (
    owner_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ─── team_members ─────────────────────────────────────────────────────────────
CREATE POLICY team_members_select_own ON public.team_members
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.users u ON u.id = t.owner_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY team_members_insert_owner ON public.team_members
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.users u ON u.id = t.owner_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY team_members_delete_owner ON public.team_members
  FOR DELETE USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.users u ON u.id = t.owner_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ─── tasks ───────────────────────────────────────────────────────────────────
CREATE POLICY tasks_select_own ON public.tasks
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY tasks_insert_own ON public.tasks
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY tasks_update_own ON public.tasks
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY tasks_delete_own ON public.tasks
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- ─── agents ──────────────────────────────────────────────────────────────────
CREATE POLICY agents_select_own ON public.agents
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.users u ON u.id = t.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY agents_insert_own ON public.agents
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.users u ON u.id = t.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY agents_update_own ON public.agents
  FOR UPDATE USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.users u ON u.id = t.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ─── checkpoints ─────────────────────────────────────────────────────────────
CREATE POLICY checkpoints_select_own ON public.checkpoints
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.users u ON u.id = t.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY checkpoints_upsert_own ON public.checkpoints
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.users u ON u.id = t.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ─── artifacts ───────────────────────────────────────────────────────────────
CREATE POLICY artifacts_select_own ON public.artifacts
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.users u ON u.id = t.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

CREATE POLICY artifacts_insert_own ON public.artifacts
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.users u ON u.id = t.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
