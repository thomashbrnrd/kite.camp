# Kite Quiver Planner — SPEC v0.1

> Nom de travail, à renommer. Ce document est la source de vérité produit. En cas de conflit avec `CLAUDE.md`, demander avant d'agir.

## 1. Problème et idée

Un kiter qui achète ou complète son quiver doit répondre à : « quelles tailles d'ailes acheter pour **mon** spot ? ». Aujourd'hui, les réponses sont des règles générales (« trois ailes », « demande aux locaux ») et des calculateurs qui donnent une taille pour **un** vent donné.

Cette app répond avec des données. À partir de l'historique de vent du spot, elle calcule, pour chaque quiver possible, la part de jours et d'heures où l'on peut rider, ainsi que le gain apporté par chaque aile supplémentaire.

Vigilance : un premier sondage n'a pas trouvé d'outil équivalent, mais il n'était pas exhaustif. Voir §12.

## 2. Cible et principes

- Kiters francophones d'abord (UI en français), extensible à l'anglais plus tard.
- Mobile-first : l'outil sera souvent consulté depuis un téléphone, à la plage ou en magasin.
- 100 % statique et côté client : aucun backend, aucun compte, aucun secret.
- Gratuit en v1.
- C'est un outil d'**aide à l'achat**, pas une aide à la décision sur l'eau (voir §13).

## 3. Périmètre

### Dans la v1
- Recherche d'un spot par nom (géocodage).
- Profil : poids, discipline, niveau.
- Évaluation d'un quiver (existant ou hypothétique) et recherche du meilleur quiver à N ailes.
- Gain marginal de chaque taille candidate à ajouter à un quiver existant.
- Graphique de la distribution du vent avec les plages de chaque aile.
- Filtre de saison (mois de pratique).
- Réglage de correction du vent.
- Partage de la configuration par URL.
- Disclaimers visibles.

### Hors v1 (idées pour plus tard)
- Filtre par direction du vent (offshore/onshore selon l'orientation du spot).
- Comparateur de spots et de périodes (« où partir en février avec mon quiver ? »).
- Pages prérendues par spot pour le SEO.
- Plages de vent par modèle d'aile (catalogue constructeurs).
- Prix et budget (« coût par point de couverture »).
- Fiche « mon matériel » (idée du propriétaire, 2026-11-06) : saisir le matériel possédé (ailes, et plus tard planches) pour obtenir une **note d'adéquation** au spot et au profil (prolonge le mode « J'ai déjà ces ailes » du §4), et une **estimation de valeur à l'occasion**. Point ouvert : source des prix (annonces d'occasion : conditions d'utilisation et droit des bases de données à vérifier ; saisie manuelle ; partenaire), et cohérence avec la licence non commerciale d'Open-Meteo (§5) si cela mène à de l'affiliation.
- Carte image partageable pour les réseaux sociaux.
- Version anglaise.

## 4. Parcours utilisateur

Une seule page, en étapes courtes.

1. **Spot** : recherche par nom, choix dans une liste de résultats.
2. **Profil** : poids (kg), discipline (twintip, directionnel, foil), niveau (débutant, intermédiaire, avancé).
3. **Quiver** : trois modes.
   - « J'ai déjà ces ailes » : saisie des tailles, calcul de la couverture et suggestion de la meilleure aile à ajouter.
   - « Trouve-moi le meilleur quiver à N ailes » : N de 1 à 4.
   - « Je compare deux quivers ».
4. **Résultat** :
   - Couverture en % de jours rideables et en % d'heures rideables.
   - Graphique du vent avec les plages des ailes superposées.
   - Tableau du gain marginal par taille candidate.
   - Bouton « Copier le lien de ma configuration ».
   - Réglages avancés repliés : années d'historique, mois, correction du vent, coefficients du modèle.

## 5. Données

Source v1 : **Open-Meteo** (appelée directement depuis le navigateur, sans clé).

