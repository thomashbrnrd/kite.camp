# CLAUDE.md

Projet : **Kite Quiver Planner** (nom de travail), une SPA qui calcule, à partir de l'historique de vent d'un spot, quel quiver d'ailes de kitesurf couvre le plus de jours rideables.

La source de vérité produit est **`SPEC.md`**. Le lire en entier avant de commencer. Si quelque chose manque, est ambigu ou contredit ce fichier, poser la question avant d'agir.

## Collaboration

- Le propriétaire du projet est développeur. Il relit chaque changement et prend lui-même les décisions techniques importantes.
- Avant d'ajouter une dépendance, de choisir une librairie, de changer l'architecture ou de modifier le modèle de calcul : **proposer 2 ou 3 options avec une recommandation et attendre la réponse**. Les points déjà listés dans `SPEC.md` §12 ne se décident pas seul.
- Faire de petits changements ciblés, un jalon à la fois (`SPEC.md` §11). Pas de refactor ni de fonctionnalité non demandés.
- Ne jamais commiter, pousser ou déployer sans accord explicite.
- Communiquer en français. Code, noms de variables, commentaires et messages de commit en anglais. Textes de l'interface en français (v1).
- **Tenir `SPEC.md` et ce fichier à jour, sans attendre qu'on le demande** : chaque décision tranchée va dans le tableau de `SPEC.md` §12 (avec la date), chaque contradiction ou précision découverte est corrigée dans la section concernée, l'avancement des jalons est coché au §11, et toute nouvelle convention, commande ou structure est reportée ici. Ces mises à jour font partie du même changement que le code.

## Messages de commit

