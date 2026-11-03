import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_MATH_RENDERER, type MathRenderer } from '../lib/mathRenderer'

const MathRendererContext = createContext<MathRenderer>(DEFAULT_MATH_RENDERER)

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
