<script setup>
import { ref, onMounted } from 'vue'
import { auth, provider, db } from '@/firebase/firebase'
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import { syncUser } from '@/firebase/syncUser'
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore'

const user = ref(null)
const errorMsg = ref('')
const isPro = ref(false)

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (u) {
      user.value = u
      await syncUser(u)
      await checkProStatus(u.uid)
    } else {
      user.value = null
      isPro.value = false
    }
  })
})

async function login() {
  try {
    const result = await signInWithPopup(auth, provider)
    user.value = result.user
    errorMsg.value = ''
    await syncUser(user.value)
    await checkProStatus(user.value.uid)
  } catch (err) {
    errorMsg.value = '登入失敗：' + err.message
  }
}

async function checkProStatus(uid) {
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  if (snap.exists()) {
    const data = snap.data()
    isPro.value = Boolean(data.isPro)
    console.log('isPro=', isPro.value)
  }
}

async function subscribe() {
  if (!user.value) return
  const uid = user.value.uid
  const userRef = doc(db, 'users', uid)

  const now = new Date()
  const expires = new Date()
  expires.setMonth(now.getMonth() + 1)

  await updateDoc(userRef, {
    isPro: true,
    subscribedAt: Timestamp.fromDate(now),
    expiresAt: Timestamp.fromDate(expires),
  })

  isPro.value = true
  alert('✅ 訂閱成功！您已成為進階會員。')
}
</script>

<template>
  <div class="p-4 space-y-4 max-w-md mx-auto">
    <button
      @click="login"
      class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      v-if="!user"
    >
      使用 Google 登入
    </button>

    <div v-if="user" class="space-y-2">
      <div class="text-green-700">👋 歡迎 {{ user.displayName }}（{{ user.email }}）</div>

      <div v-if="!isPro">
        <button
          @click="subscribe"
          class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          升級成訂閱會員（每月 1000 元）
        </button>
      </div>

      <div v-else class="text-purple-700">🌟 您是進階會員！已解鎖儲存與分享功能。</div>
    </div>

    <div v-if="errorMsg" class="text-red-600">{{ errorMsg }}</div>
  </div>
</template>
