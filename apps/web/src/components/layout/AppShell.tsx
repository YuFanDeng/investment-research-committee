import type { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Investment Research Committee home">
          <span className="brand-mark">IR</span>
          <span>Investment Research Committee</span>
        </a>
        <span className="topbar-status">
          <span className="status-dot" /> Local research workspace
        </span>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
