<template>
  <div>
    <label
      class="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600"
      :class="{ 'opacity-50 cursor-not-allowed': !canUpload }"
    >
      📤 上傳圖片
      <input type="file" class="hidden" @change="onFileChange" :disabled="!canUpload" />
    </label>
    <label class="block text-sm font-bold">或從已上傳圖片載入：</label>
    <select
      v-model="selectedImageUrl"
      @change="loadFromFirebaseImage(selectedImageUrl)"
      class="border rounded px-2 py-1 text-sm"
    >
      <option value="">請選擇圖片</option>
      <option v-for="img in uploadedImages" :key="img.url" :value="img.url">
        {{ img.name }}
      </option>
    </select>
  </div>

  <div class="relative">
    <canvas
      ref="canvas"
      :width="canvasWidth"
      :height="canvasHeight"
      @mousedown="startDragging"
      @mousemove="dragPoint"
      @mouseup="stopDragging"
      @mouseleave="stopDragging"
      class="border mt-2"
    ></canvas>

    <!-- ✅ 浮動放大區 -->
    <canvas
      ref="zoomCanvas"
      width="150"
      height="150"
      class="absolute border pointer-events-none"
      :style="{ top: zoomY + 'px', left: zoomX + 'px', display: isDragging ? 'block' : 'none' }"
    />
  </div>

  <button class="mt-2 p-2 bg-blue-600 text-white rounded" @click="handleTransform">進行校正</button>
  <label class="text-sm mr-2">輸入檔名（顏色cmXcm）：</label>
  <input
    type="text"
    placeholder="請輸入顏色長X寛"
    class="border rounded px-2 py-1 text-sm w-64 mr-2"
    v-model="filename"
  />
  <button class="bg-blue-600 text-white px-4 py-1 rounded" @click="uploadPreviewImage">
    上傳校正後圖片
  </button>
  <!-- 在 template 中加入訊息區 -->
  <p v-if="message" :class="messageClass" class="text-sm mt-2">
    {{ message }}
  </p>
  <div v-if="previewUrl" class="mt-4">
    <h3>校正後預覽圖：</h3>
    <img :src="previewUrl" class="border max-w-full" />
  </div>
</template>
<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { matrix, multiply, inv } from 'mathjs'
import { auth, storage, db } from '@/firebase/firebase'
// import perspective from 'perspective-transform'
const zoomCanvas = ref<HTMLCanvasElement | null>(null)
const zoomX = ref(0)
const zoomY = ref(0)
const isDragging = ref(false)
const canUpload = computed(() => {
  //  console.log('user.value=', isPro.value)
  return user.value && isPro.value
})
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDoc,
} from 'firebase/firestore'
// import { uploadBytes, getDownloadURL, ref as storageRef, deleteObject } from 'firebase/storage'

const uploads = ref([])
const loading = ref(true)
const user = ref(null)
const isPro = ref(false)
const message = ref('')
const messageClass = ref('')
const filename = ref('')
async function uploadPreviewImage() {
  if (!previewUrl.value || !user.value) return

  message.value = '⏳ 圖片上傳中...'
  messageClass.value = 'text-blue-500'

  try {
    // 將 dataURL 轉為 Blob
    const res = await fetch(previewUrl.value)
    const blob = await res.blob()

    // const filename = `preview_${Date.now()}.png`
    const path = `uploads/${user.value.uid}/${filename.value}`
    const fileRef = storageRef(storage, path)

    await uploadBytes(fileRef, blob)
    const url = await getDownloadURL(fileRef)

    await addDoc(collection(db, 'uploads'), {
      name: filename.value,
      path,
      url,
      uploadedBy: {
        uid: user.value.uid,
        email: user.value.email,
      },
      createdAt: serverTimestamp(),
    })

    message.value = '✅ 圖片已成功上傳！'
    messageClass.value = 'text-green-600'
  } catch (err) {
    console.error('❌ 上傳失敗', err)
    message.value = '❌ 上傳失敗，請稍後再試'
    messageClass.value = 'text-red-600'
  }
}