[Conventional Commits](https://www.conventionalcommits.org/) + [gitmoji](https://gitmoji.dev/), au format :

```
<type>: <emoji> <message>
```

- `type` : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- `emoji` : le gitmoji correspondant à l'intention (ex. ✨ nouvelle fonctionnalité, 🐛 correction, 📝 docs, ✅ tests, 👷 CI, 🔧 configuration, ♻️ refactor, ⬆️ dépendances, 🎉 démarrage du projet).
- `message` : en anglais, à l'impératif, sans majuscule initiale ni point final.
- Exemples : `feat: ✨ add spot search`, `fix: 🐛 handle archive api timeout`, `ci: 👷 add github pages workflow`.

## Stack décidée

- **Nuxt 4** + **Nuxt UI 4** (Tailwind 4), prérendu statique, hébergement sur **GitHub Pages** (déployé : https://thomashbrnrd.github.io/kite.camp/).
- npm, Node 24, TypeScript strict, ESLint + Prettier, Vitest.
- Graphiques : `UChart` (Nuxt UI, `@tanstack/charts`).
- Les autres décisions et celles encore ouvertes sont dans `SPEC.md` §12.

## Structure du code

- `shared/` : logique métier en TypeScript pur. Nuxt y interdit tout import de Vue ou Nitro, et le contexte TypeScript n'y a ni DOM ni types Node : les API du navigateur sont injectées via des types structurels (`FetchLike`, `CacheStorageLike`…). Import depuis l'app via l'alias `#shared/…`.
  - `shared/config.ts` : **seul** fichier de paramètres (données, histogramme, coefficients du modèle).
  - `shared/weather/` : adaptateur Open-Meteo (géocodage, archive), fetcher JSON avec cache, fenêtre d'années, histogramme.
  - `shared/spots/` : liste de spots connus (`spots.json`, **généré**, ne pas éditer à la main) et recherche locale.
  - `shared/model/` : plages des ailes et couverture (M2).
- `app/composables/` : état Vue autour de `shared/` (`useWindDataSource` est le seul point qui instancie la source de données).
- `app/components/`, `app/pages/` : UI, textes en français.
- `scripts/spots/` : génération de `spots.json` depuis `seed.json` (Nominatim, 1 requête/s, cache local ignoré par git).
- `modules/` : modules Nuxt locaux (chargés automatiquement). `dev-sfc-style-guard.mjs` : garde-fou de dev, voir « Pièges connus ».
- `scripts/check-node.mjs` : lancé par `predev`, refuse une version de Node non supportée.
- `test/unit/` : tests Vitest ; `test/fixtures/` : vraies réponses Open-Meteo, source notée dans leur README.

## Pièges connus

- Ne pas lancer `nuxt build`/`generate` dans le dossier du projet pendant que le serveur de dev du propriétaire tourne (ils partagent `.nuxt`) : tester dans une copie avec ses propres `node_modules` (un lien symbolique vers `node_modules` casse le build).
- Le serveur de dev doit tourner sous Node 24 (`nvm use`) : la version par défaut de la machine (23) n'est pas supportée par Nuxt 4.6. `npm run dev` le vérifie (`predev`).
- « CssSyntaxError … `index.vue?vue&type=style&index=0&lang.css` » en dev : un client non identifié (extension ou outil du navigateur) demande un bloc `<style>` qui n'existe pas ; Vite compile alors tout le `.vue` comme du CSS et l'overlay d'erreur reste affiché jusqu'au redémarrage. `modules/dev-sfc-style-guard.mjs` répond par une feuille vide et journalise `referer` et `user-agent` (« [sfc-style-guard] missing <style> requested ») : relever ce log pour identifier la source.
- En mode clair, les teintes de `primary`, `warning` et `error` sont assombries dans `app/assets/css/main.css` pour le contraste WCAG AA ; `.dark` doit y être redéclaré.

## Règles techniques

- **Ne pas se fier à la mémoire pour les versions et les API.** Avant d'écrire du code qui dépend de Nuxt, Nuxt UI, Tailwind, Vite ou Open-Meteo, consulter la documentation actuelle. Si ce n'est pas possible, le dire explicitement plutôt que deviner.
- Le site est **100 % statique** : pas de backend, pas de secret ni de clé API dans le code, pas d'appel vers un serveur propriétaire.
- **Logique métier en TypeScript pur**, indépendante de Nuxt et du DOM (plages de vent, couverture, optimiseur), testée avec des tests unitaires. Les coefficients du modèle vivent dans un seul fichier de configuration.
- La source de données (Open-Meteo) est isolée derrière une interface remplaçable. Mettre en cache les requêtes et respecter les limites d'usage. Son palier gratuit est non commercial : ne rien construire qui suppose une monétisation sans en parler.
- Mobile-first. Accessibilité de base (labels, contrastes, clavier).
- Gérer les états de chargement, vide et erreur réseau.
- Ne pas utiliser de données ou d'exemples inventés comme s'ils étaient réels.

## Sécurité du produit

C'est un **outil d'aide à l'achat**, jamais une aide à la décision sur l'eau. Ne jamais ajouter de fonctionnalité du type « quelle aile sortir maintenant », ni de formulation qui sonne comme une garantie. Les disclaimers de `SPEC.md` §13 doivent rester visibles.

## Définition de « terminé »

Ne jamais annoncer qu'un changement fonctionne sans l'avoir vérifié. Avant de déclarer une tâche finie :
1. lint, typecheck et tests passent ;
2. la génération statique réussit ;
3. le comportement a été vérifié (dans le navigateur quand c'est de l'UI) ;
4. un résumé court dit ce qui a changé, ce qui a été vérifié et ce qui reste incertain.

## Commandes

Node 24 (voir `.nvmrc` : `nvm use`), gestionnaire de paquets **npm**.

- Installation : `npm ci` (ou `npm install` pour modifier les dépendances)
- Serveur de dev : `npm run dev`
- Lint (ESLint + Prettier) : `npm run lint` — correction auto : `npm run lint:fix`
- Typecheck (strict, inclut `test/`) : `npm run typecheck`
- Tests unitaires (Vitest, logique pure, environnement node) : `npm test`
- Génération statique GitHub Pages : `NUXT_APP_BASE_URL=/kite.camp/ npm run generate:pages` → `.output/public`
- Déploiement : workflow `.github/workflows/deploy.yml` sur push `main` (Pages > Source = GitHub Actions)
- Régénérer la liste de spots : `node scripts/spots/build-spots.mjs` (relire le rapport : `CHECK_LOCALITY`, `NO_RESULT`…)