- Géocodage : endpoint `geocoding-api.open-meteo.com/v1/search`.
- Historique : endpoint `archive-api.open-meteo.com/v1/archive`.
- Variables utiles : vitesse du vent à 10 m, rafales à 10 m, unité en nœuds, fuseau horaire automatique.
- Moment de la journée : il faut pouvoir filtrer sur les heures de jour. **Vérifier dans la doc actuelle** quelles variables l'API d'archive propose pour cela (indicateur jour/nuit ou lever/coucher du soleil) et choisir en conséquence.
- Fenêtre par défaut : 5 années complètes d'heures. Prévoir un paramètre.
- Cache local par (latitude, longitude, plage d'années) pour éviter de re-télécharger. Respecter les limites d'usage.

**Limites à garder en tête**
- Ce sont des données de **réanalyse** (modèles), pas des mesures de stations.
- La résolution est grossière : les brises thermiques et effets locaux d'un spot sont souvent sous-estimés.
- D'où le réglage de correction du vent (§6) et les disclaimers (§13).

**Licence**
- Le palier gratuit d'Open-Meteo est réservé à un usage non commercial. Une monétisation (affiliation, premium, pub) exigerait un plan payant ou une autre source.
- **Vérifier les conditions d'attribution** (Open-Meteo et jeux de données sous-jacents) et les afficher dans l'UI.
- Isoler la source derrière une interface (`useWindHistory` ou équivalent) pour pouvoir la remplacer.

## 6. Modèle de calcul

> Les coefficients ci-dessous sont des **hypothèses de départ** issues de règles empiriques répandues. Ils sont à valider et à calibrer avec le propriétaire du projet, et doivent vivre dans un fichier de configuration unique, jamais en dur dans les composants.

**Vent idéal d'une aile**

```
vent_ideal (nœuds) = k × poids (kg) / taille (m²)
```

Coefficient `k` par discipline (hypothèses) : twintip freeride 2,2 ; freestyle 1,8 ; directionnel/vagues 2,0 ; foil 1,0.

**Plage rideable d'une aile**

```
plage = [ vent_ideal × bas , vent_ideal × haut ] × correction
```

Multiplicateurs par défaut (hypothèses) : `bas` = 0,75 pour tous les niveaux ; `haut` = 1,1 débutant, 1,3 intermédiaire, 1,4 avancé.

L'utilisateur doit pouvoir **surcharger la plage de chaque aile** à la main (plages données par le constructeur).

**Correction du vent**
Multiplicateur appliqué aux données, défaut ×1,0, réglable par un curseur (ex. 0,8 à 1,4). Sert à compenser les effets locaux que la réanalyse ne voit pas. Un choix additif en nœuds est possible, à trancher (§12).

**Exemple de contrôle** (70 kg, twintip freeride, `k` = 2,2, `bas` = 0,75, `haut` = 1,3, correction ×1,0). À utiliser comme tests unitaires de bon sens, pas comme vérité terrain :

| Taille | Vent idéal | Plage rideable |
|--------|-----------|----------------|
| 7 m    | 22,0 kn   | 16,5 – 28,6 kn |
| 9 m    | 17,1 kn   | 12,8 – 22,2 kn |
| 12 m   | 12,8 kn   | 9,6 – 16,7 kn  |

Le quiver {7, 9, 12} couvre donc de 9,6 à 28,6 kn.

**Définitions de couverture** (calculées sur les heures de jour, dans les mois choisis)
- **Heure rideable** : le vent de l'heure tombe dans la plage d'au moins une aile du quiver.
- **Jour rideable** : au moins 2 heures consécutives rideables dans la journée.
- **Couverture** : % de jours rideables, et % d'heures rideables, sur la période.
- **Gain marginal d'une taille** : couverture(quiver + taille) − couverture(quiver).

Les rafales peuvent servir à écarter des heures dangereuses (option, par exemple : écarter si rafale > plafond de la plus grande plage utilisable). À décider (§12).

## 7. Optimiseur

- Tailles candidates : liste configurable, par défaut les tailles courantes de 5 à 17 m.
- Recherche exhaustive pour N ≤ 4 (quelques centaines de combinaisons, instantané côté client).
- Objectif : maximiser le % de jours rideables. Départage : moins d'ailes, puis % d'heures rideables.
- Mode « ajouter à l'existant » : classement des tailles candidates par gain marginal.
- Le calcul doit tourner sans bloquer l'UI (Web Worker si besoin).

## 8. UI / UX

- Composants : **Nuxt UI** (base Tailwind). Vérifier les noms de composants dans la doc de la version installée.
- Thème clair et sombre.
- Accessibilité de base : labels, contrastes, navigation clavier.
- Graphique : bibliothèque à choisir (§12). Il doit rester lisible sur mobile et supporter la superposition de plages.
- États vides, chargement et erreurs réseau soignés (le géocodage et l'archive peuvent échouer).

## 9. Architecture technique

- **Nuxt** (version stable courante, à vérifier dans la doc) + **Nuxt UI**.
- Suivre la structure de dossiers de la version de Nuxt installée.
- **Logique métier en TypeScript pur, indépendante de Nuxt** : calcul de plage, couverture, optimiseur. Testable sans navigateur.
- Couche données isolée (géocodage, historique, cache) derrière des composables.
- État synchronisé avec l'URL (paramètres de requête) pour le partage.
- Préférences utilisateur légères en `localStorage` (thème, dernier spot).
- Aucun appel vers un serveur à nous : tout est statique.

## 10. Déploiement (GitHub Pages)

- Génération statique avec Nuxt. **Vérifier dans la doc Nuxt actuelle** le mode à utiliser et la procédure GitHub Pages.
- `baseURL` adapté si le site est servi sous `utilisateur.github.io/nom-du-repo/`. Le configurer par variable d'environnement.
- Déploiement par GitHub Actions. Ne pas déployer ni pousser sans accord du propriétaire.
- Prévoir une page 404 qui renvoie vers l'app, et le fichier `.nojekyll` si la doc le demande.

## 11. Jalons

- **M0** : scaffold Nuxt + Nuxt UI + lint + typecheck + tests. Une page « hello » déployée sur GitHub Pages.
- **M1** : couche données (géocodage, historique, cache) et un histogramme brut du vent d'un spot.
- **M2** : modèle de plage, couverture, tests unitaires (dont l'exemple du §6).
- **M3** : parcours utilisateur complet et graphique.
- **M4** : optimiseur et gain marginal.
- **M5** : partage par URL, disclaimers, attributions, SEO de base, polissage mobile.

Valider avec le propriétaire à la fin de chaque jalon avant d'enchaîner.

## 12. Décisions ouvertes (à trancher avec le propriétaire, ne pas décider seul)

1. Bibliothèque de graphiques (ECharts, Chart.js, D3, autre) et poids ajouté au bundle.
2. Gestionnaire de paquets (pnpm, npm, autre).
3. TypeScript strict : par défaut oui, à confirmer.
4. Mode de génération Nuxt (SPA pure ou prérendu statique) selon l'ambition SEO.
5. Coefficients du modèle (§6) : valeurs finales et calibrage. Correction du vent multiplicative ou additive.
6. Prise en compte des rafales dans la rideabilité.
7. Nombre d'années d'historique par défaut.
8. Monétisation éventuelle et conséquences sur la licence de données (§5).
9. Nom du produit et nom de domaine.
10. Validation de la concurrence : refaire une recherche (stores, web, forums) avant d'investir au-delà du M2.

## 13. Disclaimers (à afficher dans l'UI)

> Cet outil aide à planifier un achat à partir de données météo historiques modélisées. Il ne remplace ni l'avis d'un moniteur ou d'un shop local, ni ton jugement sur l'eau, et ne doit jamais servir à décider si tu peux naviguer. Les vents réels d'un spot peuvent différer sensiblement des données utilisées.

Ne jamais présenter un résultat comme une garantie. Ne jamais proposer de recommandation « quelle aile sortir aujourd'hui ».

## 14. Critères d'acceptation v1

- Un utilisateur trouve son spot, saisit son profil et obtient une couverture chiffrée en moins d'une minute sur mobile.
- Les calculs de plage et de couverture sont couverts par des tests unitaires, dont l'exemple du §6.
- Le build statique passe (lint, typecheck, tests, génération) et le site se déploie sur GitHub Pages.
- Les disclaimers et attributions sont visibles.
- Aucune clé, aucun secret et aucun appel serveur propriétaire dans le code.
