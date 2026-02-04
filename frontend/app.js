// API Configuration
const API_URL = 'http://localhost:8000/api';
let token = localStorage.getItem('token');
let currentUser = null;
let exercises = [];
let sessions = [];
let programs = [];
let isLoginMode = true;
let editingExerciseId = null;
let editingSessionId = null;
let editingProgramId = null;
let currentProgramId = null;
let currentExerciseMedia = [];
let currentExerciseMediaFiles = []; // Store actual file objects
let currentSets = [];
let addingExerciseToSession = null;

// DOM Elements
const authModal = document.getElementById('authModal');
const app = document.getElementById('app');
const authForm = document.getElementById('authForm');
const toggleAuth = document.getElementById('toggleAuth');
const exerciseModal = document.getElementById('exerciseModal');
const sessionModal = document.getElementById('sessionModal');
const setFormModal = document.getElementById('setFormModal');
const programModal = document.getElementById('programModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    token = normalizeToken(token);
    if (token) {
        verifyToken();
    } else {
        showAuth();
    }
    setupEventListeners();
});

function normalizeToken(value) {
    if (!value || value === 'null' || value === 'undefined') {
        localStorage.removeItem('token');
        return null;
    }
    return value;
}

function getToken() {
    return token;
}

// Setup Event Listeners
function setupEventListeners() {
    // Auth toggle
    toggleAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateAuthForm();
    });

    // Auth form submit
    authForm.addEventListener('submit', handleAuth);

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target.classList.contains('logout-btn')) {
                logout();
            } else {
                const page = e.target.dataset.page;
                switchPage(page);
            }
        });
    });

    // Add Exercise Button
    document.getElementById('addExerciseBtn').addEventListener('click', () => {
        editingExerciseId = null;
        currentExerciseMedia = [];
        openExerciseModal();
    });

    // Upload media button
    document.getElementById('uploadMediaBtn').addEventListener('click', uploadExerciseMedia);

    // Add Session Button
    document.getElementById('addSessionBtn').addEventListener('click', () => {
        editingSessionId = null;
        openSessionModal();
    });

    // Add Program Button
    document.getElementById('addProgramBtn').addEventListener('click', () => {
        editingProgramId = null;
        openProgramModal();
    });

    // Exercise Form Submit
    document.getElementById('exerciseForm').addEventListener('submit', handleExerciseSubmit);

    // Session Form Submit
    document.getElementById('sessionForm').addEventListener('submit', handleSessionSubmit);

    // Program Form Submit
    document.getElementById('programForm').addEventListener('submit', handleProgramSubmit);

    // Close modals
    document.querySelectorAll('.close, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Search and Filter
    document.getElementById('searchExercises').addEventListener('input', filterExercises);
    document.getElementById('categoryFilter').addEventListener('change', filterExercises);

    // Add exercise to session
    document.getElementById('addExerciseToSession').addEventListener('click', addExerciseToSessionForm);
    
    // Add session to program
    document.getElementById('addSessionToProgram').addEventListener('click', addSessionToProgramForm);

    // Back to programs
    const backToPrograms = document.getElementById('backToPrograms');
    if (backToPrograms) {
        backToPrograms.addEventListener('click', () => switchPage('programs'));
    }

    // Start session from program page
    const startProgramSessionBtn = document.getElementById('startProgramSession');
    if (startProgramSessionBtn) {
        startProgramSessionBtn.addEventListener('click', startProgramSession);
    }

    const exitRunnerBtn = document.getElementById('exitRunner');
    if (exitRunnerBtn) {
        exitRunnerBtn.addEventListener('click', closeProgramSessionRunner);
    }

    const runnerValidateBtn = document.getElementById('runnerValidateGoal');
    if (runnerValidateBtn) {
        runnerValidateBtn.addEventListener('click', () => submitProgramSessionResult(true));
    }

    const runnerSaveBtn = document.getElementById('runnerSaveActual');
    if (runnerSaveBtn) {
        runnerSaveBtn.addEventListener('click', () => submitProgramSessionResult(false));
    }

    const runnerSkipRestBtn = document.getElementById('runnerSkipRest');
    if (runnerSkipRestBtn) {
        runnerSkipRestBtn.addEventListener('click', skipRestAndNextExercise);
    }

    const runnerAddRestBtn = document.getElementById('runnerAddRest');
    if (runnerAddRestBtn) {
        runnerAddRestBtn.addEventListener('click', () => addRestSeconds(15));
    }

    const runnerRemoveRestBtn = document.getElementById('runnerRemoveRest');
    if (runnerRemoveRestBtn) {
        runnerRemoveRestBtn.addEventListener('click', () => addRestSeconds(-15));
    }
    
    const addSetBtn = document.getElementById('addSetBtn');
    if (addSetBtn) {
        addSetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addSetToUI();
        });
    }
    const setExerciseSelect = document.getElementById('setExerciseSelect');
    if (setExerciseSelect) {
        setExerciseSelect.addEventListener('change', updateSelectedExerciseFromModal);
    }
}

// Auth Functions
function updateAuthForm() {
    const authTitle = document.getElementById('authTitle');
    const authSubmit = document.getElementById('authSubmit');
    const toggleText = document.getElementById('toggleText');
    const nameField = document.getElementById('nameField');

    if (isLoginMode) {
        authTitle.textContent = 'Connexion';
        authSubmit.textContent = 'Se connecter';
        toggleText.textContent = "Pas encore de compte ?";
        toggleAuth.textContent = "S'inscrire";
        nameField.style.display = 'none';
    } else {
        authTitle.textContent = 'Inscription';
        authSubmit.textContent = "S'inscrire";
        toggleText.textContent = "Déjà un compte ?";
        toggleAuth.textContent = "Se connecter";
        nameField.style.display = 'block';
    }
}

async function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value;

    try {
        if (isLoginMode) {
            await login(email, password);
        } else {
            await register(email, password, name);
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        alert('Erreur: ' + errorMsg);
    }
}

async function register(email, password, name) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, email, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erreur lors de l\'inscription');
        }

        const data = await response.json();
        token = data.access_token;
        localStorage.setItem('token', token);
        
        // Get user info and save userId
        const userResponse = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userResponse.ok) {
            const user = await userResponse.json();
            localStorage.setItem('userId', user.id);
        }
        
        showApp();
    } catch (error) {
        console.error('Register error:', error);
        throw error;
    }
}

async function login(email, password) {
    try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Erreur lors de la connexion');
        }

        const data = await response.json();
        token = data.access_token;
        localStorage.setItem('token', token);
        
        // Get user info and save userId
        const userResponse = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userResponse.ok) {
            const user = await userResponse.json();
            localStorage.setItem('userId', user.id);
        }
        
        showApp();
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

async function verifyToken() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            currentUser = await response.json();
            showApp();
        } else {
            throw new Error('Token invalide');
        }
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        token = null;
        currentUser = null;
        alert('Votre session a expiré. Veuillez vous reconnecter.');
        showAuth();
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    token = null;
    currentUser = null;
    showAuth();
}

function showAuth() {
    authModal.style.display = 'flex';
    app.style.display = 'none';
}

function showApp() {
    authModal.style.display = 'none';
    app.style.display = 'block';
    loadExercises();
    loadSessions();
}

// Navigation
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`${pageName}Page`).classList.add('active');
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    const programDetail = document.getElementById('programSessionDetail');
    if (programDetail) {
        programDetail.style.display = 'none';
    }

    if (pageName === 'exercises') {
        loadExercises();
    } else if (pageName === 'sessions') {
        loadSessions();
    } else if (pageName === 'programs') {
        loadPrograms();
    }
}

