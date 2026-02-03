# Guide d'implémentation - Gestion des objectifs et résultats d'exercices

Ce guide explique comment utiliser les nouvelles fonctionnalités implémentées pour gérer les objectifs et résultats d'exercices, ainsi que l'historique des performances.

## 🎯 Vue d'ensemble

Le système comprend maintenant :

1. **Objectifs d'exercices** - Définir les cibles pour chaque exercice
2. **Résultats d'exercices** - Enregistrer les performances réelles
3. **Historique** - Voir l'évolution et les statistiques par exercice
4. **Minuteurs** - Gérer les pauses entre exercices

---

## 📋 Flux de travail principal

### 1️⃣ Première fois : Créer les objectifs

Quand un utilisateur fait un exercice pour la première fois, il doit définir ses objectifs.

**Endpoint** : `POST /api/performance/goals`

```json
{
  "session_exercise_id": 5,
  "weight_kg": 50,
  "repetitions": 10,
  "sets_count": 3,
  "time_minutes": null,
  "distance_km": null,
  "calories": null
}
```

**Réponse** :
```json
{
  "id": 1,
  "session_exercise_id": 5,
  "user_id": 1,
  "weight_kg": 50,
  "repetitions": 10,
  "sets_count": 3,
  "time_minutes": null,
  "distance_km": null,
  "calories": null,
  "created_at": "2026-02-02T10:00:00",
  "updated_at": "2026-02-02T10:00:00"
}
```

### 2️⃣ Sessions suivantes : Récupérer les objectifs précédents

Pour les sessions suivantes, récupérez les objectifs de la dernière session.

**Endpoint** : `GET /api/performance/goals/{session_exercise_id}`

```json
{
  "id": 1,
  "session_exercise_id": 5,
  "user_id": 1,
  "weight_kg": 50,
  "repetitions": 10,
  "sets_count": 3,
  ...
}
```

Vous pouvez optionnellement permettre à l'utilisateur de modifier ces objectifs avec :

**Endpoint** : `PUT /api/performance/goals/{goal_id}`

```json
{
  "weight_kg": 55,
  "repetitions": 12
}
```

### 3️⃣ Enregistrer les résultats réels

Après que l'utilisateur ait complété un exercice, enregistrez ce qu'il a réellement réalisé.

**Endpoint** : `POST /api/performance/results`

```json
{
  "session_exercise_id": 5,
  "goal_id": 1,
  "weight_kg": 50,
  "repetitions": 10,
  "sets_completed": 3,
  "time_minutes": null,
  "distance_km": null,
  "calories": null,
  "notes": "Felt strong, could have done more"
}
```

Le système **calcule automatiquement** si les objectifs ont été atteints :
- ✅ L'utilisateur a réalisé ou dépassé tous ses objectifs → `achieved: true`
- ❌ Sinon → `achieved: false`

**Réponse** :
```json
{
  "id": 1,
  "session_exercise_id": 5,
  "user_id": 1,
  "goal_id": 1,
  "weight_kg": 50,
  "repetitions": 10,
  "sets_completed": 3,
  "goal_weight_kg": 50,
  "goal_repetitions": 10,
  "goal_sets_count": 3,
  "achieved": true,
  "notes": "Felt strong, could have done more",
  "created_at": "2026-02-02T10:30:00"
}
```

### 4️⃣ Afficher les résultats précédents

Pour afficher à l'utilisateur ses performances précédentes :

**Endpoint** : `GET /api/performance/results/session-exercise/{session_exercise_id}?limit=50`

```json
[
  {
    "id": 1,
    "session_exercise_id": 5,
    "weight_kg": 50,
    "repetitions": 10,
    "sets_completed": 3,
    "achieved": true,
    "created_at": "2026-02-02T10:30:00"
  },
  {
    "id": 2,
    "session_exercise_id": 5,
    "weight_kg": 48,
    "repetitions": 9,
    "sets_completed": 3,
    "achieved": false,
    "created_at": "2026-01-30T10:00:00"
  }
]
```

---

## 📊 Historique et Statistiques

### Vue détaillée d'un exercice

**Endpoint** : `GET /api/performance/history/{exercise_id}?days=90`

Retourne les statistiques complètes pour un exercice sur les 90 derniers jours :

```json
{
  "exercise_id": 3,
  "exercise_name": "Développé couché",
  "total_sessions": 12,
  "goals_achieved": 10,
  "average_weight_kg": 52.5,
  "average_reps": 9,
  "max_weight_kg": 60,
  "max_reps": 12,
  "personal_best": {
    "date": "2026-02-01T10:00:00",
    "weight_kg": 60,
    "repetitions": 12,
    "sets": 4,
    "time_minutes": null,
    "distance_km": null,
    "calories": null
  },
  "recent_results": [
    { "id": 12, "weight_kg": 55, "repetitions": 10, "achieved": true, ... },
    { "id": 11, "weight_kg": 55, "repetitions": 9, "achieved": false, ... },
    ...
  ]
}
```

**Paramètres** :
- `exercise_id` : ID de l'exercice
- `days` : Nombre de jours à considérer (1-365, défaut: 90)

### Vue d'ensemble de tous les exercices

Pour un dashboard complet de la progression :

**Endpoint** : `GET /api/performance/user-stats?limit=20&days=90`

Retourne les stats pour les 20 derniers exercices réalisés :

```json
[
  {
    "exercise_id": 3,
    "exercise_name": "Développé couché",
    "total_sessions": 12,
    "goals_achieved": 10,
    "average_weight_kg": 52.5,
    "max_weight_kg": 60,
    "recent_results": [...]
  },
  {
    "exercise_id": 5,
    "exercise_name": "Squat",
    "total_sessions": 11,
    "goals_achieved": 8,
    "average_weight_kg": 80.5,
    "max_weight_kg": 100,
    "recent_results": [...]
  }
]
```

