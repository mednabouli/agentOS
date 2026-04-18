-- AgentOS initial schema
-- Run: supabase db push

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       UUID UNIQUE NOT NULL,         -- references auth.users.id
  email         TEXT UNIQUE NOT NULL,
  claude_api_key_enc TEXT,                    -- encrypted at app layer
  plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_email   ON public.users(email);

-- ─── teams ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  owner_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_owner ON public.teams(owner_id);

-- ─── team_members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id    UUID NOT NULL REFERENCES public.teams(id)  ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

CREATE INDEX idx_team_members_user ON public.team_members(user_id);

-- ─── tasks ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id     UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  prompt      TEXT NOT NULL,
  prd_path    TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'success', 'failed', 'paused')),
  phase       TEXT CHECK (phase IN ('analyze', 'plan', 'implement', 'test', 'review')),
  total_cost  NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id   ON public.tasks(user_id);
CREATE INDEX idx_tasks_team_id   ON public.tasks(team_id);
CREATE INDEX idx_tasks_status    ON public.tasks(status);
CREATE INDEX idx_tasks_created   ON public.tasks(created_at DESC);

-- ─── agents ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('orchestrator', 'planner', 'developer', 'tester', 'reviewer', 'debugger')),
  model       TEXT NOT NULL,
  phase       TEXT NOT NULL CHECK (phase IN ('analyze', 'plan', 'implement', 'test', 'review')),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'success', 'failed')),
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  thinking_tokens INTEGER NOT NULL DEFAULT 0,
  cost            NUMERIC(10, 6) NOT NULL DEFAULT 0,
  latency_ms      INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_agents_task_id ON public.agents(task_id);
CREATE INDEX idx_agents_role    ON public.agents(role);

-- ─── checkpoints ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checkpoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  phase       TEXT NOT NULL CHECK (phase IN ('analyze', 'plan', 'implement', 'test', 'review')),
  state_json  JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, phase)
);

CREATE INDEX idx_checkpoints_task_id ON public.checkpoints(task_id);

-- ─── artifacts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.artifacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES public.tasks(id)   ON DELETE CASCADE,
  agent_id   UUID REFERENCES public.agents(id)           ON DELETE SET NULL,
  file_path  TEXT NOT NULL,
  content    TEXT,
  diff       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifacts_task_id  ON public.artifacts(task_id);
CREATE INDEX idx_artifacts_agent_id ON public.artifacts(agent_id);

-- ─── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
