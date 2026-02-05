# 🎯 Cas d'usage pratiques et scénarios complets

## Scénario 1: Utilisateur débutant - Première séance de musculation

### Contexte
- **Utilisateur**: Marie, nouvelle à la gym
- **Date**: Lundi 2 février 2026
- **Objectif**: Commencer le musculation avec une séance standard

### Flux détaillé

#### 1️⃣ Avant la séance - Configuration des objectifs

Marie accède à sa première session "Musculation pour débutants" qui contient:
- Développé couché
- Squat
- Tirage poitrine
- Flexion des bras

Pour chaque exercice, elle définit ses objectifs:

```bash
# Exercice 1: Développé couché
POST /api/performance/goals HTTP/1.1
{
  "session_exercise_id": 1,
  "weight_kg": 20,
  "repetitions": 8,
  "sets_count": 3
}
→ ID créé: goal_1

# Exercice 2: Squat
POST /api/performance/goals HTTP/1.1
{
  "session_exercise_id": 2,
  "weight_kg": 40,
  "repetitions": 10,
  "sets_count": 3
}
→ ID créé: goal_2

# Exercice 3: Tirage poitrine
POST /api/performance/goals HTTP/1.1
{
  "session_exercise_id": 3,
  "weight_kg": 30,
  "repetitions": 12,
  "sets_count": 3
}
→ ID créé: goal_3

# Exercice 4: Flexion des bras
POST /api/performance/goals HTTP/1.1
{
  "session_exercise_id": 4,
  "weight_kg": 15,
  "repetitions": 10,
  "sets_count": 3
}
→ ID créé: goal_4
```

#### 2️⃣ Pendant la séance - Exécution

**Développé couché** (1h 5min):
- Application affiche le goal: "20kg × 8 reps × 3 sets"
- Marie fait ses séries
- Application déclenche minuteur automatique (1 min entre séries, 2 min après)

Marie enregistre le résultat réel:
```
POST /api/performance/results HTTP/1.1
{
  "session_exercise_id": 1,
  "goal_id": 1,
  "weight_kg": 20,
  "repetitions": 8,
  "sets_completed": 3,
  "notes": "Difficile! But felt good"
}
→ Response: { "achieved": true, "message": "🎉 Goal achieved!" }
```

Minuteur de repos se lance: **2 minutes** avant prochain exercice

---

**Squat** (1h 10min):
```
POST /api/performance/results HTTP/1.1
{
  "session_exercise_id": 2,
  "goal_id": 2,
  "weight_kg": 40,
  "repetitions": 10,
  "sets_completed": 3,
  "notes": "Un peu fatiguée"
}
→ Response: { "achieved": true }
```

---

**Tirage poitrine** (1h 15min):
```
POST /api/performance/results HTTP/1.1
{
  "session_exercise_id": 3,
  "goal_id": 3,
  "weight_kg": 28,
  "repetitions": 12,
  "sets_completed": 3,
  "notes": "30kg était trop lourd, j'ai réduit"
}
→ Response: { "achieved": false, "message": "💪 Great effort!" }
```

---

**Flexion des bras** (1h 20min):
```
POST /api/performance/results HTTP/1.1
{
  "session_exercise_id": 4,
  "goal_id": 4,
  "weight_kg": 15,
  "repetitions": 11,
  "sets_completed": 3,
  "notes": "Felt strong on this one!"
}
→ Response: { "achieved": true }
```

#### 3️⃣ Après la séance - Enregistrement final

```
POST /api/performance/performance HTTP/1.1
{
  "session_id": 1,
  "total_duration_minutes": 20,
  "exercises_completed": 4,
  "exercises_planned": 4,
  "goals_achieved": 3,
  "notes": "Great first session! A bit tired but motivated for next time"
}
```

#### 4️⃣ Visualisation des résultats

Marie peut voir:
```
GET /api/performance/history/1?days=90
→ Développé couché stats: 1 session, 1/1 goals (100%), personal best: 20kg×8
```

---

## Scénario 2: Utilisateur intermédiaire - Session répétée après 2 mois

### Contexte
- **Utilisateur**: Marie, 2 mois plus tard
- **Date**: Lundi 2 avril 2026
- **Session**: Même "Musculation pour débutants"

### Flux détaillé

#### 1️⃣ Chargement de la session

Marie appuie sur "Commencer la séance":

