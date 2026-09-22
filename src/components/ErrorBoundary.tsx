import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isWebGLError =
        this.state.error?.message?.toLowerCase().includes('webgl') ||
        this.state.error?.message?.toLowerCase().includes('context');

      return (
        <div className="w-full h-full min-h-[300px] p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-1">
            {this.props.fallbackTitle ||
              (isWebGLError
                ? 'WebGL Acceleration Notice'
                : 'Viewport Render Interruption')}
          </h3>

          <p className="text-xs text-slate-600 max-w-md mb-4 leading-relaxed font-sans">
            {this.props.fallbackMessage ||
              (isWebGLError
                ? 'The browser WebGL graphics pipeline was unable to initialize or experienced a context reset. The application has preserved all cadastral data, coordinates, and ULPIN records.'
                : 'An unexpected display error occurred while rendering this viewport.')}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-3.5 py-1.5 bg-[#1e3a8a] hover:bg-blue-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Rendering</span>
            </button>

            <button
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Reload Page
            </button>
          </div>

          {this.state.error && (
            <details className="mt-4 text-[11px] text-slate-500 font-mono text-left max-w-lg w-full bg-white p-2.5 rounded border border-slate-200 overflow-x-auto">
              <summary className="cursor-pointer font-semibold text-slate-700 select-none">
                Technical Diagnostics Details
              </summary>
              <pre className="mt-1 whitespace-pre-wrap break-all text-rose-700">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
