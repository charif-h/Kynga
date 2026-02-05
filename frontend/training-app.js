const API_URL = 'http://localhost:8000/api';
let currentToken = localStorage.getItem('token');
let currentUserId = localStorage.getItem('userId');
let currentSession = null;
let currentExerciseIndex = 0;
let timerInterval = null;

// ======================== Navigation ========================
function goToDashboard() {
    document.getElementById('dashboard').style.display = '';
    document.getElementById('startSessionPage').style.display = 'none';
    document.getElementById('inSessionPage').style.display = 'none';
    document.getElementById('statsPage').style.display = 'none';
    document.getElementById('historyPage').style.display = 'none';
}

function goToStartSession() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('startSessionPage').style.display = '';
    loadSessions();
}

function goToStats() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('statsPage').style.display = '';
    loadStats();
}

function goToHistory() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('historyPage').style.display = '';
    loadExercises();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = 'index.html';
}

// ======================== Auth Check ========================
async function checkAuth() {
    console.log('🔍 Checking auth...');
    console.log('Token:', currentToken ? 'Present' : 'Missing');
    console.log('UserId:', currentUserId);
    
    if (!currentToken) {
        console.log('❌ No token, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    // Get user ID if not in localStorage
    if (!currentUserId) {
        console.log('📡 Fetching user info...');
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            console.log('Response status:', response.status);
            
            if (response.ok) {
                const user = await response.json();
                console.log('✅ User loaded:', user);
                currentUserId = user.id;
                localStorage.setItem('userId', user.id);
                updateUsername(user);
            } else {
                console.log('❌ Auth failed, redirecting...');
                const errorText = await response.text();
                console.log('Error:', errorText);
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                window.location.href = 'index.html';
                return;
            }
        } catch (error) {
            console.error('❌ Auth error:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            window.location.href = 'index.html';
            return;
        }
    } else {
        console.log('✅ Auth OK');
        updateUsername();
    }
}

async function updateUsername(userData = null) {
    try {
        if (userData) {
            document.getElementById('username').textContent = `Bienvenue, ${userData.email}`;
            return;
        }
        
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            const user = await response.json();
            document.getElementById('username').textContent = `Bienvenue, ${user.email}`;
        }
    } catch (error) {
        console.error('Erreur updateUsername:', error);
    }
}

// ======================== Sessions ========================
async function loadSessions() {
    try {
        const response = await fetch(`${API_URL}/sessions`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            const sessions = await response.json();
            const select = document.getElementById('sessionSelect');
            select.innerHTML = '<option value="">-- Sélectionner une session --</option>';
            sessions.forEach(session => {
                const option = document.createElement('option');
                option.value = session.id;
                option.textContent = session.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des sessions:', error);
        alert('Erreur lors du chargement des sessions');
    }
}

async function loadSession() {
    const sessionId = document.getElementById('sessionSelect').value;
    if (!sessionId) return;

    try {
        const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            const session = await response.json();
            currentSession = session;
            displaySessionExercises(session);
            document.getElementById('startBtn').style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement de la session');
    }
}

function displaySessionExercises(session) {
    const container = document.getElementById('sessionExercises');
    container.innerHTML = '<h5>Exercices inclus:</h5>';
    
    if (session.exercises && session.exercises.length > 0) {
        session.exercises.forEach((exercise, index) => {
            container.innerHTML += `
                <div class="exercise-card">
                    <strong>${index + 1}. ${exercise.name}</strong>
                    <p class="text-muted mb-2">${exercise.description || 'Aucune description'}</p>
                    <small>
                        Durée cible: <strong>${exercise.target_duration || '--'}</strong> | 
                        Répétitions: <strong>${exercise.target_reps || '--'}</strong> | 
                        Série: <strong>${exercise.target_sets || '--'}</strong>
                    </small>
                </div>
            `;
        });
    } else {
        container.innerHTML += '<p class="text-muted">Aucun exercice dans cette session</p>';
    }
}

async function startSession() {
    if (!currentSession) return;

    try {
        const response = await fetch(`${API_URL}/sessions/${currentSession.id}/start`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: currentUserId })
        });

        if (response.ok) {
            const sessionPerf = await response.json();
            currentExerciseIndex = 0;
            showNextExercise();
            document.getElementById('startSessionPage').style.display = 'none';
            document.getElementById('inSessionPage').style.display = '';
        } else {
            alert('Erreur au démarrage de la session');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur au démarrage de la session');
    }
}

function showNextExercise() {
    if (currentExerciseIndex >= currentSession.exercises.length) {
        showSessionComplete();
        return;
    }

    const exercise = currentSession.exercises[currentExerciseIndex];
    document.getElementById('sessionTitle').textContent = `${currentSession.name} - Exercice ${currentExerciseIndex + 1}/${currentSession.exercises.length}`;

    let goalInfo = '';
    if (exercise.target_reps || exercise.target_sets || exercise.target_duration) {
        goalInfo = `
            <p class="progress-status">
                🎯 Objectif: 
                ${exercise.target_reps ? `${exercise.target_reps} reps` : ''} 
                ${exercise.target_sets ? `x ${exercise.target_sets} séries` : ''} 
                ${exercise.target_duration ? `en ${exercise.target_duration}` : ''}
            </p>
        `;
    }

    document.getElementById('currentExerciseInfo').innerHTML = `
        <h4>${exercise.name}</h4>
        <p>${exercise.description || ''}</p>
        ${goalInfo}
    `;

    // Clear form
    document.getElementById('resultWeight').value = '';
    document.getElementById('resultReps').value = '';
    document.getElementById('resultSets').value = '';
    document.getElementById('resultTime').value = '';
    document.getElementById('resultNotes').value = '';
    document.getElementById('timerContainer').style.display = 'none';
}

async function recordResult() {
    if (!currentSession || currentExerciseIndex >= currentSession.exercises.length) {
        alert('Session invalide');
        return;
    }

    const exercise = currentSession.exercises[currentExerciseIndex];
    
    const result = {
        session_exercise_id: exercise.id,
        weight: parseFloat(document.getElementById('resultWeight').value) || 0,
        reps: parseInt(document.getElementById('resultReps').value) || 0,
        sets: parseInt(document.getElementById('resultSets').value) || 0,
        duration_seconds: parseInt(document.getElementById('resultTime').value) * 60 || 0,
        notes: document.getElementById('resultNotes').value
    };

    try {
        const response = await fetch(`${API_URL}/performance/results`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result)
        });

        if (response.ok) {
            alert('Performance enregistrée ✓');
            nextExercise();
        } else {
            alert('Erreur lors de l\'enregistrement');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'enregistrement');
    }
}

