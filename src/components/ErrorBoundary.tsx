import { Button } from "@/components/ui/button";
import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
          <h1 className="text-2xl font-bold mb-4">Valami hiba történt</h1>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Az alkalmazás váratlan hibába ütközött. Kérjük, töltse újra az oldalt.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            Újratöltés
          </Button>
          {this.state.error && (
            <pre className="mt-4 text-xs text-muted-foreground max-w-md overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
