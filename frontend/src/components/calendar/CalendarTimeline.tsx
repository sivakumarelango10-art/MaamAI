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
  const [newEvent, setNewEvent] = useState({
    title: '',
    start_time: '10:00 AM',
    end_time: '11:00 AM',
    date_str: 'Today',
    location: 'Faculty Hall Room 302',
    event_type: 'meeting',
    attendee_count: 2,
    notes: 'Scheduled academic discussion',
    demo_label: 'Demo Event',
  });

  const filterOptions = ['All', 'Today', 'Tomorrow', 'Thursday', 'Friday'];

  const filteredEvents = events.filter((e) => {
    if (filterDate === 'All') return true;
    return e.date_str.toLowerCase() === filterDate.toLowerCase();
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />;
      case 'office_hours':
        return <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const handleSubmitNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !onCreateEvent) return;
    await onCreateEvent(newEvent);
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
      demo_label: 'Demo Event',
    });
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
              className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterDate === opt
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {onCreateEvent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Academic Event
          </Button>
        )}
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No events scheduled"
          description="Your timetable is clear for the selected period."
        />
      ) : (
        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-4 my-2">
          {filteredEvents.map((evt) => (
            <div key={evt.id} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[23px] sm:-left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-brand-500 group-hover:scale-125 transition-transform" />

              <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                        {getEventIcon(evt.event_type)}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {evt.title}
                      </h4>
                      <Badge variant="blue" size="sm">
                        {evt.event_type.replace('_', ' ')}
                      </Badge>
                      <Badge variant="demo" size="sm">
                        {evt.demo_label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        {evt.start_time} - {evt.end_time} ({evt.date_str})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {evt.location}
                      </span>
                      {evt.attendee_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {evt.attendee_count} Attendees
                        </span>
                      )}
                    </div>

                    {evt.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 pt-1 italic">
                        {evt.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-600" />
                Add Academic Calendar Event
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewEvent} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g., CS 4400 Guest Lecture"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Day / Date
                  </label>
                  <input
                    type="text"
                    value={newEvent.date_str}
                    onChange={(e) => setNewEvent({ ...newEvent, date_str: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Type
                  </label>
                  <select
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}
                    className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="office_hours">Office Hours</option>
                    <option value="meeting">Faculty Meeting</option>
                    <option value="colloquium">Research Colloquium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Location / Room
                </label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  placeholder="e.g., Turing Hall Room 410 or Zoom Link"
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Notes / Agenda
                </label>
                <textarea
                  rows={2}
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save to Calendar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
