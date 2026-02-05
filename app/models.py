from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
    programs = relationship("Program", cascade="all, delete-orphan")

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    group = Column(String(50), nullable=False)  # binding, musculation, yoga, etc.
    is_static = Column(Boolean, default=False)  # True for static, False for repeated movement
    profile_media_id = Column(Integer, nullable=True)
    
    # Metrics - which measurements apply to this exercise
    has_time = Column(Boolean, default=False)
    has_repetitions = Column(Boolean, default=False)
    has_weight = Column(Boolean, default=False)
    has_distance = Column(Boolean, default=False)
    has_calories = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session_exercises = relationship("SessionExercise", back_populates="exercise")
    media = relationship("ExerciseMedia", back_populates="exercise", cascade="all, delete-orphan", foreign_keys="ExerciseMedia.exercise_id")

class WorkoutSession(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="sessions")
    session_exercises = relationship("SessionExercise", back_populates="session", cascade="all, delete-orphan")
    program_sessions = relationship("ProgramSession", back_populates="session", cascade="all, delete-orphan")

class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
    sessions = relationship("ProgramSession", back_populates="program", cascade="all, delete-orphan")

class ProgramSession(Base):
    __tablename__ = "program_sessions"

    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    order_index = Column(Integer, nullable=False, default=1)

    program = relationship("Program", back_populates="sessions")
    session = relationship("WorkoutSession", back_populates="program_sessions")

class SessionExercise(Base):
    __tablename__ = "session_exercises"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    order_index = Column(Integer, nullable=False, default=1)
    rest_after_exercise_minutes = Column(Float, nullable=False, default=2.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("WorkoutSession", back_populates="session_exercises")
    exercise = relationship("Exercise", back_populates="session_exercises")
    sets = relationship("ExerciseSet", back_populates="session_exercise", cascade="all, delete-orphan")

class ExerciseSet(Base):
    __tablename__ = "exercise_sets"

    id = Column(Integer, primary_key=True, index=True)
    session_exercise_id = Column(Integer, ForeignKey("session_exercises.id"), nullable=False)
    set_number = Column(Integer, nullable=False)  # Set 1, 2, 3, etc.
    weight_kg = Column(Float, nullable=True)
    calories = Column(Float, nullable=True)
    time_minutes = Column(Float, nullable=True)
    repetitions = Column(Integer, nullable=True)
    distance_km = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session_exercise = relationship("SessionExercise", back_populates="sets")

class ExerciseMuscle(Base):
    __tablename__ = "exercise_muscles_detail"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    muscle_name = Column(String(100), nullable=False)

class ExerciseAccessory(Base):
    __tablename__ = "exercise_accessories_detail"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    accessory_name = Column(String(100), nullable=False)

class ExerciseMedia(Base):
    __tablename__ = "exercise_media"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    media_type = Column(String(20), nullable=False)  # image or video
    url = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    exercise = relationship("Exercise", back_populates="media")
class ExerciseGoal(Base):
    """Store exercise objectives for a specific session exercise"""
    __tablename__ = "exercise_goals"

    id = Column(Integer, primary_key=True, index=True)
    session_exercise_id = Column(Integer, ForeignKey("session_exercises.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Objectives
    weight_kg = Column(Float, nullable=True)
    repetitions = Column(Integer, nullable=True)
    sets_count = Column(Integer, nullable=True)
    time_minutes = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    calories = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    session_exercise = relationship("SessionExercise")
    user = relationship("User")

class ExerciseResult(Base):
    """Store the actual performance results after completing an exercise"""
    __tablename__ = "exercise_results"

    id = Column(Integer, primary_key=True, index=True)
    session_exercise_id = Column(Integer, ForeignKey("session_exercises.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_id = Column(Integer, ForeignKey("exercise_goals.id"), nullable=True)
    
    # Actual performance
    weight_kg = Column(Float, nullable=True)
    repetitions = Column(Integer, nullable=True)
    sets_completed = Column(Integer, nullable=True)
    time_minutes = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    calories = Column(Float, nullable=True)
    
    # Goal comparison
    goal_weight_kg = Column(Float, nullable=True)
    goal_repetitions = Column(Integer, nullable=True)
    goal_sets_count = Column(Integer, nullable=True)
    goal_time_minutes = Column(Float, nullable=True)
    goal_distance_km = Column(Float, nullable=True)
    goal_calories = Column(Float, nullable=True)
    
    # Status
    achieved = Column(Boolean, default=False)  # True if all metrics met or exceeded
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session_exercise = relationship("SessionExercise")
    user = relationship("User")
    goal = relationship("ExerciseGoal")

class SessionPerformance(Base):
    """Track overall session performance"""
    __tablename__ = "session_performance"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    total_duration_minutes = Column(Float, nullable=True)
    exercises_completed = Column(Integer, default=0)
    exercises_planned = Column(Integer, default=0)
    goals_achieved = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("WorkoutSession")
    user = relationship("User")