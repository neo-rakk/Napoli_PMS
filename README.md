# 🏨 Système de Gestion Hôtelière & Village (PMS)

Une application Full-Stack complète (Property Management System) conçue pour la gestion centralisée d'un complexe hôtelier ou d'un village d'hébergement (type Village Olympique). Elle couvre tous les aspects opérationnels : de l'accueil à la facturation B2B, en passant par la maintenance technique, la gouvernance et les points de vente (POS).

## ✨ Fonctionnalités Principales

Le système est divisé en plusieurs modules métier, protégés par un système de rôles rigoureux :

### 1. 🛎️ Réception & Accueil
* **Tableau de Bord / Planning** : Vue d'ensemble des réservations et de l'occupation.
* **Plan des Chambres Interactif** : Visualisation couleur par statut (Libre, Occupée, En nettoyage, Maintenance).
* **Check-In / Check-Out** : Processus d'arrivée et de départ fluides.
* **Gestion des Délégations / Groupes** : Suivi des arrivées de groupes, chefs de délégation, pays, disciplines sportives et gestion des formules de séjour (PC, DP, PD).
* **Main Courante & Clôture** : Bilan financier de fin de journée, statistiques In-House et transactions journalières.

### 2. 🧹 Housekeeping (Gouvernance)
* **Suivi Temps Réel** : Visualisation instantanée des chambres à nettoyer après un Check-Out.
* **Mise à Jour de Statut** : Les agents d'entretien peuvent marquer une chambre comme "Nettoyée", la rendant immédiatement disponible pour la réception.
* **Signalement de Pannes** : Création directe de tickets de maintenance depuis le module Housekeeping.

### 3. 🔧 Service Technique & Maintenance
* **Système de Ticketing** : Pannes signalées avec localisation exacte (Chambre ou espaces communs) et niveau d'urgence.
* **Application Mobile-Friendly** : Les techniciens voient les tâches qui leur sont assignées en temps réel.
* **Bons d'Achat** : Possibilité de demander des pièces ou du matériel depuis un ticket.
* **Clôture avec Preuve Visuelle** : L'agent technicien doit ajouter un rapport et valider par une prise de photo à la fin de l'intervention.

### 4. ☕ Point de Vente (POS) / Cafétéria
* **Caisse Enregistreuse** : Prise de commandes rapide via une interface tactile-friendly avec catégories.
* **Room Charge** : Possibilité d'imputer (transférer) le ticket de caisse directement sur la note de chambre d'un client "In-House" pour un paiement global au Check-Out.
* **Modes de Paiement** : Cash, Carte Bancaire (TPE), Imputation Chambre.

### 5. 🏢 Administration & Back-Office
* **Facturation & B2B (Grands Comptes)** : Gestion des entreprises partenaires, contrats avec système de remises, et Bons de Commande (BDC) avec montants plafonds.
* **Gestion du Parc Hébergement** : Création des chambres, blocs/bâtiments, capacités et types.
* **Gestion des Agents & Accès** : Création des comptes employés avec attribution précise des rôles (Admin, Reception, Housekeeping, Maintenance, POS, Sécurité).
* **Logs d'Audit** : Traçabilité totale des actions critiques des agents (Qui a fait quoi et quand).

---

## 🛠️ Stack Technique

* **Frontend** : React 18, Vite, Tailwind CSS, Zustand (gestion d'état), React Router DOM, Lucide React (Icônes).
* **Backend** : Node.js, Express.js.
* **Base de Données** : SQLite (via `sqlite3`, base locale embarquée et autopartagée).
* **Sécurité** : JWT (JSON Web Tokens) pour l'authentification des API, `bcrypt` pour le hachage des mots de passe.
* **Architecture** : SPA (Single Page Application) avec API RESTful. Serveur de développement unifié.

---

## 📂 Structure du Projet

```text
├── server/
│   ├── index.cjs             # Point d'entrée principal du serveur (Express + Vite Middleware)
│   ├── db/
│   │   └── database.cjs      # Fichier SQLite local (base.db) & initialisation initiale
│   ├── middleware/
│   │   └── auth.cjs          # Middleware de vérification JWT et RBAC (contrôle par rôles)
│   └── routes/               # API Routes (reservations, chambres, comptes, maintenance, etc.)
├── src/
│   ├── components/ui/        # Composants réutilisables (Boutons, Modales, etc.)
│   ├── layouts/              # Templates de mise en page par métier (Admin, POS, Reception, etc.)
│   ├── pages/                # Vues de l'application (divisées par domaine: admin, housekeeping...)
│   ├── store/                # Zustand stores (gestion de session persitante)
│   ├── App.tsx               # Routeur principal & Protection des routes
│   └── main.tsx              # Point d'entrée React
└── vite.config.ts            # Configuration Vite
```

---

## 🚀 Installation & Lancement

1. **Prérequis** : Node.js (v18+ recommandé) et npm installés sur la machine.
2. **Installation des dépendances** :
   ```bash
   npm install
   ```
3. **Lancement du Serveur de Développement (Full-Stack)** :
   ```bash
   npm run dev
   ```
   *L'application sera accessible par défaut sur `http://localhost:3000`.*
   *La base de données locale SQLite sera générée automatiquement et pré-remplie avec l'agent administrateur par défaut lors du premier démarrage.*

4. **Build pour la Production** :
   ```bash
   npm run build
   npm start
   ```

---

## 🔐 Identifiants par défaut

Lors du premier lancement, le système injecte des identifiants vides ou par défaut si paramétré.
Pour vous connecter à l'interface d'administration `/reception/login` ou au portail global, veuillez utiliser vos identifiants administrateur. (Si ce compte a été supprimé, repassez par une initialisation de la base SQLite).

---

*Ce projet a été construit dans l'esprit de fournir une plateforme robuste, évolutive et facile d'utilisation pour des équipes terrains opérationnelles.*
