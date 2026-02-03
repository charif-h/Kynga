"""
Rest Timer Management for Kynga

This module provides utilities for managing rest periods between exercises.
The frontend should use WebSockets or polling to track timer progress.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from app.database import get_db
from app.models import User, SessionExercise, WorkoutSession
from app.auth import get_current_active_user

router = APIRouter()

class RestTimerRequest(BaseModel):
    """Request for calculating rest time between exercises"""
    session_exercise_id: int
    between_sets: bool = False  # True if rest is between sets, False if rest is after exercise

class RestTimerResponse(BaseModel):
    """Response with rest time information"""
    session_exercise_id: int
    rest_duration_seconds: int
    between_sets: bool
    message: str
    
    class Config:
        from_attributes = True

@router.post("/rest-timer", response_model=RestTimerResponse)
def get_rest_timer(
    timer_request: RestTimerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get rest timer information for an exercise.
    
    Returns the duration of rest needed based on whether it's between sets or after exercise.
    """
    
    # Verify session exercise exists and belongs to user
    session_exercise = db.query(SessionExercise).join(WorkoutSession).filter(
        SessionExercise.id == timer_request.session_exercise_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session exercise not found"
        )
    
    if timer_request.between_sets:
        rest_minutes = session_exercise.rest_between_sets_minutes
        message = f"Rest {rest_minutes} minutes between sets"
    else:
        rest_minutes = session_exercise.rest_after_exercise_minutes
        message = f"Rest {rest_minutes} minutes after this exercise"
    
    rest_seconds = int(rest_minutes * 60)
    
    return RestTimerResponse(
        session_exercise_id=timer_request.session_exercise_id,
        rest_duration_seconds=rest_seconds,
        between_sets=timer_request.between_sets,
        message=message
    )

class SessionRestSchedule(BaseModel):
    """Complete rest schedule for a workout session"""
    session_id: int
    exercises: list[dict]  # List of exercises with their rest periods
    total_rest_minutes: float
    
    class Config:
        from_attributes = True

@router.get("/session-rest-schedule/{session_id}", response_model=SessionRestSchedule)
def get_session_rest_schedule(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the complete rest schedule for a workout session.
    Shows all rest periods needed between and after exercises.
    """
    
    # Verify session belongs to user
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get all session exercises in order
    session_exercises = db.query(SessionExercise).filter(
        SessionExercise.session_id == session_id
    ).order_by(SessionExercise.order_index).all()
    
    exercises_info = []
    total_rest_minutes = 0
    
    for se in session_exercises:
        exercise_data = {
            "id": se.id,
            "exercise_id": se.exercise_id,
            "order_index": se.order_index,
            "rest_between_sets_minutes": se.rest_between_sets_minutes,
            "rest_after_exercise_minutes": se.rest_after_exercise_minutes,
        }
        exercises_info.append(exercise_data)
        total_rest_minutes += se.rest_after_exercise_minutes
        # Note: rest_between_sets depends on number of sets, added per set
        if se.sets:
            total_rest_minutes += (len(se.sets) - 1) * se.rest_between_sets_minutes
    
    return SessionRestSchedule(
        session_id=session_id,
        exercises=exercises_info,
        total_rest_minutes=total_rest_minutes
    )

"""
FRONTEND TIMER IMPLEMENTATION GUIDE:
====================================

For the rest timer functionality in your frontend, you should:

1. When user completes an exercise, call POST /api/performance/rest-timer
   with the session_exercise_id and whether it's between sets

2. Display a countdown timer on the frontend using the rest_duration_seconds
   
3. You can optionally use WebSockets for real-time updates or simple polling

4. When timer expires, notify the user it's time for the next exercise/set

5. To get the full schedule before starting a session, call:
   GET /api/performance/session-rest-schedule/{session_id}

Example Frontend Timer Implementation (JavaScript):

```javascript
async function startRestTimer(sessionExerciseId, betweenSets = false) {
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
  
  // Display countdown timer
  let remaining = restSeconds;
  const timerInterval = setInterval(() => {
    remaining--;
    
    // Update UI with remaining time
    document.getElementById('timer').innerText = 
      `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;
    
    if (remaining <= 0) {
      clearInterval(timerInterval);
      // Notify user - ready for next exercise/set
      showNotification('Ready! Start your next ' + 
        (betweenSets ? 'set' : 'exercise'));
    }
  }, 1000);
}
```
"""
