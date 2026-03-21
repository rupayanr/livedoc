import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState, Compartment } from '@codemirror/state'
import { yCollab } from 'y-codemirror.next'
import { UndoManager } from 'yjs'
import type * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'
import { useTheme } from '../../contexts/ThemeContext'

interface CodeMirrorEditorProps {
  ytext: Y.Text
  provider: WebsocketProvider
}

// Light theme
const lightTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: '#ffffff',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '14px',
    caretColor: '#6366f1',
  },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    borderRight: '1px solid #e2e8f0',
    color: '#94a3b8',
  },
  '.cm-activeLine': {
    backgroundColor: '#f8fafc',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f1f5f9',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(99, 102, 241, 0.15) !important',
  },
  '.cm-cursor': {
    borderLeftColor: '#6366f1',
  },
  '.cm-line': {
    padding: '0 4px',
  },
}, { dark: false })

// Dark theme
const darkTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: '#0f172a',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '14px',
    caretColor: '#818cf8',
    color: '#e2e8f0',
  },
  '.cm-gutters': {
    backgroundColor: '#1e293b',
    borderRight: '1px solid #334155',
    color: '#475569',
  },
  '.cm-activeLine': {
    backgroundColor: '#1e293b',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#334155',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(129, 140, 248, 0.2) !important',
  },
  '.cm-cursor': {
    borderLeftColor: '#818cf8',
  },
  '.cm-line': {
    padding: '0 4px',
  },
}, { dark: true })

export function CodeMirrorEditor({ ytext, provider }: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeCompartmentRef = useRef<Compartment | null>(null)
  const { resolvedTheme } = useTheme()

  // Create editor (only when ytext/provider change, NOT when theme changes)
  useEffect(() => {
    if (!containerRef.current || !ytext || !provider) {
      return
    }

    const undoManager = new UndoManager(ytext)
    const themeCompartment = new Compartment()
    themeCompartmentRef.current = themeCompartment

    // Use current theme at creation time
    const isDark = document.documentElement.classList.contains('dark')

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        markdown(),
        yCollab(ytext, provider.awareness, { undoManager }),
        EditorView.lineWrapping,
        themeCompartment.of(isDark ? darkTheme : lightTheme),
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
      themeCompartmentRef.current = null
    }
  }, [ytext, provider])

  // Update theme dynamically without recreating editor (preserves undo history)
  useEffect(() => {
    const view = viewRef.current
    const themeCompartment = themeCompartmentRef.current
    if (!view || !themeCompartment) return

    const isDark = resolvedTheme === 'dark'
    view.dispatch({
      effects: themeCompartment.reconfigure(isDark ? darkTheme : lightTheme),
    })
  }, [resolvedTheme])

  return <div ref={containerRef} className="h-full w-full" />
}
