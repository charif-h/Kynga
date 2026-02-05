# 🏋️ Implémentation - Système de Gestion des Objectifs et Résultats

## 📦 Ce qui a été ajouté

### 1. **Nouveaux Modèles de Base de Données** (`app/models.py`)

#### `ExerciseGoal`
Stocke les objectifs que l'utilisateur se fixe pour chaque exercice d'une session.
- Poids, répétitions, nombre de séries
- Temps, distance, calories
- Timestamps de création/modification

#### `ExerciseResult`
Enregistre les performances réelles après la complétion d'un exercice.
- Métriques réelles vs objectifs visés
- Statut "atteint" (booléen)
- Notes optionnelles de l'utilisateur
- Lien vers l'objectif associé

#### `SessionPerformance`
Vue d'ensemble de la performance d'une session complète.
- Durée totale
- Nombre d'exercices complétés
- Nombre d'objectifs atteints
- Notes générales

---

### 2. **Nouveaux Schémas Pydantic** (`app/schemas.py`)

- `ExerciseGoalCreate`, `ExerciseGoalUpdate`, `ExerciseGoalResponse`
- `ExerciseResultCreate`, `ExerciseResultResponse`
- `SessionPerformanceCreate`, `SessionPerformanceResponse`
- `ExerciseHistoryStats` - Statistiques complètes par exercice

---

### 3. **Nouveau Router Performance** (`app/routes/performance.py`)

**Endpoints pour les objectifs** :
- `POST /api/performance/goals` - Créer/mettre à jour un objectif
- `GET /api/performance/goals/{session_exercise_id}` - Récupérer l'objectif
- `PUT /api/performance/goals/{goal_id}` - Modifier un objectif
- `DELETE /api/performance/goals/{goal_id}` - Supprimer un objectif

**Endpoints pour les résultats** :
- `POST /api/performance/results` - Enregistrer une performance
- `GET /api/performance/results/session-exercise/{session_exercise_id}` - Historique d'un exercice
- `GET /api/performance/results/{result_id}` - Détail d'un résultat
- `DELETE /api/performance/results/{result_id}` - Supprimer un résultat

**Endpoints pour la performance de session** :
- `POST /api/performance/performance` - Enregistrer performance globale
- `GET /api/performance/performance/session/{session_id}` - Récupérer performance

**Endpoints pour l'historique** :
- `GET /api/performance/history/{exercise_id}` - Stats d'un exercice (90 jours par défaut)
- `GET /api/performance/user-stats` - Stats de tous les exercices de l'utilisateur

---

### 4. **Nouveau Router Timer** (`app/routes/timer.py`)

**Endpoints pour les minuteurs** :
- `POST /api/performance/rest-timer` - Obtenir la durée de repos
- `GET /api/performance/session-rest-schedule/{session_id}` - Schedule complet de repos

Inclut du code exemple pour l'implémentation frontend du minuteur.

---

### 5. **Documentation Complète** (`WORKFLOW_GUIDE.md`)

Guide détaillé avec :
- 📋 Flux de travail complet (création objectifs → résultats → historique)
- 📊 Exemples d'API avec requêtes/réponses
- ⏱️ Guide d'implémentation du minuteur
- 🎨 Recommandations frontend
- 🚀 Prochaines étapes suggérées

---

## 🎯 Fonctionnalités Principales

### ✅ Objectifs d'exercices
- **Première fois** : Utilisateur définit ses objectifs (poids, reps, séries, etc.)
- **Sessions suivantes** : Récupération automatique des derniers objectifs avec possibilité de modification

### ✅ Enregistrement des résultats
- Après chaque exercice, utilisateur enregistre ce qu'il a réellement réalisé
- **Calcul automatique** si objectifs atteints ou dépassés

### ✅ Historique et statistiques
- **Stats par exercice** : moyenne, max, taux de succès, record personnel
- **Graphique de progression** : évolution sur les N derniers jours
- **Dashboard** : vue d'ensemble de tous les exercices

### ✅ Minuteur de repos
- Récupération de la durée de repos (entre séries ou après exercice)
- Planning complet de repos pour une session
- Code d'implémentation frontend fourni

---

## 🔌 Intégration

### Mise à jour du fichier principal
`app/main.py` a été mis à jour pour inclure les nouveaux routers :
```python
from app.routes import performance, timer
app.include_router(performance.router, prefix="/api/performance", tags=["Performance & History"])
app.include_router(timer.router, prefix="/api/performance", tags=["Rest Timers"])
```

