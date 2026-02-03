"""
Test examples for Kynga Performance System

Run these with: pytest test_performance.py
"""

import pytest
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import (
    User, Exercise, WorkoutSession, SessionExercise, 
    ExerciseGoal, ExerciseResult, SessionPerformance
)
from app.schemas import ExerciseGoalCreate, ExerciseResultCreate

# ============== FIXTURES ==============

@pytest.fixture
def db():
    """Database session for tests"""
    db = SessionLocal()
    yield db
    db.close()

@pytest.fixture
def test_user(db):
    """Create a test user"""
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password="hashed_password_here"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def test_exercise(db):
    """Create a test exercise"""
    exercise = Exercise(
        name="Bench Press",
        description="Push ups with weight",
        group="musculation",
        is_static=False,
        has_weight=True,
        has_repetitions=True
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise

@pytest.fixture
def test_session(db, test_user):
    """Create a test workout session"""
    session = WorkoutSession(
        user_id=test_user.id,
        name="Leg Day",
        description="Focus on legs"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@pytest.fixture
def test_session_exercise(db, test_session, test_exercise):
    """Create a session exercise"""
    se = SessionExercise(
        session_id=test_session.id,
        exercise_id=test_exercise.id,
        order_index=1,
        rest_between_sets_minutes=1.0,
        rest_after_exercise_minutes=2.0
    )
    db.add(se)
    db.commit()
    db.refresh(se)
    return se

# ============== TESTS ==============

class TestExerciseGoal:
    """Test exercise goal creation and retrieval"""
    
    def test_create_goal(self, db, test_session_exercise):
        """Test creating an exercise goal"""
        goal = ExerciseGoal(
            session_exercise_id=test_session_exercise.id,
            user_id=test_session_exercise.session.user_id,
            weight_kg=50,
            repetitions=10,
            sets_count=3
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)
        
        assert goal.id is not None
        assert goal.weight_kg == 50
        assert goal.repetitions == 10
        assert goal.sets_count == 3
    
    def test_partial_goal(self, db, test_session_exercise):
        """Test creating goal with partial metrics"""
        goal = ExerciseGoal(
            session_exercise_id=test_session_exercise.id,
            user_id=test_session_exercise.session.user_id,
            weight_kg=50,
            repetitions=None,  # Only weight
            sets_count=None
        )
        db.add(goal)
        db.commit()
        
        assert goal.weight_kg == 50
        assert goal.repetitions is None
    
    def test_goal_timestamps(self, db, test_session_exercise):
        """Test goal has correct timestamps"""
        before = datetime.now()
        goal = ExerciseGoal(
            session_exercise_id=test_session_exercise.id,
            user_id=test_session_exercise.session.user_id,
            weight_kg=50
        )
        db.add(goal)
        db.commit()
        db.refresh(goal)
        after = datetime.now()
        
        assert before <= goal.created_at <= after
        assert goal.updated_at is None or before <= goal.updated_at <= after

class TestExerciseResult:
    """Test exercise result recording and achievement detection"""
    
    def test_create_result_achieved(self, db, test_session_exercise, test_user):
        """Test recording result that meets goal"""
        # Create goal
        goal = ExerciseGoal(
            session_exercise_id=test_session_exercise.id,
            user_id=test_user.id,
            weight_kg=50,
            repetitions=10,
            sets_count=3
        )
        db.add(goal)
        db.commit()
        
        # Record result that meets goal exactly
        result = ExerciseResult(
            session_exercise_id=test_session_exercise.id,
            user_id=test_user.id,
            goal_id=goal.id,
            weight_kg=50,
            repetitions=10,
            sets_completed=3,
            achieved=True,  # Should be set by API
            goal_weight_kg=50,
            goal_repetitions=10,
            goal_sets_count=3
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        
        assert result.achieved is True
        assert result.weight_kg == 50
    
    def test_create_result_exceeded(self, db, test_session_exercise, test_user):
        """Test recording result that exceeds goal"""
        goal = ExerciseGoal(
            session_exercise_id=test_session_exercise.id,
            user_id=test_user.id,
            weight_kg=50,
            repetitions=10
        )
        db.add(goal)
        db.commit()
        
        # Record better result
        result = ExerciseResult(
            session_exercise_id=test_session_exercise.id,
            user_id=test_user.id,
            goal_id=goal.id,
            weight_kg=55,  # 5kg more!
            repetitions=12,  # 2 reps more!
            achieved=True,
            goal_weight_kg=50,
            goal_repetitions=10
        )
        db.add(result)
        db.commit()
        
        assert result.weight_kg > result.goal_weight_kg
        assert result.repetitions > result.goal_repetitions
    
    def test_create_result_failed(self, db, test_session_exercise, test_user):
        """Test recording result that doesn't meet goal"""
        goal = ExerciseGoal(
            session_exercise_id=test_session_exercise.id,
            user_id=test_user.id,
            weight_kg=50,
            repetitions=10
        )
        db.add(goal)
        db.commit()
        
        # Record worse result
        result = ExerciseResult(
            session_exercise_id=test_session_exercise.id,
            user_id=test_user.id,
            goal_id=goal.id,
            weight_kg=45,  # Less weight
            repetitions=8,  # Less reps
            achieved=False,
            goal_weight_kg=50,
            goal_repetitions=10
        )
        db.add(result)
        db.commit()
        
        assert result.achieved is False

class TestSessionPerformance:
    """Test session performance tracking"""
    
    def test_create_session_performance(self, db, test_session, test_user):
        """Test recording session performance"""
        performance = SessionPerformance(
            session_id=test_session.id,
            user_id=test_user.id,
            total_duration_minutes=45,
            exercises_completed=5,
            exercises_planned=5,
            goals_achieved=4
        )
        db.add(performance)
        db.commit()
        db.refresh(performance)
        
        assert performance.id is not None
        assert performance.total_duration_minutes == 45
        assert performance.exercises_completed == 5
        assert performance.goals_achieved == 4

class TestExerciseHistory:
    """Test exercise history calculation"""
    
    def test_history_statistics(self, db, test_session_exercise, test_user, test_exercise):
        """Test calculating history statistics"""
        # Create multiple results
        for i in range(10):
            result = ExerciseResult(
                session_exercise_id=test_session_exercise.id,
                user_id=test_user.id,
                weight_kg=45 + i,  # 45-54 kg
                repetitions=10,
                sets_completed=3,
                achieved=i >= 3,  # First 3 failed, rest succeeded
                goal_weight_kg=50,
                goal_repetitions=10
            )
            db.add(result)
        
        db.commit()
        
        # Query results
        results = db.query(ExerciseResult).filter(
            ExerciseResult.session_exercise_id == test_session_exercise.id
        ).all()
        
        # Calculate stats
        total = len(results)
        achieved = sum(1 for r in results if r.achieved)
        weights = [r.weight_kg for r in results if r.weight_kg]
        
        assert total == 10
        assert achieved == 7  # 7 succeeded
        assert max(weights) == 54
        assert min(weights) == 45
        assert sum(weights) / len(weights) == 49.5  # Average
    
    def test_recent_results(self, db, test_session_exercise, test_user):
        """Test getting recent results only"""
        now = datetime.now()
        
        # Create old result (100 days ago)
        old_result = ExerciseResult(
            session_exercise_id=test_session_exercise.id,
            user_id=test_user.id,
            weight_kg=40,
            created_at=now - timedelta(days=100)
        )
        
        # Create recent result (5 days ago)
        recent_result = ExerciseResult(
            session_exercise_id=test_session_exercise.id,
            user_id=test_user.id,
            weight_kg=50,
            created_at=now - timedelta(days=5)
        )
        
        db.add(old_result)
        db.add(recent_result)
        db.commit()
        
        # Query last 90 days
        cutoff = now - timedelta(days=90)
        results = db.query(ExerciseResult).filter(
            ExerciseResult.session_exercise_id == test_session_exercise.id,
            ExerciseResult.created_at >= cutoff
        ).all()
        
        assert len(results) == 1
        assert results[0].weight_kg == 50

class TestTimerData:
    """Test rest timer data"""
    
    def test_session_exercise_rest_times(self, db, test_session_exercise):
        """Test rest times are set correctly"""
        assert test_session_exercise.rest_between_sets_minutes == 1.0
        assert test_session_exercise.rest_after_exercise_minutes == 2.0
        
        # Convert to seconds
        between_sets_seconds = int(1.0 * 60)
        after_exercise_seconds = int(2.0 * 60)
        
        assert between_sets_seconds == 60
        assert after_exercise_seconds == 120

# ============== INTEGRATION TESTS ==============

class TestCompleteWorkflow:
    """Test complete workflow from goal to result"""
    
    def test_full_exercise_session(self, db, test_session_exercise, test_user):
        """Test complete exercise session workflow"""
        
        # Step 1: User creates goal
        goal = ExerciseGoal(
            session_exercise_id=test_session_exercise.id,
            user_id=test_user.id,
            weight_kg=50,
            repetitions=10,
            sets_count=3
        )
        db.add(goal)
        db.commit()
        
        # Step 2: User records result
        result = ExerciseResult(
            session_exercise_id=test_session_exercise.id,
            user_id=test_user.id,
            goal_id=goal.id,
            weight_kg=50,
            repetitions=10,
            sets_completed=3,
            achieved=True,
            goal_weight_kg=50,
            goal_repetitions=10,
            goal_sets_count=3,
            notes="Good session!"
        )
        db.add(result)
        db.commit()
        
        # Step 3: Record session performance
        performance = SessionPerformance(
            session_id=test_session_exercise.session_id,
            user_id=test_user.id,
            total_duration_minutes=45,
            exercises_completed=1,
            exercises_planned=1,
            goals_achieved=1
        )
        db.add(performance)
        db.commit()
        
        # Verify all data
        goals = db.query(ExerciseGoal).filter_by(user_id=test_user.id).all()
        results = db.query(ExerciseResult).filter_by(user_id=test_user.id).all()
        perfs = db.query(SessionPerformance).filter_by(user_id=test_user.id).all()
        
        assert len(goals) == 1
        assert len(results) == 1
        assert len(perfs) == 1
        
        assert results[0].achieved is True
        assert perfs[0].goals_achieved == 1

# ============== RUN TESTS ==============

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
