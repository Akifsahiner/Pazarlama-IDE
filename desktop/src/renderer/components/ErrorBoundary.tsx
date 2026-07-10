import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // Keep a console trace for diagnostics; no external reporting.
    console.error("Renderer crash:", error);
  }

  private reset = () => this.setState({ error: null });

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="font-serif text-[28px] text-text">Something went wrong</div>
          <p className="max-w-md text-body-sm text-text-2">
            The interface hit an unexpected error. You can try to recover without losing your
            session.
          </p>
          <pre className="max-w-lg overflow-auto rounded-[var(--radius-md)] border border-line bg-surface-2 p-3 text-left text-micro text-danger/90">
            {this.state.error.message}
          </pre>
          <button onClick={this.reset} className="btn-accent rounded-[var(--radius-md)] px-4 py-2 text-body-sm">
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
