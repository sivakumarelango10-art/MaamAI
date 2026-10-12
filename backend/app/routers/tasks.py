from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User, Task, ActivityLog
from app.auth import get_current_user
from app.schemas import TaskResponse, TaskCreate, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskResponse])
def get_tasks(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve faculty tasks strictly belonging to the authenticated staff member.
    """
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if status_filter and status_filter.lower() != "all":
        query = query.filter(Task.status == status_filter.lower())
    if priority and priority.lower() != "all":
        query = query.filter(Task.priority == priority.lower())
    if category and category.lower() != "all":
        query = query.filter(Task.category.ilike(category))

    return query.order_by(Task.id.asc()).all()

@router.post("", response_model=TaskResponse)
def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new task owned by the authenticated staff member.
    """
    new_task = Task(
        user_id=current_user.id,
        **task_in.model_dump()
    )
    db.add(new_task)

    log = ActivityLog(
        user_id=current_user.id,
        title=f"Task Created: {new_task.title}",
        description=f"Priority: {new_task.priority.upper()} | Due: {new_task.due_date}",
        category="task",
    )
    db.add(log)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update task status, priority, or details owned by current user.
    """
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    if task_update.status == "completed":
        log = ActivityLog(
            user_id=current_user.id,
            title=f"Task Completed: {task.title}",
            description="Marked as completed by faculty.",
            category="task",
        )
        db.add(log)

    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete task owned by current user.
    """
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": f"Task {task_id} deleted successfully"}
