<template>
  <div class="rounded p-2">
    <div class="mb-2 text-sm text-gray-700">板材 {{ boardIndex }}</div>

    <!-- 輸入尺寸 -->
    <div class="flex gap-2 mb-2">
      <div>
        <label class="text-sm">長度 (cm)</label>
        <input
          type="number"
          v-model.number="modelValue.length"
          class="border rounded px-2 py-1 w-24"
        />
      </div>
      <div>
        <label class="text-sm">寬度 (cm)</label>
        <input
          type="number"
          v-model.number="modelValue.width"
          class="border rounded px-2 py-1 w-24"
        />
      </div>
    </div>

    <!-- 畫布 + 圖形 -->
    <div
      class="relative border"
      ref="canvasWrapper"
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
      @mousemove="onMouseMoveCombined"
      @mousedown="onDragStart"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
    >
      <canvas
        ref="boardCanvas"
        @click="handleImageClick"
        :width="canvasWidth"
        :height="canvasHeight"
        class="block"
      />

      <!-- 顯示圖形數量 -->
      <div class="absolute top-0 left-0 z-50 bg-red-200 text-xs px-1">
        {{ rects.length }} 個圖形
      </div>

      <!-- 顯示圖形 -->
      <component
        v-for="rect in localRects"
        :key="rect.id"
        :is="rect.type === 'rect' ? RectShape : CircleShape"
        :rect="rect"
        :scale="scaleFactor"
        @remove="removeRect"
        @drag-start="startDrag"
      />

      <!-- 滑鼠座標提示 -->
      <div class="absolute bottom-0 left-0 z-50 bg-yellow-200 text-xs px-1">
        滑鼠座標：{{ mousePosition.x }} cm, {{ mousePosition.y }} cm
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { nanoid } from 'nanoid'
import RectShape from '@/components/RectShape.vue'
import CircleShape from './CircleShape.vue'
import type { Rect } from '@/types'
defineExpose({})
const mousePosCm = ref({ x: 0, y: 0 })
const mousePixelPos = ref({ x: 0, y: 0 })
const isHovering = ref(false)
const handleDragging = (e: MouseEvent) => {
  if (!draggingId.value) return
  const rect = localRects.value.find((r) => r.id === draggingId.value)
  if (!rect) return

  rect.x = (e.clientX - offset.value.x) / scaleFactor.value + (rect.radius ?? 0)
  rect.y = (e.clientY - offset.value.y) / scaleFactor.value + (rect.radius ?? 0)

  if (rect.type === 'rect') captureRegion(rect)
  else captureCircle(rect)
}

const onMouseMove = (event: MouseEvent) => {
  const rect = canvasWrapper.value?.getBoundingClientRect()
  if (!rect) return

  const xPx = event.clientX - rect.left
  const yPx = event.clientY - rect.top

  mousePixelPos.value = { x: xPx, y: yPx }
  mousePosCm.value = {
    x: xPx / props.cmToPx,
    y: yPx / props.cmToPx,
  }
}
const mousePosition = ref({ x: 0, y: 0 })
const onMouseMoveCombined = (e: MouseEvent) => {
  handleMouseMove(e)
  handleDragging(e)
}

const handleMouseMove = (e: MouseEvent) => {
  const rect = canvasWrapper.value?.getBoundingClientRect()
  if (!rect) return
  const x = (e.clientX - rect.left) / scaleFactor.value / props.cmToPx
  const y = (e.clientY - rect.top) / scaleFactor.value / props.cmToPx
  mousePosition.value = {
    x: parseFloat(x.toFixed(1)),
    y: parseFloat(y.toFixed(1)),
  }
}

const componentMap = {
  RectShape,
  CircleShape,
}
const props = defineProps<{
  shapeType: string
  circleRadius: number
  boardIndex: number
  modelValue: {
    id: string
    length: number
    width: number
    url: string
  }
  cmToPx: number
  imageList: any[]
  scale: number
  rectLength: number
  rectWidth: number
  labelMap: Record<string, number>
  rects: Rect[] // 用於 v-model:rects
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: typeof props.modelValue): void
  (e: 'update:rects', val: Rect[]): void // ✅ 確保這裡冒號
  (e: 'screenshot', payload: any): void
}>()

const boardCanvas = ref<HTMLCanvasElement | null>(null)
const canvasWrapper = ref<HTMLDivElement | null>(null)
const draggingId = ref<string | null>(null)
const offset = ref({ x: 0, y: 0 })

const canvasWidth = computed(() => props.modelValue.length * props.cmToPx * props.scale)
const canvasHeight = computed(() => props.modelValue.width * props.cmToPx * props.scale)
const scaleFactor = computed(() => props.scale)

const localRects = computed({
  get: () => props.rects,
  set: (val) => emit('update:rects', val),
})