```bash
# 1. Récupérer les objectifs précédents
GET /api/performance/goals/1 → goal_1 avec weight_kg: 20
GET /api/performance/goals/2 → goal_2 avec weight_kg: 40
GET /api/performance/goals/3 → goal_3 avec weight_kg: 30
GET /api/performance/goals/4 → goal_4 avec weight_kg: 15
```

Application affiche: **"Ready to crush it? Last goals loaded"**

#### 2️⃣ Marie peut modifier ses objectifs

Elle a progressé! Elle veut augmenter:

```bash
# Mise à jour du goal pour développé couché
PUT /api/performance/goals/1 HTTP/1.1
{
  "weight_kg": 25,  # +5kg!
  "repetitions": 10,  # +2 reps!
  "sets_count": 4   # +1 set!
}
```

Application: "Goals updated! 💪"

Les autres objectifs restent inchangés (20, 40, 30, 15).

#### 3️⃣ Execution avec nouvelle motivation

**Développé couché** - Nouveau goal: 25kg × 10 reps × 4 sets

```
POST /api/performance/results HTTP/1.1
{
  "session_exercise_id": 1,
  "goal_id": 1,
  "weight_kg": 27,  # Dépasse le goal!
  "repetitions": 10,
  "sets_completed": 4,
  "notes": "Feeling strong, progression is real!"
}
→ Response: { "achieved": true }
```

Application: **"🎉 You exceeded your goal! +2kg and maintained reps!"**

---

## Scénario 3: Utilisateur avancé - Analyse de progression

### Contexte
- **Utilisateur**: Pierre, utilisateur depuis 6 mois
- **Exercice**: Squat
- **But**: Analyser sa progression

### Flux

#### 1️⃣ Consultation de l'historique complet

```bash
GET /api/performance/history/5?days=180  # 6 mois
```

**Réponse** :
```json
{
  "exercise_id": 5,
  "exercise_name": "Squat",
  "total_sessions": 28,  # Une séance par semaine!
  "goals_achieved": 24,  # 85% de succès
  "average_weight_kg": 92.5,
  "average_reps": 9.2,
  "max_weight_kg": 110,
  "max_reps": 15,
  "personal_best": {
    "date": "2026-03-30T16:00:00",
    "weight_kg": 110,
    "repetitions": 12,
    "sets": 4
  },
  "recent_results": [
    {
      "id": 280,
      "created_at": "2026-03-30",
      "weight_kg": 110,
      "repetitions": 12,
      "sets_completed": 4,
      "achieved": true
    },
    {
      "id": 279,
      "created_at": "2026-03-23",
      "weight_kg": 100,
      "repetitions": 15,
      "sets_completed": 4,
      "achieved": true
    },
    // ... 8 plus
  ]
}
```

#### 2️⃣ Analyse personnelle de Pierre

"Wow! Mon personal best est 110kg × 12 reps. J'ai progressé de 20kg en 6 mois! 
Mon taux de succès est 85% - pas mal! Je dois me focaliser sur les 4 dernières semaines où j'ai échoué 3 objectifs..."

#### 3️⃣ Consultation du dashboard global

```bash
GET /api/performance/user-stats?limit=10&days=180
```

Voir tous les exercices avec progression:
- Squat: +20kg (best progression! 🏆)
- Développé couché: +8kg
- Tirage poitrine: +5kg
- Flexion des bras: +3kg (stagnant)

Pierre décide de travailler plus sur la flexion des bras.

---

## Scénario 4: Coach utilisant le système

### Contexte
- **Utilisateur**: Coach Jean
- **Buts**: Suivre ses 5 clients

### Flux

Coach Jean peut consulter la progression de ses clients:

```bash
# Pour client 1 (Alice)
GET /api/performance/user-stats?limit=20&days=30
→ Voir si elle a vu une progression ce mois-ci

# Analyser un exercice spécifique pour Alice
GET /api/performance/history/3?days=30
→ "Développé couché: 4 sessions, 100% success rate, avg 50kg"

# Voir sa session spécifique
GET /api/performance/performance/session/42
→ "50min, 5/5 exercices, 4/5 objectifs achieved"
```

**Observations du coach** :
- Alice progresse bien sur le développé couché (100% success)
- Mais elle a échoué 1 objectif - probablement les jambes
- Prochaines recommandations: Focus sur les jambes

---

## Scénario 5: Intégration avec minuteur

### Contexte
- **Utilisateur**: Marc
- **Situation**: En pleine session

### Flux

#### 1️⃣ Marc termine un exercice

