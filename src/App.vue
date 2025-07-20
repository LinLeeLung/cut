<script setup>
import Header from './components/Header.vue'
</script>

<template>
  <!-- 導覽列在上 -->
  <Header />

  <!-- 主要展示內容，位於導覽列正下方 -->
  <main class="w-full px-4 sm:px-6 md:px-8">
    <RouterView />
  </main>
</template>
