<template>
  <div class="flex space-x-2 mb-4">
    <input type="file" @change="onFileChange" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { uploadBytes, getDownloadURL, ref as storageRef } from 'firebase/storage'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { storage, db, auth } from '@/firebase/firebase'

const emit = defineEmits(['upload'])

async function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return

  const uid = auth.currentUser?.uid
  console.log('uid=', uid)
  if (!uid) {
    alert('請先登入才能上傳圖片')
    return
  }

  const storagePath = `uploads/${uid}/${Date.now()}_${file.name}`
  const fileRef = storageRef(storage, storagePath)
  await uploadBytes(fileRef, file)
  const url = await getDownloadURL(fileRef)

  // 寫入 Firestore metadata
  const docRef = await addDoc(collection(db, 'uploads'), {
    uploadedBy: {
      uid,
      email: auth.currentUser.email,
    },
    name: file.name,
    path: storagePath,
    url,
    createdAt: serverTimestamp(),
  })

  emit('upload', { id: docRef.id, url })
}
</script>
