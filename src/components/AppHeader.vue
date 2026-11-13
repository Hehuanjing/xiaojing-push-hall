<script setup>
import { computed } from 'vue'
import { formatDateChip } from '../utils/date.js'

const dateLabel = computed(() => formatDateChip(new Date()))
</script>

<template>
  <header class="banner">
    <h1 class="banner-title">小晶推送馆</h1>
    <p class="banner-sub">
      今日热点一览 · 分享你的最新动态
      <span class="date-chip">{{ dateLabel }}</span>
    </p>
  </header>
</template>

<style scoped>
.banner {
  padding: 48px 20px 28px;
  text-align: center;
  animation: fadeDown 0.7s ease both;
}
.banner-title {
  display: inline-block;
  font-size: 40px;
  font-weight: 700;
  letter-spacing: 4px;
  color: transparent;
  background: var(--grad-brand);
  background-clip: text;
  -webkit-background-clip: text;
}
.banner-title::before {
  content: '✦ ';
  font-size: 26px;
}
.banner-sub {
  margin-top: 10px;
  font-size: 15px;
  letter-spacing: 1px;
  color: var(--text-2);
}
.date-chip {
  display: inline-block;
  margin-left: 8px;
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--card);
  border: 1px solid rgba(91, 95, 233, 0.18);
  backdrop-filter: blur(6px);
}
@media (max-width: 860px) {
  .banner-title {
    font-size: 32px;
  }
}
</style>
