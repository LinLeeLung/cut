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
    <!-- 請加入在 <template> 的長寬輸入區下方 -->
    <div class="flex items-end gap-4">
      <!-- 切換形狀 -->
      <div>
        <label class="block text-sm">形狀</label>
        <label class="text-sm mr-2">
          <input type="radio" value="rect" v-model="drawShape" />
          矩形
        </label>
        <label class="text-sm">
          <input type="radio" value="circle" v-model="drawShape" />
          圓形
        </label>
      </div>

      <!-- 若為圓形才顯示 -->
      <div v-if="drawShape === 'circle'">
        <label class="block text-sm">圓半徑（cm）</label>
        <input type="number" v-model.number="circleRadius" class="border rounded px-2 py-1 w-24" />
      </div>
    </div>

    <!-- 新增板材按鈕 -->
    <button
      v-if="boards.length < 4"
      @click="addBoard"
      class="text-green-600 border px-2 py-1 rounded mt-4"
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
          :circleRadius="circleRadius"
          :cm-to-px="cmToPx"
          :image-list="imageList"
          :scale="globalScalePercent / 100"
          :rect-length="rectLength"
          :rect-width="rectWidth"
          :globalScalePercent="globalScalePercent / 100"
          :labelMap="labelMap"
          :shape-type="drawShape"
          @screenshot="handleScreenshot"
        />
      </div>
      <div>
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import BigBoard from '@/components/BigBoard.vue'
import PreviewBoard from '@/components/PreviewBoard.vue'
import { nanoid } from 'nanoid'
const circleRadius = 50
const auth = getAuth()
const db = getFirestore()
const cmToPx = ref(3.5)
const globalScalePercent = ref(100)
const rectLength = ref(180)
const rectWidth = ref(60)
const drawShape = ref('rect') // rect 或 circle
const boards = ref([])
const uploadedImages = ref([])
const imageList = ref([])
const screenshotList = ref([])
const positionMap = ref({})

const labelMap = computed(() => {
  const map = {}
  screenshotList.value.forEach((s, index) => {
    map[s.id] = index
  })
  return map
})

const handleScreenshot = (data) => {
  const index = screenshotList.value.findIndex((s) => s.id === data.id)
  if (data.url) {
    if (index === -1) {
      const globalIndex = screenshotList.value.length
      screenshotList.value.push({ ...data, globalIndex })
      if (!positionMap.value[data.id]) {
        positionMap.value[data.id] = {
          x: data.x || 0,
          y: data.y || 0,
          rotation: data.rotation || 0,
        }
      }
    } else {
      const old = screenshotList.value[index]
      screenshotList.value[index] = {
        ...old,
        url: data.url,
        width: data.width,
        height: data.height,
      }
    }
  } else {
    if (index !== -1) screenshotList.value.splice(index, 1)
    delete positionMap.value[data.id]
  }
}

const addBoard = () => {
  const lastImageUrl = uploadedImages.value.at(-1)?.url ?? ''
  boards.value.push({
    id: nanoid(),
    length: 320,
    width: 160,
    url: lastImageUrl,
    visible: true,
  })
}

const loadUploadedImages = (user) => {
  const q = query(
    collection(db, 'uploads'),
    where('uploadedBy.uid', '==', user.uid),
    orderBy('createdAt', 'asc'),
  )
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
