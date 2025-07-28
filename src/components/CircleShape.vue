<template>
  <div
    class="absolute z-20 border border-blue-500 bg-opacity-50 rounded-full cursor-move"
    :style="{
      left: (rect.x - rect.radius) * scale + 'px',
      top: (rect.y - rect.radius) * scale + 'px',
      width: rect.radius * 2 * scale + 'px',
      height: rect.radius * 2 * scale + 'px',
    }"
    @mousedown="startDrag"
  >
    <div
      class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-white bg-black bg-opacity-60 px-1 rounded"
    >
      {{ rect.label }}
    </div>
    <button
      class="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-4 h-4 text-xs"
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
    radius: number
    label: string
  }
  scale: number
}>()

const emit = defineEmits(['drag-start', 'remove'])

const startDrag = (e: MouseEvent) => {
  emit('drag-start', props.rect, e)
}
</script>
