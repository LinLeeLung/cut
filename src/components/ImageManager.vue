<template>
  <div class="space-y-4">
    <!-- 上傳 -->
    <div class="flex items-center gap-2">
      <input type="file" @change="uploadImage" />
    </div>

    <!-- 清單 -->
    <div v-if="loading">讀取中...</div>
    <div v-else>
      <div v-if="images.length === 0" class="text-gray-500">尚無上傳圖片</div>
      <ul class="grid grid-cols-2 gap-2">
        <li v-for="img in images" :key="img.id" class="border p-2 relative">
          <img :src="img.url" class="w-full h-auto" />
          <button
            @click="deleteImage(img)"
            class="absolute top-1 right-1 bg-red-500 text-white px-2 rounded"
          >
            刪
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { auth, storage, db } from '@/firebase/firebase'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'

const images = ref([])
const loading = ref(true)

const loadImages = async () => {
  if (!auth.currentUser) return
  loading.value = true
  const colRef = collection(db, 'uploads', auth.currentUser.uid, 'images')
  const snapshot = await getDocs(colRef)
  images.value = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
  loading.value = false
}

const uploadImage = async (e) => {
  const file = e.target.files[0]
  if (!file || !auth.currentUser) return

  const filename = `${Date.now()}_${file.name}`
  const path = `uploads/${auth.currentUser.uid}/${filename}`
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, file)
  const url = await getDownloadURL(fileRef)

  await addDoc(collection(db, 'uploads', auth.currentUser.uid, 'images'), {
    name: file.name,
    path,
    url,
    createdAt: serverTimestamp(),
    uploadedBy: {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
    },
  })

  await loadImages()
}

const deleteImage = async (img) => {
  if (!auth.currentUser) return

  // 刪除 Storage
  await deleteObject(storageRef(storage, img.path))

  // 刪除 Firestore
  await deleteDoc(doc(db, 'uploads', auth.currentUser.uid, 'images', img.id))

  await loadImages()
}

onMounted(loadImages)
</script>
