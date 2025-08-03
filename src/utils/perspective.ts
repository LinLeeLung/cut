// perspective.ts
export function computeHomographyMatrix(src: number[][], dst: number[][]): number[] {
  const A: number[][] = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i]
    const [u, v] = dst[i]
    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u])
    A.push([0, 0, 0, x, y, 1, -x * v, -y * v])
  }
  const b = dst.flat()
  const h = solveLinearSystem(A, b)
  h.push(1) // h9 = 1
  return h
}

// 用高斯消去法解 Ax = b
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length
  const M = A.map((row, i) => [...row, b[i]])

  for (let i = 0; i < n; i++) {
    let maxRow = i
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k
    }
    ;[M[i], M[maxRow]] = [M[maxRow], M[i]]

    for (let k = i + 1; k < n; k++) {
      const c = M[k][i] / M[i][i]
      for (let j = i; j <= n; j++) {
        M[k][j] -= c * M[i][j]
      }
    }
  }

  const x = Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / M[i][i]
    for (let k = i - 1; k >= 0; k--) {
      M[k][n] -= M[k][i] * x[i]
    }
  }

  return x
}
