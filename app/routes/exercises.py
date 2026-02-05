from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
from uuid import uuid4
import shutil
from app.database import get_db
from app.models import Exercise, ExerciseMuscle, ExerciseAccessory, ExerciseMedia, User
from app.schemas import ExerciseCreate, ExerciseUpdate, ExerciseResponse, ExerciseMediaResponse
from app.auth import get_current_active_user

router = APIRouter()

MEDIA_ROOT = Path("media") / "exercises"
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}

def build_media_response(media_items: List[ExerciseMedia]) -> List[ExerciseMediaResponse]:
    return [
        ExerciseMediaResponse(
            id=item.id,
            media_type=item.media_type,
            url=item.url,
            filename=item.filename,
            created_at=item.created_at
        )
        for item in media_items
    ]

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
        media_items = db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id == exercise.id).all()
        
        profile_media_url = None
        if exercise.profile_media_id:
            profile_media = db.query(ExerciseMedia).filter(ExerciseMedia.id == exercise.profile_media_id).first()
            if profile_media:
                profile_media_url = profile_media.url
        
        exercise_data = ExerciseResponse(
            id=exercise.id,
            name=exercise.name,
            description=exercise.description,
            image_url=exercise.image_url,
            video_url=exercise.video_url,
            group=exercise.group,
            is_static=exercise.is_static,
            has_time=exercise.has_time,
            has_repetitions=exercise.has_repetitions,
            has_weight=exercise.has_weight,
            has_distance=exercise.has_distance,
            has_calories=exercise.has_calories,
            affected_muscles=[m.muscle_name for m in muscles],
            needed_accessories=[a.accessory_name for a in accessories],
            created_at=exercise.created_at,
            media=build_media_response(media_items),
            profile_media_id=exercise.profile_media_id,
            profile_media_url=profile_media_url
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
    media_items = db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id == exercise.id).all()
    
    profile_media_url = None
    if exercise.profile_media_id:
        profile_media = db.query(ExerciseMedia).filter(ExerciseMedia.id == exercise.profile_media_id).first()
        if profile_media:
            profile_media_url = profile_media.url
    
    return ExerciseResponse(
        id=exercise.id,
        name=exercise.name,
        description=exercise.description,
        image_url=exercise.image_url,
        video_url=exercise.video_url,
        group=exercise.group,
        is_static=exercise.is_static,
        has_time=exercise.has_time,
        has_repetitions=exercise.has_repetitions,
        has_weight=exercise.has_weight,
        has_distance=exercise.has_distance,
        has_calories=exercise.has_calories,
        affected_muscles=[m.muscle_name for m in muscles],
        needed_accessories=[a.accessory_name for a in accessories],
        created_at=exercise.created_at,
        media=build_media_response(media_items),
        profile_media_id=exercise.profile_media_id,
        profile_media_url=profile_media_url
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
        is_static=exercise.is_static,
        has_time=exercise.has_time,
        has_repetitions=exercise.has_repetitions,
        has_weight=exercise.has_weight,
        has_distance=exercise.has_distance,
        has_calories=exercise.has_calories
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
        has_time=db_exercise.has_time,
        has_repetitions=db_exercise.has_repetitions,
        has_weight=db_exercise.has_weight,
        has_distance=db_exercise.has_distance,
        has_calories=db_exercise.has_calories,
        affected_muscles=exercise.affected_muscles,
        needed_accessories=exercise.needed_accessories,
        created_at=db_exercise.created_at,
        media=[],
        profile_media_id=None,
        profile_media_url=None
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
    media_items = db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id == exercise_id).all()
    
    profile_media_url = None
    if db_exercise.profile_media_id:
        profile_media = db.query(ExerciseMedia).filter(ExerciseMedia.id == db_exercise.profile_media_id).first()
        if profile_media:
            profile_media_url = profile_media.url
    
    return ExerciseResponse(
        id=db_exercise.id,
        name=db_exercise.name,
        description=db_exercise.description,
        image_url=db_exercise.image_url,
        video_url=db_exercise.video_url,
        group=db_exercise.group,
        is_static=db_exercise.is_static,
        has_time=db_exercise.has_time,
        has_repetitions=db_exercise.has_repetitions,
        has_weight=db_exercise.has_weight,
        has_distance=db_exercise.has_distance,
        has_calories=db_exercise.has_calories,
        affected_muscles=[m.muscle_name for m in muscles],
        needed_accessories=[a.accessory_name for a in accessories],
        created_at=db_exercise.created_at,
        media=build_media_response(media_items),
        profile_media_id=db_exercise.profile_media_id,
        profile_media_url=profile_media_url
    )

@router.get("/{exercise_id}/media", response_model=List[ExerciseMediaResponse])
def list_exercise_media(exercise_id: int, db: Session = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )

    media_items = db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id == exercise_id).all()
    return build_media_response(media_items)

@router.post("/{exercise_id}/media", response_model=ExerciseMediaResponse, status_code=status.HTTP_201_CREATED)
def upload_exercise_media(
    exercise_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )

    content_type = file.content_type or ""
    if content_type in ALLOWED_IMAGE_TYPES:
        media_type = "image"
        suffix = ALLOWED_IMAGE_TYPES[content_type]
    elif content_type in ALLOWED_VIDEO_TYPES:
        media_type = "video"
        suffix = ALLOWED_VIDEO_TYPES[content_type]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported media type"
        )

    media_dir = MEDIA_ROOT / str(exercise_id)
    media_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4().hex}{suffix}"
    file_path = media_dir / filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url = f"/media/exercises/{exercise_id}/{filename}"
    db_media = ExerciseMedia(
        exercise_id=exercise_id,
        media_type=media_type,
        url=url,
        filename=filename
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)

    return ExerciseMediaResponse(
        id=db_media.id,
        media_type=db_media.media_type,
        url=db_media.url,
        filename=db_media.filename,
        created_at=db_media.created_at
    )

@router.delete("/{exercise_id}/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise_media(
    exercise_id: int,
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    media_item = db.query(ExerciseMedia).filter(
        ExerciseMedia.id == media_id,
        ExerciseMedia.exercise_id == exercise_id
    ).first()
    if not media_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )

    file_path = MEDIA_ROOT / str(exercise_id) / media_item.filename
    if file_path.exists():
        file_path.unlink()

    db.delete(media_item)
    db.commit()

@router.put("/{exercise_id}/profile-media/{media_id}", response_model=ExerciseResponse)
def set_profile_media(
    exercise_id: int,
    media_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Set a media item as the profile image for an exercise."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found"
        )
    
    media_item = db.query(ExerciseMedia).filter(
        ExerciseMedia.id == media_id,
        ExerciseMedia.exercise_id == exercise_id
    ).first()
    if not media_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    # Only allow images as profile media
    if media_item.media_type != "image":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only images can be set as profile media"
        )
    
    exercise.profile_media_id = media_id
    db.commit()
    db.refresh(exercise)
    
    # Build response
    muscles = db.query(ExerciseMuscle).filter(ExerciseMuscle.exercise_id == exercise_id).all()
    accessories = db.query(ExerciseAccessory).filter(ExerciseAccessory.exercise_id == exercise_id).all()
    media_items = db.query(ExerciseMedia).filter(ExerciseMedia.exercise_id == exercise_id).all()
    
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
        created_at=exercise.created_at,
        media=build_media_response(media_items),
        profile_media_id=exercise.profile_media_id,
        profile_media_url=media_item.url
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
