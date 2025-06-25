<template>
  <div class="flex gap-4">
    <!-- 大板區 -->
    <div>
      <v-stage
        ref="stageRef"
        :config="{ width: boardWidthPx + 40, height: boardHeightPx + 40 }"
        @mousedown="handleClick"
      >
        <v-layer>
          <!-- 背景板 -->
          <v-rect
            :config="{
              x: 20,
              y: 20,
              width: boardWidthPx,
              height: boardHeightPx,
              fill: '#f5f5f5',
              stroke: '#ccc',
              strokeWidth: 1,
            }"
          />

          <!-- 使用者新增的形狀 -->
          <component
            v-for="(shape, index) in shapes"
            :key="index"
            :is="shape.type === 'circle' ? 'v-circle' : 'v-rect'"
            :config="{
              x: shape.x,
              y: shape.y,
              width: shape.width,
              height: shape.height,
              radius: shape.radius,
              fill: '#88ccff66',
              stroke: '#3399ff',
              strokeWidth: 1,
              draggable: true,
            }"
            @dragmove="() => updateResult(index)"
          />
        </v-layer>
      </v-stage>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const emit = defineEmits(['add-result', 'update-result'])

const props = defineProps({
  type: String, // 'rect' or 'circle'
  cmToPxRatio: Number,
  drawWidthCm: Number,
  drawHeightCm: Number,
})

const boardWidthCm = ref(120)
const boardHeightCm = ref(80)
const boardWidthPx = computed(() => boardWidthCm.value * props.cmToPxRatio)
const boardHeightPx = computed(() => boardHeightCm.value * props.cmToPxRatio)

const stageRef = ref()
const shapes = ref([])

function handleClick(e) {
  const stage = stageRef.value.getStage()
  const pointer = stage.getPointerPosition()

  const newShape = {
    type: props.type,
    x: pointer.x,
    y: pointer.y,
    width: props.drawWidthCm * props.cmToPxRatio,
    height: props.drawHeightCm * props.cmToPxRatio,
    radius: (props.drawWidthCm * props.cmToPxRatio) / 2,
  }

  shapes.value.push(newShape)
  nextTick(() => updateResult(shapes.value.length - 1))
}

function updateResult(index) {
  const shape = shapes.value[index]
  const stage = stageRef.value.getStage()

  const config = {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    pixelRatio: 1,
  }
  if (shape.type === 'circle') {
    config.width = config.height = shape.radius * 2
  }
  const dataUrl = stage.toDataURL(config)

  emit('add-result', {
    id: index,
    dataUrl,
    rotation: 0,
  })
}
</script>

<style scoped>
img {
  cursor: grab;
  transition: transform 0.2s;
}
</style>
