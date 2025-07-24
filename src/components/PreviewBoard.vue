<template>
  <div>
    <h2 class="text-sm font-bold mb-2">所有截圖預覽：</h2>
    <div class="flex flex-wrap gap-4">
      <div
        v-for="(screenshot, index) in screenshotList"
        :key="screenshot.id"
        class="relative shadow p-1 border"
        style="width: fit-content"
      >
        <div class="relative" :style="getImageStyle(screenshot.id)">
          <img
            :src="screenshot.url"
            class="cursor-move"
            :style="{
              transform: `rotate(${getRotation(screenshot.id)}deg)`,
              clipPath: isCircle(screenshot) ? 'circle(50% at 50% 50%)' : 'none',
            }"
            @mousedown="startImageDrag($event, screenshot.id)"
            @dblclick="rotateScreenshot(screenshot.id)"
          />
          <!-- 標示 A/B/C... 與尺寸 -->
          <div
            class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white text-xs px-1 rounded"
          >
            {{ getLabel(index) }}<br />
            {{ screenshot.rawWidth }}x{{ screenshot.rawHeight }} cm
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  screenshotList: Array,
  positionMap: Object,
  scale: Number,
  cmToPx: Number,
})

const emit = defineEmits(['update:position'])

const draggingId = ref(null)
const dragOffset = ref({ x: 0, y: 0 })

const getLabel = (index) => {
  return String.fromCharCode(65 + index) + 'A'
}

const getImageStyle = (id) => {
  const pos = props.positionMap[id] || { x: 0, y: 0 }
  return {
    position: 'relative',
    left: `${pos.x}px`,
    top: `${pos.y}px`,
  }
}

const getRotation = (id) => {
  return props.positionMap[id]?.rotation || 0
}

const isCircle = (screenshot) => {
  return screenshot.type === 'circle'
}

const startImageDrag = (event, id) => {
  draggingId.value = id
  const pos = props.positionMap[id] || { x: 0, y: 0 }
  dragOffset.value = {
    x: event.clientX - pos.x,
    y: event.clientY - pos.y,
  }
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

const onDrag = (event) => {
  if (!draggingId.value) return
  const x = event.clientX - dragOffset.value.x
  const y = event.clientY - dragOffset.value.y
  emit('update:position', {
    id: draggingId.value,
    x,
    y,
    rotation: getRotation(draggingId.value),
  })
}

const stopDrag = () => {
  draggingId.value = null
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

const rotateScreenshot = (id) => {
  const current = getRotation(id)
  const newRotation = (current + 90) % 360
  const pos = props.positionMap[id] || { x: 0, y: 0 }
  emit('update:position', {
    id,
    x: pos.x,
    y: pos.y,
    rotation: newRotation,
  })
}
</script>