// Exercises Functions
async function loadExercises() {
    try {
        const response = await fetch(`${API_URL}/exercises/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            exercises = await response.json();
            displayExercises(exercises);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des exercices:', error);
    }
}

function displayExercises(exercisesToDisplay) {
    const container = document.getElementById('exercisesList');
    
    if (exercisesToDisplay.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Aucun exercice trouvé</h3>
                <p>Commencez par ajouter votre premier exercice !</p>
            </div>
        `;
        return;
    }

    container.innerHTML = exercisesToDisplay.map(exercise => {
        const profileImage = exercise.profile_media_url || exercise.image_url;
        const metrics = [];
        if (exercise.has_time) metrics.push('⏱️ Temps');
        if (exercise.has_repetitions) metrics.push('🔢 Répétitions');
        if (exercise.has_weight) metrics.push('🏋️ Poids');
        if (exercise.has_distance) metrics.push('📏 Distance');
        if (exercise.has_calories) metrics.push('🔥 Calories');
        
        return `
        <div class="card">
            ${profileImage ? `<img src="${profileImage}" alt="${exercise.name}" style="width:100%; height:200px; object-fit:cover; border-radius:5px; margin-bottom:10px;">` : ''}
            <h3>${exercise.name}</h3>
            <p>${exercise.description}</p>
            <div class="card-meta">
                <span class="badge category">${exercise.group}</span>
                <span class="badge">${exercise.is_static ? 'Statique' : 'Mouvement répété'}</span>
            </div>
            ${exercise.affected_muscles && exercise.affected_muscles.length ? `<p><strong>Muscles:</strong> ${exercise.affected_muscles.join(', ')}</p>` : ''}
            ${exercise.needed_accessories && exercise.needed_accessories.length ? `<p><strong>Accessoires:</strong> ${exercise.needed_accessories.join(', ')}</p>` : ''}
            ${metrics.length ? `<p><strong>Métriques:</strong> ${metrics.join(' • ')}</p>` : ''}
            <div class="card-actions">
                <button class="btn-edit" onclick="editExercise(${exercise.id})">Modifier</button>
                <button class="btn-delete" onclick="deleteExercise(${exercise.id})">Supprimer</button>
            </div>
        </div>
        `;
    }).join('');
}

function filterExercises() {
    const searchTerm = document.getElementById('searchExercises').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;

    const filtered = exercises.filter(exercise => {
        const matchesSearch = exercise.name.toLowerCase().includes(searchTerm) || 
                            exercise.description.toLowerCase().includes(searchTerm);
        const matchesCategory = !category || exercise.group === category;
        return matchesSearch && matchesCategory;
    });

    displayExercises(filtered);
}

function openExerciseModal(exercise = null) {
    const modal = document.getElementById('exerciseModal');
    const title = document.getElementById('exerciseModalTitle');
    
    if (exercise) {
        title.textContent = 'Modifier l\'exercice';
        document.getElementById('exerciseName').value = exercise.name;
        document.getElementById('exerciseDescription').value = exercise.description || '';
        document.getElementById('exerciseCategory').value = exercise.group;
        document.getElementById('exerciseMuscles').value = exercise.affected_muscles ? exercise.affected_muscles.join(', ') : '';
        document.getElementById('exerciseAccessories').value = exercise.needed_accessories ? exercise.needed_accessories.join(', ') : '';
        document.getElementById('exerciseMovementType').value = exercise.is_static ? 'static' : 'repeated';
        document.getElementById('exerciseImageUrl').value = exercise.image_url || '';
        document.getElementById('metricTime').checked = exercise.has_time || false;
        document.getElementById('metricRepetitions').checked = exercise.has_repetitions || false;
        document.getElementById('metricWeight').checked = exercise.has_weight || false;
        document.getElementById('metricDistance').checked = exercise.has_distance || false;
        document.getElementById('metricCalories').checked = exercise.has_calories || false;
        currentExerciseMedia = exercise.media || [];
        currentExerciseMediaFiles = []; // Clear file storage when editing existing exercise
    } else {
        title.textContent = 'Ajouter un exercice';
        document.getElementById('exerciseForm').reset();
        // Réinitialiser les métriques
        document.getElementById('metricTime').checked = false;
        document.getElementById('metricRepetitions').checked = false;
        document.getElementById('metricWeight').checked = false;
        document.getElementById('metricDistance').checked = false;
        document.getElementById('metricCalories').checked = false;
        currentExerciseMedia = [];
        currentExerciseMediaFiles = [];
    }
    
    document.getElementById('exerciseMediaUpload').value = '';
    displayExerciseMedia();
    modal.style.display = 'flex';
}

async function handleExerciseSubmit(e) {
    e.preventDefault();
    
    const exerciseData = {
        name: document.getElementById('exerciseName').value,
        description: document.getElementById('exerciseDescription').value || null,
        group: document.getElementById('exerciseCategory').value,
        affected_muscles: document.getElementById('exerciseMuscles').value.split(',').map(m => m.trim()).filter(m => m),
        needed_accessories: document.getElementById('exerciseAccessories').value.split(',').map(a => a.trim()).filter(a => a),
        is_static: document.getElementById('exerciseMovementType').value === 'static',
        image_url: document.getElementById('exerciseImageUrl').value || null,
        has_time: document.getElementById('metricTime').checked,
        has_repetitions: document.getElementById('metricRepetitions').checked,
        has_weight: document.getElementById('metricWeight').checked,
        has_distance: document.getElementById('metricDistance').checked,
        has_calories: document.getElementById('metricCalories').checked
    };

    console.log('Exercice data before submit:', exerciseData);

    try {
        const url = editingExerciseId 
            ? `${API_URL}/exercises/${editingExerciseId}`
            : `${API_URL}/exercises/`;
        
        const method = editingExerciseId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exerciseData)
        });

        if (response.ok) {
            const createdExercise = await response.json();
            console.log('Created exercise response:', createdExercise);
            
            // Upload local media files if creating new exercise
            if (!editingExerciseId && currentExerciseMedia.length > 0) {
                let profileMediaId = null;
                for (const media of currentExerciseMedia) {
                    if (media.isLocal) {
                        // Récupérer le fichier stocké avec le média
                        const fileData = currentExerciseMediaFiles.find(f => f.id === media.id);
                        if (fileData && fileData.file) {
                            const formData = new FormData();
                            formData.append('file', fileData.file);
                            
                            try {
                                const uploadResponse = await fetch(
                                    `${API_URL}/exercises/${createdExercise.id}/media`,
                                    {
                                        method: 'POST',
                                        headers: { 'Authorization': `Bearer ${token}` },
                                        body: formData
                                    }
                                );
                                
                                if (uploadResponse.ok) {
                                    const uploadedMedia = await uploadResponse.json();
                                    console.log('Media uploaded successfully:', uploadedMedia);
                                    // Définir comme image de profil si c'est une image
                                    if (media.media_type === 'image') {
                                        profileMediaId = uploadedMedia.id;
                                    }
                                }
                            } catch (uploadError) {
                                console.error('Erreur upload média:', uploadError);
                            }
                        }
                    }
                }
                
                // Définir l'image de profil si trouvée
                if (profileMediaId) {
                    try {
                        await fetch(
                            `${API_URL}/exercises/${createdExercise.id}/profile-media/${profileMediaId}`,
                            {
                                method: 'PUT',
                                headers: { 'Authorization': `Bearer ${token}` }
                            }
                        );
                        console.log('Profile media set successfully');
                    } catch (profileError) {
                        console.error('Erreur définition profil media:', profileError);
                    }
                }
                // Clear the media files after upload
                currentExerciseMediaFiles = [];
            }
            
            closeModals();
            loadExercises();
        } else {
            const error = await response.json();
            console.error('API error:', error);
            alert('Erreur: ' + (error.detail || 'Une erreur est survenue'));
        }
    } catch (error) {
        alert('Erreur: ' + error.message);
    }
}

