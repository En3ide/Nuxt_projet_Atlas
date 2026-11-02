<template>
  <ul class="nav-ul">
    <li v-for="item in navItems" :key="item.icon">
      <NuxtLink :to="item.route" class="nav-a root-a" :aria-label="item.icon === 'history' ? 'Historique' : item.icon" :title="item.icon === 'history' ? 'Historique' : item.icon">
        <span class="material-icons md-light md-24">{{ item.icon }}</span>
      </NuxtLink>
    </li>

    <li class="nav-space">
      <div class="div-nav-space"></div>
    </li>

    <li>
      <NuxtLink to="/" class="nav-a root-a">
        <span class="material-icons md-light md-24">logout</span>
      </NuxtLink>
    </li>
  </ul>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Navbar',
  data() {
    return {
      navItems: [
        { icon: 'stream', route: '/' },
        { icon: 'dashboard', route: '/dashboard' },
        { icon: 'history', route: '/history' },
        { icon: 'cloud', route: '/cloud' },
        { icon: 'terminal', route: '/terminal' },
        //{ icon: 'school', route: '/school' },
        //{ icon: 'dns', route: '/dns' },
        { icon: 'lan', route: '/lan' },
        { icon: 'settings', route: '/settings' }
      ]
    }
  }
})
</script>
