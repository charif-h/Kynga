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
    order_index: int = Field(1, ge=1)
    rest_after_exercise_minutes: float = Field(2.0, ge=0)
    notes: Optional[str] = None

class SessionExerciseCreate(SessionExerciseBase):
    pass

class SessionExerciseUpdate(BaseModel):
    order_index: Optional[int] = Field(None, ge=1)
    rest_after_exercise_minutes: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None

class SessionExerciseResponse(BaseModel):
    id: int
    session_id: int
    exercise_id: int
    order_index: int
    rest_after_exercise_minutes: float
    notes: Optional[str] = None
    created_at: datetime
    exercise_name: Optional[str] = None

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

# Program Schemas
class ProgramSessionBase(BaseModel):
    session_id: int
    order_index: int = Field(0, ge=0)

class ProgramSessionCreate(ProgramSessionBase):
    pass

class ProgramSessionResponse(ProgramSessionBase):
    id: int
    program_id: int
    session_name: Optional[str] = None

    class Config:
        from_attributes = True

class ProgramBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class ProgramCreate(ProgramBase):
    sessions: List[ProgramSessionCreate] = []

class ProgramUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None

class ProgramResponse(ProgramBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    sessions: List[ProgramSessionResponse] = []

    class Config:
        from_attributes = True

# Exercise Goal Schemas
class ExerciseGoalBase(BaseModel):
    weight_kg: Optional[float] = Field(None, ge=0)
    repetitions: Optional[int] = Field(None, ge=1)
    sets_count: Optional[int] = Field(None, ge=1)
    time_minutes: Optional[float] = Field(None, ge=0)
    distance_km: Optional[float] = Field(None, ge=0)
    calories: Optional[float] = Field(None, ge=0)

class ExerciseGoalCreate(ExerciseGoalBase):
    session_exercise_id: int

class ExerciseGoalUpdate(ExerciseGoalBase):
    pass

class ExerciseGoalResponse(ExerciseGoalBase):
    id: int
    session_exercise_id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Exercise Result Schemas
class ExerciseResultBase(BaseModel):
    weight_kg: Optional[float] = Field(None, ge=0)
    repetitions: Optional[int] = Field(None, ge=1)
    sets_completed: Optional[int] = Field(None, ge=1)
    time_minutes: Optional[float] = Field(None, ge=0)
    distance_km: Optional[float] = Field(None, ge=0)
    calories: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None

class ExerciseResultCreate(ExerciseResultBase):
    session_exercise_id: int
    goal_id: Optional[int] = None

class ExerciseResultResponse(ExerciseResultBase):
    id: int
    session_exercise_id: int
    user_id: int
    goal_id: Optional[int] = None
    goal_weight_kg: Optional[float] = None
    goal_repetitions: Optional[int] = None
    goal_sets_count: Optional[int] = None
    goal_time_minutes: Optional[float] = None
    goal_distance_km: Optional[float] = None
    goal_calories: Optional[float] = None
    achieved: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Session Performance Schemas
class SessionPerformanceBase(BaseModel):
    total_duration_minutes: Optional[float] = Field(None, ge=0)
    exercises_completed: int = Field(0, ge=0)
    exercises_planned: int = Field(0, ge=0)
    goals_achieved: int = Field(0, ge=0)
    notes: Optional[str] = None

class SessionPerformanceCreate(SessionPerformanceBase):
    session_id: int

class SessionPerformanceResponse(SessionPerformanceBase):
    id: int
    session_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Exercise History Schemas
class ExerciseHistoryStats(BaseModel):
    """Statistics for an exercise over time"""
    exercise_id: int
    exercise_name: str
    total_sessions: int
    goals_achieved: int
    average_weight_kg: Optional[float] = None
    average_reps: Optional[int] = None
    max_weight_kg: Optional[float] = None
    max_reps: Optional[int] = None
    personal_best: Optional[dict] = None
    recent_results: List[ExerciseResultResponse] = []

    class Config:
        from_attributes = True