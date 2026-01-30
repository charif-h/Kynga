from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, Float, DateTime, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# Association table for exercises and affected muscles
exercise_muscles = Table(
    'exercise_muscles',
    Base.metadata,
    Column('exercise_id', Integer, ForeignKey('exercises.id')),
    Column('muscle_name', String(100))
)

# Association table for exercises and accessories
exercise_accessories = Table(
    'exercise_accessories',
    Base.metadata,
    Column('exercise_id', Integer, ForeignKey('exercises.id')),
    Column('accessory_name', String(100))
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    group = Column(String(50), nullable=False)  # binding, musculation, yoga, etc.
    is_static = Column(Boolean, default=False)  # True for static, False for repeated movement
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session_exercises = relationship("SessionExercise", back_populates="exercise", cascade="all, delete-orphan")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="sessions")
    session_exercises = relationship("SessionExercise", back_populates="session", cascade="all, delete-orphan")

class SessionExercise(Base):
    __tablename__ = "session_exercises"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    
    # Objectives - at least one should be set
    weight_kg = Column(Float, nullable=True)
    calories = Column(Float, nullable=True)
    time_minutes = Column(Float, nullable=True)
    repetitions = Column(Integer, nullable=True)
    
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="session_exercises")
    exercise = relationship("Exercise", back_populates="session_exercises")

# Separate tables for muscles and accessories to allow better querying
class ExerciseMuscle(Base):
    __tablename__ = "exercise_muscles_detail"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    muscle_name = Column(String(100), nullable=False)

class ExerciseAccessory(Base):
    __tablename__ = "exercise_accessories_detail"

    id = Column(Integer, primary_key=True, index=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    accessory_name = Column(String(100), nullable=False)
