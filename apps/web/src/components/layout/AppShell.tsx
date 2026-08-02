import type { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="AlphaVerifier home">
          <span className="brand-mark">AV</span>
          <span>AlphaVerifier</span>
        </a>
        <span className="topbar-status">
          <span className="status-dot" /> Local research workspace
        </span>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
