<template>
  <div
    class="absolute z-20 border border-red-500 bg-opacity-50 cursor-move"
    :style="{
      left: rect.x * scale + 'px',
      top: rect.y * scale + 'px',
      width: rect.width * scale + 'px',
      height: rect.height * scale + 'px',
    }"
    @mousedown="startDrag"
  >
    <div
      class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-white bg-black bg-opacity-60 px-1 rounded"
    >
      {{ rect.label }}
    </div>

    <button
      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 text-xs"
      @click.stop="$emit('remove', rect.id)"
    >
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
defineExpose({})
const props = defineProps<{
  rect: {
    id: string
    x: number
    y: number
    width: number
    height: number
    label: string
  }
  scale: number
}>()

const emit = defineEmits(['drag-start', 'remove'])
const startDrag = (e: MouseEvent) => {
  emit('drag-start', props.rect, e)
}
</script>
