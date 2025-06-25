<template>
  <div class="relative border rounded shadow p-2">
    <v-stage :config="stageConfig">
      <v-layer>
        <v-image
          v-if="image"
          :config="{
            image: image,
            x: shape.x,
            y: shape.y,
            rotation: shape.rotation,
            draggable: true,
            width: shape.width,
            height: shape.height,
          }"
          @dragmove="updatePosition"
          @transformend="updateTransform"
        />
      </v-layer>
    </v-stage>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  imageUrl: String,
  index: Number,
})

const image = ref(null)
const shape = ref({
  x: 50,
  y: 50,
  rotation: 0,
  width: 300,
  height: 200,
})

const stageConfig = ref({
  width: 600,
  height: 400,
})

const loadImage = (url) => {
  if (!url) return
  const img = new Image()
  img.onload = () => {
    image.value = img
    shape.value.width = img.width * 0.5
    shape.value.height = img.height * 0.5
    // 重置位置（視需要可取消）
    shape.value.x = 50
    shape.value.y = 50
  }
  img.src = url
}

// ✅ 初始載入
onMounted(() => {
  loadImage(props.imageUrl)
})

// ✅ 監聽 props.imageUrl 的變更
watch(
  () => props.imageUrl,
  (newUrl) => {
    loadImage(newUrl)
  },
  { immediate: false }
)

const updatePosition = (e) => {
  const node = e.target
  shape.value.x = node.x()
  shape.value.y = node.y()
}

const updateTransform = (e) => {
  const node = e.target
  shape.value.rotation = node.rotation()
}
</script>


<style scoped>
.relative {
  background-color: #f9f9f9;
}
</style>
