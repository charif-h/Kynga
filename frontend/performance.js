/**
 * Frontend Implementation Examples for Kynga Performance System
 * 
 * This file contains reusable JavaScript functions for the performance tracking system
 */

// ============== API SERVICE LAYER ==============

class PerformanceAPI {
  constructor(apiBaseURL = '/api/performance', authToken = null) {
    this.baseURL = apiBaseURL;
    this.authToken = authToken;
  }

  async setAuthToken(token) {
    this.authToken = token;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
    };
  }

  async request(method, endpoint, body = null) {
    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method,
      headers: this.getHeaders()
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API Error');
    }
    return response.json();
  }

  // ============== GOALS ==============
  async createGoal(sessionExerciseId, goal) {
    return this.request('POST', '/goals', {
      session_exercise_id: sessionExerciseId,
      ...goal
    });
  }

  async getGoal(sessionExerciseId) {
    return this.request('GET', `/goals/${sessionExerciseId}`);
  }

  async updateGoal(goalId, updates) {
    return this.request('PUT', `/goals/${goalId}`, updates);
  }

  async deleteGoal(goalId) {
    return this.request('DELETE', `/goals/${goalId}`);
  }

  // ============== RESULTS ==============
  async recordResult(result) {
    return this.request('POST', '/results', result);
  }

  async getSessionExerciseResults(sessionExerciseId, limit = 50) {
    return this.request('GET', `/results/session-exercise/${sessionExerciseId}?limit=${limit}`);
  }

  async getResult(resultId) {
    return this.request('GET', `/results/${resultId}`);
  }

  async deleteResult(resultId) {
    return this.request('DELETE', `/results/${resultId}`);
  }

  // ============== PERFORMANCE ==============
  async recordSessionPerformance(sessionId, performance) {
    return this.request('POST', '/performance', {
      session_id: sessionId,
      ...performance
    });
  }

  async getSessionPerformance(sessionId) {
    return this.request('GET', `/performance/session/${sessionId}`);
  }

  // ============== HISTORY & STATS ==============
  async getExerciseHistory(exerciseId, days = 90) {
    return this.request('GET', `/history/${exerciseId}?days=${days}`);
  }

  async getUserStats(limit = 20, days = 90) {
    return this.request('GET', `/user-stats?limit=${limit}&days=${days}`);
  }

  // ============== TIMERS ==============
  async getRestTimer(sessionExerciseId, betweenSets = false) {
    return this.request('POST', '/rest-timer', {
      session_exercise_id: sessionExerciseId,
      between_sets: betweenSets
    });
  }

  async getSessionRestSchedule(sessionId) {
    return this.request('GET', `/session-rest-schedule/${sessionId}`);
  }
}

// ============== REST TIMER COMPONENT ==============

class RestTimer {
  constructor(containerId, onComplete = null) {
    this.container = document.getElementById(containerId);
    this.onComplete = onComplete;
    this.timeRemaining = 0;
    this.isRunning = false;
    this.interval = null;
  }

  async start(sessionExerciseId, betweenSets = false) {
    try {
      const api = new PerformanceAPI();
      const timerData = await api.getRestTimer(sessionExerciseId, betweenSets);
      
      this.timeRemaining = timerData.rest_duration_seconds;
      this.isRunning = true;
      this.render();
      
      this.interval = setInterval(() => this.tick(), 1000);
      
      this.container.innerHTML += `
        <div class="timer-message">${timerData.message}</div>
      `;
    } catch (error) {
      console.error('Timer error:', error);
      this.render(`<div class="error">Error loading timer: ${error.message}</div>`);
    }
  }

