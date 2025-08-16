<template>
  <!-- CutterView.vue -->
  <div v-if="!userReady" class="text-sm text-gray-500">登入狀態確認中...</div>

  <div class="w-full mx-auto p-4 flex flex-col gap-4" v-else>
    <!-- 全域比例控制 -->
    <div class="mb-4">
      <label class="block text-sm font-medium">圖片顯示比例（所有板材）</label>
      <input type="range" min="10" max="100" step="10" v-model.number="globalScalePercent" />
      <span class="ml-2">{{ globalScalePercent }}%</span>
    </div>

    <!-- 一組長寬輸入 -->
    <div class="flex items-end gap-2 mb-2">
      <div>
        <label class="block text-sm">長度（cm）</label>
        <input type="number" v-model.number="rectLength" class="border rounded px-2 py-1 w-24" />
      </div>
      <div>
        <label class="block text-sm">寬度（cm）</label>
        <input type="number" v-model.number="rectWidth" class="border rounded px-2 py-1 w-24" />
      </div>
    </div>

    <!-- 形狀切換 -->
    <div class="flex items-end gap-4">
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
      class="text-green-600 border px-2 py-1 rounded mt-2"
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

    <!-- 快照 + 檔案存取 -->
    <div class="border p-2 rounded">
      <div class="flex gap-2 items-center mb-2">
        <button @click="saveSnapshot" class="bg-blue-500 text-white px-2 py-1 rounded">
          儲存快照
        </button>
        <span class="text-sm">快照數：{{ snapshots.length }}</span>
      </div>

      <div class="flex flex-row gap-2 flex-wrap">
        <div
          v-for="snap in snapshots"
          :key="snap.id"
          class="flex items-center justify-between gap-2 px-2 py-1 border rounded text-sm"
          :class="{ 'bg-green-100': currentSnapshotId === snap.id }"
        >
          <div class="flex-1 cursor-pointer" @click="loadSnapshot(snap)">
            {{ snap.name }}
          </div>
          <button @click="deleteSnapshot(snap.id)" class="text-xs text-red-500 hover:underline">
            刪除
          </button>
        </div>

        <!-- 儲存狀態區塊 -->
        <div class="border p-2 rounded mb-2">
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

        <!-- 使用者檔案清單選單 + 載入/刪除 -->
        <div class="my-2 p-2 border rounded">
          <h3 class="font-bold text-sm mb-2">我的儲存檔案</h3>

          <select v-model="selectedFilename" class="p-1 border rounded w-full text-sm">
            <option value="" disabled>請選擇要載入的檔案</option>
            <option v-for="file in myFileList" :key="file.id" :value="file.filename">
              {{ file.filename }}（{{ formatTime(file.createdAt?.seconds) }}）
            </option>
          </select>

          <div class="flex gap-2 mt-2">
            <button
              class="px-3 py-1 bg-blue-600 text-white text-sm rounded disabled:opacity-50"
              @click="loadSelectedState"
              :disabled="!selectedFilename"
            >
              載入所選檔案
            </button>
            <button
              class="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:opacity-50"
              @click="deleteSelectedFile"
              :disabled="!selectedFilename"
            >
              刪除所選檔案
            </button>
          </div>
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
          <select
            v-model="boards[index].url"
            @change="onImageChange(index)"
            class="border rounded px-2 py-1 text-sm"
          >
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
import { ref, onMounted, computed, watch } from 'vue'
import { nanoid } from 'nanoid'
import BigBoard from '@/components/BigBoard.vue'
import PreviewBoard from '@/components/PreviewBoard.vue'

/* Firebase */
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore'
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
function onImageChange(index: number) {
  const url = boards.value[index]?.url
  const img = uploadedImages.value.find((i) => i.url === url)
  boards.value[index].name = img?.name || '' // ← 直接存顯示文字
}

/* ====== 基本狀態 ====== */
const cmToPx = ref(3.5)
const globalScalePercent = ref(100)
const rectLength = ref(180)
const rectWidth = ref(60)
const circleRadius = ref(50)
const drawShape = ref<'rect' | 'circle'>('rect')

