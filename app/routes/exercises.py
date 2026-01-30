from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Exercise, ExerciseMuscle, ExerciseAccessory, User
from app.schemas import ExerciseCreate, ExerciseUpdate, ExerciseResponse
from app.auth import get_current_active_user

router = APIRouter()

@router.get("/", response_model=List[ExerciseResponse])
def get_exercises(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    group: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all exercises (public - no authentication required).
    Optionally filter by group.
    """
    query = db.query(Exercise)
    if group:
        query = query.filter(Exercise.group == group)
    
    exercises = query.offset(skip).limit(limit).all()
    
    # Add muscles and accessories to response
    result = []
    for exercise in exercises:
        muscles = db.query(ExerciseMuscle).filter(ExerciseMuscle.exercise_id == exercise.id).all()
        accessories = db.query(ExerciseAccessory).filter(ExerciseAccessory.exercise_id == exercise.id).all()
        
        exercise_data = ExerciseResponse(
            id=exercise.id,
            name=exercise.name,
            description=exercise.description,
            image_url=exercise.image_url,
            video_url=exercise.video_url,
            group=exercise.group,
            is_static=exercise.is_static,
            affected_muscles=[m.muscle_name for m in muscles],
            needed_accessories=[a.accessory_name for a in accessories],
            created_at=exercise.created_at
        )
        result.append(exercise_data)
    
    return result

@router.get("/{exercise_id}", response_model=ExerciseResponse)
def get_exercise(exercise_id: int, db: Session = Depends(get_db)):
    """
    Get a specific exercise by ID (public - no authentication required).
    """
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    muscles = db.query(ExerciseMuscle).filter(ExerciseMuscle.exercise_id == exercise.id).all()
    accessories = db.query(ExerciseAccessory).filter(ExerciseAccessory.exercise_id == exercise.id).all()
    
    return ExerciseResponse(
        id=exercise.id,
        name=exercise.name,
        description=exercise.description,
        image_url=exercise.image_url,
        video_url=exercise.video_url,
        group=exercise.group,
        is_static=exercise.is_static,
        affected_muscles=[m.muscle_name for m in muscles],
        needed_accessories=[a.accessory_name for a in accessories],
        created_at=exercise.created_at
    )

@router.post("/", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
def create_exercise(
    exercise: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new exercise (requires authentication).
    """
    # Check if exercise with same name already exists
    existing = db.query(Exercise).filter(Exercise.name == exercise.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exercise with this name already exists"
        )
    
    # Create exercise
    db_exercise = Exercise(
        name=exercise.name,
        description=exercise.description,
        image_url=exercise.image_url,
        video_url=exercise.video_url,
        group=exercise.group,
        is_static=exercise.is_static
    )
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    
    # Add muscles
    for muscle in exercise.affected_muscles:
        db_muscle = ExerciseMuscle(exercise_id=db_exercise.id, muscle_name=muscle)
        db.add(db_muscle)
    
    # Add accessories
    for accessory in exercise.needed_accessories:
        db_accessory = ExerciseAccessory(exercise_id=db_exercise.id, accessory_name=accessory)
        db.add(db_accessory)
    
    db.commit()
    
    return ExerciseResponse(
        id=db_exercise.id,
        name=db_exercise.name,
        description=db_exercise.description,
        image_url=db_exercise.image_url,
        video_url=db_exercise.video_url,
        group=db_exercise.group,
        is_static=db_exercise.is_static,
        affected_muscles=exercise.affected_muscles,
        needed_accessories=exercise.needed_accessories,
        created_at=db_exercise.created_at
    )

@router.put("/{exercise_id}", response_model=ExerciseResponse)
def update_exercise(
    exercise_id: int,
    exercise_update: ExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing exercise (requires authentication).
    """
    db_exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not db_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    # Update fields
    update_data = exercise_update.model_dump(exclude_unset=True)
    
    # Handle muscles and accessories separately
    affected_muscles = update_data.pop("affected_muscles", None)
    needed_accessories = update_data.pop("needed_accessories", None)
    
    for field, value in update_data.items():
        setattr(db_exercise, field, value)
    
    # Update muscles if provided
    if affected_muscles is not None:
        db.query(ExerciseMuscle).filter(ExerciseMuscle.exercise_id == exercise_id).delete()
        for muscle in affected_muscles:
            db_muscle = ExerciseMuscle(exercise_id=exercise_id, muscle_name=muscle)
            db.add(db_muscle)
    
    # Update accessories if provided
    if needed_accessories is not None:
        db.query(ExerciseAccessory).filter(ExerciseAccessory.exercise_id == exercise_id).delete()
        for accessory in needed_accessories:
            db_accessory = ExerciseAccessory(exercise_id=exercise_id, accessory_name=accessory)
            db.add(db_accessory)
    
    db.commit()
    db.refresh(db_exercise)
    
    # Get updated muscles and accessories
    muscles = db.query(ExerciseMuscle).filter(ExerciseMuscle.exercise_id == exercise_id).all()
    accessories = db.query(ExerciseAccessory).filter(ExerciseAccessory.exercise_id == exercise_id).all()
    
    return ExerciseResponse(
        id=db_exercise.id,
        name=db_exercise.name,
        description=db_exercise.description,
        image_url=db_exercise.image_url,
        video_url=db_exercise.video_url,
        group=db_exercise.group,
        is_static=db_exercise.is_static,
        affected_muscles=[m.muscle_name for m in muscles],
        needed_accessories=[a.accessory_name for a in accessories],
        created_at=db_exercise.created_at
    )

@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an exercise (requires authentication).
    """
    db_exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not db_exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    # Delete associated muscles and accessories
    db.query(ExerciseMuscle).filter(ExerciseMuscle.exercise_id == exercise_id).delete()
    db.query(ExerciseAccessory).filter(ExerciseAccessory.exercise_id == exercise_id).delete()
    
    db.delete(db_exercise)
    db.commit()
    return None