  tick() {
    this.timeRemaining--;
    this.render();

    if (this.timeRemaining <= 0) {
      this.stop();
      this.playSound();
      this.showNotification();
      
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  stop() {
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  render() {
    const time = this.formatTime(this.timeRemaining);
    const progressPercent = (this.timeRemaining / (this.timeRemaining + 1)) * 100;
    
    this.container.innerHTML = `
      <div class="timer-container">
        <div class="timer-display">${time}</div>
        <div class="timer-progress">
          <div class="timer-progress-bar" style="width: ${progressPercent}%"></div>
        </div>
        ${this.isRunning ? '<button onclick="timer.stop()" class="btn-stop">Stop</button>' : ''}
      </div>
    `;
  }

  playSound() {
    // Use Web Audio API or play an audio element
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Tone frequency
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }

  showNotification() {
    const notification = document.createElement('div');
    notification.className = 'notification notification-success';
    notification.textContent = 'Rest time complete! Ready to continue?';
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }
}

// ============== EXERCISE GOAL MANAGER ==============

class ExerciseGoalManager {
  constructor(api) {
    this.api = api;
  }

  async loadOrCreateGoal(sessionExerciseId, exerciseName = '') {
    try {
      // Try to get existing goal
      let goal = await this.api.getGoal(sessionExerciseId);
      
      if (goal) {
        return { goal, isNew: false };
      }
    } catch (error) {
      // Goal doesn't exist, need to create
    }

    // Return empty goal for creation
    return { goal: null, isNew: true };
  }

  async saveGoal(sessionExerciseId, goalData) {
    try {
      const result = await this.api.createGoal(sessionExerciseId, goalData);
      return { success: true, goal: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  renderGoalForm(exercise, currentGoal = null) {
    const html = `
      <div class="goal-form">
        <h3>Set Goals for ${exercise.name}</h3>
        
        ${exercise.has_weight ? `
          <div class="form-group">
            <label for="weight_kg">Weight (kg)</label>
            <input 
              type="number" 
              id="weight_kg" 
              step="0.5" 
              value="${currentGoal?.weight_kg || ''}"
              placeholder="e.g., 50"
            />
          </div>
        ` : ''}

        ${exercise.has_repetitions ? `
          <div class="form-group">
            <label for="repetitions">Repetitions</label>
            <input 
              type="number" 
              id="repetitions" 
              min="1"
              value="${currentGoal?.repetitions || ''}"
              placeholder="e.g., 10"
            />
          </div>
          <div class="form-group">
            <label for="sets_count">Sets</label>
            <input 
              type="number" 
              id="sets_count" 
              min="1"
              value="${currentGoal?.sets_count || ''}"
              placeholder="e.g., 3"
            />
          </div>
        ` : ''}

        ${exercise.has_time ? `
          <div class="form-group">
            <label for="time_minutes">Time (minutes)</label>
            <input 
              type="number" 
              id="time_minutes" 
              step="0.5"
              value="${currentGoal?.time_minutes || ''}"
              placeholder="e.g., 5"
            />
          </div>
        ` : ''}

        ${exercise.has_distance ? `
          <div class="form-group">
            <label for="distance_km">Distance (km)</label>
            <input 
              type="number" 
              id="distance_km" 
              step="0.1"
              value="${currentGoal?.distance_km || ''}"
              placeholder="e.g., 1"
            />
          </div>
        ` : ''}

        ${exercise.has_calories ? `
          <div class="form-group">
            <label for="calories">Calories</label>
            <input 
              type="number" 
              id="calories"
              value="${currentGoal?.calories || ''}"
              placeholder="e.g., 100"
            />
          </div>
        ` : ''}

        <button id="saveGoalBtn" class="btn btn-primary">Save Goal</button>
      </div>
    `;
    
    return html;
  }
}

// ============== RESULT RECORDER ==============

class ResultRecorder {
  constructor(api) {
    this.api = api;
  }

  async recordExerciseResult(sessionExerciseId, goalId, resultData) {
    try {
      const result = await this.api.recordResult({
        session_exercise_id: sessionExerciseId,
        goal_id: goalId,
        ...resultData
      });
      
      return { 
        success: true, 
        result,
        achieved: result.achieved,
        message: result.achieved ? '🎉 Goal achieved!' : '💪 Great effort!'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  renderResultForm(exercise, goal) {
    const html = `
      <div class="result-form">
        <h3>Record Results for ${exercise.name}</h3>
        <p class="goal-display">Goal: ${this.formatGoal(goal)}</p>
        
        <form id="resultForm">
          ${exercise.has_weight ? `
            <div class="form-group">
              <label for="result_weight">Weight (kg)</label>
              <input type="number" id="result_weight" step="0.5" />
            </div>
          ` : ''}

          ${exercise.has_repetitions ? `
            <div class="form-group">
              <label for="result_reps">Repetitions</label>
              <input type="number" id="result_reps" min="1" />
            </div>
            <div class="form-group">
              <label for="result_sets">Sets Completed</label>
              <input type="number" id="result_sets" min="1" />
            </div>
          ` : ''}

          ${exercise.has_time ? `
            <div class="form-group">
              <label for="result_time">Time (minutes)</label>
              <input type="number" id="result_time" step="0.5" />
            </div>
          ` : ''}

          <div class="form-group">
            <label for="result_notes">Notes</label>
            <textarea id="result_notes" placeholder="How did it feel?"></textarea>
          </div>

          <button type="submit" class="btn btn-primary">Save Result</button>
        </form>
      </div>
    `;
    
    return html;
  }

  formatGoal(goal) {
    if (!goal) return 'No goal set';
    
    const parts = [];
    if (goal.weight_kg) parts.push(`${goal.weight_kg}kg`);
    if (goal.repetitions) parts.push(`${goal.repetitions} reps`);
    if (goal.sets_count) parts.push(`${goal.sets_count} sets`);
    if (goal.time_minutes) parts.push(`${goal.time_minutes}min`);
    if (goal.distance_km) parts.push(`${goal.distance_km}km`);
    
    return parts.join(' × ');
  }
}

// ============== EXERCISE HISTORY VIEWER ==============

class ExerciseHistoryViewer {
  constructor(api) {
    this.api = api;
  }

  async loadHistory(exerciseId, days = 90) {
    try {
      const history = await this.api.getExerciseHistory(exerciseId, days);
      return { success: true, history };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  renderStats(history) {
    const successRate = history.total_sessions > 0 
      ? Math.round((history.goals_achieved / history.total_sessions) * 100)
      : 0;

    const html = `
      <div class="history-stats">
        <h3>${history.exercise_name} - Stats</h3>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${history.total_sessions}</div>
            <div class="stat-label">Total Sessions</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-value">${successRate}%</div>
            <div class="stat-label">Success Rate</div>
          </div>
          
          ${history.max_weight_kg ? `
            <div class="stat-card">
              <div class="stat-value">${history.max_weight_kg}kg</div>
              <div class="stat-label">Personal Best (Weight)</div>
            </div>
          ` : ''}
          
          ${history.max_reps ? `
            <div class="stat-card">
              <div class="stat-value">${history.max_reps}</div>
              <div class="stat-label">Personal Best (Reps)</div>
            </div>
          ` : ''}
          
          ${history.average_weight_kg ? `
            <div class="stat-card">
              <div class="stat-value">${history.average_weight_kg.toFixed(1)}kg</div>
              <div class="stat-label">Average Weight</div>
            </div>
          ` : ''}
          
          ${history.average_reps ? `
            <div class="stat-card">
              <div class="stat-value">${Math.round(history.average_reps)}</div>
              <div class="stat-label">Average Reps</div>
            </div>
          ` : ''}
        </div>

        ${history.personal_best ? `
          <div class="personal-best">
            <h4>🏆 Personal Best</h4>
            <p>${new Date(history.personal_best.date).toLocaleDateString()}</p>
          </div>
        ` : ''}

        <div class="recent-results">
          <h4>Recent Results</h4>
          <ul>
            ${history.recent_results.map(r => `
              <li class="${r.achieved ? 'achieved' : 'not-achieved'}">
                <span>${new Date(r.created_at).toLocaleDateString()}</span>
                <span>${this.formatResult(r)}</span>
                <span class="badge">${r.achieved ? '✓' : '✗'}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
    
    return html;
  }

  formatResult(result) {
    const parts = [];
    if (result.weight_kg) parts.push(`${result.weight_kg}kg`);
    if (result.repetitions) parts.push(`${result.repetitions}×`);
    if (result.sets_completed) parts.push(`${result.sets_completed}s`);
    return parts.join(' ');
  }
}

// ============== EXAMPLE USAGE ==============

/*
// Initialize API
const api = new PerformanceAPI('/api/performance', localStorage.getItem('authToken'));

// Create and start a rest timer
const timer = new RestTimer('timerContainer', () => {
  console.log('Rest complete! Ready for next exercise');
});

timer.start(5, false); // sessionExerciseId=5, after exercise

// Manage goals
const goalManager = new ExerciseGoalManager(api);
const { goal, isNew } = await goalManager.loadOrCreateGoal(5, 'Bench Press');

// Record result
const resultRecorder = new ResultRecorder(api);
const result = await resultRecorder.recordExerciseResult(5, goal.id, {
  weight_kg: 50,
  repetitions: 10,
  sets_completed: 3,
  notes: 'Felt strong'
});

// View history
const historyViewer = new ExerciseHistoryViewer(api);
const { history } = await historyViewer.loadHistory(3, 90);
document.getElementById('historyContainer').innerHTML = historyViewer.renderStats(history);
*/

// ============== CSS STYLES (TO ADD TO YOUR STYLESHEET) ==============

/*
.timer-container {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  color: white;
}

.timer-display {
  font-size: 72px;
  font-weight: bold;
  font-family: monospace;
  margin: 20px 0;
}

.timer-progress {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
  margin: 20px 0;
}

.timer-progress-bar {
  height: 100%;
  background: #4CAF50;
  transition: width 1s linear;
}

.goal-form, .result-form {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.stat-card {
  background: white;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

.achieved {
  color: #4CAF50;
  font-weight: bold;
}

.not-achieved {
  color: #f44336;
}

.badge {
  margin-left: 10px;
  font-weight: bold;
  font-size: 16px;
}

.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 4px;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  z-index: 1000;
}

.notification-success {
  border-left: 4px solid #4CAF50;
  color: #2e7d32;
}
*/