const boards = ref<any[]>([])
const allRects = ref<Record<string, Rect[]>>({})
const uploadedImages = ref<any[]>([])
const imageList = ref<any[]>([])
const screenshotList = ref<Screenshot[]>([])
const positionMap = ref<Record<string, { x: number; y: number; rotation: number }>>({})

/* 快照 */
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

const snapshots = ref<Snapshot[]>([])
const currentSnapshotId = ref<string | null>(null)

/* Firebase 基本物件 */
const auth = getAuth()
const db = getFirestore()
const storage = getStorage()

/* 使用者與就緒狀態 */
const userReady = ref(false)
const currentUser = ref<any>(null)

/* 我的狀態檔案清單 */
const myFileList = ref<any[]>([])
const selectedFilename = ref('')
const customFilename = ref('')

/* ====== 工具 ====== */
const labelMap = computed(() => {
  const map: Record<string, number> = {}
  screenshotList.value.forEach((s, index) => {
    map[s.id] = index
  })
  return map
})

function parseSizeFromFilename(name: string): { length?: number; width?: number } {
  const match = name.match(/(\d{2,4})[^\d]{0,2}[\sxX×]{1}(\d{2,4})/)
  if (match) {
    const [, lenStr, widStr] = match
    return { length: parseInt(lenStr, 10), width: parseInt(widStr, 10) }
  }
  return {}
}

/* 只保留一個 watcher：當板材圖片更換時自動解析尺寸 */
watch(
  () => boards.value.map((b) => b.url),
  (urls, oldUrls) => {
    urls.forEach((url, index) => {
      if (url !== oldUrls?.[index]) {
        const board = boards.value[index]
        board.hasParsedSize = false
        //  -       const filename = url.split('/').pop() ?? ''
        const filename = (board.name || '').split('/').pop() || (url.split('/').pop() ?? '')
        const { length, width } = parseSizeFromFilename(filename)
        if (length && width) {
          board.length = length
          board.width = width
          board.hasParsedSize = true
          console.log(`已自動解析尺寸：${length} x ${width}`)
        } else {
          console.log(`無法自動解析尺寸：${filename}`)
        }
      }
    })
  },
)

/* 預設檔名：第一塊板材圖片的檔名（去掉副檔名）；沒有就用「未命名」 */
const defaultImageName = computed(() => {
  const name = boards.value?.[0]?.name || ''
  return name ? name.replace(/\.[^.]+$/, '') : '未命名'
})

/* ====== 快照功能 ====== */
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
  const i = snapshots.value.findIndex((s) => s.id === id)
  if (i !== -1) snapshots.value.splice(i, 1)
  if (currentSnapshotId.value === id) currentSnapshotId.value = null
}

/* ====== 截圖處理 ====== */
const handleScreenshot = (data: Screenshot & { x?: number; y?: number; rotation?: number }) => {
  const idx = screenshotList.value.findIndex((s) => s.id === data.id)
  if (data.url) {
    if (idx === -1) {
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
      const old = screenshotList.value[idx]
      screenshotList.value[idx] = { ...old, url: data.url, width: data.width, height: data.height }
    }
  } else {
    if (idx !== -1) screenshotList.value.splice(idx, 1)
    delete positionMap.value[data.id]
  }
}

/* ====== 板材 ====== */
const addBoard = () => {
  const newId = nanoid()
  // - const newestUrl = uploadedImages.value.at(0)?.url ?? ''
  const newest = uploadedImages.value.at(0) // 你已排序為新→舊
  boards.value.push({
    id: newId,
    length: 320,
    width: 160,
    // -   url: newestUrl,
    url: newest?.url ?? '',
    name: newest?.name ?? '', // ✅ 立即帶入檔名
    visible: true,
    hasParsedSize: false,
  })
  allRects.value[newId] = []
}
watch(uploadedImages, (list) => {
  boards.value.forEach((b) => {
    if (!b.name && b.url) {
      const m = list.find((i) => i.url === b.url)
      if (m?.name) b.name = m.name
    }
  })
})

/* ====== 讀取使用者已上傳圖片（新→舊） ====== */
const loadUploadedImages = (user: any) => {
  const qImg = query(
    collection(db, 'uploads'),
    where('uploadedBy.uid', '==', user.uid),
    orderBy('createdAt', 'desc'),
  )
  onSnapshot(qImg, (snapshot) => {
    uploadedImages.value = snapshot.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      url: d.data().url,
    }))
  })
}