function updateZoomPreview(x: number, y: number, clientX: number, clientY: number) {
  if (!image.value || !zoomCanvas.value || !canvas.value) return

  const scale = 1.2
  const size = 50
  const zoomSize = zoomCanvas.value.width

  // 計算實際原圖座標
  const scaleX = image.value.width / canvasWidth
  const scaleY = image.value.height / canvasHeight
  const imgX = x * scaleX
  const imgY = y * scaleY

  // 設定 zoomCanvas 位置（畫布區域右上）
  const canvasRect = canvas.value.getBoundingClientRect()
  zoomX.value = x + 20
  zoomY.value = y - zoomSize - 10

  // 若超出畫布可視範圍，可調整位置（避免超出）
  if (zoomX.value + zoomSize > canvasWidth) zoomX.value = canvasWidth - zoomSize
  if (zoomY.value < 0) zoomY.value = 0

  // 畫圖像
  const ctx = zoomCanvas.value.getContext('2d')!
  ctx.clearRect(0, 0, zoomSize, zoomSize)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(image.value, imgX - size / 2, imgY - size / 2, size, size, 0, 0, zoomSize, zoomSize)

  // 十字
  ctx.strokeStyle = 'red'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(zoomSize / 2, 0)
  ctx.lineTo(zoomSize / 2, zoomSize)
  ctx.moveTo(0, zoomSize / 2)
  ctx.lineTo(zoomSize, zoomSize / 2)
  ctx.stroke()
}

const canvas = ref<HTMLCanvasElement | null>(null)
const canvasWidth = 1600
const canvasHeight = 1200
const image = ref<HTMLImageElement | null>(null)
const points = ref<{ x: number; y: number }[]>([])
const draggingIndex = ref<number | null>(null)
const dragRadius = 10
const previewUrl = ref<string>('')

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const img = new Image()
  img.onload = () => {
    image.value = img
    points.value = [
      { x: 50, y: 50 },
      { x: 1400, y: 50 },
      { x: 1400, y: 1100 },
      { x: 50, y: 1100 },
    ]
    draw()
  }
  img.src = URL.createObjectURL(file)
}

function draw() {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx || !image.value) return
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  ctx.drawImage(image.value, 0, 0, canvasWidth, canvasHeight)

  ctx.fillStyle = 'red'
  ctx.strokeStyle = 'yellow'
  ctx.lineWidth = 1

  points.value.forEach((p, i) => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, dragRadius, 0, Math.PI * 2)
    ctx.fill()
    if (i > 0) {
      ctx.beginPath()
      ctx.moveTo(points.value[i - 1].x, points.value[i - 1].y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
  })
  if (points.value.length === 4) {
    ctx.beginPath()
    ctx.moveTo(points.value[3].x, points.value[3].y)
    ctx.lineTo(points.value[0].x, points.value[0].y)
    ctx.stroke()
  }
}
function startDragging(e: MouseEvent) {
  const rect = canvas.value!.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  draggingIndex.value = points.value.findIndex((p) => Math.hypot(p.x - x, p.y - y) < dragRadius)

  if (draggingIndex.value !== -1) {
    isDragging.value = true
    updateZoomPreview(x, y, e.clientX, e.clientY)
  }
}

function dragPoint(e: MouseEvent) {
  if (draggingIndex.value === null) return
  const rect = canvas.value!.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  points.value[draggingIndex.value] = { x, y }
  draw()
  updateZoomPreview(x, y, e.clientX, e.clientY)
}
function stopDragging() {
  draggingIndex.value = null
  isDragging.value = false
}

function getHomographyMatrix(src: number[], dst: number[]) {
  const A = []
  for (let i = 0; i < 4; i++) {
    const x = src[i * 2],
      y = src[i * 2 + 1]
    const u = dst[i * 2],
      v = dst[i * 2 + 1]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y])
  }
  const Ainv = inv(matrix(A))
  const h = multiply(Ainv, matrix(dst)).toArray() as number[]
  return [...h, 1]
}

function applyHomography(H: number[], x: number, y: number) {
  const denom = H[6] * x + H[7] * y + H[8]
  const sx = (H[0] * x + H[1] * y + H[2]) / denom
  const sy = (H[3] * x + H[4] * y + H[5]) / denom
  return [sx, sy]
}

