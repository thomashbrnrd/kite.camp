<script setup lang="ts">
import type { Spot } from '#shared/weather/types'

const selected = defineModel<Spot | null>('selected', { default: null })

const {
  searchTerm,
  isQueryTooShort,
  knownSpots,
  places,
  placesStatus,
  placesError
} = useSpotSearch()

const coordinate = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 })

/** Region and country, or coordinates when the place has neither (e.g. disputed territories). */
function placeDetails(spot: Spot): string {
  const details = [spot.admin2, spot.admin1, spot.country]
    .filter((part, i, parts) => part && parts.indexOf(part) === i)
    .join(', ')
  return (
    details ||
    `${coordinate.format(spot.latitude)} ; ${coordinate.format(spot.longitude)}`
  )
}

/** One shape for every menu entry: group labels have no `spot`. */
interface MenuItem {
  id: string
  name: string
  details?: string
  icon?: string
  type?: 'label'
  spot?: Spot
}

const toItem = (spot: Spot): MenuItem => ({
  id: spot.id,
  name: spot.name,
  details: placeDetails(spot),
  icon: spot.kind === 'spot' ? 'i-lucide-wind' : 'i-lucide-map-pin',
  spot
})

const items = computed<MenuItem[][]>(() => {
  const groups: MenuItem[][] = []
  if (knownSpots.value.length) {
    groups.push([
      { id: 'label:spots', type: 'label', name: 'Spots de kite' },
      ...knownSpots.value.map(toItem)
    ])
  }
  if (places.value.length) {
    groups.push([
      { id: 'label:places', type: 'label', name: 'Localités' },
      ...places.value.map(toItem)
    ])
  }
  return groups
})

const selectedItem = computed<MenuItem | undefined>({
  get: () => (selected.value ? toItem(selected.value) : undefined),
  set: (item) => {
    selected.value = item?.spot ?? null
  }
})

const emptyText = computed(() => {
  if (isQueryTooShort.value) return 'Tape au moins 2 lettres.'
  if (placesStatus.value === 'pending') return 'Recherche…'
  return `Aucun spot ni lieu trouvé pour « ${searchTerm.value.trim()} ».`
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <UFormField
      label="Spot ou localité"
      name="spot"
      help="Nom d’un spot de kite (ex. Pounda, L’Almanarre) ou d’une ville proche."
    >
      <UInputMenu
        v-model="selectedItem"
        v-model:search-term="searchTerm"
        :items="items"
        label-key="name"
        description-key="details"
        by="id"
        ignore-filter
        :loading="placesStatus === 'pending'"
        placeholder="Dakhla, Tarifa, Hyères…"
        icon="i-lucide-search"
        size="lg"
        class="w-full"
      >
        <template #empty>{{ emptyText }}</template>
      </UInputMenu>
    </UFormField>

    <p v-if="placesError" class="text-sm text-error" role="status">
      Recherche de localités indisponible : {{ dataErrorMessage(placesError) }}
      Les spots connus restent disponibles.
    </p>
  </div>
</template>
