from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import WorkoutSession, SessionExercise, ExerciseSet, Exercise, User
from app.schemas import (
    SessionCreate,
    SessionUpdate,
    SessionResponse,
    SessionExerciseCreate,
    SessionExerciseUpdate,
    SessionExerciseResponse,
    ExerciseSetBase,
    ExerciseSetResponse
)
from app.auth import get_current_active_user

router = APIRouter()

def build_session_response(db_session: WorkoutSession, db: Session) -> SessionResponse:
    """Helper function to build session response with all exercises and sets"""
    session_exercises = db.query(SessionExercise).filter(
        SessionExercise.session_id == db_session.id
    ).order_by(SessionExercise.order_index, SessionExercise.id).all()
    
    exercises_data = []
    for se in session_exercises:
        exercise = db.query(Exercise).filter(Exercise.id == se.exercise_id).first()
        
        # Get all sets for this session exercise
        sets = db.query(ExerciseSet).filter(
            ExerciseSet.session_exercise_id == se.id
        ).order_by(ExerciseSet.set_number).all()
        
        sets_data = [ExerciseSetResponse(
            id=s.id,
            session_exercise_id=s.session_exercise_id,
            set_number=s.set_number,
            weight_kg=s.weight_kg,
            calories=s.calories,
            time_minutes=s.time_minutes,
            repetitions=s.repetitions,
            distance_km=s.distance_km,
            created_at=s.created_at
        ) for s in sets]
        
        exercise_data = SessionExerciseResponse(
            id=se.id,
            session_id=se.session_id,
            exercise_id=se.exercise_id,
            order_index=se.order_index,
            rest_between_sets_minutes=se.rest_between_sets_minutes,
            rest_after_exercise_minutes=se.rest_after_exercise_minutes,
            exercise_name=exercise.name if exercise else None,
            notes=se.notes,
            created_at=se.created_at,
            sets=sets_data
        )
        exercises_data.append(exercise_data)
    
    return SessionResponse(
        id=db_session.id,
        user_id=db_session.user_id,
        name=db_session.name,
        description=db_session.description,
        created_at=db_session.created_at,
        updated_at=db_session.updated_at,
        exercises=exercises_data
    )

@router.get("/", response_model=List[SessionResponse])
def get_user_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all sessions for the current user"""
    sessions = db.query(WorkoutSession).filter(
        WorkoutSession.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    return [build_session_response(session, db) for session in sessions]

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific session by ID"""
    session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return build_session_response(session, db)

