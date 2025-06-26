<template>
  <div class="relative border shadow rounded p-2 bg-gray-100">
    <!-- 尺寸輸入欄 -->
    <div class="mb-2 flex gap-2 items-center text-sm">
      <label>長：</label>
      <input
        type="number"
        v-model.number="localWidthCm"
        class="w-20 px-1 py-0.5 border rounded"
        min="1"
      />
      <label>寬：</label>
      <input
        type="number"
        v-model.number="localHeightCm"
        class="w-20 px-1 py-0.5 border rounded"
        min="1"
      />
      <span class="text-gray-500">(cm)</span>
    </div>

    <canvas
      ref="canvas"
      :width="pixelWidth"
      :height="pixelHeight"
      class="border bg-white"
      @mousedown="startDraw"
      @mousemove="onMouseMove"
      @mouseup="endDraw"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick, computed } from 'vue'

const props = defineProps({
  initialWidth: Number,
  initialHeight: Number,
  ratio: { type: Number, default: 3 },
  imageUrl: String,
  boardId: String,
  drawType: { type: String, default: 'rect' },
})

const emit = defineEmits(['update-image'])

const localWidthCm = ref(props.initialWidth || 300)
const localHeightCm = ref(props.initialHeight || 150)

const pixelWidth = computed(() => localWidthCm.value * props.ratio)
const pixelHeight = computed(() => localHeightCm.value * props.ratio)

const canvas = ref(null)
const ctx = ref(null)

const image = new Image()
const shapes = ref([])
const draggingShape = ref(null)
const startX = ref(null)
const startY = ref(null)

// 監聽圖片載入
watch(
  () => props.imageUrl,
  (url) => {
    if (url) {
      image.src = url
      image.onload = () => drawAll()
    }
  },
)

// 監聽尺寸輸入變化
watch([localWidthCm, localHeightCm], async () => {
  await nextTick()
  ctx.value = canvas.value.getContext('2d')
  drawAll()
})

onMounted(() => {
  ctx.value = canvas.value.getContext('2d')
  if (props.imageUrl) {
    image.src = props.imageUrl
    image.onload = () => drawAll()
  } else {
    drawAll()
  }
})

function drawAll() {
  ctx.value.clearRect(0, 0, pixelWidth.value, pixelHeight.value)
  if (image.complete) {
    ctx.value.drawImage(image, 0, 0, pixelWidth.value, pixelHeight.value)
  }
  for (const s of shapes.value) {
    drawShape(s)
  }
}

function drawShape(s) {
  ctx.value.save()
  ctx.value.strokeStyle = 'red'
  ctx.value.lineWidth = 2
  ctx.value.translate(s.x, s.y)
  if (s.type === 'rect') {
    ctx.value.strokeRect(0, 0, s.w, s.h)
  } else if (s.type === 'ellipse') {
    ctx.value.beginPath()
    ctx.value.ellipse(s.w / 2, s.h / 2, s.w / 2, s.h / 2, 0, 0, 2 * Math.PI)
    ctx.value.stroke()
  }
  ctx.value.restore()
}

function startDraw(e) {
  const rect = canvas.value.getBoundingClientRect()
  startX.value = e.clientX - rect.left
  startY.value = e.clientY - rect.top
  draggingShape.value = null
}

function onMouseMove(e) {
  if (startX.value === null) return
  if (draggingShape.value) return

  const rect = canvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  drawAll()
  ctx.value.strokeStyle = 'blue'
  ctx.value.setLineDash([5, 3])

  const w = x - startX.value
  const h = y - startY.value

  if (props.drawType === 'rect') {
    ctx.value.strokeRect(startX.value, startY.value, w, h)
  } else if (props.drawType === 'ellipse') {
    ctx.value.beginPath()
    ctx.value.ellipse(
      startX.value + w / 2,
      startY.value + h / 2,
      Math.abs(w / 2),
      Math.abs(h / 2),
      0,
      0,
      2 * Math.PI,
    )
    ctx.value.stroke()
  }

  ctx.value.setLineDash([])
}

function endDraw(e) {
  const rect = canvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const w = x - startX.value
  const h = y - startY.value

  if (w === 0 || h === 0) {
    startX.value = null
    startY.value = null
    return
  }

  const newShape = {
    type: props.drawType,
    x: startX.value,
    y: startY.value,
    w,
    h,
  }
  shapes.value.push(newShape)
  drawAll()

  const imgData = ctx.value.getImageData(startX.value, startY.value, w, h)
  const offCanvas = document.createElement('canvas')
  offCanvas.width = Math.abs(w)
  offCanvas.height = Math.abs(h)
  const offCtx = offCanvas.getContext('2d')
  offCtx.putImageData(imgData, 0, 0)

  emit('update-image', {
    boardId: props.boardId,
    shape: newShape,
    imageUrl: offCanvas.toDataURL(),
  })

  startX.value = null
  startY.value = null
}
</script>

<style scoped>
canvas {
  cursor: crosshair;
}
</style>
