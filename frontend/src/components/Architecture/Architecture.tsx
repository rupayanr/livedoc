import { useEffect, useState, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import mermaid from 'mermaid'

type Theme = 'dark' | 'light'

/**
 * Safely format text with bold markers (**text**) without using dangerouslySetInnerHTML.
 * This prevents XSS vulnerabilities by using React elements instead of innerHTML.
 */
function formatAnswer(text: string, theme: Theme): ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  const boldClass = theme === 'dark' ? 'text-green-400' : 'text-green-600'

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2)
      return (
        <strong key={index} className={boldClass}>
          {boldText}
        </strong>
      )
    }
    return <span key={index}>{part}</span>
  })
}

export function Architecture() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('architecture-theme')
    return (saved as Theme) || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('architecture-theme', theme)

    const renderDiagrams = async () => {
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        themeVariables: theme === 'dark' ? {
          primaryColor: '#3b82f6',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#475569',
          lineColor: '#94a3b8',
          secondaryColor: '#1e293b',
          tertiaryColor: '#334155',
          background: '#0f172a',
          mainBkg: '#1e293b',
          nodeBorder: '#475569',
          clusterBkg: '#1e293b',
          clusterBorder: '#475569',
          titleColor: '#f8fafc',
          edgeLabelBackground: '#1e293b',
        } : {
          primaryColor: '#3b82f6',
          primaryTextColor: '#1e293b',
          primaryBorderColor: '#e2e8f0',
          lineColor: '#64748b',
          secondaryColor: '#f8fafc',
          tertiaryColor: '#f1f5f9',
          background: '#ffffff',
          mainBkg: '#f8fafc',
          nodeBorder: '#e2e8f0',
          clusterBkg: '#f8fafc',
          clusterBorder: '#e2e8f0',
          titleColor: '#1e293b',
          edgeLabelBackground: '#f8fafc',
        },
      })

      // Re-render all mermaid diagrams
      const elements = document.querySelectorAll('.mermaid')
      for (const el of elements) {
        const content = el.getAttribute('data-content') || el.textContent || ''
        if (content) {
          el.setAttribute('data-content', content)
          el.removeAttribute('data-processed')
          el.innerHTML = content
        }
      }

      // Use mermaid.run() for modern rendering
      await mermaid.run({ querySelector: '.mermaid' })
    }

    renderDiagrams()
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Theme-aware classes
  const t = {
    bg: theme === 'dark' ? 'bg-[#0f172a]' : 'bg-gray-50',
    bgSecondary: theme === 'dark' ? 'bg-[#1e293b]' : 'bg-white',
    bgTertiary: theme === 'dark' ? 'bg-[#334155]' : 'bg-gray-100',
    text: theme === 'dark' ? 'text-[#f8fafc]' : 'text-gray-900',
    textSecondary: theme === 'dark' ? 'text-[#94a3b8]' : 'text-gray-600',
    border: theme === 'dark' ? 'border-[#475569]' : 'border-gray-200',
    cardHover: theme === 'dark' ? 'hover:border-blue-500' : 'hover:border-blue-400 hover:shadow-md',
  }

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} transition-colors duration-300`}>
      {/* Hero */}
      <div className={`text-center py-16 px-4 ${theme === 'dark' ? 'bg-gradient-to-b from-[#1e293b] to-[#0f172a]' : 'bg-gradient-to-b from-white to-gray-50'} border-b ${t.border}`}>
        <div className="flex items-center justify-between max-w-6xl mx-auto mb-8">
          <Link
            to="/"
            className={`inline-flex items-center gap-2 ${t.textSecondary} hover:text-blue-500 transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to App
          </Link>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg ${t.bgSecondary} ${t.border} border hover:scale-105 transition-all`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>

        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-4">
          LiveDoc Architecture
        </h1>
        <p className={`text-xl ${t.textSecondary} max-w-2xl mx-auto`}>
          A deep dive into real-time collaborative editing with CRDTs, WebSockets, and Y.js
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Table of Contents */}
        <nav className={`${t.bgSecondary} rounded-2xl p-8 mb-12 border ${t.border}`}>
          <h2 className="text-2xl font-bold mb-6">Table of Contents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { num: 1, title: 'System Architecture', id: 'architecture' },
              { num: 2, title: 'What is CRDT?', id: 'crdt' },
              { num: 3, title: 'Y.js Deep Dive', id: 'yjs' },
              { num: 4, title: 'Real-Time Sync', id: 'sync' },
              { num: 5, title: 'Components', id: 'components' },
              { num: 6, title: 'Scaling Strategy', id: 'scaling' },
              { num: 7, title: 'Interview Q&A', id: 'interview' },
              { num: 8, title: 'Tech Stack', id: 'tech' },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`flex items-center gap-3 p-4 ${t.bgTertiary} rounded-xl ${t.cardHover} border border-transparent transition-all hover:-translate-y-1`}
              >
                <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center font-semibold text-sm text-white">
                  {item.num}
                </span>
                <span>{item.title}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* Section 1: Architecture */}
        <section id="architecture" className="mb-16">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-blue-500 inline-block">
            System Architecture
          </h2>
          <p className={`${t.textSecondary} mb-6`}>
            LiveDoc uses a client-server architecture with Y.js CRDTs for conflict-free real-time collaboration.
          </p>

          <div className={`${t.bgSecondary} rounded-2xl p-8 border ${t.border} mb-8 overflow-x-auto`}>
            <div className="mermaid">
              {`graph TB
    subgraph Clients["Client Layer"]
        A["User A<br/>React + Y.js"]
        B["User B<br/>React + Y.js"]
        C["User C<br/>React + Y.js"]
    end

    subgraph Backend["FastAPI Backend"]
        WS["WebSocket Handler"]
        RM["Room Manager"]
        YM["Y.js Manager"]
        API["REST API"]
    end

    subgraph Storage["Data Layer"]
        PG[("PostgreSQL")]
        RD[("Redis Pub/Sub")]
    end

    A <-->|WebSocket| WS
    B <-->|WebSocket| WS
    C <-->|WebSocket| WS

    WS <--> RM
    RM <--> YM
    API --> PG
    YM --> PG
    RM <--> RD`}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Real-Time Sync', desc: 'Changes propagate in ~50ms via WebSocket and Y.js CRDT operations.' },
              { title: 'Conflict-Free', desc: 'CRDT guarantees all clients converge to the same state.' },
              { title: 'Offline Support', desc: 'Y.js stores operations locally. Reconnecting merges automatically.' },
              { title: 'Scalable', desc: 'Redis pub/sub enables horizontal scaling across instances.' },
            ].map((feature, idx) => (
              <div
                key={feature.title}
                className={`${t.bgSecondary} rounded-2xl p-6 border ${t.border} ${t.cardHover} transition-all hover:-translate-y-1`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold mb-4">
                  {idx + 1}
                </div>
                <h4 className="font-semibold mb-2">{feature.title}</h4>
                <p className={`text-sm ${t.textSecondary}`}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: CRDT */}
        <section id="crdt" className="mb-16">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-blue-500 inline-block">
            What is CRDT?
          </h2>

          <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/30' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'} rounded-2xl p-8 border mb-8`}>
            <h3 className="text-xl font-semibold text-cyan-500 mb-4">The Problem: Concurrent Edits</h3>
            <p className={`${t.textSecondary} mb-6`}>
              When multiple users edit the same document simultaneously, conflicts arise. Traditional solutions have major drawbacks:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={t.bgTertiary}>
                    <th className="p-4 text-left font-semibold">Approach</th>
                    <th className="p-4 text-left font-semibold">How it Works</th>
                    <th className="p-4 text-left font-semibold">Problem</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={`border-b ${t.border}`}>
                    <td className="p-4"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-500">Locking</span></td>
                    <td className={`p-4 ${t.textSecondary}`}>Only one user can edit</td>
                    <td className={`p-4 ${t.textSecondary}`}>Terrible UX</td>
                  </tr>
                  <tr className={`border-b ${t.border}`}>
                    <td className="p-4"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-500">Last Write Wins</span></td>
                    <td className={`p-4 ${t.textSecondary}`}>Most recent overwrites</td>
                    <td className={`p-4 ${t.textSecondary}`}>Data loss!</td>
                  </tr>
                  <tr className={`border-b ${t.border}`}>
                    <td className="p-4"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-500">OT (Google Docs)</span></td>
                    <td className={`p-4 ${t.textSecondary}`}>Transform operations</td>
                    <td className={`p-4 ${t.textSecondary}`}>Complex O(n²)</td>
                  </tr>
                  <tr>
                    <td className="p-4"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-500">CRDT (Y.js)</span></td>
                    <td className={`p-4 ${t.textSecondary}`}>Math guarantees merge</td>
                    <td className="p-4 text-green-500 font-semibold">No conflicts</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-cyan-500 mb-4">CRDT Mathematical Properties</h3>
          <p className={`${t.textSecondary} mb-6`}>CRDTs guarantee eventual consistency through three properties:</p>

          <div className="space-y-4 mb-8">
            {[
              { code: 'A ⊕ B = B ⊕ A', name: 'Commutativity', desc: 'Order of operations doesn\'t matter' },
              { code: '(A ⊕ B) ⊕ C = A ⊕ (B ⊕ C)', name: 'Associativity', desc: 'Grouping doesn\'t matter' },
              { code: 'A ⊕ A = A', name: 'Idempotency', desc: 'Duplicate operations have no effect' },
            ].map((prop) => (
              <div key={prop.name} className={`${t.bgSecondary} rounded-xl p-4 border-l-4 border-purple-500`}>
                <code className="text-orange-500 text-lg font-mono">{prop.code}</code>
                <div className={`${t.textSecondary} mt-2 text-sm`}>
                  <strong className={t.text}>{prop.name}:</strong> {prop.desc}
                </div>
              </div>
            ))}
          </div>

          <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-green-500/10 to-cyan-500/10' : 'bg-gradient-to-r from-green-50 to-cyan-50'} border-l-4 border-green-500 rounded-r-xl p-6`}>
            <strong className={t.text}>Result:</strong>{' '}
            <span className={t.textSecondary}>
              All replicas are <strong className="text-green-500">guaranteed</strong> to converge to the same state.
              This is called <strong className="text-green-500">Strong Eventual Consistency</strong>.
            </span>
          </div>
        </section>

        {/* Section 3: Y.js */}
        <section id="yjs" className="mb-16">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-blue-500 inline-block">
            Y.js Deep Dive
          </h2>
          <p className={`${t.textSecondary} mb-6`}>
            Y.js assigns a <strong className={t.text}>unique ID</strong> to every character, making merges automatic.
          </p>

          {/* Unique ID Explanation */}
          <div className={`${t.bgSecondary} rounded-2xl p-6 border ${t.border} mb-8`}>
            <h4 className="font-semibold mb-4">How Unique IDs Work</h4>
            <p className={`${t.textSecondary} text-sm mb-6`}>
              Every character gets a globally unique identifier: <code className="text-blue-400">(clientID, clock)</code>
            </p>

            {/* Step 1: Initial State */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</span>
                <span className="font-semibold">Initial State</span>
              </div>
              <div className={`${t.bgTertiary} rounded-lg p-4 text-center`}>
                <span className={`${t.textSecondary}`}>Document is empty: </span>
                <span className="font-mono text-lg">"</span>
                <span className={`${t.bgSecondary} px-4 py-1 rounded border-2 border-dashed ${t.border}`}></span>
                <span className="font-mono text-lg">"</span>
              </div>
            </div>

            {/* Step 2: Concurrent Editing */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</span>
                <span className="font-semibold">Concurrent Editing</span>
                <span className={`text-xs ${t.textSecondary}`}>(both users type at the same time)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User A */}
                <div className={`${t.bgTertiary} rounded-xl p-4 border-l-4 border-blue-500`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">A</div>
                    <div>
                      <div className="font-semibold">Alice</div>
                      <div className={`text-xs ${t.textSecondary}`}>clientID: 1</div>
                    </div>
                  </div>
                  <div className={`text-sm ${t.textSecondary} mb-2`}>Types "Hi"</div>
                  <div className="space-y-2">
                    <div className={`${t.bgSecondary} rounded-lg p-2 flex items-center justify-between`}>
                      <span className="text-2xl font-mono text-blue-400">H</span>
                      <span className="font-mono text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">(1, 0)</span>
                    </div>
                    <div className={`${t.bgSecondary} rounded-lg p-2 flex items-center justify-between`}>
                      <span className="text-2xl font-mono text-blue-400">i</span>
                      <span className="font-mono text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">(1, 1)</span>
                    </div>
                  </div>
                </div>

                {/* User B */}
                <div className={`${t.bgTertiary} rounded-xl p-4 border-l-4 border-green-500`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">B</div>
                    <div>
                      <div className="font-semibold">Bob</div>
                      <div className={`text-xs ${t.textSecondary}`}>clientID: 2</div>
                    </div>
                  </div>
                  <div className={`text-sm ${t.textSecondary} mb-2`}>Types "!"</div>
                  <div className="space-y-2">
                    <div className={`${t.bgSecondary} rounded-lg p-2 flex items-center justify-between`}>
                      <span className="text-2xl font-mono text-green-400">!</span>
                      <span className="font-mono text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">(2, 0)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: The Merge */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</span>
                <span className="font-semibold">CRDT Merge</span>
              </div>
              <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'} rounded-xl p-5 border`}>
                <div className="text-center mb-4">
                  <div className={`inline-flex items-center gap-4 ${t.bgSecondary} rounded-lg px-4 py-2`}>
                    <span className="text-blue-400 font-mono">H<sub className="text-xs">(1,0)</sub></span>
                    <span className="text-blue-400 font-mono">i<sub className="text-xs">(1,1)</sub></span>
                    <span className={`${t.textSecondary}`}>+</span>
                    <span className="text-green-400 font-mono">!<sub className="text-xs">(2,0)</sub></span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <svg className={`w-5 h-5 ${t.textSecondary}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="text-center">
                  <div className={`text-sm ${t.textSecondary} mb-2`}>Sorted by unique IDs (deterministic)</div>
                  <div className={`inline-flex items-center gap-1 ${t.bgSecondary} rounded-lg px-4 py-3`}>
                    <span className="text-2xl font-mono text-blue-400">H</span>
                    <span className="text-2xl font-mono text-blue-400">i</span>
                    <span className="text-2xl font-mono text-green-400">!</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Result */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">4</span>
                <span className="font-semibold">Final State</span>
                <span className={`text-xs text-green-500`}>Identical on all clients</span>
              </div>
              <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'} rounded-xl p-5 border text-center`}>
                <div className="text-4xl font-mono mb-2">
                  <span className="text-blue-400">H</span>
                  <span className="text-blue-400">i</span>
                  <span className="text-green-400">!</span>
                </div>
                <div className={`text-sm ${t.textSecondary}`}>
                  Both Alice and Bob see <span className={t.text}>"Hi!"</span> — no conflicts, no data loss
                </div>
              </div>
            </div>
          </div>

          {/* Key Insight */}
          <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10' : 'bg-gradient-to-r from-blue-50 to-cyan-50'} border-l-4 border-blue-500 rounded-r-xl p-5 mb-8`}>
            <div className="font-semibold mb-2">Why This Works</div>
            <p className={`${t.textSecondary} text-sm`}>
              Every operation has a <span className="text-blue-400 font-mono">(clientID, clock)</span> pair that is globally unique.
              When merging, Y.js sorts characters by their IDs using a deterministic algorithm.
              This means <strong className={t.text}>all clients will always arrive at the same result</strong>, regardless of the order they receive updates.
            </p>
          </div>

          <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'} mb-4`}>State Vector Sync</h3>
          <div className={`${t.bgSecondary} rounded-2xl p-8 border ${t.border} overflow-x-auto`}>
            <div className="mermaid">
              {`sequenceDiagram
    participant A as Client A
    participant S as Server
    participant B as Client B

    Note over A,B: State Vector Exchange
    A->>S: My state: {A:5, B:2}
    S->>A: Missing: B ops 3-4
    A->>A: Apply updates
    Note over A: Synced: {A:5, B:4}`}
            </div>
          </div>
        </section>

        {/* Section 4: Sync Flow */}
        <section id="sync" className="mb-16">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-blue-500 inline-block">
            Real-Time Sync Flow
          </h2>

          <div className={`${t.bgSecondary} rounded-2xl p-8 border ${t.border} mb-8 overflow-x-auto`}>
            <div className="mermaid">
              {`sequenceDiagram
    participant UA as User A
    participant YA as Y.js (A)
    participant WS as Server
    participant YB as Y.js (B)
    participant UB as User B

    Note over UA,UB: User A types "Hello"
    UA->>YA: Keystroke
    YA->>YA: Create CRDT op
    YA->>WS: Binary (~8 bytes)
    WS->>YB: Broadcast
    YB->>YB: Auto-merge
    YB->>UB: Update view

    Note over UA,UB: Both see "Hello"`}
            </div>
          </div>

          <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'} mb-4`}>Connection Lifecycle</h3>
          <div className={`${t.bgSecondary} rounded-2xl p-8 border ${t.border} overflow-x-auto`}>
            <div className="mermaid">
              {`stateDiagram-v2
    [*] --> Connecting: Open document
    Connecting --> Connected: WS open
    Connected --> Syncing: Exchange vectors
    Syncing --> Live: Sync complete
    Live --> Live: Updates
    Live --> Reconnecting: Lost
    Reconnecting --> Syncing: Reconnected
    Live --> [*]: Leave`}
            </div>
          </div>
        </section>

        {/* Section 5: Components */}
        <section id="components" className="mb-16">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-blue-500 inline-block">
            Component Architecture
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'} mb-4`}>Frontend</h3>
              <div className={`${t.bgSecondary} rounded-2xl p-6 border ${t.border} overflow-x-auto`}>
                <div className="mermaid">
                  {`flowchart TB
    subgraph App["App"]
        Router[Router]
        Toast[Toasts]
    end

    subgraph Pages["Pages"]
        Login[Login]
        Home[Documents]
        Edit[Editor]
    end

    subgraph Ed["Editor"]
        Toolbar
        CM[CodeMirror]
        Preview
    end

    Router --> Login
    Router --> Home
    Router --> Edit
    Edit --> Toolbar
    Edit --> CM
    Edit --> Preview`}
                </div>
              </div>
            </div>

            <div>
              <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'} mb-4`}>Backend</h3>
              <div className={`${t.bgSecondary} rounded-2xl p-6 border ${t.border} overflow-x-auto`}>
                <div className="mermaid">
                  {`flowchart TB
    subgraph API["FastAPI"]
        REST["/documents"]
        WS["/ws/{id}"]
    end

    subgraph Core["Core"]
        Room[RoomManager]
        YJS[YjsManager]
    end

    subgraph Data["Data"]
        DB[(PostgreSQL)]
    end

    REST --> DB
    WS --> Room
    WS --> YJS
    YJS -.-> DB`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Scaling */}
        <section id="scaling" className="mb-16">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-blue-500 inline-block">
            Scaling Strategy
          </h2>

          <div className={`${t.bgSecondary} rounded-2xl p-8 border ${t.border} mb-8 overflow-x-auto`}>
            <div className="mermaid">
              {`graph LR
    subgraph LB["Load Balancer"]
        Nginx[Nginx<br/>Sticky Sessions]
    end

    subgraph Servers["Application Servers"]
        S1[Server 1]
        S2[Server 2]
        S3[Server 3]
    end

    subgraph Data["Data Layer"]
        R[(Redis<br/>Pub/Sub)]
        PG[(PostgreSQL<br/>Primary)]
    end

    Nginx --> S1
    Nginx --> S2
    Nginx --> S3

    S1 <--> R
    S2 <--> R
    S3 <--> R

    S1 --> PG
    S2 --> PG
    S3 --> PG`}
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-green-500/10 to-cyan-500/10' : 'bg-gradient-to-r from-green-50 to-cyan-50'} border-l-4 border-green-500 rounded-r-xl p-6`}>
            <strong className={t.text}>Why Sticky Sessions?</strong>{' '}
            <span className={t.textSecondary}>
              WebSocket connections are stateful. Y.js document state lives in server memory.
              Redis pub/sub syncs updates across all instances.
            </span>
          </div>
        </section>

        {/* Section 7: Interview */}
        <section id="interview" className="mb-16">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-blue-500 inline-block">
            Interview Q&A
          </h2>

          <div className="space-y-6">
            {[
              {
                q: 'Why CRDT over Operational Transformation?',
                a: 'CRDTs provide **guaranteed eventual consistency** without a central server. Unlike OT (Google Docs), CRDTs work **peer-to-peer** and handle **offline editing** gracefully. Y.js uses unique IDs per character, making merges automatic.',
              },
              {
                q: 'How does real-time sync work?',
                a: 'When a user types, Y.js creates a CRDT operation with a **unique ID** (clientID + clock). This is encoded as a **binary update (~10 bytes)** and sent via WebSocket. The server broadcasts to all clients, who merge using CRDT rules.',
              },
              {
                q: 'What if two users edit the same word?',
                a: 'Y.js handles this automatically. Each character has a unique ID, so both characters are **preserved in deterministic order** (client ID as tiebreaker). No data loss - this is called **intention preservation**.',
              },
              {
                q: 'How would you scale to millions of users?',
                a: 'Current architecture supports horizontal scaling via **sticky sessions** and **Redis pub/sub**. For massive scale: **document sharding**, **read replicas**, **CDN** for assets, and **connection pooling** with PgBouncer.',
              },
            ].map((item, i) => (
              <div key={i} className={`${t.bgSecondary} rounded-2xl p-6 border ${t.border}`}>
                <div className={`flex items-start gap-3 text-lg font-semibold ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'} mb-4`}>
                  <span className={`w-7 h-7 ${theme === 'dark' ? 'bg-cyan-400 text-[#0f172a]' : 'bg-cyan-600 text-white'} rounded-full flex items-center justify-center text-sm flex-shrink-0`}>
                    Q
                  </span>
                  {item.q}
                </div>
                <div className={`pl-10 ${t.textSecondary} leading-relaxed`}>
                  {formatAnswer(item.a, theme)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 8: Tech Stack */}
        <section id="tech" className="mb-16">
          <h2 className="text-3xl font-bold mb-6 pb-3 border-b-2 border-blue-500 inline-block">
            Technology Stack
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { abbr: 'Re', name: 'React 18', desc: 'UI Framework', color: 'from-cyan-500 to-blue-500' },
              { abbr: 'CM', name: 'CodeMirror 6', desc: 'Text Editor', color: 'from-orange-500 to-red-500' },
              { abbr: 'Yjs', name: 'Y.js', desc: 'CRDT Library', color: 'from-green-500 to-emerald-500' },
              { abbr: 'Fa', name: 'FastAPI', desc: 'Python Backend', color: 'from-teal-500 to-cyan-500' },
              { abbr: 'Pg', name: 'PostgreSQL', desc: 'Database', color: 'from-blue-500 to-indigo-500' },
              { abbr: 'Rd', name: 'Redis', desc: 'Pub/Sub', color: 'from-red-500 to-rose-500' },
              { abbr: 'Zu', name: 'Zustand', desc: 'State Management', color: 'from-amber-500 to-orange-500' },
              { abbr: 'Tw', name: 'Tailwind', desc: 'Styling', color: 'from-sky-500 to-blue-500' },
            ].map((tech) => (
              <div
                key={tech.name}
                className={`${t.bgSecondary} rounded-xl p-4 border ${t.border} flex items-center gap-3 ${t.cardHover} transition-all`}
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${tech.color} rounded-lg flex items-center justify-center text-white text-xs font-bold`}>
                  {tech.abbr}
                </div>
                <div>
                  <div className="font-semibold">{tech.name}</div>
                  <div className={`text-xs ${t.textSecondary}`}>{tech.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className={`text-center py-12 border-t ${t.border} ${t.textSecondary}`}>
        <p>LiveDoc Architecture Documentation</p>
        <p className="mt-2">
          Built by <span className={t.text}>Rupayan Roy</span>
        </p>
      </footer>
    </div>
  )
}
