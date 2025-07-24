<template>
  <div class="rounded p-2">
    <div class="mb-2 text-sm text-gray-700">板材 {{ boardIndex }}</div>

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

    <div
      class="relative"
      ref="canvasWrapper"
      style="width: 100%; height: 100%"
      @mousemove="onDrag"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
    >
      <canvas
        ref="boardCanvas"
        @click="handleImageClick"
        :width="canvasWidth"
        :height="canvasHeight"
        :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px', display: 'block' }"
      />

      <!-- 矩形顯示區 -->
      <div v-for="rect in rects" :key="rect.id">
        <div
          v-if="rect.type === 'rect'"
          class="absolute border-2 border-blue-500 bg-transparent cursor-move"
          :style="{
            top: rect.y * scaleFactor + 'px',
            left: rect.x * scaleFactor + 'px',
            width: rect.width * scaleFactor + 'px',
            height: rect.height * scaleFactor + 'px',
          }"
          @mousedown.stop.prevent="startDrag(rect, $event)"
        >
          <div
            class="text-xs text-white bg-black bg-opacity-50 px-1 rounded absolute flex flex-col justify-center items-center text-center"
            :style="{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }"
          >
            <div>{{ rect.label }}</div>
            <div>
              {{ (rect.width / cmToPx).toFixed(0) }}x{{ (rect.height / cmToPx).toFixed(0) }} cm
            </div>
          </div>
          <button
            class="absolute top-[-10px] right-[-10px] text-xs bg-red-500 text-white px-1 rounded"
            @click.stop="removeRect(rect.id)"
          >
            ✕
          </button>
        </div>

        <!-- 圓形顯示區 -->
        <div
          v-else-if="rect.type === 'circle'"
          class="absolute border-2 border-red-500 rounded-full cursor-move"
          :style="{
            top: (rect.y - rect.radius) * scaleFactor + 'px',
            left: (rect.x - rect.radius) * scaleFactor + 'px',
            width: rect.radius * 2 * scaleFactor + 'px',
            height: rect.radius * 2 * scaleFactor + 'px',
          }"
          @mousedown.stop.prevent="startDrag(rect, $event)"
        >
          <div
            class="absolute text-xs text-white bg-black bg-opacity-50 px-1 rounded text-center"
            style="top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none"
          >
            <div>{{ rect.label }}</div>
            <div>{{ ((rect.radius * 2) / cmToPx).toFixed(0) }} cm</div>
          </div>
          <button
            class="absolute top-[-10px] right-[-10px] text-xs bg-red-500 text-white px-1 rounded"
            @click.stop="removeRect(rect.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { nanoid } from 'nanoid'

const props = defineProps({
  shapeType: { type: String, default: 'rect' },
  circleRadius: { type: Number, default: 10 },
  boardIndex: Number,
  modelValue: Object,
  cmToPx: Number,
  imageList: Array,
  scale: Number,
  rectLength: Number,
  rectWidth: Number,
  labelMap: Object,
})

const emit = defineEmits(['update:modelValue', 'screenshot'])

const canvasWidth = computed(() => props.modelValue.length * props.cmToPx * props.scale)
const canvasHeight = computed(() => props.modelValue.width * props.cmToPx * props.scale)
const scaleFactor = computed(() => props.scale)
const boardCanvas = ref(null)
const canvasWrapper = ref(null)
const rects = ref([])
const boardPxWidth = computed(() => props.modelValue.length * props.cmToPx)
const boardPxHeight = computed(() => props.modelValue.width * props.cmToPx)

const getLabel = (index) => {
  let label = ''
  while (index >= 0) {
    label = String.fromCharCode((index % 26) + 65) + label
    index = Math.floor(index / 26) - 1
  }
  return label
}

const drawImage = () => {
  const ctx = boardCanvas.value.getContext('2d')
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    boardCanvas.value.width = boardPxWidth.value
    boardCanvas.value.height = boardPxHeight.value
    ctx.clearRect(0, 0, boardPxWidth.value, boardPxHeight.value)
    ctx.drawImage(img, 0, 0, boardPxWidth.value, boardPxHeight.value)
  }
  img.src = props.modelValue.url
}

const handleImageClick = (e) => {
  const canvasRect = canvasWrapper.value.getBoundingClientRect()
  const x = (e.clientX - canvasRect.left) / scaleFactor.value
  const y = (e.clientY - canvasRect.top) / scaleFactor.value

  const id = nanoid()
  const label = props.boardIndex + getLabel(rects.value.length)
  console.log(props.shapeType)
  if (props.shapeType === 'rect') {
    const width = props.rectLength * props.cmToPx
    const height = props.rectWidth * props.cmToPx
    const newRect = { id, x, y, width, height, label, type: 'rect' }
    rects.value.push(newRect)
    nextTick(() => captureRegion(newRect))
  } else if (props.shapeType === 'circle') {
    const radius = props.circleRadius * props.cmToPx
    const newCircle = { id, x, y, radius, label, type: 'circle' }
    rects.value.push(newCircle)
    nextTick(() => captureCircle(newCircle))
  }
}

const captureRegion = (r) => {
  const ctx = boardCanvas.value.getContext('2d')
  const imageData = ctx.getImageData(r.x, r.y, r.width, r.height)
  const offscreen = document.createElement('canvas')
  offscreen.width = r.width
  offscreen.height = r.height
  const offCtx = offscreen.getContext('2d')
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
    type: 'rect', // ✅ 可選，但建議加入
  })
}

const captureCircle = (c) => {
  const ctx = boardCanvas.value.getContext('2d')
  const d = c.radius * 2
  const imageData = ctx.getImageData(c.x - c.radius, c.y - c.radius, d, d)
  const offscreen = document.createElement('canvas')
  offscreen.width = d
  offscreen.height = d
  const offCtx = offscreen.getContext('2d')
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
    type: 'circle', // ✅ 加這行！
  })
}

const removeRect = (id) => {
  rects.value = rects.value.filter((r) => r.id !== id)
  emit('screenshot', { id: props.modelValue.id + '__' + id, url: null })
}

let draggingId = null
let offsetX = 0
let offsetY = 0

const startDrag = (rect, e) => {
  draggingId = rect.id
  offsetX = e.clientX - (rect.x - (rect.radius ?? 0)) * scaleFactor.value
  offsetY = e.clientY - (rect.y - (rect.radius ?? 0)) * scaleFactor.value
}

const onDrag = (e) => {
  if (!draggingId) return
  const rect = rects.value.find((r) => r.id === draggingId)
  if (!rect) return
  rect.x = (e.clientX - offsetX) / scaleFactor.value + (rect.radius ?? 0)
  rect.y = (e.clientY - offsetY) / scaleFactor.value + (rect.radius ?? 0)
  if (rect.type === 'rect') captureRegion(rect)
  else if (rect.type === 'circle') captureCircle(rect)
}

const stopDrag = () => {
  draggingId = null
}
watch(
  () => props.circleRadius,
  (newVal) => {
    console.log('半徑變更為:', newVal)
    console.info('半徑變更為:', newVal)
  },
)
watch(
  () => [props.modelValue.length, props.modelValue.width, props.modelValue.url, scaleFactor.value],
  () => {
    if (props.modelValue.url) drawImage()
  },
)

onMounted(() => {
  if (props.modelValue.url) drawImage()
})
</script>

<style scoped>
.absolute button {
  z-index: 10;
}
</style>
