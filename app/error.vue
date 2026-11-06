<script setup lang="ts">
import type { NuxtError } from '#app'
import { fr } from '@nuxt/ui/locale'

const props = defineProps<{ error: NuxtError }>()

const status = computed(() => props.error.status ?? props.error.statusCode)
const isNotFound = computed(() => status.value === 404)

useHead({
  htmlAttrs: {
    lang: 'fr'
  }
})
</script>

<template>
  <UApp :locale="fr">
    <UError
      :error="{
        status,
        statusText: isNotFound ? 'Page introuvable' : 'Une erreur est survenue',
        message: isNotFound
          ? 'Cette page n’existe pas.'
          : 'Réessaie dans quelques instants.'
      }"
      :clear="{ label: 'Retour à l’accueil' }"
    />
  </UApp>
</template>
