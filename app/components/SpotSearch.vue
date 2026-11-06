<script setup lang="ts">
import type { Spot } from '#shared/weather/types'

const selected = defineModel<Spot | null>('selected', { default: null })

const query = ref('')
const coordinate = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 })
const { results, status, error, lastQuery, search } = useSpotSearch()

const canSearch = computed(() => query.value.trim().length >= 2)

function submit() {
  if (canSearch.value) search(query.value)
}

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
</script>

<template>
  <div class="flex flex-col gap-4">
    <form role="search" @submit.prevent="submit">
      <UFormField
        label="Localité la plus proche du spot"
        name="spot"
        help="La recherche porte sur les noms de villes et de lieux (ex. Hyères, Dakhla, Paros, Itarema)."
      >
        <div class="flex gap-2">
          <UInput
            v-model="query"
            class="flex-1"
            placeholder="Hyères"
            icon="i-lucide-map-pin"
            autocomplete="off"
            size="lg"
          />
          <UButton
            type="submit"
            label="Rechercher"
            size="lg"
            :loading="status === 'pending'"
            :disabled="!canSearch"
          />
        </div>
      </UFormField>
    </form>

    <div aria-live="polite">
      <UAlert
        v-if="status === 'error' && error"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="La recherche a échoué"
        :description="dataErrorMessage(error)"
        :actions="[
          {
            label: 'Réessayer',
            color: 'error',
            variant: 'outline',
            onClick: submit
          }
        ]"
      />

      <p v-else-if="status === 'success' && !results.length" class="text-muted">
        Aucun lieu trouvé pour « {{ lastQuery }} ». Essaie le nom de la ville la
        plus proche du spot.
      </p>

      <ul
        v-else-if="status === 'success'"
        class="flex flex-col divide-y divide-default rounded-md border border-default"
        aria-label="Résultats de la recherche"
      >
        <li v-for="spot in results" :key="spot.id">
          <UButton
            :color="selected?.id === spot.id ? 'primary' : 'neutral'"
            :variant="selected?.id === spot.id ? 'soft' : 'ghost'"
            :aria-pressed="selected?.id === spot.id"
            :trailing-icon="
              selected?.id === spot.id ? 'i-lucide-check' : undefined
            "
            block
            class="justify-between rounded-none px-3 py-2.5 text-left"
            @click="selected = spot"
          >
            <span class="flex flex-col">
              <span class="font-medium text-highlighted">{{ spot.name }}</span>
              <span class="text-sm text-muted">{{ placeDetails(spot) }}</span>
            </span>
          </UButton>
        </li>
      </ul>
    </div>
  </div>
</template>
