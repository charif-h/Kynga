from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Session as SessionModel, SessionExercise, Exercise, User
from app.schemas import (
    SessionCreate,
    SessionUpdate,
    SessionResponse,
    SessionExerciseCreate,
    SessionExerciseUpdate,
    SessionExerciseResponse
)
from app.auth import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[SessionResponse])
def get_user_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all sessions for the current user.
    """
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    
    result = []
    for session in sessions:
        session_exercises = db.query(SessionExercise).filter(
            SessionExercise.session_id == session.id
        ).all()
        
        exercises_data = []
        for se in session_exercises:
            exercise = db.query(Exercise).filter(Exercise.id == se.exercise_id).first()
            exercise_data = SessionExerciseResponse(
                id=se.id,
                session_id=se.session_id,
                exercise_id=se.exercise_id,
                exercise_name=exercise.name if exercise else None,
                weight_kg=se.weight_kg,
                calories=se.calories,
                time_minutes=se.time_minutes,
                repetitions=se.repetitions,
                notes=se.notes,
                created_at=se.created_at
            )
            exercises_data.append(exercise_data)
        
        session_data = SessionResponse(
            id=session.id,
            user_id=session.user_id,
            name=session.name,
            description=session.description,
            created_at=session.created_at,
            updated_at=session.updated_at,
            exercises=exercises_data
        )
        result.append(session_data)
    
    return result

@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific session by ID.
    """
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session_exercises = db.query(SessionExercise).filter(
        SessionExercise.session_id == session.id
    ).all()
    
    exercises_data = []
    for se in session_exercises:
        exercise = db.query(Exercise).filter(Exercise.id == se.exercise_id).first()
        exercise_data = SessionExerciseResponse(
            id=se.id,
            session_id=se.session_id,
            exercise_id=se.exercise_id,
            exercise_name=exercise.name if exercise else None,
            weight_kg=se.weight_kg,
            calories=se.calories,
            time_minutes=se.time_minutes,
            repetitions=se.repetitions,
            notes=se.notes,
            created_at=se.created_at
        )
        exercises_data.append(exercise_data)
    
    return SessionResponse(
        id=session.id,
        user_id=session.user_id,
        name=session.name,
        description=session.description,
        created_at=session.created_at,
        updated_at=session.updated_at,
        exercises=exercises_data
    )

