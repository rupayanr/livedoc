import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { yCollab } from 'y-codemirror.next'
import { UndoManager } from 'yjs'
import type * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'

interface CodeMirrorEditorProps {
  ytext: Y.Text
  provider: WebsocketProvider
}

export function CodeMirrorEditor({ ytext, provider }: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!containerRef.current || !ytext || !provider) {
      return
    }

    const undoManager = new UndoManager(ytext)

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        markdown(),
        yCollab(ytext, provider.awareness, { undoManager }),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': {
            height: '100%',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '.cm-content': {
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: '14px',
          },
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [ytext, provider])

  return <div ref={containerRef} className="h-full w-full" />
}
