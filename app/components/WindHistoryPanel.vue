<script setup lang="ts">
import { DATA_CONFIG } from '#shared/config'
import type { Spot } from '#shared/weather/types'

const props = defineProps<{ spot: Spot }>()

const { history, status, error, load } = useWindHistory()

watch(
  () => props.spot,
  (spot) => load(spot),
  { immediate: true }
)
</script>

<template>
  <div aria-live="polite" :aria-busy="status === 'pending'">
    <div v-if="status === 'pending'" class="flex flex-col gap-3">
      <p class="text-muted">
        Téléchargement de {{ DATA_CONFIG.historyYears }} ans d’historique
        horaire… (environ 1,5 Mo, mis en cache ensuite)
      </p>
      <USkeleton class="h-72 w-full" />
    </div>

    <UAlert
      v-else-if="status === 'error' && error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Impossible de charger l’historique de vent"
      :description="dataErrorMessage(error)"
      :actions="[
        {
          label: 'Réessayer',
          color: 'error',
          variant: 'outline',
          onClick: () => load(spot)
        }
      ]"
    />

    <WindHistogramChart
      v-else-if="status === 'success' && history"
      :spot="spot"
      :history="history"
    />
  </div>
</template>
