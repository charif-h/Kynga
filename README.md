# Kynga - Sports Management API

A comprehensive sports management application where users can manage exercises and create personalized workout sessions.

## Features

### User Management
- User registration and authentication
- Secure login with JWT tokens

### Exercise Management
- **Public Exercise Library**: All exercises are visible to all users
- Each exercise includes:
  - Name
  - Description
  - Images or videos explaining the exercise
  - Set of affected muscles
  - Group category (binding, musculation, yoga, etc.)
  - Needed accessories
  - Movement type (static vs. repeated movement)

### Session Management
- Users can create personalized workout sessions
- Each session can contain multiple exercises
- For each exercise in a session, users can set objectives:
  - Weight (kg)
  - Calories
  - Time (minutes)
  - Repetitions
- Users can only manage their own sessions

## Installation

1. Clone the repository:
```bash
git clone https://github.com/charif-h/Kynga.git
cd Kynga
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables (optional):
```bash
cp .env.example .env
# Edit .env file to set your SECRET_KEY and other configurations
```

4. Run the application:
```bash
python -m app.main
```

The API will be available at `http://localhost:8000`

## Configuration

The application can be configured using environment variables:

- `SECRET_KEY`: Secret key for JWT token signing (required in production)
- `DATABASE_URL`: Database connection URL (default: `sqlite:///./kynga.db`)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (default: `*`)

**Important for Production:**
- Set a strong, random `SECRET_KEY` using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- Configure specific `ALLOWED_ORIGINS` instead of using `*`
- Use a production-grade database (PostgreSQL, MySQL) instead of SQLite

## API Documentation

Once the application is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token
- `GET /api/auth/me` - Get current user information

### Exercises (Public viewing, authentication required for modifications)
- `GET /api/exercises/` - Get all exercises (public)
- `GET /api/exercises/{id}` - Get specific exercise (public)
- `POST /api/exercises/` - Create new exercise (authenticated)
- `PUT /api/exercises/{id}` - Update exercise (authenticated)
- `DELETE /api/exercises/{id}` - Delete exercise (authenticated)

### Sessions (All require authentication)
- `GET /api/sessions/` - Get user's sessions
- `GET /api/sessions/{id}` - Get specific session
- `POST /api/sessions/` - Create new session
- `PUT /api/sessions/{id}` - Update session
- `DELETE /api/sessions/{id}` - Delete session
- `POST /api/sessions/{id}/exercises` - Add exercise to session
- `PUT /api/sessions/{id}/exercises/{exercise_id}` - Update exercise objectives
- `DELETE /api/sessions/{id}/exercises/{exercise_id}` - Remove exercise from session

## Usage Examples

### 1. Register a User
```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "secure123"
  }'
```

### 2. Login
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "secure123"
  }'
```

### 3. Create an Exercise
```bash
curl -X POST "http://localhost:8000/api/exercises/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Push-ups",
    "description": "Classic bodyweight exercise",
    "group": "musculation",
    "is_static": false,
    "affected_muscles": ["chest", "triceps", "shoulders"],
    "needed_accessories": []
  }'
```

### 4. Create a Session with Exercises
```bash
curl -X POST "http://localhost:8000/api/sessions/" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning Workout",
    "description": "Daily morning routine",
    "exercises": [
      {
        "exercise_id": 1,
        "repetitions": 20,
        "time_minutes": 5
      }
    ]
  }'
```

## Database

The application uses SQLite as the database, which is created automatically on first run as `kynga.db`.

## Technology Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **Pydantic**: Data validation using Python type annotations
- **JWT**: Secure token-based authentication
- **SQLite**: Lightweight database

## License

MIT License
