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
    <div class="border p-2 rounded mb-4">
      <div class="flex gap-2 items-center mb-2">
        <button @click="saveSnapshot" class="bg-blue-500 text-white px-2 py-1 rounded">
          儲存快照
        </button>
        <span class="text-sm">快照數：{{ snapshots.length }}</span>
      </div>
      <div class="flex flex-row gap-1">
        <div
          v-for="snap in snapshots"
          :key="snap.id"
          class="flex items-center justify-between gap-2 px-2 py-1 border rounded text-sm"
          :class="{
            'bg-green-100': currentSnapshotId === snap.id,
          }"
        >
          <div class="flex-1 cursor-pointer" @click="loadSnapshot(snap)">
            {{ snap.name }}
          </div>
          <button @click="deleteSnapshot(snap.id)" class="text-xs text-red-500 hover:underline">
            刪除
          </button>
        </div>
        <!-- 儲存狀態區塊 -->
        <div class="border p-2 rounded mb-4">
          <label class="text-sm mr-2">輸入檔名（可空）：</label>
          <input
            type="text"
            v-model="customFilename"
            placeholder="未填則自動產生"
            class="border rounded px-2 py-1 text-sm w-64 mr-2"
          />
          <button
            @click="uploadFullStateToFirebase"
            class="bg-green-600 text-white px-3 py-1 rounded text-sm"
          >
            儲存整體狀態
          </button>
        </div>
        <!-- 使用者檔案清單選單 + 載入按鈕 -->
        <div class="my-4 p-2 border rounded">
          <h3 class="font-bold text-sm mb-2">我的儲存檔案</h3>

          <select v-model="selectedFilename" class="p-1 border rounded w-full text-sm">
            <option value="" disabled>請選擇要載入的檔案</option>
            <option v-for="file in myFileList" :key="file.id" :value="file.filename">
              {{ file.filename }}（{{ formatTime(file.createdAt?.seconds) }})
            </option>
          </select>

          <button
            class="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded"
            @click="loadSelectedState"
            :disabled="!selectedFilename"
          >
            載入所選檔案
          </button>
        </div>
      </div>
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

        <BigBoard
          :modelValue="entry"
          :boardIndex="index + 1"
          :circleRadius="circleRadius"
          :cm-to-px="cmToPx"
          :image-list="imageList"
          :scale="globalScalePercent / 100"
          :rect-length="rectLength"
          :rect-width="rectWidth"
          :labelMap="labelMap"
          :shape-type="drawShape"
          v-model:rects="allRects[entry.id]"
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
<script setup lang="ts">
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore'

const loadSavedState = async (filename) => {
  const user = auth.currentUser
  if (!user) return alert('請先登入')

  const fileRef = storageRef(storage, `cuttingStates/${user.uid}/${filename}`)
  const url = await getDownloadURL(fileRef)
  const res = await fetch(url)
  const data = await res.json()

  // 將載入的資料套用回畫面
  boards.value = data.boards || []
  allRects.value = data.allRects || {}
  screenshotList.value = data.screenshotList || []
  positionMap.value = data.positionMap || {}
  snapshots.value = data.snapshots || []

  alert(`已載入：${filename}`)
}
const customFilename = ref('')
const storage = getStorage()

const uploadFullStateToFirebase = async () => {
  const user = auth.currentUser
  if (!user) return alert('請先登入')

  // 組成檔案名稱
  const now = new Date()
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '')
  const defaultImageName = boards.value[0]?.url?.split('/').pop()?.split('.')[0] || '未命名'
  const filename = customFilename.value?.trim()
    ? customFilename.value.trim()
    : `${yyyymmdd}-${defaultImageName}.json`

  // 準備 JSON 資料
  const fullData = {
    createdAt: Date.now(),
    uid: user.uid,
    boards: boards.value,
    allRects: allRects.value,
    screenshotList: screenshotList.value,
    positionMap: positionMap.value,
    snapshots: snapshots.value,
  }

  const jsonBlob = new Blob([JSON.stringify(fullData)], { type: 'application/json' })

  // 上傳至 Firebase Storage
  const fileRef = storageRef(storage, `cuttingStates/${user.uid}/${filename}`)
  await uploadBytes(fileRef, jsonBlob)
  const downloadUrl = await getDownloadURL(fileRef)

  // 存 metadata 至 Firestore
  const docRef = doc(db, 'cuttingStates', user.uid, 'files', filename)

  await setDoc(docRef, {
    uid: user.uid,
    filename,
    createdAt: serverTimestamp(),
    downloadUrl,
    public: false,
  })

  alert(`已儲存檔案：${filename}`)
}

defineExpose({})
import { ref, onMounted, computed } from 'vue'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import BigBoard from '@/components/BigBoard.vue'

