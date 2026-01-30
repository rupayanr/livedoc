import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useDocumentStore } from '../../stores/documentStore'

export function MarkdownPreview() {
  const content = useDocumentStore((s) => s.content)

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Start typing to see the preview...
      </div>
    )
  }

  return (
    <div className="p-6 markdown-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
