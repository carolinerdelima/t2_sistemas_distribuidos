import { useEffect, useState } from 'react'

export default function EduModal({
  isOpen,
  title,
  concept = '',
  conceptTag = '',
  tagColor = 'bg-blue-100 text-blue-800',
  formalDefinition = null,
  children,
  onConfirm,
  confirmLabel = 'Entendi, próximo passo',
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        style={{ opacity: visible ? 0.72 : 0, transition: 'opacity 200ms ease' }}
        className="absolute inset-0 bg-black"
      />
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(18px)',
          transition: 'opacity 260ms ease, transform 260ms ease',
        }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[88vh] flex flex-col"
      >
        <div className="px-8 pt-8 pb-5 border-b border-gray-100 flex-shrink-0">
          {conceptTag && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tagColor}`}>
              {conceptTag}
            </span>
          )}
          <h2 className="text-[22px] font-bold text-gray-900 mt-3 leading-snug">{title}</h2>
          {concept && (
            <p className="text-sm text-gray-400 mt-0.5">Conceito: {concept}</p>
          )}
        </div>

        <div className="px-8 py-6 overflow-y-auto flex-1 space-y-4 text-[15px] text-gray-700 leading-relaxed">
          {formalDefinition && (
            <div className="border-l-4 border-blue-400 bg-blue-50 px-5 py-4 rounded-r-xl">
              <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-1.5">
                Definição formal - Cachin, Guerraoui e Rodrigues (2011)
              </p>
              <p className="text-sm text-blue-900 italic leading-relaxed">{formalDefinition}</p>
            </div>
          )}
          {children}
        </div>

        <div className="px-8 pb-8 pt-5 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onConfirm}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-4 rounded-xl text-sm transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