---

## ⏱️ Minuteurs de repos

### Obtenir le temps de repos pour un exercice

**Endpoint** : `POST /api/performance/rest-timer`

```json
{
  "session_exercise_id": 5,
  "between_sets": true
}
```

**Réponse** :
```json
{
  "session_exercise_id": 5,
  "rest_duration_seconds": 60,
  "between_sets": true,
  "message": "Rest 1.0 minutes between sets"
}
```

**Paramètres** :
- `session_exercise_id` : ID du session_exercise
- `between_sets` : 
  - `true` pour repos entre les séries
  - `false` pour repos après l'exercice

### Obtenir le planning complet de repos d'une session

**Endpoint** : `GET /api/performance/session-rest-schedule/{session_id}`

```json
{
  "session_id": 10,
  "exercises": [
    {
      "id": 5,
      "exercise_id": 3,
      "rest_between_sets_minutes": 1.0,
      "rest_after_exercise_minutes": 2.0
    },
    {
      "id": 6,
      "exercise_id": 5,
      "rest_between_sets_minutes": 1.5,
      "rest_after_exercise_minutes": 3.0
    }
  ],
  "total_rest_minutes": 11.5
}
```

### Implémentation frontend du minuteur

```javascript
async function startRestTimer(sessionExerciseId, betweenSets = false) {
  // Obtenir la durée du repos
  const response = await fetch('/api/performance/rest-timer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_exercise_id: sessionExerciseId,
      between_sets: betweenSets
    })
  });
  
  const data = await response.json();
  const restSeconds = data.rest_duration_seconds;
  let remaining = restSeconds;
  
  // Afficher le minuteur
  const timer = document.getElementById('timer');
  timer.textContent = formatTime(remaining);
  
  const interval = setInterval(() => {
    remaining--;
    timer.textContent = formatTime(remaining);
    
    if (remaining <= 0) {
      clearInterval(interval);
      // Notifier que le repos est terminé
      showNotification(`C'est parti! ${betweenSets ? 'Série' : 'Exercice'} suivant!`);
      playSound('ding.mp3');
    }
  }, 1000);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

## 📝 Performance globale de session

Après une session complète, enregistrez la performance globale :

**Endpoint** : `POST /api/performance/performance`

```json
{
  "session_id": 10,
  "total_duration_minutes": 45,
  "exercises_completed": 5,
  "exercises_planned": 5,
  "goals_achieved": 4,
  "notes": "Great session, could have pushed harder on leg press"
}
```

**Réponse** :
```json
{
  "id": 1,
  "session_id": 10,
  "user_id": 1,
  "total_duration_minutes": 45,
  "exercises_completed": 5,
  "exercises_planned": 5,
  "goals_achieved": 4,
  "created_at": "2026-02-02T11:00:00"
}
```

Récupérer la performance d'une session :

**Endpoint** : `GET /api/performance/performance/session/{session_id}`

---

## 🔄 Cas d'usage complet

### Scénario : Première fois que l'utilisateur fait une session

1. **Avant de commencer** : Utilisateur configure les objectifs
   - Appel `POST /api/performance/goals` pour chaque exercice

2. **Pour chaque exercice** :
   - Utilisateur voit l'objectif
   - Complète l'exercice
   - Appel `POST /api/performance/results` avec les vraies performances
   
3. **Entre les exercices** :
   - Appel `POST /api/performance/rest-timer` pour afficher le minuteur

4. **Fin de session** :
   - Appel `POST /api/performance/performance` pour enregistrer la vue d'ensemble

### Scénario : Sessions suivantes

1. **Configuration** :
   - Appel `GET /api/performance/goals/{session_exercise_id}` pour avoir les anciens objectifs
   - Optionnellement : `PUT /api/performance/goals/{goal_id}` pour les modifier

2. **Réalisation** :
   - Même flux que première fois (étapes 2-4 ci-dessus)

3. **Visualisation de progression** :
   - Appel `GET /api/performance/history/{exercise_id}` pour voir les stats
   - Appel `GET /api/performance/user-stats` pour un dashboard complet

---

## 🎨 Recommandations Frontend

### Page de session en cours
- Afficher l'objectif actuel
- Bouton pour enregistrer le résultat
- Minuteur automatique qui se lance après l'enregistrement
- Affichage des 3 dernières tentatives

### Page d'historique
- Graphique avec évolution du poids/reps pour chaque exercice
- Taux d'atteinte des objectifs (%)
- Record personnel par exercice
- Statistiques moyennes

### Dashboard
- Liste des exercices avec progression récente
- Tendances (en hausse/baisse)
- Total de sessions complétées
- Taux de réussite global

---

## ⚠️ Notes importantes

1. **Validation des objectifs** : Le système accepte les objectifs partiels (ex: seulement poids, pas de reps)
2. **Calcul de succès** : Un exercice est réussi si l'utilisateur **atteint OU dépasse** tous les objectifs définis
3. **Historique** : Limité à 365 jours par défaut (configurable par paramètre)
4. **Minuteurs** : Les durées viennent des données du `SessionExercise`, pas du résultat
5. **Suppression** : Vous pouvez supprimer les résultats et objectifs si nécessaire

---

## 🚀 Prochaines étapes

1. Implémenter l'interface frontend pour la gestion des objectifs
2. Créer des visualisations graphiques pour l'historique
3. Ajouter des notifications/sons quand le minuteur arrive à 0
4. Implémenter un système de "streaks" (séries continues de succès)
5. Ajouter des badges/achievements pour la motivation