@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new workout session"""
    db_session = WorkoutSession(
        user_id=current_user.id,
        name=session.name,
        description=session.description
    )
    db.add(db_session)
    db.flush()
    
    # Add exercises to session
    for exercise_data in session.exercises:
        # Verify exercise exists
        exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
        if not exercise:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exercise with id {exercise_data.exercise_id} not found"
            )
        
        # Validate at least one set is provided
        if not exercise_data.sets:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one set must be provided for each exercise"
            )
        
        db_session_exercise = SessionExercise(
            session_id=db_session.id,
            exercise_id=exercise_data.exercise_id,
            order_index=exercise_data.order_index,
            rest_between_sets_minutes=exercise_data.rest_between_sets_minutes,
            rest_after_exercise_minutes=exercise_data.rest_after_exercise_minutes,
            notes=exercise_data.notes
        )
        db.add(db_session_exercise)
        db.flush()
        
        # Add sets for this exercise
        for set_data in exercise_data.sets:
            exercise_set = ExerciseSet(
                session_exercise_id=db_session_exercise.id,
                set_number=set_data.set_number,
                weight_kg=set_data.weight_kg,
                calories=set_data.calories,
                time_minutes=set_data.time_minutes,
                repetitions=set_data.repetitions,
                distance_km=set_data.distance_km
            )
            db.add(exercise_set)
    
    db.commit()
    db.refresh(db_session)
    return build_session_response(db_session, db)

@router.put("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: int,
    session_update: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a session's basic information"""
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    update_data = session_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_session, field, value)
    
    db.commit()
    db.refresh(db_session)
    return build_session_response(db_session, db)

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a session and all its associated exercises and sets"""
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    db.delete(db_session)
    db.commit()

@router.post("/{session_id}/exercises", response_model=SessionExerciseResponse, status_code=status.HTTP_201_CREATED)
def add_exercise_to_session(
    session_id: int,
    exercise_data: SessionExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add an exercise with sets to a session"""
    # Verify session exists and belongs to user
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Verify exercise exists
    exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exercise with id {exercise_data.exercise_id} not found"
        )
    
    # Validate at least one set is provided
    if not exercise_data.sets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one set must be provided"
        )
    
    db_session_exercise = SessionExercise(
        session_id=session_id,
        exercise_id=exercise_data.exercise_id,
        order_index=exercise_data.order_index,
        rest_between_sets_minutes=exercise_data.rest_between_sets_minutes,
        rest_after_exercise_minutes=exercise_data.rest_after_exercise_minutes,
        notes=exercise_data.notes
    )
    db.add(db_session_exercise)
    db.flush()
    
    # Add sets
    sets_data = []
    for set_data in exercise_data.sets:
        exercise_set = ExerciseSet(
            session_exercise_id=db_session_exercise.id,
            set_number=set_data.set_number,
            weight_kg=set_data.weight_kg,
            calories=set_data.calories,
            time_minutes=set_data.time_minutes,
            repetitions=set_data.repetitions,
            distance_km=set_data.distance_km
        )
        db.add(exercise_set)
        db.flush()
        sets_data.append(ExerciseSetResponse(
            id=exercise_set.id,
            session_exercise_id=exercise_set.session_exercise_id,
            set_number=exercise_set.set_number,
            weight_kg=exercise_set.weight_kg,
            calories=exercise_set.calories,
            time_minutes=exercise_set.time_minutes,
            repetitions=exercise_set.repetitions,
            distance_km=exercise_set.distance_km,
            created_at=exercise_set.created_at
        ))
    
    db.commit()
    db.refresh(db_session_exercise)
    
    return SessionExerciseResponse(
        id=db_session_exercise.id,
        session_id=db_session_exercise.session_id,
        exercise_id=db_session_exercise.exercise_id,
        order_index=db_session_exercise.order_index,
        rest_between_sets_minutes=db_session_exercise.rest_between_sets_minutes,
        rest_after_exercise_minutes=db_session_exercise.rest_after_exercise_minutes,
        exercise_name=exercise.name,
        notes=db_session_exercise.notes,
        created_at=db_session_exercise.created_at,
        sets=sets_data
    )