function nextExercise() {
    currentExerciseIndex++;
    
    if (currentExerciseIndex < currentSession.exercises.length) {
        // Show rest timer
        showRestTimer();
    } else {
        showSessionComplete();
    }
}

function showRestTimer() {
    document.getElementById('timerContainer').style.display = '';
    let timeLeft = 120; // 2 minutes par défaut
    
    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        document.getElementById('timerDisplay').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert('Temps de repos terminé!');
            showNextExercise();
        }
        timeLeft--;
    }

    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function skipTimer() {
    clearInterval(timerInterval);
    showNextExercise();
}

function showSessionComplete() {
    document.getElementById('inSessionPage').style.display = 'none';
    document.getElementById('dashboard').style.display = '';
    alert('🎉 Session terminée! Bravo!');
}

// ======================== Statistics ========================
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/performance/statistics?days=30`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const stats = await response.json();
            displayStats(stats);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function displayStats(stats) {
    let html = '';
    
    if (stats.total_sessions) {
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <h6>Sessions complétées</h6>
                    <h4>${stats.total_sessions}</h4>
                </div>
            </div>
        `;
    }

    if (stats.average_performance) {
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <h6>Performance moyenne</h6>
                    <p>${JSON.stringify(stats.average_performance).substring(0, 100)}...</p>
                </div>
            </div>
        `;
    }

    if (stats.achievements && stats.achievements.length > 0) {
        html += '<div class="card mb-3"><div class="card-body"><h6>Réalisations</h6>';
        stats.achievements.forEach(ach => {
            html += `<p><strong>${ach}</strong></p>`;
        });
        html += '</div></div>';
    }

    document.getElementById('statsContainer').innerHTML = html || '<p class="text-muted">Aucune statistique disponible</p>';
}

// ======================== History ========================
async function loadExercises() {
    try {
        const response = await fetch(`${API_URL}/exercises`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const exercises = await response.json();
            const select = document.getElementById('exerciseSelect');
            select.innerHTML = '<option value="">-- Choisir un exercice --</option>';
            exercises.forEach(exercise => {
                const option = document.createElement('option');
                option.value = exercise.id;
                option.textContent = exercise.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function loadExerciseHistory() {
    const exerciseId = document.getElementById('exerciseSelect').value;
    if (!exerciseId) return;

    try {
        const response = await fetch(`${API_URL}/performance/history/${exerciseId}?days=90`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const history = await response.json();
            displayHistory(history);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function displayHistory(history) {
    let html = '<div class="card">';
    
    if (history.personal_best) {
        html += `
            <div class="card-body border-bottom">
                <h6>🏆 Record personnel</h6>
                <p>${JSON.stringify(history.personal_best)}</p>
            </div>
        `;
    }

    if (history.recent_results && history.recent_results.length > 0) {
        html += '<div class="card-body"><h6>Derniers résultats</h6>';
        history.recent_results.forEach(result => {
            const date = new Date(result.created_at).toLocaleDateString('fr-FR');
            html += `
                <div class="border-bottom py-2">
                    <strong>${date}</strong><br>
                    Poids: ${result.weight}kg | Reps: ${result.reps} | Séries: ${result.sets}
                </div>
            `;
        });
        html += '</div>';
    }

    html += '</div>';
    document.getElementById('historyContainer').innerHTML = html;
}

// ======================== Init ========================
document.addEventListener('DOMContentLoaded', checkAuth);
