'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '◉' },
  { href: '/swarms/new', label: 'New Swarm', icon: '+' },
  { href: '/agents', label: 'Agents', icon: '⊞' },
  { href: '/costs', label: 'Costs', icon: '$' },
  { href: '/templates', label: 'Templates', icon: '◈' },
  { href: '/prd', label: 'PRD Parser', icon: '≡' },
  { href: '/team', label: 'Team', icon: '⊕' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="name">AgentOS</div>
        <div className="version">v1.5.0</div>
      </div>
      {NAV.map(({ href, label, icon }) => {
        const active =
          pathname === href ||
          (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link key={href} href={href} className={`nav-link${active ? ' active' : ''}`}>
            <span className="nav-icon">{icon}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
