<template>
  <div class="border border-gray-300">
    <canvas ref="canvasRef" width="800" height="600" />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({ images: Array })
const canvasRef = ref(null)

watch(
  () => props.images,
  () => {
    draw()
  },
  { deep: true },
)

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  props.images.forEach((img, idx) => {
    const image = new Image()
    image.src = img.src
    image.onload = () => {
      ctx.drawImage(image, 50 + idx * 100, 50, 200, 200)
    }
  })
}
</script>
