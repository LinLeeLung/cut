import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import AboutView from '@/views/AboutView.vue'
import CutterView from '@/views/CutterView.vue'
import UploadManager from '@/views/UploadManager.vue'
import Rectifier from '@/views/Rectifier.vue'
import UploadByMobile from '@/views/UploadByMobile.vue'
const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/login', name: 'Login', component: Login },
  { path: '/about', name: 'About', component: AboutView }, // ← 補這段
  { path: '/cut', component: CutterView }, // ✅ 新增裁板頁面
  { path: '/uploadm', component: UploadManager }, // ✅ 新增裁板頁面
  { path: '/login', component: Login }, // ✅ 新增登入頁面
  { path: '/rectifer', component: Rectifier }, // ✅ 新增圖形處理頁面
  { path: '/uploadbm', component: UploadByMobile }, // ✅ 新增手機上傳頁面
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
