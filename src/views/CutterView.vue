<template>
  <div class="p-4 flex flex-col gap-4">
    <!-- 圖片選擇區 -->
    <div>
      <h2 class="text-lg font-semibold mb-2">選擇板材圖片（最多四張）</h2>
      <div class="flex gap-4 flex-wrap">
        <div v-for="(entry, index) in selectedImages" :key="index" class="flex items-center gap-2">
          <select
            v-model="entry.imageUrl"
            class="border p-1 rounded"
            :disabled="selectedImages.length >= 4"
          >
            <option value="" disabled>請選擇圖片</option>
            <option v-for="img in uploadedImages" :key="img.id" :value="img.url">
              {{ img.name }}
            </option>
          </select>
          <button v-if="entry.imageUrl" @click="removeImage(index)" class="text-red-600">
            移除
          </button>
        </div>
        <button
          v-if="selectedImages.length < 4"
          @click="addImage"
          class="text-green-600 border px-2 py-1 rounded"
        >
          + 新增板材
        </button>
      </div>
    </div>

    <!-- Canvas 畫布區 -->
    <div>
      <h2 class="text-lg font-semibold mb-2">對紋畫布</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BoardCanvas
          v-for="(entry, index) in selectedImages"
          :key="index"
          :imageUrl="entry.imageUrl"
          :index="index"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import BoardCanvas from '../components/BoardCanvas.vue'

const uploadedImages = ref([])
const selectedImages = ref([{ imageUrl: '' }])

const db = getFirestore()
const auth = getAuth()
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage'

const loadUploadedImages = async () => {
  const user = auth.currentUser
  if (!user) return

  const q = query(collection(db, 'uploads'), where('uploadedBy.uid', '==', user.uid))
  const snapshot = await getDocs(q)

  // 顯示從 Firebase 加載的圖片資訊，便於排除錯誤
  uploadedImages.value = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      url: data.url, // 圖片 URL
      name: data.name, // 顯示名稱
    }
  })

  if (uploadedImages.value.length === 0) {
    console.warn('No uploaded images found')
  }
}

const addImage = () => {
  selectedImages.value.push({ imageUrl: '' })
}

const removeImage = (index) => {
  selectedImages.value.splice(index, 1)
}

onMounted(loadUploadedImages)
</script>

<style scoped>
/* Add any desired styling for canvas or components */
.grid {
  padding-top: 20px;
}
</style>
