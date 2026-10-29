import React from 'react'

interface SimpleMarkdownProps {
  content: string
}

export const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ content }) => {
  if (!content) return null

  // Normalizar quebras de linha
  const normalized = content.replace(/\r\n/g, '\n')
  const paragraphs = normalized.split(/\n\n+/)

  const formatInline = (text: string): React.ReactNode => {
    // Quebra por links, negritos e itálicos básicos
    // Regex para **bold** e [link](url)
    const tokens: React.ReactNode[] = []
    let remaining = text

    let key = 0
    while (remaining.length > 0) {
      // Buscar links [texto](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)
      // Buscar negritos **texto**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)

      let firstMatch: {
        type: 'link' | 'bold'
        index: number
        length: number
        match: RegExpMatchArray
      } | null = null

      if (linkMatch && linkMatch.index !== undefined) {
        firstMatch = {
          type: 'link',
          index: linkMatch.index,
          length: linkMatch[0].length,
          match: linkMatch,
        }
      }

      if (boldMatch && boldMatch.index !== undefined) {
        if (!firstMatch || boldMatch.index < firstMatch.index) {
          firstMatch = {
            type: 'bold',
            index: boldMatch.index,
            length: boldMatch[0].length,
            match: boldMatch,
          }
        }
      }

      if (!firstMatch) {
        tokens.push(remaining)
        break
      }

      if (firstMatch.index > 0) {
        tokens.push(remaining.substring(0, firstMatch.index))
      }

      if (firstMatch.type === 'link') {
        const [, linkText, linkUrl] = firstMatch.match
        tokens.push(
          <a
            key={`l-${key++}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline"
          >
            {linkText}
          </a>,
        )
      } else if (firstMatch.type === 'bold') {
        const [, boldText] = firstMatch.match
        tokens.push(
          <strong key={`b-${key++}`} className="font-semibold text-white">
            {boldText}
          </strong>,
        )
      }

      remaining = remaining.substring(firstMatch.index + firstMatch.length)
    }

    return <>{tokens}</>
  }

  return (
    <div className="space-y-4 text-slate-300 leading-relaxed text-sm sm:text-base">
      {paragraphs.map((para, i) => {
        const trimmed = para.trim()
        if (!trimmed) return null

        // Títulos h1, h2, h3, h4
        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={i}
              className="text-2xl sm:text-3xl font-bold font-serif text-white pt-4 pb-2 border-b border-slate-800"
            >
              {trimmed.substring(2)}
            </h1>
          )
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={i}
              className="text-xl sm:text-2xl font-bold font-serif text-amber-400 pt-4 pb-1"
            >
              {trimmed.substring(3)}
            </h2>
          )
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="text-lg sm:text-xl font-semibold text-white pt-3 pb-1">
              {trimmed.substring(4)}
            </h3>
          )
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={i} className="text-base sm:text-lg font-semibold text-slate-200 pt-2 pb-0.5">
              {trimmed.substring(5)}
            </h4>
          )
        }

        // Listas não-ordenadas (* ou -)
        if (
          trimmed
            .split('\n')
            .every((line) => line.trim().startsWith('- ') || line.trim().startsWith('* '))
        ) {
          const items = trimmed.split('\n').map((line) => line.trim().replace(/^[-*]\s+/, ''))
          return (
            <ul key={i} className="list-disc pl-5 space-y-1 text-slate-300">
              {items.map((item, idx) => (
                <li key={idx}>{formatInline(item)}</li>
              ))}
            </ul>
          )
        }

        // Parágrafos normais com quebras simples
        const lines = trimmed.split('\n')
        return (
          <p key={i} className="text-slate-300 leading-relaxed">
            {lines.map((line, idx) => (
              <React.Fragment key={idx}>
                {formatInline(line)}
                {idx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