const drawImage = () => {
  const ctx = boardCanvas.value?.getContext('2d')
  if (!ctx || !props.modelValue.url) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
    ctx.drawImage(img, 0, 0, canvasWidth.value, canvasHeight.value)
  }
  img.src = props.modelValue.url
}

onMounted(drawImage)
watch(
  () => [props.modelValue.length, props.modelValue.width, props.modelValue.url, scaleFactor.value],
  drawImage,
)

const getLabel = (index: number): string => {
  let label = ''
  while (index >= 0) {
    label = String.fromCharCode((index % 26) + 65) + label
    index = Math.floor(index / 26) - 1
  }
  return label
}

const handleImageClick = (e: MouseEvent) => {
  const canvasRect = canvasWrapper.value?.getBoundingClientRect()
  if (!canvasRect) return
  const x = (e.clientX - canvasRect.left) / scaleFactor.value
  const y = (e.clientY - canvasRect.top) / scaleFactor.value
  const id = nanoid()

  if (props.shapeType === 'rect') {
    const label = `${props.boardIndex}${getLabel(localRects.value.length)} (${props.rectLength}×${props.rectWidth})`
    const width = props.rectLength * props.cmToPx
    const height = props.rectWidth * props.cmToPx
    const newRect = { id, x, y, width, height, label, type: 'rect' } as Rect
    localRects.value.push(newRect)
    nextTick(() => captureRegion(newRect))
  } else if (props.shapeType === 'circle') {
    const label = `${props.boardIndex}${getLabel(localRects.value.length)} R(${props.circleRadius})`
    const radius = props.circleRadius * props.cmToPx
    const newCircle = { id, x, y, radius, label, type: 'circle' } as Rect
    localRects.value.push(newCircle)
    nextTick(() => captureCircle(newCircle))
  }
}

const captureRegion = (r: Rect) => {
  const ctx = boardCanvas.value?.getContext('2d')
  if (!ctx) return
  const imageData = ctx.getImageData(r.x, r.y, r.width, r.height)
  const offscreen = document.createElement('canvas')
  offscreen.width = r.width
  offscreen.height = r.height
  const offCtx = offscreen.getContext('2d')!
  offCtx.putImageData(imageData, 0, 0)

  emit('screenshot', {
    id: props.modelValue.id + '__' + r.id,
    label: r.label,
    url: offscreen.toDataURL(),
    x: r.x * scaleFactor.value,
    y: r.y * scaleFactor.value,
    width: r.width * scaleFactor.value,
    height: r.height * scaleFactor.value,
    rotation: 0,
    rawWidth: r.width,
    rawHeight: r.height,
    type: 'rect',
  })
}

const captureCircle = (c: Rect) => {
  const ctx = boardCanvas.value?.getContext('2d')
  if (!ctx) return
  const d = c.radius * 2
  const imageData = ctx.getImageData(c.x - c.radius, c.y - c.radius, d, d)
  const offscreen = document.createElement('canvas')
  offscreen.width = d
  offscreen.height = d
  const offCtx = offscreen.getContext('2d')!
  offCtx.beginPath()
  offCtx.arc(c.radius, c.radius, c.radius, 0, Math.PI * 2)
  offCtx.clip()
  offCtx.putImageData(imageData, 0, 0)

  emit('screenshot', {
    id: props.modelValue.id + '__' + c.id,
    label: c.label,
    url: offscreen.toDataURL(),
    x: (c.x - c.radius) * scaleFactor.value,
    y: (c.y - c.radius) * scaleFactor.value,
    width: d * scaleFactor.value,
    height: d * scaleFactor.value,
    rotation: 0,
    rawWidth: d,
    rawHeight: d,
    type: 'circle',
  })
}

const removeRect = (id: string) => {
  // console.log('removeRect')
  localRects.value = localRects.value.filter((r) => r.id !== id)
  emit('screenshot', { id: props.modelValue.id + '__' + id, url: null })
}
const startDrag = (rect: Rect, e: MouseEvent) => {
  draggingId.value = rect.id
  offset.value = {
    x: e.clientX - (rect.x - (rect.radius ?? 0)) * scaleFactor.value,
    y: e.clientY - (rect.y - (rect.radius ?? 0)) * scaleFactor.value,
  }
}

const onDragStart = (e: MouseEvent) => {
  if (!draggingId.value) return
  const rect = localRects.value.find((r) => r.id === draggingId.value)
  console.log('onDragStart')
  if (!rect) return
  rect.x = (e.clientX - offset.value.x) / scaleFactor.value + (rect.radius ?? 0)
  rect.y = (e.clientY - offset.value.y) / scaleFactor.value + (rect.radius ?? 0)
  if (rect.type === 'rect') captureRegion(rect)
  else captureCircle(rect)
}

const stopDrag = () => (draggingId.value = null)
</script>

<style scoped>
.absolute button {
  z-index: 10;
}
</style>