import PreviewBoard from '@/components/PreviewBoard.vue'
import { nanoid } from 'nanoid'
const getRectsFor = (id: string) =>
  computed({
    get: () => allRects.value[id] || [],
    set: (val) => {
      allRects.value[id] = val
    },
  })
//#region 基本狀態與引用
const cmToPx = ref(3.5)
const globalScalePercent = ref(100)
const rectLength = ref(180)
const rectWidth = ref(60)
const circleRadius = ref(50)
const drawShape = ref('rect') // rect or circle
const boards = ref<any[]>([])
const allRects = ref<Record<string, Rect[]>>({})
const uploadedImages = ref<any[]>([])
const imageList = ref<any[]>([])
const screenshotList = ref<Screenshot[]>([])
const positionMap = ref<Record<string, { x: number; y: number; rotation: number }>>({})
//#endregion

//#region 型別定義
type Rect = {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: 'rect' | 'circle'
  rotation?: number
  label: string
  radius: number
}

type Screenshot = {
  id: string
  url: string
  width: number
  height: number
  globalIndex?: number
}

interface Snapshot {
  id: string
  name: string
  boards: any[]
  rects: Record<string, Rect[]>
  screenshots: Screenshot[]
  positionMap: Record<string, { x: number; y: number; rotation: number }>
}
//#endregion

//#region 快照功能
const snapshots = ref<Snapshot[]>([])
const currentSnapshotId = ref<string | null>(null)

const saveSnapshot = () => {
  const id = nanoid()
  const name = `快照 ${snapshots.value.length + 1}`
  snapshots.value.push({
    id,
    name,
    boards: JSON.parse(JSON.stringify(boards.value)),
    rects: JSON.parse(JSON.stringify(allRects.value)),
    screenshots: JSON.parse(JSON.stringify(screenshotList.value)),
    positionMap: JSON.parse(JSON.stringify(positionMap.value)),
  })
  currentSnapshotId.value = id
}

const loadSnapshot = (snapshot: Snapshot) => {
  boards.value = JSON.parse(JSON.stringify(snapshot.boards))
  allRects.value = JSON.parse(JSON.stringify(snapshot.rects))
  screenshotList.value = JSON.parse(JSON.stringify(snapshot.screenshots))
  positionMap.value = JSON.parse(JSON.stringify(snapshot.positionMap))
  currentSnapshotId.value = snapshot.id
}

const deleteSnapshot = (id: string) => {
  const index = snapshots.value.findIndex((s) => s.id === id)
  if (index !== -1) {
    snapshots.value.splice(index, 1)
    if (currentSnapshotId.value === id) {
      currentSnapshotId.value = null
    }
  }
}
//#endregion

//#region 處理截圖與拖曳更新
const labelMap = computed(() => {
  const map: Record<string, number> = {}
  screenshotList.value.forEach((s, index) => {
    map[s.id] = index
  })
  return map
})

const handleScreenshot = (data: Screenshot & { x?: number; y?: number; rotation?: number }) => {
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
//#endregion

//#region 新增板材功能
const addBoard = () => {
  const newId = nanoid()
  const lastImageUrl = uploadedImages.value.at(-1)?.url ?? ''
  boards.value.push({
    id: newId,
    length: 320,
    width: 160,
    url: lastImageUrl,
    visible: true,
  })
  allRects.value[newId] = []
}
//#endregion

//#region 載入圖片資料（Firebase）
const auth = getAuth()
const db = getFirestore()

const loadUploadedImages = (user: any) => {
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
// data refs
const myFileList = ref([])
const selectedFilename = ref('')

// 載入我的 Firestore 檔案清單
const loadMyFileList = async () => {
  const user = auth.currentUser
  if (!user) return alert('請先登入')

  const filesCol = collection(db, 'cuttingStates', user.uid, 'files')
  const snapshot = await getDocs(filesCol)

  myFileList.value = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

// 載入所選檔案
const loadSelectedState = async () => {
  const user = auth.currentUser
  if (!user || !selectedFilename.value) return

  const fileRef = storageRef(storage, `cuttingStates/${user.uid}/${selectedFilename.value}`)
  const url = await getDownloadURL(fileRef)
  const res = await fetch(url)
  const data = await res.json()

  // ✅ 套用到你的狀態（你應該已有這些變數）
  boards.value = data.boards || []
  allRects.value = data.allRects || {}
  screenshotList.value = data.screenshotList || []
  positionMap.value = data.positionMap || {}
  snapshots.value = data.snapshots || []

  alert(`已成功載入：${selectedFilename.value}`)
}

// 日期格式化函式
const formatTime = (seconds) => {
  if (!seconds) return ''
  const date = new Date(seconds * 1000)
  return date.toLocaleDateString()
}

// 自動載入清單

onMounted(() => {
  loadMyFileList()
  onAuthStateChanged(auth, (user) => {
    if (user) loadUploadedImages(user)
  })
})
//#endregion
</script>
