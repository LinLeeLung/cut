<template>
  <div class="p-4 flex justify-between items-center bg-white shadow mb-4">
    <div>
      <h1 class="text-xl font-bold text-green-700">CutAlign — 石材排版系統</h1>
    </div>

    <div class="text-sm flex items-center space-x-4">
      <div v-if="user">
        <p>✋ 歡迎 {{ user.displayName }} ({{ user.email }})</p>
        <p v-if="role === 'admin'">🔐 管理員權限</p>
        <p v-else-if="role === 'pro'">🌟 進階會員</p>
        <p v-else class="text-red-600">🆓 一般會員</p>
      </div>

      <div v-else>
        <button @click="login" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          使用 Google 登入
        </button>
      </div>

      <button
        v-if="user"
        @click="logout"
        class="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
      >
        登出
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { auth, provider } from '@/firebase/firebase'
import { signInWithPopup, signOut } from 'firebase/auth'
import { syncUser } from '@/firebase/syncUser'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'

const user = ref(null)
const isPro = ref(false)
const role = ref('free')
const errorMsg = ref('')

async function login() {
  try {
    const result = await signInWithPopup(auth, provider)
    user.value = result.user
    errorMsg.value = ''
    await syncUser(user.value)
    await checkPro(user.value.uid)
  } catch (err) {
    errorMsg.value = '登入失敗：' + err.message
    console.error(err)
  }
}

async function checkPro(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid))
  if (snapshot.exists()) {
    const data = snapshot.data()
    isPro.value = data?.isPro || false
    role.value = data?.role || 'free'
  }
}

function logout() {
  signOut(auth)
  user.value = null
  isPro.value = false
  role.value = 'free'
}

onMounted(() => {
  auth.onAuthStateChanged(async (u) => {
    if (u) {
      user.value = u
      await checkPro(u.uid)
    }
  })
})
</script>
