import type { ReactNode } from 'react';
import { Sidebar } from '../components/Sidebar.js';
import './globals.css';

export const metadata = {
  title: 'AgentOS',
  description: 'Multi-interface AI agent orchestration platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <Sidebar />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
