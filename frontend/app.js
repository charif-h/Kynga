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
let currentExerciseMedia = [];
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
    
    // Set Form listeners
    document.getElementById('setForm').addEventListener('submit', handleSetFormSubmit);
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
    } else {
        title.textContent = 'Ajouter un exercice';
        document.getElementById('exerciseForm').reset();
        currentExerciseMedia = [];
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
            
            // Upload local media files if creating new exercise
            if (!editingExerciseId && currentExerciseMedia.length > 0) {
                for (const media of currentExerciseMedia) {
                    if (media.isLocal) {
                        // Get the actual file from input
                        const fileInput = document.getElementById('exerciseMediaUpload');
                        // We need to re-upload, so just reload
                    }
                }
            }
            
            closeModals();
            loadExercises();
        } else {
            const error = await response.json();
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
            currentExerciseMedia.push({
                id: Date.now(),
                media_type: file.type.startsWith('video/') ? 'video' : 'image',
                url: e.target.result,
                filename: file.name,
                isLocal: true
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

    setFormModal.style.display = 'flex';
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

// Deprecated - kept for compatibility but no longer used
function addSetToForm() {
    // No longer adding sets during session creation
}

function displaySets() {
    // No longer displaying sets during session creation
}

function removeSet(index) {
    // No longer managing sets during session creation
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
                <button class="btn-icon" onclick="editProgram(${program.id})" title="Modifier">✏️</button>
                <button class="btn-icon" onclick="deleteProgram(${program.id})" title="Supprimer">🗑️</button>
            </div>
        `;
        list.appendChild(div);
    });
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