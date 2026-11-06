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

    <UFooter>
      <template #left>
        <p class="text-xs text-muted">
          Météo :
          <ULink to="https://open-meteo.com/" target="_blank" class="underline"
            >Open-Meteo.com</ULink
          >
          (CC BY 4.0). Spots : noms issus de
          <ULink
            to="https://fr.wikipedia.org/wiki/Spot_de_kitesurf"
            target="_blank"
            class="underline"
            >Wikipédia</ULink
          >
          (CC BY-SA 4.0), coordonnées ©
          <ULink
            to="https://www.openstreetmap.org/copyright"
            target="_blank"
            class="underline"
            >contributeurs OpenStreetMap</ULink
          >
          (ODbL).
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
