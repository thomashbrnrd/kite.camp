import type { DataSourceError } from '#shared/weather/errors'

/** User-facing French message for a data source error. */
export function dataErrorMessage(error: DataSourceError): string {
  switch (error.kind) {
    case 'network':
      return 'Impossible de joindre Open-Meteo. Vérifie ta connexion et réessaie.'
    case 'http':
      if (error.status === 429) {
        return 'Trop de requêtes vers Open-Meteo. Réessaie dans quelques minutes.'
      }
      return `Open-Meteo a renvoyé une erreur (${error.status ?? 'inconnue'}). Réessaie plus tard.`
    case 'invalid-response':
      return 'Open-Meteo a renvoyé une réponse inattendue. Réessaie plus tard.'
    case 'aborted':
      return 'La requête a été annulée.'
  }
}
