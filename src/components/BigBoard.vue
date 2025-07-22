<template>
  <div class="border rounded p-2">
    <div class="mb-2 text-sm text-gray-700">板材 {{ modelValue.id }}</div>

    <!-- 尺寸輸入 -->
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

    <!-- 畫布區 -->
    <div
      class="relative border"
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
        :style="{
          width: canvasWidth + 'px',
          height: canvasHeight + 'px',
          display: 'block',
        }"
      />

      <div
        v-for="(rect, index) in rects"
        :key="rect.id"
        class="absolute border-2 border-blue-500 bg-transparent cursor-move"
        :style="{
          top: rect.y * scaleFactor + 'px',
          left: rect.x * scaleFactor + 'px',
          width: rect.width * scaleFactor + 'px',
          height: rect.height * scaleFactor + 'px',
        }"
        @mousedown.stop.prevent="startDrag(rect, $event)"
      >
        <!-- 編號與尺寸 -->
        <div
          class="text-xs text-white bg-black bg-opacity-50 px-1 rounded absolute flex flex-col justify-center items-center text-center"
          :style="{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }"
        >
          <div>{{ rect.label }}</div>
          <div>
            {{ (rect.width / cmToPx).toFixed(0) }}x{{ (rect.height / cmToPx).toFixed(0) }} cm
          </div>
        </div>

        <!-- 刪除按鈕 -->
        <button
          class="absolute top-[-10px] right-[-10px] text-xs bg-red-500 text-white px-1 rounded"
          @click.stop="removeRect(rect.id)"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { nanoid } from 'nanoid'
const canvasWidth = computed(() => props.modelValue.length * props.cmToPx * props.scale)
const canvasHeight = computed(() => props.modelValue.width * props.cmToPx * props.scale)
const getLabel = (index) => {
  if (index === undefined) return '?'
  let label = ''
  while (index >= 0) {
    label = String.fromCharCode((index % 26) + 65) + label
    index = Math.floor(index / 26) - 1
  }
  return label
}

const props = defineProps({
  boardIndex: Number, // 新增這個：板材編號 1、2、3...
  modelValue: Object,
  cmToPx: Number,
  imageList: Array,
  scale: Number,
  rectLength: Number,
  rectWidth: Number,
  labelMap: Object, // 🔥 新增這個，全域 label 對照表
})
const emit = defineEmits(['update:modelValue', 'screenshot'])
const { labelMap } = props

const boardCanvas = ref(null)
const rects = ref([])
const canvasWrapper = ref(null)

const boardPxWidth = computed(() => props.modelValue.length * props.cmToPx)
const boardPxHeight = computed(() => props.modelValue.width * props.cmToPx)
const scaleFactor = computed(() => props.scale)

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

  const width = props.rectLength * props.cmToPx
  const height = props.rectWidth * props.cmToPx
  const id = nanoid()
  console.log(width, height)
  const label = props.boardIndex + getLabel(rects.value.length) // e.g., "2A"
  const newRect = { id, x, y, width, height, label }
  rects.value.push(newRect)

  nextTick(() => captureRegion(newRect))
}

let draggingId = null
let offsetX = 0
let offsetY = 0

const startDrag = (rect, e) => {
  draggingId = rect.id
  offsetX = e.clientX - rect.x * scaleFactor.value
  offsetY = e.clientY - rect.y * scaleFactor.value
}

const onDrag = (e) => {
  if (!draggingId) return
  const rect = rects.value.find((r) => r.id === draggingId)
  if (!rect) return
  rect.x = (e.clientX - offsetX) / scaleFactor.value
  rect.y = (e.clientY - offsetY) / scaleFactor.value
  captureRegion(rect)
}

const stopDrag = () => {
  draggingId = null
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
    label: r.label, // 新增 label 傳回給父層
    url: offscreen.toDataURL(),
    x: r.x * scaleFactor.value,
    y: r.y * scaleFactor.value,
    width: r.width * scaleFactor.value,
    height: r.height * scaleFactor.value,
    rotation: 0,
    rawWidth: r.width,
    rawHeight: r.height,
  })
  // console.log('labelMap', props.labelMap)
  // console.log('id', props.modelValue.id + '__' + rect.id)

  // console.log(r.width, r.height)
  // console.log(r.width / props.cmToPx, r.height / props.cmToPx)
}

const removeRect = (id) => {
  rects.value = rects.value.filter((r) => r.id !== id)
  emit('screenshot', {
    id: props.modelValue.id + '__' + id,
    url: null,
  })
}

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
