<script setup lang="ts">
import { HISTOGRAM_CONFIG } from '#shared/config'
import { distanceKm } from '#shared/weather/geo'
import { windSpeedHistogram } from '#shared/weather/histogram'
import type { Spot, WindHistory } from '#shared/weather/types'

const props = defineProps<{ spot: Spot; history: WindHistory }>()

const { binWidthKn } = HISTOGRAM_CONFIG

const number = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat('fr-FR')
const coordinate = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 })

// Daylight hours only: night sessions are not relevant for kiting.
const histogram = computed(() =>
  windSpeedHistogram(props.history.windSpeedKn, {
    ...HISTOGRAM_CONFIG,
    include: (i) => props.history.isDay[i] === true
  })
)

const rows = computed(() =>
  histogram.value.bins.map((bin) => ({
    label: bin.toKn === null ? `≥ ${bin.fromKn}` : `${bin.fromKn}–${bin.toKn}`,
    share: bin.share * 100
  }))
)

const years = computed(
  () =>
    `${props.history.request.startDate.slice(0, 4)}–${props.history.request.endDate.slice(0, 4)}`
)

const gridDistanceKm = computed(() =>
  distanceKm(props.spot, {
    latitude: props.history.gridLatitude,
    longitude: props.history.gridLongitude
  })
)
</script>

<template>
  <figure class="flex flex-col gap-3">
    <figcaption class="flex flex-col gap-1">
      <span class="font-medium text-highlighted">
        Répartition du vent moyen à 10 m, heures de jour, {{ years }}
      </span>
      <span class="text-sm text-muted">
        {{ integer.format(histogram.countedHours) }} heures de jour
        analysées<template v-if="histogram.missingHours">
          ({{ integer.format(histogram.missingHours) }} sans donnée)</template
        >.
      </span>
    </figcaption>

    <UChart
      type="bar"
      :data="rows"
      index="label"
      :categories="[{ key: 'share', label: 'Part des heures de jour' }]"
      :format="(value: number) => `${number.format(value)} %`"
      x-label="Vent moyen (nœuds)"
      y-label="% des heures"
      :height="280"
      :aria-label="`Histogramme du vent moyen, heures de jour, ${years}`"
    />

    <p class="text-sm text-muted">
      Point de grille du modèle :
      {{ coordinate.format(history.gridLatitude) }} ;
      {{ coordinate.format(history.gridLongitude) }}, à
      {{ number.format(gridDistanceKm) }} km du lieu choisi. Données modélisées
      (réanalyse), pas des mesures : les effets locaux comme les brises
      thermiques peuvent être sous-estimés.
    </p>

    <p class="text-xs text-muted">
      Données météo par
      <ULink to="https://open-meteo.com/" target="_blank" class="underline">
        Open-Meteo.com
      </ULink>
      (<ULink
        to="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        class="underline"
        >CC BY 4.0</ULink
      >), regroupées par tranches de {{ binWidthKn }} nœuds.
    </p>
  </figure>
</template>
