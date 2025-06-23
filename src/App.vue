<script setup>
import { RouterView, RouterLink } from 'vue-router'
import Header from './components/Header.vue'
</script>

<template>
  <header class="p-4 bg-gray-100">
    <nav class="space-x-4">
      <!-- <Header></Header> -->
      <RouterLink to="/">🏠 首頁</RouterLink>
      <RouterLink to="/about">📄 關於</RouterLink>
      <RouterLink to="/cut">📄 裁切對紋</RouterLink>
      <RouterLink to="/uploadM">📄 檔案管理</RouterLink>
      <RouterLink to="/login">📄 登入/登出</RouterLink>
    </nav>
  </header>

  <RouterView />
  <!-- ✅ 這裡顯示對應的頁面內容 -->
</template>