```bash
POST /api/performance/results HTTP/1.1
{
  "session_exercise_id": 3,
  "weight_kg": 80,
  "repetitions": 8,
  "sets_completed": 3
}
→ "achieved": true
```

#### 2️⃣ Application démarre automatiquement le minuteur

```bash
POST /api/performance/rest-timer HTTP/1.1
{
  "session_exercise_id": 4,  # Prochain exercice
  "between_sets": false
}
→ "rest_duration_seconds": 120  # 2 minutes
```

#### 3️⃣ Minuteur affichage dans l'interface

```
┌─────────────────────┐
│     REST TIME       │
│      02:00          │
│  ████████░░░░░░░░   │  (50% complete)
│  Ready for next?    │
└─────────────────────┘
```

#### 4️⃣ Minuteur expire

```
🔔 DING DING DING!
"Rest complete! Time for Leg Press"
```

Application affiche automatiquement le prochain exercice avec son objectif.

---

## Scénario 6: Récupération après déplacement

### Contexte
- **Utilisateur**: Sophie
- **Situation**: Revenait en vacances, n'a pas pu faire sa séance habituelle (1 semaine)

### Flux

#### 1️⃣ Sophie reprend sa séance

Elle voit les anciens objectifs:
```
Développé couché: 45kg × 10 × 3
Squat: 65kg × 12 × 3
```

Application: "1 week without training - take it easy! 💪"

#### 2️⃣ Elle réduit volontairement ses objectifs

```bash
PUT /api/performance/goals/1
{
  "weight_kg": 40,  # Réduit de 5kg
  "repetitions": 8,  # Réduit de 2
  "sets_count": 2   # Réduit d'1
}
```

#### 3️⃣ Elle complète les exercices à son rythme

Et tout est à "achieved" car elle a adapté ses objectifs. 

**Résultat**: Motivation maintenue, pas de déception.

---

## Scénario 7: Analyse de stagnation

### Contexte
- **Utilisateur**: Luc
- **Problème**: Pas de progression sur le bench press depuis 6 semaines

### Flux

#### 1️⃣ Luc consulte son historique

```bash
GET /api/performance/history/2?days=42  # 6 semaines
```

```json
{
  "exercise_name": "Bench Press",
  "total_sessions": 6,
  "goals_achieved": 4,  // 67%
  "max_weight_kg": 90,
  "average_weight_kg": 87.5,  // Pmax 3 semaines en arrière!
  "recent_results": [
    { "date": "2026-01-30", "weight_kg": 85, "achieved": false },
    { "date": "2026-01-23", "weight_kg": 90, "achieved": true },
    { "date": "2026-01-16", "weight_kg": 88, "achieved": false },
    { "date": "2026-01-09", "weight_kg": 90, "achieved": true },
  ]
}
```

#### 2️⃣ Analyse

"Je vois que j'ai atteint 90kg il y a 3 semaines, mais depuis je stagne à 85-88kg et j'échoue plus souvent. 
Je dois probablement chercher du repos et de la nutrition."

Application recommande: "Consider deloading week or consulting your coach"

#### 3️⃣ Prochaines actions

Luc décide de réduire ses objectifs pour la semaine:
```
Objectif: 80kg × 10 × 3 (au lieu de 90 × 8 × 4)
```

Prochaine session, il devrait réussir et regagner de la motivation.

---

## Cas d'usage spéciaux

### ✅ Exercices basés sur le temps (course, vélo)
```bash
POST /api/performance/results
{
  "session_exercise_id": 10,
  "time_minutes": 45,
  "distance_km": 10,
  "calories": 500
}
```

### ✅ Exercices isométriques (planche)
```bash
POST /api/performance/results
{
  "session_exercise_id": 15,
  "time_minutes": 3.5,  # 3:30 minutes
  "notes": "Held position well"
}
```

### ✅ Exercices au poids du corps
```bash
POST /api/performance/results
{
  "session_exercise_id": 20,
  "repetitions": 25,  # 25 pompes
  "sets_completed": 3
}
```

---

## Conclusion

Ce système offre une flexibilité complète pour :
- 🎯 Débutants : Fixer des objectifs réalistes et suivre la progression
- 💪 Intermédiaires : Analyser et adapter les objectifs
- 🏆 Avancés : Optimiser chaque détail et éviter les plateaus
- 👥 Coaches : Suivre multiple clients efficacement

Le calcul automatique du succès et l'historique complet permettent une analyse réaliste de la progression sans déception.