@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new workout session.
    """
    # Create session
    db_session = SessionModel(
        user_id=current_user.id,
        name=session.name,
        description=session.description
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Add exercises to session
    exercises_data = []
    for exercise_data in session.exercises:
        # Verify exercise exists
        exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
        if not exercise:
            # Rollback and raise error
            db.delete(db_session)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exercise with id {exercise_data.exercise_id} not found"
            )
        
        # Validate at least one objective is set
        if not any([
            exercise_data.weight_kg,
            exercise_data.calories,
            exercise_data.time_minutes,
            exercise_data.repetitions
        ]):
            db.delete(db_session)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one objective (weight, calories, time, or repetitions) must be set"
            )
        
        db_session_exercise = SessionExercise(
            session_id=db_session.id,
            exercise_id=exercise_data.exercise_id,
            weight_kg=exercise_data.weight_kg,
            calories=exercise_data.calories,
            time_minutes=exercise_data.time_minutes,
            repetitions=exercise_data.repetitions,
            notes=exercise_data.notes
        )
        db.add(db_session_exercise)
        db.commit()
        db.refresh(db_session_exercise)
        
        exercises_data.append(SessionExerciseResponse(
            id=db_session_exercise.id,
            session_id=db_session_exercise.session_id,
            exercise_id=db_session_exercise.exercise_id,
            exercise_name=exercise.name,
            weight_kg=db_session_exercise.weight_kg,
            calories=db_session_exercise.calories,
            time_minutes=db_session_exercise.time_minutes,
            repetitions=db_session_exercise.repetitions,
            notes=db_session_exercise.notes,
            created_at=db_session_exercise.created_at
        ))
    
    return SessionResponse(
        id=db_session.id,
        user_id=db_session.user_id,
        name=db_session.name,
        description=db_session.description,
        created_at=db_session.created_at,
        updated_at=db_session.updated_at,
        exercises=exercises_data
    )

@router.put("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: int,
    session_update: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a session's basic information (name, description).
    Use separate endpoints to manage exercises within the session.
    """
    db_session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
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
    
    # Get exercises
    session_exercises = db.query(SessionExercise).filter(
        SessionExercise.session_id == db_session.id
    ).all()
    
    exercises_data = []
    for se in session_exercises:
        exercise = db.query(Exercise).filter(Exercise.id == se.exercise_id).first()
        exercise_data = SessionExerciseResponse(
            id=se.id,
            session_id=se.session_id,
            exercise_id=se.exercise_id,
            exercise_name=exercise.name if exercise else None,
            weight_kg=se.weight_kg,
            calories=se.calories,
            time_minutes=se.time_minutes,
            repetitions=se.repetitions,
            notes=se.notes,
            created_at=se.created_at
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

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a session and all its associated exercises.
    """
    db_session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()
    
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    db.delete(db_session)
    db.commit()
    return None

@router.post("/{session_id}/exercises", response_model=SessionExerciseResponse, status_code=status.HTTP_201_CREATED)
def add_exercise_to_session(
    session_id: int,
    exercise_data: SessionExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add an exercise to a session with objectives.
    """
    # Verify session exists and belongs to user
    db_session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
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
    
    # Validate at least one objective is set
    if not any([
        exercise_data.weight_kg,
        exercise_data.calories,
        exercise_data.time_minutes,
        exercise_data.repetitions
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one objective (weight, calories, time, or repetitions) must be set"
        )
    
    db_session_exercise = SessionExercise(
        session_id=session_id,
        exercise_id=exercise_data.exercise_id,
        weight_kg=exercise_data.weight_kg,
        calories=exercise_data.calories,
        time_minutes=exercise_data.time_minutes,
        repetitions=exercise_data.repetitions,
        notes=exercise_data.notes
    )
    db.add(db_session_exercise)
    db.commit()
    db.refresh(db_session_exercise)
    
    return SessionExerciseResponse(
        id=db_session_exercise.id,
        session_id=db_session_exercise.session_id,
        exercise_id=db_session_exercise.exercise_id,
        exercise_name=exercise.name,
        weight_kg=db_session_exercise.weight_kg,
        calories=db_session_exercise.calories,
        time_minutes=db_session_exercise.time_minutes,
        repetitions=db_session_exercise.repetitions,
        notes=db_session_exercise.notes,
        created_at=db_session_exercise.created_at
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
    Update objectives for an exercise in a session.
    """
    # Verify session exists and belongs to user
    db_session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
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
    
    update_data = exercise_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_session_exercise, field, value)
    
    # Validate at least one objective is set
    if not any([
        db_session_exercise.weight_kg,
        db_session_exercise.calories,
        db_session_exercise.time_minutes,
        db_session_exercise.repetitions
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one objective (weight, calories, time, or repetitions) must be set"
        )
    
    db.commit()
    db.refresh(db_session_exercise)
    
    exercise = db.query(Exercise).filter(Exercise.id == db_session_exercise.exercise_id).first()
    
    return SessionExerciseResponse(
        id=db_session_exercise.id,
        session_id=db_session_exercise.session_id,
        exercise_id=db_session_exercise.exercise_id,
        exercise_name=exercise.name if exercise else None,
        weight_kg=db_session_exercise.weight_kg,
        calories=db_session_exercise.calories,
        time_minutes=db_session_exercise.time_minutes,
        repetitions=db_session_exercise.repetitions,
        notes=db_session_exercise.notes,
        created_at=db_session_exercise.created_at
    )

@router.delete("/{session_id}/exercises/{session_exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_exercise_from_session(
    session_id: int,
    session_exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Remove an exercise from a session.
    """
    # Verify session exists and belongs to user
    db_session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
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
    
    db.delete(db_session_exercise)
    db.commit()
    return None