### Mise à jour des exports
`app/routes/__init__.py` exporte maintenant tous les routers incluant `performance` et `timer`.

---

## 📊 Structure des données - Exemple complet

```
User (1)
  ↓
WorkoutSession (Nouvelle session lundi)
  ├── SessionExercise (Développé couché)
  │   ├── ExerciseGoal (Objectif: 50kg x 10 reps x 3 sets)
  │   └── ExerciseResult[] (Historique)
  │       ├── Result 1: 50kg x 10 reps x 3 sets → ATTEINT ✓
  │       ├── Result 2: 48kg x 9 reps x 3 sets → PAS ATTEINT ✗
  │       └── Result 3: 55kg x 11 reps x 4 sets → ATTEINT ✓
  │
  ├── SessionExercise (Squat)
  │   ├── ExerciseGoal (Objectif: 80kg x 8 reps x 4 sets)
  │   └── ExerciseResult[] (Historique)
  │
  └── SessionPerformance (45 min, 5/5 exercices, 4/5 objectifs)

ExerciseHistoryStats (Développé couché)
  - Total sessions: 10
  - Goals achieved: 8 (80%)
  - Average: 49kg x 9.5 reps
  - Personal best: 60kg x 12 reps (il y a 5 jours)
  - Recent results: [...]
```

---

## 🚀 Utilisation

### Pour commencer une session
1. **GET** `/api/sessions/{session_id}` - Récupérer les exercices
2. **POST** `/api/performance/goals` - Créer/confirmer objectifs pour chaque exercice (ou **GET** pour session2+)
3. **GET** `/api/performance/session-rest-schedule/{session_id}` - Optionnel, voir le plan global

### Pour chaque exercice
1. Afficher l'objectif à l'utilisateur
2. Utilisateur complète l'exercice
3. **POST** `/api/performance/results` - Enregistrer la performance
4. **POST** `/api/performance/rest-timer` - Démarrer minuteur
5. Répéter pour l'exercice suivant

### Après la session
1. **POST** `/api/performance/performance` - Enregistrer la performance globale

### Visualiser la progression
- **GET** `/api/performance/history/{exercise_id}` - Stats d'un exercice
- **GET** `/api/performance/user-stats` - Tous les exercices

---

## ⚙️ Configuration de la base de données

Les nouvelles tables seront créées automatiquement au démarrage de l'application grâce à :
```python
Base.metadata.create_all(bind=engine)
```

Pas besoin de migrations manuelles.

---

## 📝 Exemples d'utilisation

### Créer un objectif
```bash
curl -X POST http://localhost:8000/api/performance/goals \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "session_exercise_id": 5,
    "weight_kg": 50,
    "repetitions": 10,
    "sets_count": 3
  }'
```

### Enregistrer un résultat
```bash
curl -X POST http://localhost:8000/api/performance/results \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "session_exercise_id": 5,
    "goal_id": 1,
    "weight_kg": 50,
    "repetitions": 10,
    "sets_completed": 3,
    "notes": "Felt strong"
  }'
```

### Obtenir les stats d'un exercice
```bash
curl http://localhost:8000/api/performance/history/3?days=90 \
  -H "Authorization: Bearer {token}"
```

---

## 🔐 Authentification

Tous les endpoints nécessitent une authentification via JWT.
Include l'en-tête : `Authorization: Bearer {access_token}`

---

## 📚 Prochaines étapes

1. **Frontend** : Créer les pages pour gérer les objectifs et résultats
2. **Graphiques** : Implémenter des charts (Chart.js, D3.js, etc.)
3. **Notifications** : Ajouter des sons/notifications quand minuteur expire
4. **Gamification** : Streaks, badges, motivations
5. **Rapports** : Générer des rapports de progression mensuel/annuel

---

## 🎓 Notes de développement

- Les objectifs partiels sont acceptés (ex: seulement poids, pas de reps)
- Le système détecte automatiquement si objectifs sont atteints
- Les stats sont calculées côté serveur pour la performance
- L'historique peut être filtré par nombre de jours (1-365)
- Tous les endpoints respectent la permission utilisateur (user_id)

Consultez [WORKFLOW_GUIDE.md](WORKFLOW_GUIDE.md) pour plus de détails et d'exemples.