async function editExercise(id) {
    editingExerciseId = id;
    const exercise = exercises.find(e => e.id === id);
    if (exercise) {
        openExerciseModal(exercise);
    }
}
async function deleteExercise(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet exercice ?')) return;

    try {
        const response = await fetch(`${API_URL}/exercises/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadExercises();
        } else {
            alert('Erreur lors de la suppression');
        }
    } catch (error) {
        alert('Erreur: ' + error.message);
    }
}

// Sessions Functions
async function loadSessions() {
    try {
        const response = await fetch(`${API_URL}/sessions/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            sessions = await response.json();
            displaySessions(sessions);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des sessions:', error);
    }
}

function displaySessions(sessionsToDisplay) {
    const container = document.getElementById('sessionsList');
    
    if (sessionsToDisplay.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Aucune session trouvée</h3>
                <p>Créez votre première session d'entraînement !</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sessionsToDisplay.map(session => `
        <div class="card">
            <h3>${session.name}</h3>
            <p>${session.description || ''}</p>
            <p><strong>Créée le:</strong> ${new Date(session.created_at).toLocaleDateString('fr-FR')}</p>
            <p><strong>Exercices:</strong> ${session.exercises ? session.exercises.length : 0}</p>
            <div class="card-actions">
                <button class="btn-edit" onclick="editSession(${session.id})">Modifier</button>
                <button class="btn-delete" onclick="deleteSession(${session.id})">Supprimer</button>
            </div>
        </div>
    `).join('');
}

function openSessionModal(session = null) {
    const modal = document.getElementById('sessionModal');
    const title = document.getElementById('sessionModalTitle');
    
    if (session) {
        title.textContent = 'Modifier la session';
        document.getElementById('sessionName').value = session.name;
        document.getElementById('sessionDescription').value = session.description || '';
        editingSessionId = session.id;
        
        // Load session exercises
        displaySessionExercisesInModal(session.exercises || []);
    } else {
        title.textContent = 'Créer une session';
        document.getElementById('sessionForm').reset();
        document.getElementById('sessionExercisesList').innerHTML = '';
        editingSessionId = null;
    }
    
    modal.style.display = 'flex';
}

function addExerciseToSessionForm() {
    openSetFormModal();
}

function displaySessionExercisesInModal(exercises) {
    const container = document.getElementById('sessionExercisesList');
    
    if (!exercises || exercises.length === 0) {
        container.innerHTML = `
            <div style="padding: 15px; border: 2px dashed #ddd; border-radius: 5px; text-align: center; color: #999; margin: 10px 0;">
                <p>Aucun exercice ajouté</p>
                <small>Cliquez sur "+ Ajouter un exercice" pour en ajouter</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = exercises.map((exercise, index) => {
        // exercise peut être un objet avec 'name' ou 'exercise_name'
        const exerciseName = exercise.name || exercise.exercise_name || 'Exercice inconnu';
        const restAfter = exercise.rest_after_exercise_minutes || 2;
        const notes = exercise.notes || '';
        const exerciseId = exercise.exercise_id || exercise.id;
        
        return `
            <div class="session-exercise-item" data-exercise-id="${exerciseId}" data-exercise-data='${JSON.stringify({
                exercise_id: exerciseId,
                rest_after_exercise_minutes: restAfter,
                notes: notes || null
            })}'>
                <div style="padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 8px;">
                    <div class="session-exercise-header" style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="flex: 1;">
                            <strong>${index + 1}. ${exerciseName}</strong>
                            ${notes ? `<p style="font-size: 12px; color: #666; margin: 5px 0;">📝 ${notes}</p>` : ''}
                        </div>
                        <div>
                            <button type="button" class="btn-secondary" onclick="moveSessionExerciseUp(this)" title="Monter">↑</button>
                            <button type="button" class="btn-secondary" onclick="moveSessionExerciseDown(this)" title="Descendre">↓</button>
                            <button type="button" class="btn-delete" onclick="this.closest('.session-exercise-item').remove()" title="Supprimer">✕</button>
                        </div>
                    </div>
                    <div style="margin-top: 6px; font-size: 12px; color:#666;">
                        ⏱️ Repos après: ${restAfter} min
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function handleSessionSubmit(e) {
    e.preventDefault();
    
    const sessionExercises = [];
    document.querySelectorAll('.session-exercise-item').forEach(item => {
        const exerciseData = item.dataset.exerciseData;
        if (exerciseData) {
            sessionExercises.push(JSON.parse(exerciseData));
        }
    });

    sessionExercises.forEach((ex, index) => {
        ex.order_index = index + 1;
    });

    if (sessionExercises.length === 0) {
        alert('Veuillez ajouter au moins un exercice');
        return;
    }

    const sessionData = {
        name: document.getElementById('sessionName').value,
        description: document.getElementById('sessionDescription').value,
        exercises: sessionExercises
    };

    try {
        const url = editingSessionId 
            ? `${API_URL}/sessions/${editingSessionId}`
            : `${API_URL}/sessions/`;
        
        const method = editingSessionId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sessionData)
        });

        if (response.ok) {
            closeModals();
            loadSessions();
        } else {
            const error = await response.json();
            alert('Erreur: ' + (error.detail || error.detail || 'Une erreur est survenue'));
        }
    } catch (error) {
        alert('Erreur: ' + error.message);
    }
}

async function editSession(id) {
    editingSessionId = id;
    const session = sessions.find(s => s.id === id);
    if (session) {
        openSessionModal(session);
    }
}

async function deleteSession(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) return;

    try {
        const response = await fetch(`${API_URL}/sessions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadSessions();
        } else {
            alert('Erreur lors de la suppression');
        }
    } catch (error) {
        alert('Erreur: ' + error.message);
    }
}
function displayExerciseMedia() {
    const gallery = document.getElementById('exerciseMediaGallery');
    
    if (currentExerciseMedia.length === 0) {
        gallery.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">Aucun média</p>';
        return;
    }

    gallery.innerHTML = currentExerciseMedia.map(media => {
        const currentExercise = exercises.find(e => e.id === editingExerciseId);
        const isProfile = currentExercise && currentExercise.profile_media_id === media.id;
        
        return `
        <div class="media-item ${isProfile ? 'is-profile' : ''}">
            ${media.media_type === 'image' ? 
                `<img src="${media.url}" alt="media">` :
                `<video width="100" height="100" style="object-fit: cover;"><source src="${media.url}"></video>`
            }
            ${isProfile ? '<div class="profile-badge">Profil</div>' : ''}
            <div class="media-item-overlay">
                ${media.media_type === 'image' && !media.isLocal ? 
                    `<button class="media-item-set-profile" onclick="setProfileMedia(${media.id})" ${isProfile ? 'disabled' : ''}>
                        ${isProfile ? '✓ Profil' : 'Définir profil'}
                    </button>` : ''
                }
                <button class="media-item-delete" onclick="deleteExerciseMediaItem(${media.id})">Supprimer</button>
            </div>
        </div>
        `;
    }).join('');
}

async function uploadExerciseMedia() {
    const fileInput = document.getElementById('exerciseMediaUpload');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Veuillez sélectionner un fichier');
        return;
    }

    // If adding new exercise (not yet created)
    if (!editingExerciseId) {
        // Just add to local array for preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const mediaId = Date.now();
            currentExerciseMedia.push({
                id: mediaId,
                media_type: file.type.startsWith('video/') ? 'video' : 'image',
                url: e.target.result,
                filename: file.name,
                isLocal: true
            });
            // Store the actual file object for later upload
            currentExerciseMediaFiles.push({
                id: mediaId,
                file: file
            });
            displayExerciseMedia();
            fileInput.value = '';
        };
        reader.readAsDataURL(file);
    } else {
        // Upload to existing exercise
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_URL}/exercises/${editingExerciseId}/media`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                const mediaItem = await response.json();
                currentExerciseMedia.push(mediaItem);
                displayExerciseMedia();
                fileInput.value = '';
            } else {
                const error = await response.json();
                alert('Erreur: ' + (error.detail || 'Erreur lors de l\'upload'));
            }
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    }
}

async function deleteExerciseMediaItem(mediaId) {
    if (!editingExerciseId) {
        // Remove from local array
        currentExerciseMedia = currentExerciseMedia.filter(m => m.id !== mediaId);
        displayExerciseMedia();
    } else {
        // Delete from server
        if (!confirm('Supprimer ce média ?')) return;

        try {
            const response = await fetch(`${API_URL}/exercises/${editingExerciseId}/media/${mediaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                currentExerciseMedia = currentExerciseMedia.filter(m => m.id !== mediaId);
                displayExerciseMedia();
                // Reload exercises to update the list
                loadExercises();
            } else {
                alert('Erreur lors de la suppression');
            }
        } catch (error) {
            alert('Erreur: ' + error.message);
        }
    }
}

