# Atlas — interface Nuxt

Tableau de bord de supervision domestique : caméras, graphiques, fichiers,
terminal et réseau local. Nuxt 3, Vue 3 et TypeScript.

## Démarrage local

Dans le backend voisin :

```powershell
cd D:\Projet\TEST_techno\atlas-backend
npm run dev:local
```

Dans un autre terminal :

```powershell
cd D:\Projet\TEST_techno\test_NUXT_3.14
npm run dev
```

Nuxt affiche l’adresse du site (habituellement `http://localhost:3000`).
La page `/settings` permet d’ajouter, modifier, activer, désactiver et supprimer
les profils caméra. L’accueil charge les profils activés depuis PostgreSQL.
Les six anciennes caméras sont importées à la première initialisation du backend.

La page `/dashboard` affiche les **mesures du serveur NestJS** :
modèle, cœurs physiques/logiques, charge globale et par processeur logique,
fréquence indiquée par l’OS et température si une sonde est accessible.
Elle interroge `/api/system/metrics` toutes les deux secondes et conserve les
60 dernières mesures en mémoire pendant la visite. Les requêtes du navigateur
s’arrêtent à la sortie du dashboard et sont suspendues dans les onglets masqués.
La collecte côté backend continue indépendamment des visiteurs.

La page `/history`, accessible par l’icône Historique ou depuis le dashboard,
affiche l’historique conservé dans PostgreSQL : choix du jour en heure locale,
courbes CPU/RAM/température/réseau, moyennes et maxima des relevés disponibles,
tableau paginé et détail d’un instantané complet. Un export JSON permet de
télécharger les séries affichées. Le backend écrit un relevé toutes les dix
secondes tant qu’il fonctionne. Les coupures restent des trous dans les courbes ;
une température inaccessible reste absente. Aucun ancien historique n’est
reconstitué. Le bouton Actualiser recharge la journée en cours.
La carte RAM affiche la mémoire totale utilisable, utilisée et disponible en
Gio/Mio et sa répartition réelle. Sous Linux, le cache récupérable est inclus
dans la mémoire disponible.

La carte réseau permet de choisir une interface du serveur. Elle affiche son
état, ses adresses IP, les débits de réception/envoi en Mbit/s, l’historique et
les compteurs cumulés en octets. L’interface par défaut est sélectionnée au
premier chargement. Les interfaces physiques et virtuelles sont séparées pour
éviter de compter deux fois le même trafic. Un zéro réel reste affiché ; une
interface déconnectée ou un compteur inaccessible affiche une valeur absente.
Ce sont les débits observés sur le serveur, sans test de vitesse Internet.
Les séries CPU, RAM et réseau fictives et l’ancienne requête météo ont été
supprimées du dashboard. L’ancien endpoint `/api/system/cpu` reste disponible.

Sur Windows, la température exige un fournisseur WMI CPU tel que
LibreHardwareMonitor ; sous Linux, les sondes CPU `hwmon`/`thermal` doivent
être accessibles. Une sonde absente affiche « Température non disponible ».
La fréquence Windows est nominale, pas une mesure du turbo. Voir les détails
de compatibilité dans le README du backend.

## Terminal interactif

Ouvrir `/terminal` après `npm run dev` : une vraie session PowerShell sur Windows
ou Bash sur Linux s’ouvre sur la machine qui exécute Nuxt. Aucun relais sur le
port 3001 ni lancement séparé n’est nécessaire. `npm run terminal` reste un
raccourci de lancement du site. Le terminal fonctionne aussi avec le serveur
Nuxt compilé, pas avec une génération statique.

Les commandes, l’historique du shell, la complétion, les programmes interactifs,
Ctrl+C et le redimensionnement passent par un pseudo-terminal. Les boutons
permettent de déconnecter, reconnecter et effacer l’écran. Chaque onglet possède
sa session ; quitter la page, fermer la connexion ou arrêter Nuxt ferme le shell.
Une session inactive depuis 30 minutes est fermée, avec quatre sessions maximum.

Configuration privée facultative dans `.env`, suivie d’un redémarrage de Nuxt :