@router.put("/{session_id}/exercises/{session_exercise_id}", response_model=SessionExerciseResponse)
def update_session_exercise(
    session_id: int,
    session_exercise_id: int,
    exercise_update: SessionExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an exercise's notes or sets in a session.
    """
    # Verify session exists and belongs to user
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get session exercise
    db_session_exercise = db.query(SessionExercise).filter(
        SessionExercise.id == session_exercise_id,
        SessionExercise.session_id == session_id
    ).first()
    
    if not db_session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this session"
        )
    
    # Update notes if provided
    update_data = exercise_update.model_dump(exclude_unset=True)
    if "notes" in update_data:
        db_session_exercise.notes = update_data["notes"]
    if "order_index" in update_data:
        db_session_exercise.order_index = update_data["order_index"]
    if "rest_between_sets_minutes" in update_data:
        db_session_exercise.rest_between_sets_minutes = update_data["rest_between_sets_minutes"]
    if "rest_after_exercise_minutes" in update_data:
        db_session_exercise.rest_after_exercise_minutes = update_data["rest_after_exercise_minutes"]
    
    # Update sets if provided
    if "sets" in update_data and update_data["sets"]:
        # Delete existing sets and create new ones
        db.query(ExerciseSet).filter(
            ExerciseSet.session_exercise_id == session_exercise_id
        ).delete()
        
        for set_data in update_data["sets"]:
            exercise_set = ExerciseSet(
                session_exercise_id=session_exercise_id,
                set_number=set_data.set_number,
                weight_kg=set_data.weight_kg,
                calories=set_data.calories,
                time_minutes=set_data.time_minutes,
                repetitions=set_data.repetitions,
                distance_km=set_data.distance_km
            )
            db.add(exercise_set)
    
    db.commit()
    db.refresh(db_session_exercise)
    
    exercise = db.query(Exercise).filter(Exercise.id == db_session_exercise.exercise_id).first()
    
    # Get all sets
    sets = db.query(ExerciseSet).filter(
        ExerciseSet.session_exercise_id == session_exercise_id
    ).order_by(ExerciseSet.set_number).all()
    
    sets_data = [ExerciseSetResponse(
        id=s.id,
        session_exercise_id=s.session_exercise_id,
        set_number=s.set_number,
        weight_kg=s.weight_kg,
        calories=s.calories,
        time_minutes=s.time_minutes,
        repetitions=s.repetitions,
        distance_km=s.distance_km,
        created_at=s.created_at
    ) for s in sets]
    
    return SessionExerciseResponse(
        id=db_session_exercise.id,
        session_id=db_session_exercise.session_id,
        exercise_id=db_session_exercise.exercise_id,
        order_index=db_session_exercise.order_index,
        rest_between_sets_minutes=db_session_exercise.rest_between_sets_minutes,
        rest_after_exercise_minutes=db_session_exercise.rest_after_exercise_minutes,
        exercise_name=exercise.name if exercise else None,
        notes=db_session_exercise.notes,
        created_at=db_session_exercise.created_at,
        sets=sets_data
    )

@router.delete("/{session_id}/exercises/{session_exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_exercise_from_session(
    session_id: int,
    session_exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove an exercise from a session"""
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    db_session_exercise = db.query(SessionExercise).filter(
        SessionExercise.id == session_exercise_id,
        SessionExercise.session_id == session_id
    ).first()
    
    if not db_session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this session"
        )
    
    db.delete(db_session_exercise)
    db.commit()

@router.post("/{session_id}/exercises/{session_exercise_id}/sets", response_model=ExerciseSetResponse, status_code=status.HTTP_201_CREATED)
def add_set_to_exercise(
    session_id: int,
    session_exercise_id: int,
    set_data: ExerciseSetBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a new set to an exercise in a session"""
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    db_session_exercise = db.query(SessionExercise).filter(
        SessionExercise.id == session_exercise_id,
        SessionExercise.session_id == session_id
    ).first()
    
    if not db_session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this session"
        )
    
    exercise_set = ExerciseSet(
        session_exercise_id=session_exercise_id,
        set_number=set_data.set_number,
        weight_kg=set_data.weight_kg,
        calories=set_data.calories,
        time_minutes=set_data.time_minutes,
        repetitions=set_data.repetitions,
        distance_km=set_data.distance_km
    )
    db.add(exercise_set)
    db.commit()
    db.refresh(exercise_set)
    
    return ExerciseSetResponse(
        id=exercise_set.id,
        session_exercise_id=exercise_set.session_exercise_id,
        set_number=exercise_set.set_number,
        weight_kg=exercise_set.weight_kg,
        calories=exercise_set.calories,
        time_minutes=exercise_set.time_minutes,
        repetitions=exercise_set.repetitions,
        distance_km=exercise_set.distance_km,
        created_at=exercise_set.created_at
    )

@router.delete("/{session_id}/exercises/{session_exercise_id}/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(
    session_id: int,
    session_exercise_id: int,
    set_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a specific set from an exercise"""
    db_session = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    db_session_exercise = db.query(SessionExercise).filter(
        SessionExercise.id == session_exercise_id,
        SessionExercise.session_id == session_id
    ).first()
    
    if not db_session_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found in this session"
        )
    
    exercise_set = db.query(ExerciseSet).filter(
        ExerciseSet.id == set_id,
        ExerciseSet.session_exercise_id == session_exercise_id
    ).first()
    
    if not exercise_set:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Set not found"
        )
    
    db.delete(exercise_set)
    db.commit()
