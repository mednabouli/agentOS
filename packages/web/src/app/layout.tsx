import type { ReactNode } from 'react';

export const metadata = {
  title: 'AgentOS',
  description: 'Multi-interface AI agent orchestration platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
