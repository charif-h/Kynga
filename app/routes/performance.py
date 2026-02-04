from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.models import (
    User, Exercise, SessionExercise, ExerciseGoal, ExerciseResult, 
    SessionPerformance, WorkoutSession
)
from app.schemas import (
    ExerciseGoalCreate, ExerciseGoalUpdate, ExerciseGoalResponse,
    ExerciseResultCreate, ExerciseResultResponse,
    SessionPerformanceCreate, SessionPerformanceResponse,
    ExerciseHistoryStats
)
from app.auth import get_current_active_user

router = APIRouter()

# ============== EXERCISE GOAL ENDPOINTS ==============

@router.post("/goals", response_model=ExerciseGoalResponse, status_code=status.HTTP_201_CREATED)
def create_exercise_goal(
    goal: ExerciseGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new exercise goal for a session exercise"""
    
    # Verify session exercise exists and belongs to user
    session_exercise = db.query(SessionExercise).join(WorkoutSession).filter(
        SessionExercise.id == goal.session_exercise_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session exercise not found"
        )
    
    # Check if a goal already exists for this session exercise
    existing_goal = db.query(ExerciseGoal).filter(
        ExerciseGoal.session_exercise_id == goal.session_exercise_id,
        ExerciseGoal.user_id == current_user.id
    ).first()
    
    if existing_goal:
        # Update existing goal
        for field, value in goal.model_dump().items():
            if value is not None:
                setattr(existing_goal, field, value)
        db.commit()
        db.refresh(existing_goal)
        return ExerciseGoalResponse.model_validate(existing_goal)
    
    # Create new goal
    db_goal = ExerciseGoal(
        session_exercise_id=goal.session_exercise_id,
        user_id=current_user.id,
        **goal.model_dump(exclude={"session_exercise_id"})
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    
    return ExerciseGoalResponse.model_validate(db_goal)

@router.get("/goals/{session_exercise_id}", response_model=Optional[ExerciseGoalResponse])
def get_exercise_goal(
    session_exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get the goal for a specific session exercise"""
    
    goal = db.query(ExerciseGoal).join(SessionExercise).join(WorkoutSession).filter(
        ExerciseGoal.session_exercise_id == session_exercise_id,
        WorkoutSession.user_id == current_user.id,
        ExerciseGoal.user_id == current_user.id
    ).first()
    
    if not goal:
        return None
    
    return ExerciseGoalResponse.model_validate(goal)

@router.put("/goals/{goal_id}", response_model=ExerciseGoalResponse)
def update_exercise_goal(
    goal_id: int,
    goal_update: ExerciseGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an exercise goal"""
    
    db_goal = db.query(ExerciseGoal).filter(
        ExerciseGoal.id == goal_id,
        ExerciseGoal.user_id == current_user.id
    ).first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    update_data = goal_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_goal, field, value)
    
    db.commit()
    db.refresh(db_goal)
    
    return ExerciseGoalResponse.model_validate(db_goal)

@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an exercise goal"""
    
    db_goal = db.query(ExerciseGoal).filter(
        ExerciseGoal.id == goal_id,
        ExerciseGoal.user_id == current_user.id
    ).first()
    
    if not db_goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found"
        )
    
    db.delete(db_goal)
    db.commit()

# ============== EXERCISE RESULT ENDPOINTS ==============

@router.post("/results", response_model=ExerciseResultResponse, status_code=status.HTTP_201_CREATED)
def record_exercise_result(
    result: ExerciseResultCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record the actual performance after completing an exercise"""
    
    # Verify session exercise exists and belongs to user
    session_exercise = db.query(SessionExercise).join(WorkoutSession).filter(
        SessionExercise.id == result.session_exercise_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session exercise not found"
        )
    
    # Get the goal if provided
    goal = None
    goal_data = {
        "goal_weight_kg": None,
        "goal_repetitions": None,
        "goal_sets_count": None,
        "goal_time_minutes": None,
        "goal_distance_km": None,
        "goal_calories": None
    }
    
    if result.goal_id:
        goal = db.query(ExerciseGoal).filter(
            ExerciseGoal.id == result.goal_id,
            ExerciseGoal.user_id == current_user.id
        ).first()
        
        if goal:
            goal_data = {
                "goal_weight_kg": goal.weight_kg,
                "goal_repetitions": goal.repetitions,
                "goal_sets_count": goal.sets_count,
                "goal_time_minutes": goal.time_minutes,
                "goal_distance_km": goal.distance_km,
                "goal_calories": goal.calories
            }
    
    # Check if goals were achieved
    achieved = True
    if goal_data["goal_weight_kg"] is not None and result.weight_kg is not None:
        if result.weight_kg < goal_data["goal_weight_kg"]:
            achieved = False
    if goal_data["goal_repetitions"] is not None and result.repetitions is not None:
        if result.repetitions < goal_data["goal_repetitions"]:
            achieved = False
    if goal_data["goal_sets_count"] is not None and result.sets_completed is not None:
        if result.sets_completed < goal_data["goal_sets_count"]:
            achieved = False
    if goal_data["goal_time_minutes"] is not None and result.time_minutes is not None:
        if result.time_minutes < goal_data["goal_time_minutes"]:
            achieved = False
    if goal_data["goal_distance_km"] is not None and result.distance_km is not None:
        if result.distance_km < goal_data["goal_distance_km"]:
            achieved = False
    
    # Create result
    db_result = ExerciseResult(
        session_exercise_id=result.session_exercise_id,
        user_id=current_user.id,
        goal_id=result.goal_id,
        weight_kg=result.weight_kg,
        repetitions=result.repetitions,
        sets_completed=result.sets_completed,
        time_minutes=result.time_minutes,
        distance_km=result.distance_km,
        calories=result.calories,
        achieved=achieved,
        notes=result.notes,
        **goal_data
    )
    
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    
    return ExerciseResultResponse.model_validate(db_result)

@router.get("/results/session-exercise/{session_exercise_id}", response_model=List[ExerciseResultResponse])
def get_session_exercise_results(
    session_exercise_id: int,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all results for a specific session exercise"""
    
    # Verify session exercise belongs to user
    session_exercise = db.query(SessionExercise).join(WorkoutSession).filter(
        SessionExercise.id == session_exercise_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session exercise not found"
        )
    
    results = db.query(ExerciseResult).filter(
        ExerciseResult.session_exercise_id == session_exercise_id,
        ExerciseResult.user_id == current_user.id
    ).order_by(ExerciseResult.created_at.desc()).limit(limit).all()
    
    return [ExerciseResultResponse.model_validate(r) for r in results]

@router.get("/results/{result_id}", response_model=ExerciseResultResponse)
def get_exercise_result(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific exercise result"""
    
    result = db.query(ExerciseResult).filter(
        ExerciseResult.id == result_id,
        ExerciseResult.user_id == current_user.id
    ).first()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found"
        )
    
    return ExerciseResultResponse.model_validate(result)

@router.delete("/results/{result_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise_result(
    result_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an exercise result"""
    
    result = db.query(ExerciseResult).filter(
        ExerciseResult.id == result_id,
        ExerciseResult.user_id == current_user.id
    ).first()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Result not found"
        )
    
    db.delete(result)
    db.commit()

# ============== SESSION PERFORMANCE ENDPOINTS ==============

@router.post("", response_model=SessionPerformanceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/performance", response_model=SessionPerformanceResponse, status_code=status.HTTP_201_CREATED)
def record_session_performance(
    performance: SessionPerformanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record overall session performance"""
    
    # Verify session belongs to user
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == performance.session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    db_performance = SessionPerformance(
        session_id=performance.session_id,
        user_id=current_user.id,
        total_duration_minutes=performance.total_duration_minutes,
        exercises_completed=performance.exercises_completed,
        exercises_planned=performance.exercises_planned,
        goals_achieved=performance.goals_achieved,
        notes=performance.notes
    )
    
    db.add(db_performance)
    db.commit()
    db.refresh(db_performance)
    
    return SessionPerformanceResponse.model_validate(db_performance)

@router.get("/performance/session/{session_id}", response_model=Optional[SessionPerformanceResponse])
def get_session_performance(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get performance record for a specific session"""
    
    performance = db.query(SessionPerformance).filter(
        SessionPerformance.session_id == session_id,
        SessionPerformance.user_id == current_user.id
    ).first()
    
    if not performance:
        return None
    
    return SessionPerformanceResponse.model_validate(performance)

# ============== EXERCISE HISTORY & STATS ENDPOINTS ==============

@router.get("/history/{exercise_id}", response_model=ExerciseHistoryStats)
def get_exercise_history(
    exercise_id: int,
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get exercise history and statistics for the last N days"""
    
    # Verify exercise exists
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    # Get cutoff date
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Get results for this exercise in the timeframe
    results = db.query(ExerciseResult).join(SessionExercise).filter(
        SessionExercise.exercise_id == exercise_id,
        ExerciseResult.user_id == current_user.id,
        ExerciseResult.created_at >= cutoff_date
    ).order_by(ExerciseResult.created_at.desc()).all()
    
    # Calculate statistics
    total_sessions = len(results)
    goals_achieved = sum(1 for r in results if r.achieved)
    
    average_weight = None
    max_weight = None
    if any(r.weight_kg for r in results):
        weights = [r.weight_kg for r in results if r.weight_kg]
        average_weight = sum(weights) / len(weights)
        max_weight = max(weights)
    
    average_reps = None
    max_reps = None
    if any(r.repetitions for r in results):
        reps = [r.repetitions for r in results if r.repetitions]
        average_reps = sum(reps) / len(reps)
        max_reps = max(reps)
    
    # Personal best (most recent best achievement)
    personal_best = None
    achieved_results = [r for r in results if r.achieved]
    if achieved_results:
        best_result = achieved_results[0]
        personal_best = {
            "date": best_result.created_at,
            "weight_kg": best_result.weight_kg,
            "repetitions": best_result.repetitions,
            "sets": best_result.sets_completed,
            "time_minutes": best_result.time_minutes,
            "distance_km": best_result.distance_km,
            "calories": best_result.calories
        }
    
    # Recent results (limit to 10)
    recent_results = [ExerciseResultResponse.model_validate(r) for r in results[:10]]
    
    return ExerciseHistoryStats(
        exercise_id=exercise_id,
        exercise_name=exercise.name,
        total_sessions=total_sessions,
        goals_achieved=goals_achieved,
        average_weight_kg=average_weight,
        average_reps=int(average_reps) if average_reps else None,
        max_weight_kg=max_weight,
        max_reps=max_reps,
        personal_best=personal_best,
        recent_results=recent_results
    )

@router.get("/user-stats", response_model=List[ExerciseHistoryStats])
def get_user_exercise_stats(
    limit: int = Query(20, ge=1, le=100),
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get stats for all exercises the user has done"""
    
    cutoff_date = datetime.now() - timedelta(days=days)
    
    # Get all exercises the user has performed
    exercise_ids = db.query(Exercise.id).join(SessionExercise).join(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id
    ).distinct().limit(limit).all()
    
    stats = []
    for (exercise_id,) in exercise_ids:
        exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
        
        results = db.query(ExerciseResult).join(SessionExercise).filter(
            SessionExercise.exercise_id == exercise_id,
            ExerciseResult.user_id == current_user.id,
            ExerciseResult.created_at >= cutoff_date
        ).order_by(ExerciseResult.created_at.desc()).all()
        
        if results:
            total_sessions = len(results)
            goals_achieved = sum(1 for r in results if r.achieved)
            
            average_weight = None
            max_weight = None
            if any(r.weight_kg for r in results):
                weights = [r.weight_kg for r in results if r.weight_kg]
                average_weight = sum(weights) / len(weights)
                max_weight = max(weights)
            
            average_reps = None
            max_reps = None
            if any(r.repetitions for r in results):
                reps = [r.repetitions for r in results if r.repetitions]
                average_reps = sum(reps) / len(reps)
                max_reps = max(reps)
            
            recent_results = [ExerciseResultResponse.model_validate(r) for r in results[:5]]
            
            stats.append(ExerciseHistoryStats(
                exercise_id=exercise_id,
                exercise_name=exercise.name,
                total_sessions=total_sessions,
                goals_achieved=goals_achieved,
                average_weight_kg=average_weight,
                average_reps=int(average_reps) if average_reps else None,
                max_weight_kg=max_weight,
                max_reps=max_reps,
                personal_best=None,
                recent_results=recent_results
            ))
    
    # Sort by most recently done
    stats.sort(key=lambda x: x.recent_results[0].created_at if x.recent_results else datetime.min, reverse=True)
    
    return stats
