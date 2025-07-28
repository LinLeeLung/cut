export type Rect = {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: 'rect' | 'circle'
  rotation?: number
  radius: number
  label: string
}
