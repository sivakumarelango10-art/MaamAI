import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Clock,
  X,
  Trash2,
} from 'lucide-react';
import type { TaskItem } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSkeleton, EmptyState } from '../ui/States';

interface TaskManagerProps {
  tasks: TaskItem[];
  isLoading: boolean;
  onToggleTaskStatus: (task: TaskItem) => void;
  onCreateTask?: (taskData: Omit<TaskItem, 'id' | 'user_id'>) => Promise<void>;
  onDeleteTask?: (id: number) => void;
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  isLoading,
  onToggleTaskStatus,
  onCreateTask,
  onDeleteTask,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState('All');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Grading');
  const [newTaskDueDate, setNewTaskDueDate] = useState('Friday');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const filteredTasks = tasks.filter((t) => {
    if (filterPriority === 'All') return true;
    return t.priority === filterPriority;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !onCreateTask) return;
    await onCreateTask({
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      due_date: newTaskDueDate,
      priority: newTaskPriority,
      status: 'pending',
      demo_label: 'Demo Task',
    });
    setNewTaskTitle('');
    setIsAddOpen(false);
  };

  if (isLoading) {
    return <LoadingSkeleton rows={3} height="h-16" />;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-xs">
          {['All', 'high', 'medium', 'low'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
                filterPriority === p
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {onCreateTask && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            New Task
          </Button>
        )}
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="You are caught up with your academic deliverables."
        />
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                  isCompleted
                    ? 'bg-slate-50/50 dark:bg-slate-900/40 opacity-70'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onToggleTaskStatus(task)}
                    className="mt-0.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex-shrink-0"
                    title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {isCompleted ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-semibold truncate ${
                          isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </span>
                      <Badge
                        variant={task.priority === 'high' ? 'high' : 'medium'}
                        size="sm"
                      >
                        {task.priority}
                      </Badge>
                      <Badge variant="blue" size="sm">
                        {task.category}
                      </Badge>
                      <Badge variant="demo" size="sm">
                        {task.demo_label}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due: {task.due_date}
                      </span>
                      {task.description && (
                        <span className="truncate hidden sm:inline">
                          • {task.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {onDeleteTask && (
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsAddOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-brand-600" />
                Add Faculty Task
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Review midterm question bank"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    placeholder="e.g., Committee, Research"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Due Date
                  </label>
                  <input
                    type="text"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    placeholder="e.g., Today, Friday, Oct 20"
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Priority
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