import { computeHomographyMatrix } from '@/utils/perspective'
function transformImage(
  image: HTMLImageElement,
  srcPts: number[][],
  dstPts: number[][],
  canvas: HTMLCanvasElement,
) {
  const outputWidth = Math.round(
    Math.hypot(dstPts[1][0] - dstPts[0][0], dstPts[1][1] - dstPts[0][1]),
  )
  const outputHeight = Math.round(
    Math.hypot(dstPts[3][0] - dstPts[0][0], dstPts[3][1] - dstPts[0][1]),
  )

  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')!

  const hMatrix = computeHomographyMatrix(dstPts, srcPts)

  const srcCtx = document.createElement('canvas').getContext('2d')!
  srcCtx.canvas.width = image.width
  srcCtx.canvas.height = image.height
  srcCtx.drawImage(image, 0, 0)

  const srcData = srcCtx.getImageData(0, 0, image.width, image.height)
  const dstData = ctx.createImageData(outputWidth, outputHeight)

  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const [srcX, srcY] = applyHomography(hMatrix, x, y)
      const sx = Math.floor(srcX)
      const sy = Math.floor(srcY)

      if (sx >= 0 && sx < image.width && sy >= 0 && sy < image.height) {
        const srcIndex = (sy * image.width + sx) * 4
        const dstIndex = (y * outputWidth + x) * 4
        for (let c = 0; c < 4; c++) {
          dstData.data[dstIndex + c] = srcData.data[srcIndex + c]
        }
      }
    }
  }

  ctx.putImageData(dstData, 0, 0)
}
function handleTransform() {
  // ✨ 加上這段
  const scaleX = image.value.width / canvasWidth
  const scaleY = image.value.height / canvasHeight
  const srcPts = points.value.map((p) => [p.x * scaleX, p.y * scaleY])

  if (!image.value || !canvas.value || points.value.length !== 4) return

  // const srcPts = points.value.map((p) => [p.x, p.y])

  // 計算票據的實際寬高（右上-左上、左下-左上）
  const topWidth = Math.hypot(
    points.value[1].x - points.value[0].x,
    points.value[1].y - points.value[0].y,
  )
  const bottomWidth = Math.hypot(
    points.value[2].x - points.value[3].x,
    points.value[2].y - points.value[3].y,
  )
  const outputWidth = (topWidth + bottomWidth) / 2

  const leftHeight = Math.hypot(
    points.value[3].x - points.value[0].x,
    points.value[3].y - points.value[0].y,
  )
  const rightHeight = Math.hypot(
    points.value[2].x - points.value[1].x,
    points.value[2].y - points.value[1].y,
  )
  const outputHeight = (leftHeight + rightHeight) / 2

  const dstPts = [
    [0, 0],
    [outputWidth, 0],
    [outputWidth, outputHeight],
    [0, outputHeight],
  ]

  // 建立一個臨時 canvas 來放結果
  const resultCanvas = document.createElement('canvas')
  transformImage(image.value, srcPts, dstPts, resultCanvas)

  // 顯示預覽圖
  previewUrl.value = resultCanvas.toDataURL()
}

import { onMounted } from 'vue'
const uploadedImages = ref<any[]>([])
const selectedImageUrl = ref<string>('')
function loadFromFirebaseImage(url: string) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    image.value = img
    points.value = [
      { x: 50, y: 50 },
      { x: canvasWidth - 50, y: 50 },
      { x: canvasWidth - 50, y: canvasHeight - 50 },
      { x: 50, y: canvasHeight - 50 },
    ]
    draw()
  }
  img.src = url
}

onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) return
    user.value = u

    const userRef = doc(db, 'users', u.uid)
    const snap = await getDoc(userRef)
    isPro.value = snap.exists() && snap.data().isPro

    if (isPro.value) {
      const q = query(collection(db, 'uploadsRawPic'), where('uploadedBy.uid', '==', u.uid))
      onSnapshot(q, (snapshot) => {
        uploadedImages.value = snapshot.docs.map((doc) => doc.data())
      })
    }
    const qq = query(
      collection(db, 'uploadsRawPic'),
      where('uploadedBy.uid', '==', user.value.uid),
      orderBy('createdAt', 'desc'),
      limit(1),
    )

    const snapshot = await getDocs(qq)
    if (!snapshot.empty) {
      const latest = snapshot.docs[0].data()
      selectedImageUrl.value = latest.url
      loadFromFirebaseImage(selectedImageUrl.value)
      // filename.value = latest.name
      // imageName.value = latest.name // 如果你有這欄
    }
  })
})

import { orderBy, limit, getDocs } from 'firebase/firestore'

async function loadLatestRawImage() {
  if (!user.value) return
}
</script>
<!-- 在你的 index.html 加上 -->

<style scoped>
canvas {
  display: block;
  background-color: #f0f0f0;
}
</style>
