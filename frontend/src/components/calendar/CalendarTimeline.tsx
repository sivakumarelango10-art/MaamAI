import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  BookOpen,
  Coffee,
  Briefcase,
  X,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import type { CalendarEventItem } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSkeleton, EmptyState } from '../ui/States';

interface CalendarTimelineProps {
  events: CalendarEventItem[];
  isLoading: boolean;
  onCreateEvent?: (eventData: Omit<CalendarEventItem, 'id' | 'user_id'>) => Promise<void>;
}

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  events,
  isLoading,
  onCreateEvent,
}) => {
  const [filterDate, setFilterDate] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '',
    start_time: '10:00 AM',
    end_time: '11:00 AM',
    date_str: 'Today',
    location: 'Faculty Hall Room 302',
    event_type: 'meeting',
    attendee_count: 2,
    notes: 'Scheduled academic discussion',
    demo_label: '',
  });

  const filterOptions = ['All', 'Today', 'Tomorrow', 'Thursday', 'Friday'];

  const filteredEvents = events.filter((e) => {
    if (filterDate === 'All') return true;
    return e.date_str.toLowerCase() === filterDate.toLowerCase();
  });

  // Check for potential schedule conflicts
  const detectConflicts = (evtList: CalendarEventItem[]) => {
    const conflicts = new Set<number>();
    for (let i = 0; i < evtList.length; i++) {
      for (let j = i + 1; j < evtList.length; j++) {
        const a = evtList[i];
        const b = evtList[j];
        if (
          a.date_str.toLowerCase() === b.date_str.toLowerCase() &&
          a.start_time === b.start_time
        ) {
          conflicts.add(a.id);
          conflicts.add(b.id);
        }
      }
    }
    return conflicts;
  };

  const conflictingIds = detectConflicts(filteredEvents);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <BookOpen className="w-4 h-4 text-cobalt" />;
      case 'office_hours':
        return <Coffee className="w-4 h-4 text-amber-600" />;
      default:
        return <Briefcase className="w-4 h-4 text-ink" />;
    }
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;
    setIsConfirmModalOpen(true);
  };

  const handleFinalSubmit = async () => {
    if (!onCreateEvent) return;
    setIsSubmitting(true);
    try {
      await onCreateEvent(newEvent);
      setIsConfirmModalOpen(false);
      setIsAddModalOpen(false);
      setNewEvent({
        title: '',
        start_time: '10:00 AM',
        end_time: '11:00 AM',
        date_str: 'Today',
        location: 'Faculty Hall Room 302',
        event_type: 'meeting',
        attendee_count: 2,
        notes: 'Scheduled academic discussion',
        demo_label: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton rows={3} height="h-20" />;
  }

  return (
    <div className="space-y-4">
      {/* Date Filter & Add Event Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {filterOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilterDate(opt)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all duration-180 whitespace-nowrap ${
                filterDate === opt
                  ? 'bg-ink text-white shadow-xs'
                  : 'bg-canvas text-secondary hover:text-ink hover:bg-slate-200'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {onCreateEvent && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Academic Event
          </Button>
        )}
      </div>

      {conflictingIds.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Schedule Notice:</strong> Overlapping time slots detected for {conflictingIds.size} events on your calendar.
          </span>
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No events scheduled"
          description="Your timetable is clear for the selected period."
        />
      ) : (
        <div className="relative border-l-2 border-line ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-4 my-2">
          {filteredEvents.map((evt) => {
            const hasConflict = conflictingIds.has(evt.id);

            return (
              <div key={evt.id} className="relative group">
                {/* Dot */}
                <div
                  className={`absolute -left-[23px] sm:-left-[31px] top-2 w-3.5 h-3.5 rounded-full bg-white border-2 transition-transform duration-180 ${
                    hasConflict
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-cobalt group-hover:scale-125'
                  }`}
                />

                <div className="p-4 rounded-xl bg-white border border-line shadow-xs hover:border-slate-300 transition-all duration-180">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-canvas">
                          {getEventIcon(evt.event_type)}
                        </div>
                        <h4 className="text-sm font-bold text-ink">
                          {evt.title}
                        </h4>
                        <Badge variant="neutral" size="sm">
                          {evt.event_type.replace('_', ' ')}
                        </Badge>
                        {hasConflict && (
                          <Badge variant="amber" size="sm">
                            Time Overlap
                          </Badge>
                        )}
                        {evt.demo_label && (
                          <Badge variant="neutral" size="sm">
                            {evt.demo_label}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-secondary pt-1">
                        <span className="flex items-center gap-1 font-semibold text-ink">
                          <Clock className="w-3.5 h-3.5 text-cobalt" />
                          {evt.start_time} - {evt.end_time} ({evt.date_str})
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-secondary" />
                          {evt.location}
                        </span>
                        {evt.attendee_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-secondary" />
                            {evt.attendee_count} Attendees
                          </span>
                        )}
                      </div>

                      {evt.notes && (
                        <p className="text-xs text-secondary pt-1 italic">
                          {evt.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Event Form Modal */}
      {isAddModalOpen && !isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-180">
          <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-line p-5 sm:p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cobalt" />
                Add Academic Calendar Event
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-secondary hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenConfirm} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-ink">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g., CS 4400 Guest Lecture"
                  className="w-full mt-1 p-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-ink">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    className="w-full mt-1 p-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    className="w-full mt-1 p-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-ink">
                    Day / Date
                  </label>
                  <input
                    type="text"
                    value={newEvent.date_str}
                    onChange={(e) => setNewEvent({ ...newEvent, date_str: e.target.value })}
                    className="w-full mt-1 p-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink">
                    Type
                  </label>
                  <select
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                    className="w-full mt-1 p-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="office_hours">Office Hours</option>
                    <option value="meeting">Faculty Meeting</option>
                    <option value="colloquium">Research Colloquium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-ink">
                  Location / Room
                </label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="e.g., Turing Hall Room 410 or Zoom Link"
                  className="w-full mt-1 p-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
                />
              </div>

              <div>
                <label className="font-semibold text-ink">
                  Notes / Agenda
                </label>
                <textarea
                  rows={2}
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                  className="w-full mt-1 p-2 bg-white border border-line rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-cobalt focus:border-cobalt"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Review & Confirm
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explicit User Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-in fade-in duration-180">
          <div className="fixed inset-0" onClick={() => setIsConfirmModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-line p-5 sm:p-6 z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cobalt-light text-cobalt flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Confirm Calendar Event
                </h3>
                <p className="text-xs text-secondary">
                  Explicit authorization required before scheduling.
                </p>
              </div>
            </div>

            <div className="p-3 bg-canvas rounded-xl border border-line text-xs space-y-1.5 text-ink">
              <div className="font-semibold text-sm">{newEvent.title}</div>
              <div className="text-secondary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cobalt" />
                <span>{newEvent.start_time} - {newEvent.end_time} ({newEvent.date_str})</span>
              </div>
              <div className="text-secondary flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{newEvent.location}</span>
              </div>
            </div>

            <p className="text-[11px] text-secondary">
              Are you sure you want to commit this event to your academic schedule?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                onClick={handleFinalSubmit}
                icon={<CheckCircle className="w-3.5 h-3.5" />}
              >
                Authorize & Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
