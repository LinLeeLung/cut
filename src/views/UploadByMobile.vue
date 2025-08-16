<template>
  <div class="p-4 bg-white shadow rounded space-y-4">
    <h2 class="text-lg font-bold text-gray-800">📂 我的圖片管理</h2>

    <!-- 上傳區塊 -->
    <div class="flex items-center gap-4">
      <label
        class="inline-flex items-center gap-2 px-4 py-2 rounded text-white cursor-pointer"
        :class="[
          canUpload ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed',
          uploading ? 'opacity-70' : '',
        ]"
      >
        <span v-if="!uploading">📤 點我上傳原始圖片</span>
        <span v-else>⏳ 上傳中…</span>
        <input
          type="file"
          class="hidden"
          accept="image/*"
          @change="onFileChange"
          :disabled="!canUpload || uploading"
        />
      </label>

      <p v-if="message" :class="messageClass" class="text-sm">{{ message }}</p>
      <p v-if="!canUpload" class="text-sm text-red-600">⚠️ 僅限進階會員上傳圖片</p>
    </div>

    <!-- 清單區塊 -->
    <div v-if="loading">讀取中...</div>
    <div v-else>
      <div v-if="uploads.length === 0" class="text-gray-500">尚無上傳圖片</div>

      <ul class="space-y-2">
        <li
          v-for="item in uploads"
          :key="item.id"
          class="flex items-center justify-between border p-2 rounded"
        >
          <div class="flex items-center space-x-3">
            <a :href="item.url" target="_blank" rel="noopener noreferrer">
              <img
                :src="
                  (item.url || '') + (item.createdAt?.seconds ? '?t=' + item.createdAt.seconds : '')
                "
                alt="預覽"
                class="w-12 h-12 object-cover rounded cursor-pointer"
              />
            </a>
            <div class="flex flex-col">
              <span class="text-sm">{{ item.name || '未命名' }}</span>
              <span class="text-xs text-gray-500">
                {{
                  item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : '處理中…'
                }}
              </span>
            </div>
          </div>

          <button
            @click="deleteUpload(item)"
            :disabled="deletingId === item.id"
            class="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            {{ deletingId === item.id ? '刪除中…' : '刪除' }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { auth, storage, db } from '@/firebase/firebase'
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
  orderBy,
} from 'firebase/firestore'
import { uploadBytes, getDownloadURL, ref as storageRef, deleteObject } from 'firebase/storage'

const uploads = ref([])
const loading = ref(true)
const user = ref(null)
const isPro = ref(false)
const message = ref('')
const messageClass = ref('')
const uploading = ref(false)
const deletingId = ref(null)
let unsubscribe = null

const canUpload = computed(() => !!user.value && isPro.value)

// 共用訊息顯示（自動清除）
let msgTimer = null
function showMessage(text, type = 'info', ms = 3000) {
  if (msgTimer) clearTimeout(msgTimer)
  message.value = text
  messageClass.value =
    type === 'success' ? 'text-green-600' : type === 'error' ? 'text-red-600' : 'text-blue-500'
  if (ms) {
    msgTimer = setTimeout(() => {
      message.value = ''
    }, ms)
  }
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = '' // 允許再次選同檔
  if (!file || !canUpload.value || uploading.value) return

  uploading.value = true
  showMessage('⏳ 圖片上傳中…', 'info', 0)

  try {
    const path = `uploadsRawPic/${user.value.uid}/${Date.now()}_${file.name}`
    const fileRef = storageRef(storage, path)
    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)

    await addDoc(collection(db, 'uploadsRawPic'), {
      name: file.name,
      path,
      url,
      uploadedBy: {
        uid: user.value.uid,
        email: user.value.email,
      },
      createdAt: serverTimestamp(),
    })

    showMessage('✅ 圖片上傳成功！', 'success')
  } catch (err) {
    console.error('❌ 上傳失敗', err)
    showMessage('❌ 上傳失敗，請稍後再試', 'error')
  } finally {
    uploading.value = false
  }
}

async function deleteUpload(item) {
  if (!confirm(`確定要刪除「${item.name || '未命名'}」？`)) return
  deletingId.value = item.id
  showMessage('🗑️ 正在刪除…', 'info', 0)

  try {
    if (item.path) {
      try {
        await deleteObject(storageRef(storage, item.path))
      } catch (err) {
        if (err?.code === 'storage/object-not-found') {
          console.warn('Storage 檔案不存在，略過刪 Storage。')
        } else {
          throw err
        }
      }
    } else {
      console.warn('此紀錄沒有 path 欄位，略過刪 Storage。')
    }

    await deleteDoc(doc(db, 'uploadsRawPic', item.id))
    showMessage('✅ 已刪除', 'success')
  } catch (err) {
    console.error('刪除失敗：', err)
    showMessage('❌ 刪除失敗：' + (err?.message || ''), 'error')
  } finally {
    deletingId.value = null
  }
}

function watchUploads() {
  if (!user.value) return
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }

  const q = query(
    collection(db, 'uploadsRawPic'),
    where('uploadedBy.uid', '==', user.value.uid),
    orderBy('createdAt', 'desc'), // 依建立時間新→舊
  )

  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      uploads.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      loading.value = false
    },
    (err) => {
      console.error('onSnapshot 錯誤：', err)
      loading.value = false
      showMessage('❌ 讀取清單失敗', 'error')
    },
  )
}

onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) return
    user.value = u

    try {
      const userRef = doc(db, 'users', u.uid)
      const snap = await getDoc(userRef)
      isPro.value = snap.exists() && !!snap.data().isPro
      if (isPro.value) {
        watchUploads()
      } else {
        loading.value = false
        showMessage('⚠️ 尚未訂閱，無法啟動圖片同步', 'error')
      }
    } catch (e) {
      loading.value = false
      console.error(e)
      showMessage('❌ 讀取會員資訊失敗', 'error')
    }
  })
})

onBeforeUnmount(() => {
  if (unsubscribe) unsubscribe()
  if (msgTimer) clearTimeout(msgTimer)
})
</script>

<style scoped>
ul li:hover {
  background-color: #f9f9f9;
}
</style>