/* ====== 狀態存取（Storage + Firestore metadata） ====== */
function showMessage(msg: string) {
  const div = document.createElement('div')
  div.textContent = msg
  div.style.position = 'fixed'
  div.style.top = '20px'
  div.style.left = '50%'
  div.style.transform = 'translateX(-50%)'
  div.style.backgroundColor = '#4CAF50'
  div.style.color = 'white'
  div.style.padding = '10px 20px'
  div.style.borderRadius = '8px'
  div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)'
  div.style.zIndex = '9999'
  document.body.appendChild(div)
  setTimeout(() => div.remove(), 3000)
}
const formatTime = (seconds?: number) => {
  if (!seconds) return ''
  return new Date(seconds * 1000).toLocaleDateString()
}

/* 即時監聽我的檔案清單（新→舊） */
const watchMySavedStates = () => {
  if (!auth.currentUser) return
  const qFiles = query(
    collection(db, 'cuttingStates', auth.currentUser.uid, 'files'),
    orderBy('createdAt', 'desc'),
  )
  onSnapshot(qFiles, (snapshot) => {
    myFileList.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  })
}

/* 儲存整體狀態到 Firebase */
const uploadFullStateToFirebase = async () => {
  const user = auth.currentUser
  if (!user) return alert('請先登入')

  const now = new Date()
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '')
  const filename = customFilename.value?.trim()
    ? customFilename.value.trim()
    : `${yyyymmdd}-${defaultImageName.value}.json`

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

  const fileRef = storageRef(storage, `cuttingStates/${user.uid}/${filename}`)
  await uploadBytes(fileRef, jsonBlob)
  const downloadUrl = await getDownloadURL(fileRef)

  const metaRef = doc(db, 'cuttingStates', user.uid, 'files', filename) // docId = filename
  await setDoc(metaRef, {
    uid: user.uid,
    filename: filename,
    createdAt: serverTimestamp(),
    downloadUrl,
    public: false,
  })

  showMessage(`已儲存檔案：${filename}`)
}

/* 載入所選狀態 */
const loadSelectedState = async () => {
  const user = auth.currentUser
  if (!user || !selectedFilename.value) return
  const fileRef = storageRef(storage, `cuttingStates/${user.uid}/${selectedFilename.value}`)
  const url = await getDownloadURL(fileRef)
  const res = await fetch(url)
  const data = await res.json()

  boards.value = data.boards || []
  allRects.value = data.allRects || {}
  screenshotList.value = data.screenshotList || []
  positionMap.value = data.positionMap || {}
  snapshots.value = data.snapshots || []
  customFilename.value = selectedFilename.value

  showMessage(`已成功載入：${selectedFilename.value}`)
}

/* 刪除所選狀態（穩健） */
async function deleteSelectedFile() {
  const user = auth.currentUser
  if (!selectedFilename.value || !user?.uid) {
    showMessage('請先選擇要刪除的檔案')
    return
  }
  const filename = selectedFilename.value
  try {
    // 刪 Storage
    const fileRef = storageRef(storage, `cuttingStates/${user.uid}/${filename}`)
    try {
      await deleteObject(fileRef)
    } catch (err: any) {
      if (err?.code !== 'storage/object-not-found') throw err
      console.warn('Storage 檔案不存在，略過。')
    }
    // 刪 Firestore metadata（docId = filename）
    const metaRef = doc(db, 'cuttingStates', user.uid, 'files', filename)
    await deleteDoc(metaRef)

    // UI 更新
    myFileList.value = myFileList.value.filter((f) => f.filename !== filename)
    selectedFilename.value = ''
    showMessage(`已成功刪除：${filename}`)
  } catch (err: any) {
    console.error('刪除失敗：', err)
    showMessage(`刪除失敗：${err.message || err}`)
  }
}

/* 掛載：登入後載圖片與檔案清單（皆為即時監聽） */
onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    userReady.value = true
    if (user) {
      loadUploadedImages(user)
      watchMySavedStates()
    }
  })
})
</script>
