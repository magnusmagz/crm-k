import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { notesAPI } from '../../services/api';

interface Note {
  id: string;
  content: string;
  isPinned: boolean;
  activities?: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface NoteWidgetProps {
  contactId: string;
}

const ACTIVITY_TYPES = ['Call', 'Text', 'Email', 'Set Meeting', 'Had Meeting'];

const ACTIVITY_COLORS: Record<string, string> = {
  'Call': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Text': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Email': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'Set Meeting': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Had Meeting': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const NoteWidget: React.FC<NoteWidgetProps> = ({ contactId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editActivities, setEditActivities] = useState<string[]>([]);
  const [newNoteActivities, setNewNoteActivities] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchNotes();
  }, [contactId]);

  const fetchNotes = async () => {
    try {
      const response = await notesAPI.getContactNotes(contactId);
      setNotes(response.data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNewNoteActivity = (activity: string) => {
    setNewNoteActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const toggleEditActivity = (activity: string) => {
    setEditActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || saving) return;

    setSaving(true);
    try {
      const response = await notesAPI.createNote({
        contactId,
        content: newNote.trim(),
        activities: newNoteActivities
      });
      setNotes([response.data, ...notes]);
      setNewNote('');
      setNewNoteActivities([]);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = '40px';
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditActivities(note.activities || []);
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await notesAPI.updateNote(noteId, {
        content: editContent.trim(),
        activities: editActivities
      });
      setNotes(notes.map(n => n.id === noteId ? response.data : n));
      setEditingId(null);
      setEditActivities([]);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await notesAPI.deleteNote(noteId);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const response = await notesAPI.updateNote(note.id, {
        isPinned: !note.isPinned
      });
      setNotes(notes.map(n => n.id === note.id ? response.data : n));
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewNote(e.target.value);
    
    // Auto-resize textarea
    e.target.style.height = '40px';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const formatNoteDate = (date: string) => {
    const noteDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - noteDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return format(noteDate, 'MMM d, yyyy');
    }
  };

  const getUserName = (user: Note['user']) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`.trim();
    }
    return user.email;
  };

  const toggleFilter = (activity: string) => {
    setActiveFilters(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  // Filter notes based on active filters
  const filteredNotes = activeFilters.length === 0
    ? notes
    : notes.filter(note =>
        note.activities && note.activities.some(activity => activeFilters.includes(activity))
      );

  // Show only first 3 notes if not expanded
  const displayedNotes = showAll ? filteredNotes : filteredNotes.slice(0, 3);
  const hasMoreNotes = filteredNotes.length > 3;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4">
        <div className="flex items-center mb-4">
          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notes</h3>
        </div>

        {/* Activity Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {ACTIVITY_TYPES.map((activity) => (
            <button
              key={activity}
              onClick={() => toggleFilter(activity)}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeFilters.includes(activity)
                  ? ACTIVITY_COLORS[activity]
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {activity}
            </button>
          ))}
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Add note input */}
        <div className="mb-4">
          <textarea
            ref={textareaRef}
            value={newNote}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Add a note..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white resize-none"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />

          {/* Activity checkboxes */}
          <div className="mt-2 flex flex-wrap gap-3">
            {ACTIVITY_TYPES.map((activity) => (
              <label
                key={activity}
                className="flex items-center space-x-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={newNoteActivities.includes(activity)}
                  onChange={() => toggleNewNoteActivity(activity)}
                  className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-gray-700 dark:text-gray-300">{activity}</span>
              </label>
            ))}
          </div>

          <div className="mt-2 flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Press Enter to save, Shift+Enter for new line
            </span>
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim() || saving}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                newNote.trim() && !saving
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>

        {/* Notes list */}
        <div className="space-y-3">
          {displayedNotes.map((note) => (
            <div
              key={note.id}
              className={`border rounded-lg p-3 ${
                note.isPinned
                  ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getUserName(note.user)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      {formatNoteDate(note.createdAt)}
                    </span>
                  </div>
                  {note.isPinned && (
                    <StarSolid className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleTogglePin(note)}
                    className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                    title={note.isPinned ? 'Unpin' : 'Pin'}
                  >
                    {note.isPinned ? (
                      <StarSolid className="h-4 w-4" />
                    ) : (
                      <StarOutline className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(note)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {editingId === note.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white resize-none"
                    style={{ minHeight: '60px' }}
                    autoFocus
                  />

                  {/* Activity checkboxes in edit mode */}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {ACTIVITY_TYPES.map((activity) => (
                      <label
                        key={activity}
                        className="flex items-center space-x-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editActivities.includes(activity)}
                          onChange={() => toggleEditActivity(activity)}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{activity}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-2 flex justify-end space-x-2">
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      className="p-1 text-green-600 hover:text-green-700"
                      title="Save"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Cancel"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {note.content}
                  </p>

                  {/* Display selected activities */}
                  {note.activities && note.activities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {note.activities.map((activity) => (
                        <span
                          key={activity}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ACTIVITY_COLORS[activity] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}
                        >
                          {activity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {notes.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No notes yet. Add your first note above!
            </p>
          )}
        </div>

        {/* Show more/less button */}
        {hasMoreNotes && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-3 flex items-center justify-center w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUpIcon className="h-4 w-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4 mr-1" />
                Show {filteredNotes.length - 3} more note{filteredNotes.length - 3 !== 1 ? 's' : ''}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default NoteWidget;