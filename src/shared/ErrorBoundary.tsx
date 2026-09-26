import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Last line of defence for a render-time crash. Without it, any thrown error
 * unmounts the whole React tree and leaves the admin staring at a blank white
 * page with no way forward — the single worst failure mode in production.
 *
 * Deliberately a hard reload rather than a state reset: the tree that threw is
 * of unknown validity, and a reload is the one recovery that always works.
 */
interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No logging service is wired up yet; the console keeps the stack reachable
    // for anyone debugging a report from the field.
    console.error('[tabaakhuh] unhandled render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        dir="rtl"
        role="alert"
        className="flex min-h-screen items-center justify-center bg-papyrus p-6"
      >
        <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 text-center">
          <h1 className="mb-2 text-xl font-black text-brand">حصل خطأ غير متوقع</h1>
          <p className="mb-6 text-sm font-bold text-gray-500">
            في مشكلة منعت الصفحة من العمل. جرّب تحديث الصفحة، ولو المشكلة فضلت، بلّغ الدعم الفني.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-brand px-6 py-3 text-sm font-black text-white"
          >
            تحديث الصفحة
          </button>
        </div>
      </div>
    )
  }
}
