import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/60 p-6 md:p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Animated Warning Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center shadow-inner">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title & Message */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Application Error
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                The application encountered an unexpected issue or connection timeout. Please reload to try again.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm transition-all duration-200 shadow-md shadow-blue-500/20"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all duration-200"
              >
                Go to Login
              </button>
            </div>

            {/* Technical Details (Expandable for debugging) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <summary className="text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">
                  Technical Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-slate-900 text-red-400 rounded-lg text-xs font-mono overflow-auto max-h-40">
                  <p className="font-bold">{this.state.error.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-[10px] text-slate-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