```dotenv
TERMINAL_MODE=local
TERMINAL_ENABLED=true
# TERMINAL_CWD=D:/Projet/TEST_techno/atlas-backend
# TERMINAL_SHELL=powershell.exe
```

`TERMINAL_ENABLED=false` désactive la console. Le dossier initial est celui de
lancement de Nuxt par défaut. Le shell utilise les droits du compte qui lance
Nuxt. Le terminal est limité aux connexions locales et aux origines localhost :
ouvrir le site via `http://localhost:3000` ou l’adresse de boucle locale affichée.
Un ticket de 30 secondes à usage unique relie la requête HTTP à la connexion
WebSocket sur la même origine. Aucun mot de passe ou clé privée n’est envoyé au
navigateur. L’accès au terminal depuis le LAN nécessitera une authentification
utilisateur ; le mode livré ne l’ouvre pas au réseau.

Pour ouvrir une machine distante depuis cette interface locale, choisir
`TERMINAL_MODE=ssh`, renseigner `SSH_HOST`, `SSH_PORT`, `SSH_USERNAME`, puis
`SSH_PASSWORD` ou `SSH_PRIVATE_KEY_PATH` (et `SSH_KEY_PASSPHRASE` si nécessaire).
`SSH_HOST_FINGERPRINT` doit contenir l’empreinte `SHA256:...` de sa clé hôte,
obtenue par un canal de confiance. Une empreinte différente refuse la connexion.
Les anciennes variables SSH seules ne changent pas le mode local par défaut.

Le paquet natif `node-pty` fournit ConPTY sous Windows et un PTY sous Linux.
Sa version est verrouillée à `1.2.0-beta.18` : cette préversion corrige notamment
la fermeture des processus Windows et la gestion d’une console déjà terminée.
Installer les dépendances sur la plateforme cible avec `npm ci` ; si aucun
binaire compatible n’est disponible, ses outils de compilation C++ sont requis.
Le build Node inclut les binaires natifs de sa plateforme et n’est pas portable
tel quel entre Windows et Linux. Windows 10 récent ou Windows 11 est nécessaire.

```powershell
npm run test:terminal
```

Les tests ouvrent un vrai shell local (état conservé, commandes, Ctrl+C,
redimensionnement et fermeture), vérifient le refus des origines/clients/tickets
invalides et testent le SSH contre un serveur éphémère isolé, avec vérification
de la clé hôte. Ils n’utilisent pas les identifiants SSH du `.env`.

## Configuration

Les dépendances et les `.env` sont déjà préparés sur cette machine.
Sur une nouvelle installation, lancer `npm ci`, copier `.env.example` vers
`.env`, puis configurer :

```dotenv
NUXT_ATLAS_API_BASE=http://127.0.0.1:3002/api
NUXT_ATLAS_API_KEY=la-meme-cle-que-ATLAS_API_KEY-du-backend
```

Ces variables sont privées au serveur Nuxt. Redémarrer Nuxt après modification.
Le navigateur appelle `/api/cameras`, dont les routes serveur transmettent les
requêtes à NestJS. Les API existantes `/api/files` et `/api/lan/scan` restent
dans Nuxt.

HLS et MJPEG sont lisibles si le flux est accessible depuis le navigateur.
Les profils RTSP sont stockés mais nécessitent un relais vidéo vers HLS pour
être lus. Les URL avec identifiants intégrés ne sont pas prises en charge.
La gestion des profils ne réalise pas d’enregistrement vidéo.

Le site n’a pas encore d’authentification utilisateur : toute personne pouvant
accéder au site peut gérer les profils. Le mode fourni est destiné à un usage
local ; voir le README du backend avant une publication.

## Compilation

```powershell
npm run build
npm run preview
```

Pour lancer directement le serveur compilé, fournir les variables
`NUXT_ATLAS_*` dans l’environnement ou utiliser Node.js avec
`node --env-file=.env .output/server/index.mjs`.
Les profils caméra exigent le serveur Nuxt ; un hébergement purement statique
avec `npm run generate` ne suffit pas.

Voir [le backend](../atlas-backend/README.md) pour PostgreSQL, les migrations,
Docker, les endpoints et les tests d’intégration.
