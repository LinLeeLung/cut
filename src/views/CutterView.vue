<template>
  <!-- CutterView.vue -->
  <div class="w-full mx-auto p-4 flex flex-col gap-4">
    <!-- 全域比例控制 -->
    <div class="mb-4">
      <label class="block text-sm font-medium">圖片顯示比例（所有板材）</label>
      <input type="range" min="10" max="100" step="10" v-model.number="globalScalePercent" />
      <span class="ml-2">{{ globalScalePercent }}%</span>
    </div>

    <!-- 一組長寬輸入 -->
    <div class="flex items-end gap-2 mb-4">
      <div>
        <label class="block text-sm">長度（cm）</label>
        <input type="number" v-model.number="rectLength" class="border rounded px-2 py-1 w-24" />
      </div>
      <div>
        <label class="block text-sm">寬度（cm）</label>
        <input type="number" v-model.number="rectWidth" class="border rounded px-2 py-1 w-24" />
      </div>
    </div>

    <!-- 新增板材按鈕 -->
    <button
      v-if="boards.length < 4"
      @click="addBoard"
      class="text-green-600 border px-2 py-1 rounded"
    >
      + 新增板材
    </button>

    <!-- 顯示控制 checkbox -->
    <div class="flex flex-wrap gap-4 text-sm">
      <label v-for="(entry, index) in boards" :key="entry.id" class="flex items-center gap-2">
        <input type="checkbox" v-model="entry.visible" />
        顯示板材 {{ index + 1 }}
      </label>
    </div>

    <!-- 板材顯示區 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="(entry, index) in boards"
        :key="entry.id"
        v-show="entry.visible"
        class="border p-2 rounded shadow"
      >
        <!-- 選擇圖片 -->
        <div class="mb-2">
          <label class="text-sm mr-2">選擇圖片：</label>
          <select v-model="boards[index].url" class="border rounded px-2 py-1 text-sm">
            <option value="">請選擇</option>
            <option v-for="img in uploadedImages" :key="img.id" :value="img.url">
              {{ img.name }}
            </option>
          </select>
        </div>

        <!-- 板材主元件 -->
        <BigBoard
          v-model="boards[index]"
          :boardIndex="index + 1"
          :cm-to-px="cmToPx"
          :image-list="imageList"
          :scale="globalScalePercent / 100"
          :rect-length="rectLength"
          :rect-width="rectWidth"
          :globalScalePercent="globalScalePercent / 100"
          :labelMap="labelMap"
          @screenshot="handleScreenshot"
        />
      </div>

      <!-- 集中截圖併接區
      <div class="mt-6 border-t pt-4 min-h-[1000px]">
        <h2 class="text-sm font-bold mb-2">所有截圖預覽：</h2>
        <div class="flex flex-wrap gap-4">
          <div v-for="(url, id) in screenshotMap" :key="id" class="shadow p-1 relative">
            <img
              :src="url"
              class="max-w-[1200px] cursor-move absolute"
              :style="getImageStyle(id)"
              @mousedown="startImageDrag($event, id)"
              @dblclick="rotateScreenshot(id)"
            />
          </div>
        </div>
      </div> -->
      <PreviewBoard
        :screenshotList="screenshotList"
        :positionMap="positionMap"
        :cmToPx="cmToPx"
        :scale="globalScalePercent / 100"
        @update:position="
          (data) => {
            positionMap[data.id] = { x: data.x, y: data.y, rotation: data.rotation }
          }
        "
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore'
import BigBoard from '@/components/BigBoard.vue'
import { nanoid } from 'nanoid'
import PreviewBoard from '@/components/PreviewBoard.vue'
const screenshotPosition = ref({}) // 儲存每張截圖的位置
const screenshotList = ref([])
const positionMap = ref({})
const cmToPx = ref(3.5)
const imageList = ref([]) // 如果你後面真的有使用

const labelMap = computed(() => {
  const map = {}
  screenshotList.value.forEach((s, index) => {
    map[s.id] = index // 或 s.globalIndex 看你是哪個維度
  })

  return map
})
const handleScreenshot = (data) => {
  const index = screenshotList.value.findIndex((s) => s.id === data.id)

  if (data.url) {
    if (index === -1) {
      // 第一次加入：給予 globalIndex
      const globalIndex = screenshotList.value.length

      screenshotList.value.push({
        ...data,
        globalIndex,
      })

      if (!positionMap.value[data.id]) {
        positionMap.value[data.id] = {
          x: data.x || 0,
          y: data.y || 0,
          rotation: data.rotation || 0,
        }
      }
      console.log('globalIndex=', globalIndex)
    } else {
      // 再次擷取：更新 url，但保持位置與編號
      const old = screenshotList.value[index]
      screenshotList.value[index] = {
        ...old,
        url: data.url,
        width: data.width,
        height: data.height,
      }
    }
  } else {
    // 移除
    if (index !== -1) screenshotList.value.splice(index, 1)
    delete positionMap.value[data.id]
  }
}

const getImageStyle = (id) => {
  const pos = screenshotPosition.value[id] || { x: 0, y: 0 }
  return {
    transform: `translate(${pos.x}px, ${pos.y}px) rotate(${screenshotRotation.value[id] || 0}deg)`,
    transition: 'transform 0.1s',
  }
}

let dragId = null
let dragOffset = { x: 0, y: 0 }

const startImageDrag = (e, id) => {
  dragId = id
  const pos = screenshotPosition.value[id] || { x: 0, y: 0 }
  dragOffset = {
    x: e.clientX - pos.x,
    y: e.clientY - pos.y,
  }
  window.addEventListener('mousemove', onImageDrag)
  window.addEventListener('mouseup', stopImageDrag)
}

const onImageDrag = (e) => {
  if (!dragId) return
  screenshotPosition.value[dragId] = {
    x: e.clientX - dragOffset.x,
    y: e.clientY - dragOffset.y,
  }
}

const stopImageDrag = () => {
  dragId = null
  window.removeEventListener('mousemove', onImageDrag)
  window.removeEventListener('mouseup', stopImageDrag)
}

const auth = getAuth()
const db = getFirestore()

const rectLength = ref(180)
const rectWidth = ref(60)
const globalScalePercent = ref(70)
const boards = ref([])
const uploadedImages = ref([])

const screenshotMap = ref({})
const screenshotRotation = ref({})

const rotateScreenshot = (id) => {
  screenshotRotation.value[id] = ((screenshotRotation.value[id] || 0) + 90) % 360
}

const addBoard = () => {
  const firstImageUrl = uploadedImages.value[0]?.url ?? ''
  boards.value.push({
    id: nanoid(),
    length: 320,
    width: 160,
    url: firstImageUrl,
    visible: true,
  })
}

const removeBoard = (id) => {
  boards.value = boards.value.filter((b) => b.id !== id)
  delete screenshotMap.value[id]
  delete screenshotRotation.value[id]
}

const loadUploadedImages = (user) => {
  const q = query(collection(db, 'uploads'), where('uploadedBy.uid', '==', user.uid))
  onSnapshot(q, (snapshot) => {
    uploadedImages.value = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      url: doc.data().url,
    }))
  })
}

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) loadUploadedImages(user)
  })
})
</script>
