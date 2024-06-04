<script setup>
const msg = ref('hi')
</script>

<template>
  <h1>{{ msg }}</h1>
  <input v-model="msg">
</template>