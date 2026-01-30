from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

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

class ExerciseResponse(ExerciseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Session Exercise Schemas
class SessionExerciseBase(BaseModel):
    exercise_id: int
    weight_kg: Optional[float] = None
    calories: Optional[float] = None
    time_minutes: Optional[float] = None
    repetitions: Optional[int] = None
    notes: Optional[str] = None

class SessionExerciseCreate(SessionExerciseBase):
    pass

class SessionExerciseUpdate(BaseModel):
    weight_kg: Optional[float] = None
    calories: Optional[float] = None
    time_minutes: Optional[float] = None
    repetitions: Optional[int] = None
    notes: Optional[str] = None

class SessionExerciseResponse(SessionExerciseBase):
    id: int
    session_id: int
    exercise_name: Optional[str] = None
    created_at: datetime

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
