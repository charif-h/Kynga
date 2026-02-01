from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=72)

class UserLogin(BaseModel):
    username: str
    password: str = Field(..., max_length=72)

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Exercise Schemas
class ExerciseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    group: str = Field(..., min_length=1, max_length=50)
    is_static: bool = False
    affected_muscles: List[str] = []
    needed_accessories: List[str] = []
    has_time: bool = False
    has_repetitions: bool = False
    has_weight: bool = False
    has_distance: bool = False
    has_calories: bool = False

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    group: Optional[str] = Field(None, min_length=1, max_length=50)
    is_static: Optional[bool] = None
    affected_muscles: Optional[List[str]] = None
    needed_accessories: Optional[List[str]] = None
    has_time: Optional[bool] = None
    has_repetitions: Optional[bool] = None
    has_weight: Optional[bool] = None
    has_distance: Optional[bool] = None
    has_calories: Optional[bool] = None

class ExerciseMediaResponse(BaseModel):
    id: int
    media_type: str
    url: str
    filename: str
    created_at: datetime

    class Config:
        from_attributes = True

class ExerciseResponse(ExerciseBase):
    id: int
    created_at: datetime
    media: List[ExerciseMediaResponse] = []
    profile_media_id: Optional[int] = None
    profile_media_url: Optional[str] = None

    class Config:
        from_attributes = True

# Exercise Set Schemas
class ExerciseSetBase(BaseModel):
    set_number: int = Field(..., ge=1)
    weight_kg: Optional[float] = Field(None, ge=0)
    calories: Optional[float] = Field(None, ge=0)
    time_minutes: Optional[float] = Field(None, ge=0)
    repetitions: Optional[int] = Field(None, ge=0)
    distance_km: Optional[float] = Field(None, ge=0)

class ExerciseSetCreate(ExerciseSetBase):
    pass

class ExerciseSetResponse(ExerciseSetBase):
    id: int
    session_exercise_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Session Exercise Schemas
class SessionExerciseBase(BaseModel):
    exercise_id: int
    notes: Optional[str] = None
    sets: List[ExerciseSetBase] = []

class SessionExerciseCreate(SessionExerciseBase):
    pass

class SessionExerciseUpdate(BaseModel):
    notes: Optional[str] = None
    sets: Optional[List[ExerciseSetBase]] = None

class SessionExerciseResponse(BaseModel):
    id: int
    session_id: int
    exercise_id: int
    notes: Optional[str] = None
    created_at: datetime
    exercise_name: Optional[str] = None
    sets: List[ExerciseSetResponse] = []

    class Config:
        from_attributes = True
# Session Schemas
class SessionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class SessionCreate(SessionBase):
    exercises: List[SessionExerciseCreate] = []

class SessionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None

class SessionResponse(SessionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    exercises: List[SessionExerciseResponse] = []

    class Config:
        from_attributes = True