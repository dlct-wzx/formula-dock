import { createContext, useContext, type ReactNode } from 'react'
import type { MathRenderer } from '../lib/mathRenderer'

const MathRendererContext = createContext<MathRenderer>('katex')

export function MathRendererProvider({
  renderer,
  children,
}: {
  renderer: MathRenderer
  children: ReactNode
}) {
  return <MathRendererContext.Provider value={renderer}>{children}</MathRendererContext.Provider>
}

export function useMathRenderer(): MathRenderer {
  return useContext(MathRendererContext)
}
