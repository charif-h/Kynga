# 🛠️ Instructions d'installation et configuration

## ✅ Prérequis

- Python 3.9+
- pip (gestionnaire de paquets Python)
- Base de données (SQLite par défaut, PostgreSQL recommandé pour prod)
- Code éditeur (VS Code, PyCharm, etc)

---

## 📦 Installation des dépendances

### 1. Créer un environnement virtuel

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# MacOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 2. Installer les paquets

```bash
# Les dépendances principales (déjà dans requirements.txt)
pip install fastapi
pip install sqlalchemy
pip install pydantic
pip install python-jose[cryptography]
pip install python-multipart
pip install uvicorn
pip install passlib[bcrypt]
pip install email-validator

# Pour les tests
pip install pytest
pip install pytest-cov

# Pour le développement
pip install black
pip install flake8
pip install mypy
```

### 3. Ou installer depuis requirements.txt

```bash
# Si requirements.txt existe
pip install -r requirements.txt
```

---

## 🗄️ Configuration base de données

### Par défaut (SQLite)
Aucune configuration requise, utilise `kynga.db`

### PostgreSQL (Recommandé pour production)

1. Installer PostgreSQL:
```bash
# Windows: Télécharger depuis postgresql.org
# MacOS: brew install postgresql
# Linux: sudo apt-get install postgresql
```

2. Créer une base:
```bash
psql postgres
CREATE DATABASE kynga_db;
```

3. Configurer la variable d'environnement:
```bash
export DATABASE_URL="postgresql://username:password@localhost/kynga_db"
```

---

## 🚀 Lancer l'application

### Développement (mode watch)

```bash
uvicorn app.main:app --reload --port 8000
```

Accéder à: `http://localhost:8000`
Documentation automatique: `http://localhost:8000/docs`

### Production

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 🧪 Lancer les tests

```bash
# Tous les tests
pytest test_performance.py -v

# Avec couverture
pytest test_performance.py --cov=app

# Test spécifique
pytest test_performance.py::TestExerciseGoal::test_create_goal -v
```

---

## 🔑 Configuration variables d'environnement

Créer un fichier `.env`:

```bash
# Base de données
DATABASE_URL=sqlite:///./kynga.db
# ou PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost/kynga

# Sécurité
SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Application
DEBUG=True  # False en production
```

---

## ✅ Vérifier l'installation

### 1. Tester l'API

```bash
# Vérifier que le serveur répond
curl http://localhost:8000/api/test

# Résultat attendu:
# {"message": "Test endpoint working"}
```

### 2. Vérifier les modèles

```python
# Dans Python interactive
from app.models import ExerciseGoal, ExerciseResult, SessionPerformance
print("✅ Modèles importés avec succès")
```

### 3. Vérifier les endpoints

Via Swagger UI: `http://localhost:8000/docs`

Vous devriez voir:
- ✅ `/api/performance/goals/*` (4 endpoints)
- ✅ `/api/performance/results/*` (4 endpoints)
- ✅ `/api/performance/performance/*` (2 endpoints)
- ✅ `/api/performance/history/*` (2 endpoints)
- ✅ `/api/performance/rest-timer` (1 endpoint)

---

## 🔍 Troubleshooting

### "ModuleNotFoundError: No module named 'fastapi'"
→ Installer dépendances: `pip install -r requirements.txt`

### "Impossible de se connecter à la base"
→ Vérifier `DATABASE_URL` dans `.env`

### "Port 8000 déjà en utilisation"
→ Lancer sur un autre port: `uvicorn app.main:app --port 8001`

### "Erreur JWT"
→ Vérifier `SECRET_KEY` est définie

### Tests échouent
→ S'assurer que pytest est installé: `pip install pytest`

---

## 🎯 Checklist d'installation

- [ ] Python 3.9+ installé
- [ ] Environnement virtuel créé
- [ ] Dépendances installées
- [ ] `.env` configuré
- [ ] Base de données créée
- [ ] Serveur démarre sans erreur
- [ ] Endpoints accessibles via Swagger UI
- [ ] Tests passent
- [ ] Vous pouvez faire une requête API

---

## 📝 Exemples de commandes complètes

### Setup complète (Windows)

```bash
# 1. Créer environnement
python -m venv venv
venv\Scripts\activate

# 2. Installer dépendances
pip install fastapi sqlalchemy pydantic uvicorn passlib python-jose email-validator

# 3. Créer .env
echo DATABASE_URL=sqlite:///./kynga.db > .env
echo SECRET_KEY=dev-secret-key >> .env

# 4. Lancer serveur
uvicorn app.main:app --reload

# 5. Tester
curl http://localhost:8000/api/test
```

### Setup complète (MacOS/Linux)

```bash
# 1. Créer environnement
python3 -m venv venv
source venv/bin/activate

# 2. Installer dépendances
pip install -r requirements.txt

# 3. Créer .env
cat > .env << EOF
DATABASE_URL=sqlite:///./kynga.db
SECRET_KEY=dev-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
DEBUG=True
EOF

# 4. Lancer serveur
uvicorn app.main:app --reload

# 5. Tester
curl http://localhost:8000/api/test
```

---

## 📚 Ressources utiles

- FastAPI: https://fastapi.tiangolo.com
- SQLAlchemy: https://docs.sqlalchemy.org
- Pydantic: https://docs.pydantic.dev
- Python-jose: https://python-jose.readthedocs.io

---

## 🎓 Prochaines étapes

1. ✅ Installation complète
2. ✅ Tests unitaires passent
3. ⏳ Commencer le développement frontend
4. ⏳ Intégrer frontend avec API
5. ⏳ Tester flux complet
6. ⏳ Déployer en production

---

## 🆘 Support

Si vous rencontrez un problème:

1. Vérifier que toutes les dépendances sont installées
2. Consulter les logs de la console
3. Vérifier les fichiers `.env`
4. Lancer les tests: `pytest -v`
5. Consulter la documentation dans `WORKFLOW_GUIDE.md`

---

## ✨ C'est prêt!

Une fois l'installation terminée, vous pouvez:

```
✅ Consulter la doc Swagger: http://localhost:8000/docs
✅ Créer des objectifs: POST /api/performance/goals
✅ Enregistrer des résultats: POST /api/performance/results
✅ Voir les stats: GET /api/performance/history/{id}
✅ Tester les minuteurs: POST /api/performance/rest-timer
```

**Bon développement! 🚀**
