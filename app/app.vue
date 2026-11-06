<script setup lang="ts">
import { fr } from '@nuxt/ui/locale'

const title = 'Kite Quiver Planner'
const description =
  'Quelles tailles d’ailes de kitesurf couvrent le plus de jours rideables sur ton spot ? Un outil d’aide à l’achat basé sur l’historique de vent.'

useHead({
  htmlAttrs: {
    lang: 'fr'
  }
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})
</script>

<template>
  <UApp :locale="fr">
    <UHeader :title="title" :toggle="false">
      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>
  </UApp>
</template>
