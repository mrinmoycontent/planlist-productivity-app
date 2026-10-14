import React, { useState } from 'react';
import {
  StickyNote,
  Plus,
  Pin,
  Trash2,
  CalendarPlus,
  Search,
  Check,
  Edit2,
} from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { formatDisplayDate } from '../../utils/dateUtils';
import { Note, TaskCategory } from '../../types';

export const NotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote, togglePinNote, convertNoteToTask } = usePlan();

  const [search, setSearch] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0] || null);

  // New Note state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('Work');

  const filteredNotes = notes.filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  // Pinned first
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;

    const created = addNote(newTitle.trim(), newContent.trim(), newCategory);
    setSelectedNote(created);
    setIsCreating(false);
    setNewTitle('');
    setNewContent('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Notes List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                All Notes ({notes.length})
              </span>
              <button
                id="notes-create-btn"
                onClick={() => {
                  setIsCreating(true);
                  setSelectedNote(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Note</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Notes Stack */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {sortedNotes.map((note) => {
              const isSelected = selectedNote?.id === note.id && !isCreating;
              return (
                <div
                  key={note.id}
                  onClick={() => {
                    setSelectedNote(note);
                    setIsCreating(false);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-500/10 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight line-clamp-1">
                      {note.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinNote(note.id);
                      }}
                      className={`p-1 rounded-md transition-colors ${
                        note.isPinned ? 'text-amber-500 fill-amber-500' : 'text-slate-300 hover:text-slate-500'
                      }`}
                      title={note.isPinned ? 'Unpin' : 'Pin note'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                    {note.content}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {note.category}
                    </span>
                    <span>{formatDisplayDate(note.updatedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Note Reader & Editor */}
        <div className="lg:col-span-7">
          {isCreating ? (
            <form onSubmit={handleCreateNote} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Create Quick Note</h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Note title or takeaway..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 bg-white focus:outline-none focus:border-indigo-600"
                >
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Projects">Projects</option>
                  <option value="Study">Study</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Note Content
                </label>
                <textarea
                  rows={8}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Capture meeting minutes, thoughts, or steps..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600 resize-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs"
                >
                  Save Note
                </button>
              </div>
            </form>
          ) : selectedNote ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {selectedNote.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      Updated {formatDisplayDate(selectedNote.updatedAt)}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {selectedNote.title}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => convertNoteToTask(selectedNote.content)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 transition-colors"
                    title="Convert first line of note to task"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Turn to Task</span>
                  </button>
                  <button
                    onClick={() => deleteNote(selectedNote.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editable content directly */}
              <div>
                <textarea
                  rows={12}
                  value={selectedNote.content}
                  onChange={(e) => updateNote(selectedNote.id, { content: e.target.value })}
                  className="w-full p-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 rounded-xl border border-transparent hover:border-slate-200 resize-none font-sans leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
              <p className="text-xs text-slate-500 font-semibold">Select a note to view or create one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
