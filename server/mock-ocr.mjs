const DEFAULT_FORMULAS = [
  {
    latex: String.raw`\int_{-\infty}^{\infty}e^{-x^2}\,\mathrm{d}x=\sqrt{\pi}`,
    displayMode: true,
  },
  {
    latex: String.raw`\frac{\mathrm{d}}{\mathrm{d}x}\left(\sin x\right)=\cos x`,
    displayMode: true,
  },
]

function pickFormulas(fileName) {
  const name = String(fileName || '').toLowerCase()
  if (name.includes('matrix')) {
    return [
      {
        latex: String.raw`A=\begin{pmatrix}a&b\\c&d\end{pmatrix},\qquad \det(A)=ad-bc`,
        displayMode: true,
      },
    ]
  }
  if (name.includes('quadratic')) {
    return [
      {
        latex: String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`,
        displayMode: true,
      },
    ]
  }
  if (name.includes('greek')) {
    return [
      {
        latex: String.raw`\alpha+\beta+\gamma=\pi`,
        displayMode: true,
      },
    ]
  }
  return DEFAULT_FORMULAS
}

export async function getMockOcrResult({ fileName }) {
  await new Promise((resolve) => setTimeout(resolve, 700))
  return {
    state: 'done',
    mode: 'mock',
    formulas: pickFormulas(fileName).map((formula, index) => ({
      id: `mock-${index + 1}`,
      ...formula,
    })),
    message: '当前为本地 Mock 模式。配置 MinerU Token 后会切换到真实识别。',
  }
}
