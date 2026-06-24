import { useState } from 'react'

export default function TerminalBlock({ command, description }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(command).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-700 text-left">
      {description && (
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      )}
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-green-400 font-mono text-sm flex-shrink-0 select-none">$</span>
          <code className="text-green-300 font-mono text-sm break-all">{command}</code>
        </div>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}
