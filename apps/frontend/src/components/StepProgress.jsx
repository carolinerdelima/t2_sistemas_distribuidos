const STEP_LABELS = [
  'Arquitetura síncrona',
  'BEB: Comprar',
  'Perfect Links',
  'Crash-stop',
  'Dead Letter',
  'Ordenação FIFO',
  'Escalabilidade',
  'Confiabilidade',
]

export default function StepProgress({ currentStep, completedSteps }) {
  return (
    <div className="bg-white border-b border-gray-100 py-4 px-6 sticky top-14 z-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1
            const done = completedSteps.includes(n)
            const active = currentStep === n

            return (
              <div key={n} className="flex-1 flex flex-col items-center relative">
                {n < STEP_LABELS.length && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-px ${done ? 'bg-green-400' : 'bg-gray-200'}`}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 relative z-10 transition-all ${
                    done
                      ? 'bg-green-500 border-green-500 text-white'
                      : active
                      ? 'bg-gray-900 border-gray-900 text-white scale-110'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  {done ? 'ok' : n}
                </div>
                <p
                  className={`mt-1.5 text-[10px] text-center leading-tight max-w-[56px] hidden sm:block ${
                    active ? 'text-gray-900 font-semibold' : 'text-gray-400'
                  }`}
                >
                  {label}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
