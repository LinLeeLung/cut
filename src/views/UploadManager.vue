<template>
  <div class="p-4 bg-white shadow rounded space-y-4">
    <h2 class="text-lg font-bold text-gray-800">📂 我的圖片管理</h2>

    <!-- 上傳區塊 -->
    <div class="flex items-center gap-4">
      <label
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600"
        :class="{ 'opacity-50 cursor-not-allowed': !canUpload }"
      >
        📤 上傳圖片
        <input type="file" class="hidden" @change="onFileChange" :disabled="!canUpload" />
      </label>
      <!-- 在 template 中加入訊息區 -->
      <p v-if="message" :class="messageClass" class="text-sm mt-2">
        {{ message }}
      </p>
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
          <div class="flex items-center space-x-2">
            <img :src="item.url" alt="預覽" class="w-12 h-12 object-cover rounded" />
            <span class="text-sm">{{ item.name }}</span>
          </div>
          <button @click="deleteUpload(item)" class="text-sm text-red-600 hover:underline">
            刪除
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
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
} from 'firebase/firestore'
import { uploadBytes, getDownloadURL, ref as storageRef, deleteObject } from 'firebase/storage'

const uploads = ref([])
const loading = ref(true)
const user = ref(null)
const isPro = ref(false)
const message = ref('')
const messageClass = ref('')

const canUpload = computed(() => {
  //  console.log('user.value=', isPro.value)
  return user.value && isPro.value
})
async function onFileChange(e) {
  const file = e.target.files[0]
  if (!file || !canUpload.value) return

  message.value = '⏳ 圖片上傳中...'
  messageClass.value = 'text-blue-500'

  try {
    const path = `uploads/${Date.now()}_${file.name}`
    const fileRef = storageRef(storage, path)
    await uploadBytes(fileRef, file)
    const url = await getDownloadURL(fileRef)

    await addDoc(collection(db, 'uploads'), {
      name: file.name,
      path,
      url,
      uploadedBy: {
        uid: user.value.uid,
        email: user.value.email,
      },
      createdAt: serverTimestamp(),
    })

    message.value = '✅ 圖片上傳成功！'
    messageClass.value = 'text-green-600'
  } catch (err) {
    console.error('❌ 上傳失敗', err)
    message.value = '❌ 上傳失敗，請稍後再試'
    messageClass.value = 'text-red-600'
  }

  // 清空 input（允許再次選取相同檔案）
  e.target.value = ''
}

async function deleteUpload(item) {
  if (!confirm(`確定要刪除 ${item.name}？`)) return

  await deleteObject(storageRef(storage, item.path))
  await deleteDoc(doc(db, 'uploads', item.id))
}

function watchUploads() {
  if (!user.value) return

  const q = query(collection(db, 'uploads'), where('uploadedBy.uid', '==', user.value.uid))
  onSnapshot(q, (snapshot) => {
    uploads.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    loading.value = false
  })
}

onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (!u) return

    user.value = u

    const userRef = doc(db, 'users', u.uid)
    const snap = await getDoc(userRef)

    isPro.value = snap.exists() && snap.data().isPro

    if (isPro.value) {
      watchUploads()
    } else {
      console.log('⚠️ 尚未訂閱，無法啟動圖片同步')
    }
  })
})
</script>

<style scoped>
ul li:hover {
  background-color: #f9f9f9;
}
</style>