async function setProfileMedia(mediaId) {
    if (!editingExerciseId) {
        alert('Enregistrez d\'abord l\'exercice');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/exercises/${editingExerciseId}/profile-media/${mediaId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const updatedExercise = await response.json();
            // Update the exercise in the list
            const index = exercises.findIndex(e => e.id === editingExerciseId);
            if (index !== -1) {
                exercises[index] = updatedExercise;
            }
            currentExerciseMedia = updatedExercise.media;
            displayExerciseMedia();
            loadExercises();
        } else {
            const error = await response.json();
            alert('Erreur: ' + (error.detail || 'Erreur lors de la définition du profil'));
        }
    } catch (error) {
        alert('Erreur: ' + error.message);
    }
}
function closeModals(e) {
    if (e && setFormModal.contains(e.target)) {
        closeSetModal();
        return;
    }

    exerciseModal.style.display = 'none';
    sessionModal.style.display = 'none';
    setFormModal.style.display = 'none';
    programModal.style.display = 'none';
    editingExerciseId = null;
    editingSessionId = null;
    editingProgramId = null;
    currentExerciseMedia = [];
    currentSets = [];
    addingExerciseToSession = null;
}

function closeSetModal() {
    setFormModal.style.display = 'none';
    currentSets = [];
    addingExerciseToSession = null;
}

// Sets Management Functions
function openSetFormModal() {
    const select = document.getElementById('setExerciseSelect');
    if (!exercises.length) {
        alert('Veuillez d\'abord créer un exercice');
        return;
    }

    select.innerHTML = exercises.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('');
    select.value = exercises[0].id;
    updateSelectedExerciseFromModal();

    document.getElementById('restAfterExercise').value = 2;
    document.getElementById('exerciseNotes').value = '';
    
    // Initialize sets list with one empty set
    currentSets = [{id: 1}];
    displaySetsUI();

    setFormModal.style.display = 'flex';
}

function displaySetsUI() {
    const setsList = document.getElementById('setsList');
    const exercise = addingExerciseToSession;
    
    if (!exercise) return;
    
    setsList.innerHTML = currentSets.map((set, index) => `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; background: #f9f9f9;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>Set ${index + 1}</strong>
                <button type="button" class="btn-delete" style="padding: 4px 8px; font-size: 12px;" onclick="deleteSet(${index})">- Supprimer</button>
            </div>
            <div style="display: grid; gap: 8px;">
                ${exercise.has_repetitions ? `
                    <div>
                        <label>Répétitions</label>
                        <input type="number" class="set-metric" data-set="${index}" data-metric="repetitions" min="0" placeholder="Répétitions">
                    </div>
                ` : ''}
                ${exercise.has_weight ? `
                    <div>
                        <label>Poids (kg)</label>
                        <input type="number" class="set-metric" data-set="${index}" data-metric="weight" min="0" step="0.5" placeholder="Poids">
                    </div>
                ` : ''}
                ${exercise.has_time ? `
                    <div>
                        <label>Temps (min)</label>
                        <input type="number" class="set-metric" data-set="${index}" data-metric="time" min="0" step="0.1" placeholder="Temps">
                    </div>
                ` : ''}
                ${exercise.has_distance ? `
                    <div>
                        <label>Distance (km)</label>
                        <input type="number" class="set-metric" data-set="${index}" data-metric="distance" min="0" step="0.1" placeholder="Distance">
                    </div>
                ` : ''}
                ${exercise.has_calories ? `
                    <div>
                        <label>Calories</label>
                        <input type="number" class="set-metric" data-set="${index}" data-metric="calories" min="0" placeholder="Calories">
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function addSetToUI() {
    const newSetId = Math.max(...currentSets.map(s => s.id), 0) + 1;
    currentSets.push({id: newSetId});
    displaySetsUI();
}

function deleteSet(index) {
    if (currentSets.length <= 1) {
        alert('Vous devez avoir au moins un set');
        return;
    }
    currentSets.splice(index, 1);
    displaySetsUI();
}

function updateSelectedExerciseFromModal() {
    const select = document.getElementById('setExerciseSelect');
    const exerciseId = parseInt(select.value, 10);
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) {
        addingExerciseToSession = null;
        return;
    }

    addingExerciseToSession = {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        has_time: exercise.has_time,
        has_repetitions: exercise.has_repetitions,
        has_weight: exercise.has_weight,
        has_distance: exercise.has_distance,
        has_calories: exercise.has_calories
    };
}


function handleSetFormSubmit(e) {
    e.preventDefault();

    if (!addingExerciseToSession) {
        alert('Veuillez sélectionner un exercice');
        return;
    }
    
    const restAfterExercise = parseFloat(document.getElementById('restAfterExercise').value) || 2;
    const notes = document.getElementById('exerciseNotes').value.trim() || null;

    // Add to session exercises list
    const container = document.getElementById('sessionExercisesList');
    const exerciseItem = document.createElement('div');
    exerciseItem.className = 'session-exercise-item';
    
    const exerciseData = {
        exercise_id: addingExerciseToSession.exercise_id,
        rest_after_exercise_minutes: restAfterExercise,
        notes: notes
    };
    
    exerciseItem.innerHTML = `
        <div style="padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            <div class="session-exercise-header" style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${addingExerciseToSession.exercise_name}</strong>
                <div>
                    <button type="button" class="btn-secondary" onclick="moveSessionExerciseUp(this)">↑</button>
                    <button type="button" class="btn-secondary" onclick="moveSessionExerciseDown(this)">↓</button>
                    <button type="button" class="btn-delete" onclick="this.closest('.session-exercise-item').remove()">Retirer</button>
                </div>
            </div>
            <div style="margin-top: 6px; font-size: 12px; color:#666;">
                Repos après exercice: ${restAfterExercise} min
                ${notes ? `<br>Notes: ${notes}` : ''}
            </div>
        </div>
    `;
    
    exerciseItem.dataset.exerciseData = JSON.stringify(exerciseData);
    container.appendChild(exerciseItem);
    closeSetModal();
}

function moveSessionExerciseUp(button) {
    const item = button.closest('.session-exercise-item');
    const prev = item?.previousElementSibling;
    if (prev) {
        item.parentElement.insertBefore(item, prev);
    }
}

function moveSessionExerciseDown(button) {
    const item = button.closest('.session-exercise-item');
    const next = item?.nextElementSibling;
    if (next) {
        item.parentElement.insertBefore(next, item);
    }
}
// Programs Functions
async function loadPrograms() {
    try {
        const response = await fetch(`${API_URL}/programs/`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                showAuth();
                return;
            }
            console.error('Error loading programs:', response.status);
            return;
        }
        const data = await response.json();
        programs = Array.isArray(data) ? data : (data.data || []);
        displayPrograms();
    } catch (error) {
        console.error('Error loading programs:', error);
    }
}

