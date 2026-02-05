from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Program, ProgramSession, WorkoutSession, User, SessionPerformance
from app.schemas import (
    ProgramCreate,
    ProgramUpdate,
    ProgramResponse,
    ProgramSessionResponse,
    ProgramSessionProgress
)
from app.auth import get_current_active_user

router = APIRouter()

def build_program_response(db_program: Program, db: Session) -> ProgramResponse:
    program_sessions = db.query(ProgramSession).filter(
        ProgramSession.program_id == db_program.id
    ).order_by(ProgramSession.order_index, ProgramSession.id).all()

    sessions_data = []
    for ps in program_sessions:
        session = db.query(WorkoutSession).filter(WorkoutSession.id == ps.session_id).first()
        sessions_data.append(ProgramSessionResponse(
            id=ps.id,
            program_id=ps.program_id,
            session_id=ps.session_id,
            order_index=ps.order_index,
            session_name=session.name if session else None
        ))

    return ProgramResponse(
        id=db_program.id,
        user_id=db_program.user_id,
        name=db_program.name,
        description=db_program.description,
        created_at=db_program.created_at,
        updated_at=db_program.updated_at,
        sessions=sessions_data
    )

@router.get("/", response_model=List[ProgramResponse])
def get_programs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    programs = db.query(Program).filter(
        Program.user_id == current_user.id
    ).offset(skip).limit(limit).all()

    return [build_program_response(p, db) for p in programs]

@router.get("/{program_id}", response_model=ProgramResponse)
def get_program(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    program = db.query(Program).filter(
        Program.id == program_id,
        Program.user_id == current_user.id
    ).first()

    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found"
        )

    return build_program_response(program, db)

@router.post("/", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(
    program: ProgramCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_program = Program(
        user_id=current_user.id,
        name=program.name,
        description=program.description
    )
    db.add(db_program)
    db.flush()

    for session_data in program.sessions:
        session = db.query(WorkoutSession).filter(
            WorkoutSession.id == session_data.session_id,
            WorkoutSession.user_id == current_user.id
        ).first()

        if not session:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with id {session_data.session_id} not found"
            )

        db_program_session = ProgramSession(
            program_id=db_program.id,
            session_id=session_data.session_id,
            order_index=session_data.order_index
        )
        db.add(db_program_session)

    db.commit()
    db.refresh(db_program)
    return build_program_response(db_program, db)

@router.put("/{program_id}", response_model=ProgramResponse)
def update_program(
    program_id: int,
    program_update: ProgramUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_program = db.query(Program).filter(
        Program.id == program_id,
        Program.user_id == current_user.id
    ).first()

    if not db_program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found"
        )

    update_data = program_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_program, field, value)

    db.commit()
    db.refresh(db_program)
    return build_program_response(db_program, db)

@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_program = db.query(Program).filter(
        Program.id == program_id,
        Program.user_id == current_user.id
    ).first()

    if not db_program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found"
        )

    db.delete(db_program)
    db.commit()

@router.get("/{program_id}/progress", response_model=List[ProgramSessionProgress])
def get_program_progress(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Return sessions in a program with completion counts"""
    db_program = db.query(Program).filter(
        Program.id == program_id,
        Program.user_id == current_user.id
    ).first()

    if not db_program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Program not found"
        )

    program_sessions = db.query(ProgramSession).filter(
        ProgramSession.program_id == db_program.id
    ).order_by(ProgramSession.order_index, ProgramSession.id).all()

    progress = []
    for ps in program_sessions:
        session = db.query(WorkoutSession).filter(WorkoutSession.id == ps.session_id).first()
        completed_count = db.query(SessionPerformance).filter(
            SessionPerformance.session_id == ps.session_id,
            SessionPerformance.user_id == current_user.id
        ).count()

        progress.append(ProgramSessionProgress(
            session_id=ps.session_id,
            session_name=session.name if session else None,
            order_index=ps.order_index,
            completed_count=completed_count
        ))

    return progress
