<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Navbar from './components/Navbar.vue'
//import 'assets/css/tailwind.css'
import 'assets/css/style.css'
//import 'assets/css/style_def.css'

export default defineComponent({
  name: 'App',
  components: { Navbar }
})
</script>