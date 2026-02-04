# Udemy Dealabs Auto - Extension Chrome

Extension Chrome pour automatiser l'ajout de formations Udemy gratuites depuis les pages Dealabs.

Embed a Sponsor button
<iframe src="https://github.com/sponsors/leQuere/button" title="Sponsor leQuere" height="32" width="114" style="border: 0; border-radius: 6px;"></iframe>
Preview

Embed a Sponsor card
<iframe src="https://github.com/sponsors/leQuere/card" title="Sponsor leQuere" height="225" width="600" style="border: 0;"></iframe>
Preview


## 🎯 Fonctionnalités

- ✅ **Parse automatiquement** les pages Dealabs pour trouver tous les liens de formation
- ✅ **Visite chaque formation** en suivant les redirections
- ✅ **Détecte automatiquement** si la formation est gratuite, payante ou déjà achetée
- ✅ **S'inscrit automatiquement** aux formations gratuites
- ✅ **Validation automatique** du panier (optionnel)
- ✅ **Statistiques en temps réel** avec journal détaillé
- ✅ **Interface moderne** avec progression visuelle

## 📥 Installation

### 1. Charger l'extension dans Chrome

1. Ouvrez Chrome et allez sur `chrome://extensions/`
2. Activez le **Mode développeur** (coin supérieur droit)
3. Cliquez sur **Charger l'extension non empaquetée**
4. Sélectionnez le dossier `/home/sly/udemy-dealabs-extension/`
5. L'extension est installée ! 🎉

### 2. Ajouter des icônes (optionnel)

Les icônes ne sont pas incluses. Créez ou téléchargez des icônes PNG :
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Sites recommandés : [Flaticon](https://www.flaticon.com/), [Icons8](https://icons8.com/)

## 🚀 Utilisation

### Méthode 1 : Depuis la popup

1. Ouvrez une page Dealabs avec des formations (ex: `https://www.dealabs.com/bons-plans/selection-de-cours-en-ligne-gratuits-...`)
2. Cliquez sur l'icône de l'extension dans la barre d'outils
3. Cliquez sur **🚀 Démarrer l'automatisation**
4. L'extension va :
   - Extraire tous les liens de formation
   - Visiter chaque lien
   - Vérifier si gratuit/payant/déjà acheté
   - S'inscrire automatiquement si gratuit
5. Suivez la progression en temps réel

### Méthode 2 : Bouton sur la page

Un bouton **🎓 Lancer Udemy Auto** apparaît en bas à droite des pages Dealabs. Cliquez dessus pour ouvrir la popup.

## 📊 Statistiques affichées

L'extension affiche en temps réel :

- **Total trouvées** : Nombre de formations détectées
- **Achetées** : Nouvelles inscriptions réussies ✅
- **Déjà achetées** : Formations déjà dans votre compte ⊙
- **Payantes** : Formations non gratuites ignorées €
- **Erreurs** : Liens non traités ❌

## ⚙️ Options

- **Valider automatiquement le panier** : Finalise automatiquement l'inscription
- **Délai entre chaque cours** : Ajoute 2 secondes entre chaque traitement

## 🔧 Structure des fichiers

```
udemy-dealabs-extension/
├── manifest.json              # Configuration de l'extension
├── popup.html                 # Interface popup
├── popup.css                  # Styles de la popup
├── popup.js                   # Logique de la popup
├── background.js              # Service worker (orchestration)
├── dealabs-content.js         # Script injecté dans Dealabs
├── udemy-content.js           # Script injecté dans Udemy
├── icon16.png                 # Icône 16x16 (à créer)
├── icon48.png                 # Icône 48x48 (à créer)
├── icon128.png                # Icône 128x128 (à créer)
└── README.md                  # Ce fichier
```

## 🎨 Architecture

### Flux de fonctionnement

1. **Popup** → L'utilisateur clique sur "Démarrer"
2. **Background** → Orchestre le processus
3. **Dealabs Content Script** → Extrait les liens `/visit/threaddesc/`
4. **Background** → Ouvre chaque lien dans un nouvel onglet
5. **Redirection** → Attente de la redirection vers Udemy
6. **Udemy Content Script** → Analyse le cours et s'inscrit si gratuit
7. **Background** → Met à jour les stats et passe au suivant
8. **Popup** → Affiche la progression en temps réel

## 🐛 Dépannage

### L'extension ne détecte pas les liens

Vérifiez que vous êtes bien sur une page Dealabs avec des formations Udemy. Les liens doivent contenir `/visit/threaddesc/`.

### Les inscriptions échouent

- Assurez-vous d'être **connecté à votre compte Udemy**
- Vérifiez que vous avez une connexion internet stable
- Udemy peut avoir changé sa structure HTML (nécessite une mise à jour)

### L'extension est trop lente

Désactivez l'option "Délai entre chaque cours" pour accélérer le processus.

### Erreurs dans la console

Ouvrez la console de développement :
- `chrome://extensions/` → Détails de l'extension → "Inspecter les vues"
- Ou `F12` sur la popup

## ⚠️ Avertissements

- ⚠️ **Utilisez de manière responsable** - Ne spammez pas les serveurs
- ⚠️ **Respectez les CGU** - De Dealabs et Udemy
- ⚠️ **Compte Udemy requis** - Vous devez être connecté
- ⚠️ **Maintenance** - Peut nécessiter des mises à jour si les sites changent

## 🔄 Mises à jour futures

- [ ] Support de plusieurs pages Dealabs simultanément
- [ ] Export des résultats en CSV
- [ ] Filtrage par catégorie de formation
- [ ] Notifications desktop
- [ ] Dark mode
- [ ] Support d'autres plateformes (Coursera, etc.)

## 📝 Licence

Libre d'utilisation à des fins personnelles.

## 🤝 Contribution

Cette extension est un outil personnel. Utilisez-la et modifiez-la selon vos besoins !

4 test
https://www.dealabs.com/bons-plans/selection-de-cours-udemy-gratuits-ia-communication-finance-business-3236640

Veuillez épingler Dealabs pour accéder à toutes ses fonctionnalités.
Cliquez sur l'icône Puzzle, puis sur l'icône Épingle

https://www.udemy.com/courses/search/?q=extension+chrome&src=ukw&price=price-free&lang=fr

580