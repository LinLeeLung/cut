<template>
  <div class="p-4">
    <h2 class="text-sm font-bold mb-2">所有截圖預覽：</h2>
    <div class="flex flex-wrap gap-4">
      <div
        v-for="screenshot in screenshotList"
        :key="screenshot.id"
        class="relative p-1"
        style="width: fit-content"
      >
        <div class="relative" :style="getImageStyle(screenshot.id)">
          <img
            :src="screenshot.url"
            class="cursor-move transition-transform duration-200 hover:scale-100"
            @mousedown="startImageDrag($event, screenshot.id)"
            @dblclick="rotateScreenshot(screenshot.id)"
          />
          <!-- 標示 A/B/C 與尺寸 -->
          <div
            class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white text-xs px-1 rounded text-center"
            style="pointer-events: none"
          >
            <div>{{ screenshot.label }}</div>
            <div>
              {{ (screenshot.rawWidth / props.cmToPx).toFixed(0) }}x
              {{ (screenshot.rawHeight / props.cmToPx).toFixed(0) }} cm
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const getLabel = (index) => {
  let label = ''
  while (index >= 0) {
    label = String.fromCharCode((index % 26) + 65) + label
    index = Math.floor(index / 26) - 1
  }
  console.log('lebel=', label)
  return label
}

import { ref, computed } from 'vue'

const props = defineProps({
  screenshotList: {
    type: Array,
    default: () => [],
  },
  positionMap: {
    type: Object,
    default: () => ({}),
  },
  cmToPx: {
    type: Number,
    default: 3.5,
  },
  scale: { type: Number },
})

const rotationMap = ref({})

let dragId = null
let dragOffset = { x: 0, y: 0 }

const startImageDrag = (e, id) => {
  dragId = id
  const pos = props.positionMap[id] || { x: 0, y: 0 }
  dragOffset = {
    x: e.clientX - pos.x,
    y: e.clientY - pos.y,
  }
  window.addEventListener('mousemove', onImageDrag)
  window.addEventListener('mouseup', stopImageDrag)
}

const onImageDrag = (e) => {
  if (!dragId) return
  const newPos = {
    x: e.clientX - dragOffset.x,
    y: e.clientY - dragOffset.y,
    rotation: rotationMap.value[dragId] || 0,
  }
  emit('update:position', { id: dragId, ...newPos })
}

const stopImageDrag = () => {
  dragId = null
  window.removeEventListener('mousemove', onImageDrag)
  window.removeEventListener('mouseup', stopImageDrag)
}

const rotateScreenshot = (id) => {
  const current = rotationMap.value[id] || 0
  const newRotation = (current + 90) % 360
  rotationMap.value[id] = newRotation
  emit('update:position', {
    id,
    x: props.positionMap[id]?.x || 0,
    y: props.positionMap[id]?.y || 0,
    rotation: newRotation,
  })
}

const emit = defineEmits(['update:position'])

const getImageStyle = (id) => {
  const pos = props.positionMap[id] || { x: 0, y: 0 }
  const rot = rotationMap.value[id] || props.positionMap[id]?.rotation || 0
  return {
    transform: `translate(${pos.x}px, ${pos.y}px) rotate(${rot}deg)`,
    transition: 'transform 0.1s',
  }
}
</script>
