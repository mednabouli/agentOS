export const dynamic = 'force-dynamic';

interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  tasksRun: number;
}

// Placeholder data — real data will come from Supabase teams/team_members tables
const PLACEHOLDER_TEAM: TeamMember[] = [
  { id: '1', email: 'you@example.com', role: 'owner', joinedAt: '2026-01-01', tasksRun: 0 },
];

const ROLE_BADGE: Record<TeamMember['role'], string> = {
  owner: 'badge-completed',
  admin: 'badge-running',
  member: '',
};

export default function TeamPage() {
  return (
    <>
      <h1>Team</h1>

      <div className="card-grid">
        <div className="stat-card">
          <div className="label">Members</div>
          <div className="value">{PLACEHOLDER_TEAM.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Plan</div>
          <div className="value">Free</div>
        </div>
        <div className="stat-card">
          <div className="label">Shared Tasks</div>
          <div className="value">0</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Tasks Run</th>
            </tr>
          </thead>
          <tbody>
            {PLACEHOLDER_TEAM.map((m) => (
              <tr key={m.id}>
                <td>{m.email}</td>
                <td>
                  <span className={`badge ${ROLE_BADGE[m.role]}`}>{m.role}</span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{m.joinedAt}</td>
                <td>{m.tasksRun}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 24, maxWidth: 480 }}>
        <h2>Invite a Member</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Team collaboration requires a Supabase project. Configure your Supabase URL and anon key
          in <strong>Settings</strong> to enable multi-user access.
        </p>
        <button className="btn btn-primary" disabled>
          + Invite (requires Supabase)
        </button>
      </div>
    </>
  );
}