function displayPrograms() {
    const list = document.getElementById('programsList');
    list.innerHTML = '';
    
    programs.forEach(program => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <div class="item-info">
                <h3>${program.name}</h3>
                <p>${program.description || ''}</p>
                <small>${program.sessions.length} session(s)</small>
            </div>
            <div class="item-actions">
                <button class="btn-icon" onclick="showProgramDetail(${program.id})" title="Voir">👁️</button>
                <button class="btn-icon" onclick="editProgram(${program.id})" title="Modifier">✏️</button>
                <button class="btn-icon" onclick="deleteProgram(${program.id})" title="Supprimer">🗑️</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function showProgramDetail(programId) {
    currentProgramId = programId;
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('programDetailPage').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const programsBtn = document.querySelector('[data-page="programs"]');
    if (programsBtn) {
        programsBtn.classList.add('active');
    }
    loadProgramProgress(programId);
}

async function loadProgramProgress(programId) {
    try {
        const [programResponse, progressResponse] = await Promise.all([
            fetch(`${API_URL}/programs/${programId}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            }),
            fetch(`${API_URL}/programs/${programId}/progress`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            })
        ]);

        if (!programResponse.ok || !progressResponse.ok) {
            alert('Erreur lors du chargement du programme');
            return;
        }

        const program = await programResponse.json();
        const progress = await progressResponse.json();
        displayProgramProgress(program, progress);
    } catch (error) {
        console.error('Erreur lors du chargement du programme:', error);
        alert('Erreur lors du chargement du programme');
    }
}

function displayProgramProgress(program, progressList) {
    document.getElementById('programDetailTitle').textContent = program.name || 'Détails du programme';
    document.getElementById('programDetailDescription').textContent = program.description || '';

    const container = document.getElementById('programSessionsProgress');
    if (!progressList || progressList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Aucune session dans ce programme</h3>
                <p>Ajoutez des sessions à ce programme pour suivre vos accomplissements.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = progressList.map((item, index) => `
        <div class="card">
            <h3>${index + 1}. ${item.session_name || 'Session sans nom'}</h3>
            <p><strong>Accomplie:</strong> ${item.completed_count} fois</p>
            <button class="btn-secondary" style="margin-top: 8px;" onclick="openProgramSession(${item.session_id}, '${(item.session_name || '').replace(/'/g, "\\'")}')">Voir la session</button>
        </div>
    `).join('');
}

let activeProgramSessionId = null;
let activeProgramSessionExercises = [];
let activeProgramSessionIndex = 0;
let restTimerInterval = null;
let restRemainingSeconds = 0;

async function openProgramSession(sessionId, sessionName) {
    activeProgramSessionId = sessionId;
    const detailSection = document.getElementById('programSessionDetail');
    const title = document.getElementById('programSessionDetailTitle');
    title.textContent = sessionName ? `Session: ${sessionName}` : 'Session';
    detailSection.style.display = 'block';

    try {
        const sessionResponse = await fetch(`${API_URL}/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!sessionResponse.ok) {
            alert('Erreur lors du chargement de la session');
            return;
        }

        const session = await sessionResponse.json();
        await renderSessionGoals(session);
    } catch (error) {
        console.error('Erreur chargement session:', error);
        alert('Erreur lors du chargement de la session');
    }
}

async function renderSessionGoals(session) {
    const container = document.getElementById('programSessionExercises');
    container.innerHTML = '';

    if (!session.exercises || session.exercises.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Aucun exercice</h3>
                <p>Cette session ne contient pas d'exercices.</p>
            </div>
        `;
        return;
    }

    const exerciseDetails = await Promise.all(session.exercises.map(async (se) => {
        const [exerciseRes, historyRes] = await Promise.all([
            fetch(`${API_URL}/exercises/${se.exercise_id}`),
            fetch(`${API_URL}/performance/history/${se.exercise_id}?days=365`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            })
        ]);

        const exercise = exerciseRes.ok ? await exerciseRes.json() : null;
        const history = historyRes.ok ? await historyRes.json() : null;
        const last = history?.recent_results?.[0] || null;

        return { sessionExercise: se, exercise, lastResult: last };
    }));

    container.innerHTML = exerciseDetails.map(({ sessionExercise, exercise, lastResult }, exerciseIndex) => {
        const name = sessionExercise.exercise_name || exercise?.name || 'Exercice';
        const hasReps = !!exercise?.has_repetitions;
        const hasTime = !!exercise?.has_time;
        const hasWeight = !!exercise?.has_weight;
        const hasDistance = !!exercise?.has_distance;
        const hasCalories = !!exercise?.has_calories;

        const repsVal = lastResult?.repetitions ?? '';
        const timeVal = lastResult?.time_minutes ?? '';
        const weightVal = lastResult?.weight_kg ?? '';
        const distanceVal = lastResult?.distance_km ?? '';
        const caloriesVal = lastResult?.calories ?? '';

        const safeName = String(name).replace(/"/g, '&quot;');

        return `
            <div class="card" 
                data-session-exercise-id="${sessionExercise.id}"
                data-exercise-name="${safeName}"
                data-exercise-index="${exerciseIndex}"
                data-has-reps="${hasReps}"
                data-has-time="${hasTime}"
                data-has-weight="${hasWeight}"
                data-has-distance="${hasDistance}"
                data-has-calories="${hasCalories}">
                <h3>${name}</h3>
                <input type="hidden" class="goal-session-exercise" value="${sessionExercise.id}">
                
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong>Sets</strong>
                        <button type="button" class="btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="addGoalSet(${exerciseIndex})">+ Ajouter un set</button>
                    </div>
                    <div class="goal-sets-container" data-exercise-index="${exerciseIndex}">
                        <div class="goal-set-item" style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: #f9f9f9; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <strong>Set 1</strong>
                                <button type="button" class="btn-delete" style="padding: 4px 8px; font-size: 12px; display: none;" onclick="removeGoalSet(${exerciseIndex}, 0)">- Supprimer</button>
                            </div>
                            <div class="form-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;">
                                ${hasReps ? `
                                    <div>
                                        <label>Répétitions</label>
                                        <input type="number" class="set-reps" min="0" value="${repsVal}" data-exercise="${exerciseIndex}" data-set="0">
                                    </div>
                                ` : ''}
                                ${hasTime ? `
                                    <div>
                                        <label>Temps (min)</label>
                                        <input type="number" class="set-time" min="0" step="0.1" value="${timeVal}" data-exercise="${exerciseIndex}" data-set="0">
                                    </div>
                                ` : ''}
                                ${hasWeight ? `
                                    <div>
                                        <label>Poids (kg)</label>
                                        <input type="number" class="set-weight" min="0" step="0.1" value="${weightVal}" data-exercise="${exerciseIndex}" data-set="0">
                                    </div>
                                ` : ''}
                                ${hasDistance ? `
                                    <div>
                                        <label>Distance (km)</label>
                                        <input type="number" class="set-distance" min="0" step="0.1" value="${distanceVal}" data-exercise="${exerciseIndex}" data-set="0">
                                    </div>
                                ` : ''}
                                ${hasCalories ? `
                                    <div>
                                        <label>Calories</label>
                                        <input type="number" class="set-calories" min="0" step="0.1" value="${caloriesVal}" data-exercise="${exerciseIndex}" data-set="0">
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                <p style="margin-top: 8px; color: #666; font-size: 12px;">
                    ${lastResult ? 'Prérempli avec le dernier résultat.' : 'Aucun historique, champs vides.'}
                </p>
            </div>
        `;
    }).join('');
}

function addGoalSet(exerciseIndex) {
    const container = document.querySelector(`.goal-sets-container[data-exercise-index="${exerciseIndex}"]`);
    if (!container) return;
    
    const card = container.closest('.card');
    const hasReps = card.dataset.hasReps === 'true';
    const hasTime = card.dataset.hasTime === 'true';
    const hasWeight = card.dataset.hasWeight === 'true';
    const hasDistance = card.dataset.hasDistance === 'true';
    const hasCalories = card.dataset.hasCalories === 'true';
    
    const setCount = container.querySelectorAll('.goal-set-item').length;
    const setIndex = setCount;
    
    const setItem = document.createElement('div');
    setItem.className = 'goal-set-item';
    setItem.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: #f9f9f9; margin-bottom: 8px;';
    
    setItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong>Set ${setIndex + 1}</strong>
            <button type="button" class="btn-delete" style="padding: 4px 8px; font-size: 12px;" onclick="removeGoalSet(${exerciseIndex}, ${setIndex})">- Supprimer</button>
        </div>
        <div class="form-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;">
            ${hasReps ? `
                <div>
                    <label>Répétitions</label>
                    <input type="number" class="set-reps" min="0" data-exercise="${exerciseIndex}" data-set="${setIndex}">
                </div>
            ` : ''}
            ${hasTime ? `
                <div>
                    <label>Temps (min)</label>
                    <input type="number" class="set-time" min="0" step="0.1" data-exercise="${exerciseIndex}" data-set="${setIndex}">
                </div>
            ` : ''}
            ${hasWeight ? `
                <div>
                    <label>Poids (kg)</label>
                    <input type="number" class="set-weight" min="0" step="0.1" data-exercise="${exerciseIndex}" data-set="${setIndex}">
                </div>
            ` : ''}
            ${hasDistance ? `
                <div>
                    <label>Distance (km)</label>
                    <input type="number" class="set-distance" min="0" step="0.1" data-exercise="${exerciseIndex}" data-set="${setIndex}">
                </div>
            ` : ''}
            ${hasCalories ? `
                <div>
                    <label>Calories</label>
                    <input type="number" class="set-calories" min="0" step="0.1" data-exercise="${exerciseIndex}" data-set="${setIndex}">
                </div>
            ` : ''}
        </div>
    `;
    
    container.appendChild(setItem);
    updateGoalSetButtons(exerciseIndex);
}

function removeGoalSet(exerciseIndex, setIndex) {
    const container = document.querySelector(`.goal-sets-container[data-exercise-index="${exerciseIndex}"]`);
    if (!container) return;
    
    const setItems = container.querySelectorAll('.goal-set-item');
    if (setItems.length <= 1) {
        alert('Vous devez avoir au moins un set');
        return;
    }
    
    setItems[setIndex]?.remove();
    
    // Renumber sets
    const remainingSets = container.querySelectorAll('.goal-set-item');
    remainingSets.forEach((item, index) => {
        item.querySelector('strong').textContent = `Set ${index + 1}`;
        const btn = item.querySelector('.btn-delete');
        if (btn) {
            btn.setAttribute('onclick', `removeGoalSet(${exerciseIndex}, ${index})`);
        }
        // Update data-set attributes
        item.querySelectorAll('input').forEach(input => {
            input.dataset.set = index;
        });
    });
    
    updateGoalSetButtons(exerciseIndex);
}

function updateGoalSetButtons(exerciseIndex) {
    const container = document.querySelector(`.goal-sets-container[data-exercise-index="${exerciseIndex}"]`);
    if (!container) return;
    
    const setItems = container.querySelectorAll('.goal-set-item');
    setItems.forEach((item, index) => {
        const deleteBtn = item.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.style.display = setItems.length > 1 ? 'inline-block' : 'none';
        }
    });
}

async function startProgramSession() {
    const container = document.getElementById('programSessionExercises');
    const cards = Array.from(container.querySelectorAll('.card'));
    if (!cards.length) {
        alert('Aucun exercice à démarrer');
        return;
    }

    // Construire les objectifs et les enregistrer
    const goals = cards.map((card, exerciseIndex) => {
        const sessionExerciseId = parseInt(card.dataset.sessionExerciseId, 10);
        const setsContainer = card.querySelector(`.goal-sets-container[data-exercise-index="${exerciseIndex}"]`);
        const setItems = setsContainer ? Array.from(setsContainer.querySelectorAll('.goal-set-item')) : [];
        
        // Collecter les données de chaque set
        const sets = setItems.map((setItem, setIndex) => {
            return {
                repetitions: parseInt(setItem.querySelector('.set-reps')?.value || '', 10) || null,
                time_minutes: parseFloat(setItem.querySelector('.set-time')?.value || '') || null,
                weight_kg: parseFloat(setItem.querySelector('.set-weight')?.value || '') || null,
                distance_km: parseFloat(setItem.querySelector('.set-distance')?.value || '') || null,
                calories: parseFloat(setItem.querySelector('.set-calories')?.value || '') || null
            };
        });
        
        return {
            session_exercise_id: sessionExerciseId,
            session_id: activeProgramSessionId,
            sets_count: sets.length,
            sets_data: sets,
            exercise_name: card.dataset.exerciseName || 'Exercice',
            has_reps: card.dataset.hasReps === 'true',
            has_time: card.dataset.hasTime === 'true',
            has_weight: card.dataset.hasWeight === 'true',
            has_distance: card.dataset.hasDistance === 'true',
            has_calories: card.dataset.hasCalories === 'true'
        };
    });

    try {
        await Promise.all(goals.map(g => fetch(`${API_URL}/performance/goals`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_exercise_id: g.session_exercise_id,
                sets_count: g.sets_count,
                repetitions: g.repetitions,
                time_minutes: g.time_minutes,
                weight_kg: g.weight_kg,
                distance_km: g.distance_km,
                calories: g.calories
            })
        })));

        activeProgramSessionExercises = goals;
        activeProgramSessionIndex = 0;
        openProgramSessionRunner();
    } catch (error) {
        console.error('Erreur démarrage session:', error);
        alert('Erreur lors du démarrage de la session');
    }
}

function openProgramSessionRunner() {
    const runner = document.getElementById('programSessionRunner');
    runner.style.display = 'block';
    renderRunnerExercise();
}

function closeProgramSessionRunner() {
    const runner = document.getElementById('programSessionRunner');
    runner.style.display = 'none';
    clearRestTimer();
    hideRestUI();
}

function renderRunnerExercise() {
    const current = activeProgramSessionExercises[activeProgramSessionIndex];
    if (!current) {
        closeProgramSessionRunner();
        alert('Session terminée');
        return;
    }

    hideRestUI();

    document.getElementById('runnerExerciseTitle').textContent = current.exercise_name || 'Exercice';

    // Afficher les objectifs de tous les sets
    const objectiveParts = [];
    if (current.sets_count) objectiveParts.push(`${current.sets_count} sets`);
    
    if (current.sets_data && current.sets_data.length > 0) {
        const setDetails = current.sets_data.map((set, idx) => {
            const details = [];
            if (set.repetitions) details.push(`${set.repetitions} reps`);
            if (set.time_minutes) details.push(`${set.time_minutes} min`);
            if (set.weight_kg) details.push(`${set.weight_kg} kg`);
            if (set.distance_km) details.push(`${set.distance_km} km`);
            if (set.calories) details.push(`${set.calories} cal`);
            return details.length > 0 ? `Set ${idx + 1}: ${details.join(', ')}` : null;
        }).filter(Boolean);
        
        if (setDetails.length > 0) {
            objectiveParts.push(...setDetails);
        }
    }

    document.getElementById('runnerObjective').textContent = objectiveParts.length
        ? `Objectif: ${objectiveParts.join(' • ')}`
        : 'Aucun objectif défini';

    const form = document.getElementById('runnerActualForm');
    form.innerHTML = '';

    form.innerHTML += `
        <div>
            <label>Nombre de sets</label>
            <input type="number" id="actualSets" min="0" value="${current.sets_count ?? ''}">
        </div>
    `;

    if (current.has_reps) {
        form.innerHTML += `
            <div>
                <label>Répétitions / set</label>
                <input type="number" id="actualReps" min="0" value="${current.repetitions ?? ''}">
            </div>
        `;
    }
    if (current.has_time) {
        form.innerHTML += `
            <div>
                <label>Temps (min)</label>
                <input type="number" id="actualTime" min="0" step="0.1" value="${current.time_minutes ?? ''}">
            </div>
        `;
    }
    if (current.has_weight) {
        form.innerHTML += `
            <div>
                <label>Poids (kg)</label>
                <input type="number" id="actualWeight" min="0" step="0.1" value="${current.weight_kg ?? ''}">
            </div>
        `;
    }
    if (current.has_distance) {
        form.innerHTML += `
            <div>
                <label>Distance (km)</label>
                <input type="number" id="actualDistance" min="0" step="0.1" value="${current.distance_km ?? ''}">
            </div>
        `;
    }
    if (current.has_calories) {
        form.innerHTML += `
            <div>
                <label>Calories</label>
                <input type="number" id="actualCalories" min="0" step="0.1" value="${current.calories ?? ''}">
            </div>
        `;
    }
}

async function submitProgramSessionResult(useGoalValues) {
    const current = activeProgramSessionExercises[activeProgramSessionIndex];
    if (!current) return;

    const payload = {
        session_exercise_id: current.session_exercise_id,
        sets_completed: useGoalValues ? current.sets_count : parseInt(document.getElementById('actualSets')?.value || '', 10) || null,
        repetitions: current.has_reps ? (useGoalValues ? current.repetitions : parseInt(document.getElementById('actualReps')?.value || '', 10) || null) : null,
        time_minutes: current.has_time ? (useGoalValues ? current.time_minutes : parseFloat(document.getElementById('actualTime')?.value || '') || null) : null,
        weight_kg: current.has_weight ? (useGoalValues ? current.weight_kg : parseFloat(document.getElementById('actualWeight')?.value || '') || null) : null,
        distance_km: current.has_distance ? (useGoalValues ? current.distance_km : parseFloat(document.getElementById('actualDistance')?.value || '') || null) : null,
        calories: current.has_calories ? (useGoalValues ? current.calories : parseFloat(document.getElementById('actualCalories')?.value || '') || null) : null
    };

    try {
        const response = await fetch(`${API_URL}/performance/results`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            alert('Erreur lors de l\'enregistrement du résultat');
            return;
        }

        activeProgramSessionIndex += 1;

        // If all exercises completed, record session performance
        if (activeProgramSessionIndex >= activeProgramSessionExercises.length) {
            await completeSession();
            return;
        }

        await startRestAfterExercise(current.session_exercise_id);
    } catch (error) {
        console.error('Erreur enregistrement résultat:', error);
        alert('Erreur lors de l\'enregistrement du résultat');
    }
}

function formatSeconds(seconds) {
    const safeSeconds = Math.max(0, seconds || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remaining = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function updateRestCountdownDisplay() {
    const countdown = document.getElementById('runnerRestCountdown');
    if (countdown) {
        countdown.textContent = formatSeconds(restRemainingSeconds);
    }
}

function showRestUI(seconds) {
    restRemainingSeconds = seconds;
    const restSection = document.getElementById('runnerRestSection');
    const form = document.getElementById('runnerActualForm');
    const actionButtons = document.getElementById('runnerActionButtons');

    if (restSection) restSection.style.display = 'block';
    if (form) form.style.display = 'none';
    if (actionButtons) actionButtons.style.display = 'none';

    updateRestCountdownDisplay();
}

function hideRestUI() {
    const restSection = document.getElementById('runnerRestSection');
    const form = document.getElementById('runnerActualForm');
    const actionButtons = document.getElementById('runnerActionButtons');

    if (restSection) restSection.style.display = 'none';
    if (form) form.style.display = 'grid';
    if (actionButtons) actionButtons.style.display = 'flex';
}

function clearRestTimer() {
    if (restTimerInterval) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
    }
    restRemainingSeconds = 0;
}

function startRestCountdown(seconds) {
    clearRestTimer();
    showRestUI(seconds);

    restTimerInterval = setInterval(() => {
        restRemainingSeconds -= 1;
        if (restRemainingSeconds <= 0) {
            clearRestTimer();
            hideRestUI();
            renderRunnerExercise();
            return;
        }
        updateRestCountdownDisplay();
    }, 1000);
}

function addRestSeconds(extraSeconds) {
    if (!restTimerInterval) return;
    restRemainingSeconds = Math.max(0, restRemainingSeconds + extraSeconds);
    updateRestCountdownDisplay();
}

function skipRestAndNextExercise() {
    clearRestTimer();
    hideRestUI();
    renderRunnerExercise();
}

async function startRestAfterExercise(sessionExerciseId) {
    try {
        const response = await fetch(`${API_URL}/performance/rest-timer`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_exercise_id: sessionExerciseId,
                between_sets: false
            })
        });

        if (response.ok) {
            const data = await response.json();
            const restSeconds = parseInt(data.rest_duration_seconds, 10) || 0;
            if (restSeconds > 0) {
                startRestCountdown(restSeconds);
                return;
            }
        }
    } catch (error) {
        console.warn('Erreur rest-timer, passage au suivant:', error);
    }

    renderRunnerExercise();
}

async function completeSession() {
    const sessionId = activeProgramSessionExercises[0]?.session_id;
    if (!sessionId) return;

    try {
        const sessionPerformance = {
            session_id: sessionId,
            exercises_completed: activeProgramSessionExercises.length,
            exercises_planned: activeProgramSessionExercises.length,
            goals_achieved: 0, // Could track this if needed
            total_duration_minutes: null,
            notes: null
        };

        const response = await fetch(`${API_URL}/performance`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sessionPerformance)
        });

        if (response.ok) {
            closeProgramSessionRunner();
            alert('✅ Session terminée et enregistrée !');
            // Reload program detail to refresh completion count
            if (currentProgramId) {
                showProgramDetail(currentProgramId);
            }
        } else {
            alert('Session terminée mais erreur lors de l\'enregistrement');
            closeProgramSessionRunner();
        }
    } catch (error) {
        console.error('Erreur enregistrement session:', error);
        alert('Session terminée mais erreur lors de l\'enregistrement');
        closeProgramSessionRunner();
    }
}

async function saveSessionGoals() {
    const container = document.getElementById('programSessionExercises');
    const cards = container.querySelectorAll('.card');
    if (!cards.length) {
        alert('Aucun exercice à enregistrer');
        return;
    }

    try {
        for (const card of cards) {
            const sessionExerciseId = card.querySelector('.goal-session-exercise')?.value;
            if (!sessionExerciseId) continue;

            const payload = {
                session_exercise_id: parseInt(sessionExerciseId, 10),
                sets_count: parseInt(card.querySelector('.goal-sets')?.value || '', 10) || null,
                repetitions: parseInt(card.querySelector('.goal-reps')?.value || '', 10) || null,
                time_minutes: parseFloat(card.querySelector('.goal-time')?.value || '') || null,
                weight_kg: parseFloat(card.querySelector('.goal-weight')?.value || '') || null,
                distance_km: parseFloat(card.querySelector('.goal-distance')?.value || '') || null,
                calories: parseFloat(card.querySelector('.goal-calories')?.value || '') || null
            };

            await fetch(`${API_URL}/performance/goals`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        }

        alert('Objectifs enregistrés');
    } catch (error) {
        console.error('Erreur sauvegarde objectifs:', error);
        alert('Erreur lors de l\'enregistrement des objectifs');
    }
}

function openProgramModal(program = null) {
    editingProgramId = program ? program.id : null;
    document.getElementById('programName').value = program ? program.name : '';
    document.getElementById('programDescription').value = program ? program.description || '' : '';
    
    const sessionsList = document.getElementById('programSessionsList');
    sessionsList.innerHTML = '';
    
    if (program && program.sessions) {
        program.sessions.forEach(ps => {
            addSessionToProgramList(ps.session_id, ps.session_name, ps.order_index);
        });
    }
    
    programModal.style.display = 'block';
}

async function handleProgramSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('programName').value;
    const description = document.getElementById('programDescription').value;
    
    const sessionItems = document.querySelectorAll('.program-session-item');
    const sessions = Array.from(sessionItems).map((item, order_index) => ({
        session_id: parseInt(item.querySelector('.session-data').value),
        order_index: order_index
    }));
    
    const programData = { name, description, sessions };
    
    try {
        const url = editingProgramId ? 
            `${API_URL}/programs/${editingProgramId}` : 
            `${API_URL}/programs/`;
        const method = editingProgramId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(programData)
        });
        
        if (response.ok) {
            closeModals();
            loadPrograms();
        } else {
            alert('Erreur lors de l\'enregistrement du programme');
        }
    } catch (error) {
        console.error('Error saving program:', error);
        alert('Erreur lors de l\'enregistrement du programme');
    }
}

async function editProgram(id) {
    const program = programs.find(p => p.id === id);
    if (program) {
        openProgramModal(program);
    }
}

async function deleteProgram(id) {
    if (!confirm('Supprimer ce programme?')) return;
    
    try {
        const response = await fetch(`${API_URL}/programs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (response.ok) {
            loadPrograms();
        }
    } catch (error) {
        console.error('Error deleting program:', error);
    }
}

async function addSessionToProgramForm() {
    try {
        const response = await fetch(`${API_URL}/sessions/`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) {
            alert('Erreur lors du chargement des sessions');
            return;
        }

        sessions = await response.json();
    } catch (error) {
        console.error('Erreur lors du chargement des sessions:', error);
        alert('Erreur lors du chargement des sessions');
        return;
    }

    if (sessions.length === 0) {
        alert('Aucune session disponible. Créez une session d\'abord.');
        return;
    }

    const sessionsList = document.getElementById('programSessionsList');
    const alreadyAdded = Array.from(sessionsList.querySelectorAll('.session-data')).map(el => parseInt(el.value));
    const availableSessions = sessions.filter(s => !alreadyAdded.includes(s.id));

    if (availableSessions.length === 0) {
        alert('Toutes les sessions ont déjà été ajoutées.');
        return;
    }

    const modal = document.createElement('div');
    modal.dataset.modalType = 'program-session-selector';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';

    const content = document.createElement('div');
    content.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%; max-height: 70vh; overflow-y: auto;';
    content.innerHTML = '<h3>Sélectionner une session à ajouter</h3>';

    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

    availableSessions.forEach(session => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = session.name;
        button.style.cssText = 'padding: 10px; text-align: left; cursor: pointer; border: 1px solid #ccc; border-radius: 4px;';
        button.addEventListener('click', () => selectSessionForProgram(session.id, session.name));
        list.appendChild(button);
    });

    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Annuler';
    cancel.style.cssText = 'margin-top: 15px; padding: 8px 16px; width: 100%; cursor: pointer;';
    cancel.addEventListener('click', () => modal.remove());

    content.appendChild(list);
    content.appendChild(cancel);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function selectSessionForProgram(sessionId, sessionName) {
    const sessionsList = document.getElementById('programSessionsList');
    const orderIndex = sessionsList.children.length;
    addSessionToProgramList(sessionId, sessionName, orderIndex);

    const modal = document.querySelector('[data-modal-type="program-session-selector"]');
    if (modal) modal.remove();
}

function addSessionToProgramList(sessionId, sessionName, orderIndex) {
    const container = document.getElementById('programSessionsList');
    
    const sessionItem = document.createElement('div');
    sessionItem.className = 'program-session-item';
    sessionItem.innerHTML = `
        <div class="session-info">
            <strong>${sessionName}</strong>
        </div>
        <div class="session-actions">
            <button type="button" class="btn-icon" onclick="moveProgramSessionUp(this)" title="Monter">⬆️</button>
            <button type="button" class="btn-icon" onclick="moveProgramSessionDown(this)" title="Descendre">⬇️</button>
            <button type="button" class="btn-icon" onclick="removeProgramSession(this)" title="Retirer">🗑️</button>
        </div>
        <input type="hidden" class="session-data" value="${sessionId}">
    `;
    
    container.appendChild(sessionItem);
}

function moveProgramSessionUp(button) {
    const item = button.closest('.program-session-item');
    const prev = item?.previousElementSibling;
    if (prev) {
        item.parentElement.insertBefore(item, prev);
    }
}

function moveProgramSessionDown(button) {
    const item = button.closest('.program-session-item');
    const next = item?.nextElementSibling;
    if (next) {
        item.parentElement.insertBefore(next, item);
    }
}

function removeProgramSession(button) {
    const item = button.closest('.program-session-item');
    item.remove();
}