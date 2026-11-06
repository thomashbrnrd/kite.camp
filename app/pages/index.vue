<script setup lang="ts">
import type { Spot } from '#shared/weather/types'

const selectedSpot = shallowRef<Spot | null>(null)
</script>

<template>
  <UContainer class="flex flex-col gap-8 py-10 sm:py-16">
    <section class="flex flex-col gap-3">
      <h1 class="text-3xl font-bold text-highlighted sm:text-4xl">
        Quelles ailes pour ton spot ?
      </h1>
      <p class="text-lg text-muted">
        Bientôt ici : trouver, à partir de l’historique de vent de ton spot, les
        tailles d’ailes qui couvrent le plus de jours rideables.
      </p>
    </section>

    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Aide à l’achat uniquement"
      description="Cet outil aide à planifier un achat à partir de données météo historiques modélisées. Il ne remplace ni l’avis d’un moniteur ou d’un shop local, ni ton jugement sur l’eau, et ne doit jamais servir à décider si tu peux naviguer. Les vents réels d’un spot peuvent différer sensiblement des données utilisées."
    />

    <section aria-labelledby="spot-title" class="flex flex-col gap-4">
      <h2 id="spot-title" class="text-xl font-semibold text-highlighted">
        Ton spot
      </h2>
      <SpotSearch v-model:selected="selectedSpot" />
    </section>

    <section
      v-if="selectedSpot"
      aria-labelledby="wind-title"
      class="flex flex-col gap-4"
    >
      <h2 id="wind-title" class="text-xl font-semibold text-highlighted">
        Le vent à {{ selectedSpot.name }}
      </h2>
      <WindHistoryPanel :spot="selectedSpot" />
    </section>
  </UContainer>
</template>
