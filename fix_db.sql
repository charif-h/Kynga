-- Créer une nouvelle table sans rest_between_sets_minutes
CREATE TABLE session_exercises_new (
    id INTEGER PRIMARY KEY,
    session_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    rest_after_exercise_minutes REAL NOT NULL DEFAULT 2.0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);

-- Copier les données de l'ancienne table
INSERT INTO session_exercises_new (id, session_id, exercise_id, order_index, rest_after_exercise_minutes, notes, created_at)
SELECT id, session_id, exercise_id, order_index, rest_after_exercise_minutes, notes, created_at
FROM session_exercises;

-- Supprimer l'ancienne table
DROP TABLE session_exercises;

-- Renommer la nouvelle table
ALTER TABLE session_exercises_new RENAME TO session_exercises;

-- Recréer les index
CREATE INDEX idx_session_exercises_session_id ON session_exercises(session_id);
CREATE INDEX idx_session_exercises_exercise_id ON session_exercises(exercise_id);
