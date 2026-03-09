import { Component, ErrorInfo, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDocumentStore } from '../../stores/documentStore'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Markdown preview error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <svg
              className="w-12 h-12 mb-4 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-center">
              Unable to render markdown preview.
              <br />
              <span className="text-sm">The content may contain invalid markdown.</span>
            </p>
          </div>
        )
      )
    }

    return this.props.children
  }
}

function MarkdownContent() {
  const content = useDocumentStore((s) => s.content)

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 p-4">
        Start typing to see the preview...
      </div>
    )
  }

  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
}

export function MarkdownPreview() {
  return (
    <div className="p-4 md:p-6 markdown-preview scroll-touch safe-area-bottom">
      <MarkdownErrorBoundary>
        <MarkdownContent />
      </MarkdownErrorBoundary>
    </div>
  )
}
