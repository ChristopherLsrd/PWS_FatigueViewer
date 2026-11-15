# Fatigue Viewer

Plugin pour **Pro Wrestling Sim** : suit la fatigue et le risque de blessure des catcheurs de ta promotion, et permet de les envoyer en congé.

Le plugin s'affiche en français ou en anglais selon la langue du jeu (allemand, espagnol, italien et portugais en bonus ; anglais pour les autres langues).

## Fonctionnement

- **Page « Fatigue Viewer »** (menu latéral) :
  - **Catcheurs disponibles** : fatigue (barre), risque de blessure par match (pourcentage et niveau Faible / Moyen / Élevé), jours avant récupération complète, traits (fragile, maudit, robuste) et bouton **Congé**. Clic sur un en-tête pour trier.
  - **En congé / suspendus** : motif et date de retour.
  - **Blessés** : type de blessure et date de retour.
- **Widget du Bureau** : les catcheurs fatigués (au-dessus du seuil) ou à risque élevé, du plus grave au moins grave, avec un lien vers la page.
- **Congé** : choisis une durée de 1 à 90 jours (par défaut, le temps de récupérer complètement). Le plugin écrit sur le contrat exactement ce que le bouton de congé du jeu écrit : `onTimeOff`, `timeOffEndDate`, `suspended`, `suspensionEndDate`. Le jeu gère ensuite le retour du catcheur.

## Risque de blessure

Le pourcentage reprend la formule du jeu pour un match : `(2 + fatigue / 2) / 2000`, doublé pour un catcheur fragile (*injury prone*), doublé pour un catcheur maudit (*cursed*), divisé par 4 pour un catcheur robuste. Les facteurs propres au show (danger de la promotion, stipulation, spots) ne sont pas comptés.

| Niveau | Risque par match | Catcheur sans trait |
|---|---|---|
| Faible | moins de 0,75 % | fatigue < 26 |
| Moyen | de 0,75 % à 1,5 % | fatigue 26 à 55 |
| Élevé | 1,5 % et plus | fatigue ≥ 56 |

## Réglages

Bouton **Réglages** en haut de la page Fatigue Viewer. Chaque changement est enregistré tout de suite.

| Réglage | Défaut | Rôle |
|---|---|---|
| Widget du Bureau | activé | Affiche le widget dans le Bureau |
| Seuil de fatigue | 50 | Fatigue minimale pour apparaître dans le widget (0-100) |
| Risque de blessure élevé | activé | Ajoute au widget les catcheurs à risque élevé |
| Lignes du widget | 8 | Nombre maximum de catcheurs dans le widget (1-20) |

## Permissions

`database`, `database:write` (uniquement pour le congé), `events`.

## Développement

Architecture propre : `src/domain` (règles pures), `src/application` (ports et cas d'usage), `src/presentation` (HTML et textes), `src/adapters` (base de données et interface du jeu). `test/architecture.test.js` vérifie le sens des dépendances.

Tests (Node 24) :

```powershell
npm test
```

Pour que le jeu charge le plugin directement depuis le dépôt (Windows) :

```powershell
New-Item -ItemType Junction -Path "$env:APPDATA\ProWrestlingSimulator\plugins\fatigue-viewer" -Target "F:\Dev\PWS_FatigueViewer"
```
