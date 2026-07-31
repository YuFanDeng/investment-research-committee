import { MessagesSquare, Workflow } from 'lucide-react';

export type WorkspaceMode = 'committee' | 'agent';

type WorkspaceModeSwitchProps = {
  mode: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
};

const MODES = [
  {
    value: 'committee',
    label: 'Committee research',
    description: 'Guided multi-agent workflow',
    icon: Workflow,
  },
  {
    value: 'agent',
    label: 'Agent chat',
    description: 'Open-ended tool calling',
    icon: MessagesSquare,
  },
] satisfies ReadonlyArray<{
  value: WorkspaceMode;
  label: string;
  description: string;
  icon: typeof Workflow;
}>;

export function WorkspaceModeSwitch({ mode, onChange }: WorkspaceModeSwitchProps) {
  return (
    <nav className="mode-switch" aria-label="Research mode">
      {MODES.map((option) => {
        const Icon = option.icon;
        const isActive = mode === option.value;

        return (
          <button
            type="button"
            className={isActive ? 'is-active' : undefined}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(option.value)}
            key={option.value}
          >
            <span className="mode-switch-icon">
              <Icon size={18} />
            </span>
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
