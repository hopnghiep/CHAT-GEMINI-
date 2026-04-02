import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import Modal from './Modal';

interface JournalViewProps {
  entries: JournalEntry[];
  onUpdateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  onDeleteEntry: (id: string) => void;
  onNewEntry: () => void;
}

const JournalView: React.FC<JournalViewProps> = ({
  entries,
  onUpdateEntry,
  onDeleteEntry,
  onNewEntry,
}) => {
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const activeEntry = entries.find((e) => e.id === activeEntryId);

  useEffect(() => {
    if (activeEntry) {
      setEditTitle(activeEntry.title);
      setEditContent(activeEntry.content);
      setEditTags(activeEntry.tags || []);
    }
  }, [activeEntry]);

  const handleSave = () => {
    if (activeEntryId) {
      onUpdateEntry(activeEntryId, {
        title: editTitle,
        content: editContent,
        tags: editTags,
      });
      setIsEditing(false);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      if (!editTags.includes(tagInput.trim())) {
        setEditTags([...editTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  return (
    <div className="flex h-full w-full flex-col bg-white dark:bg-gray-800 lg:flex-row">
      {/* List Sidebar */}
      <div className="w-full border-r border-gray-200 dark:border-gray-700 lg:w-80 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Nhật ký</h2>
          <button
            onClick={onNewEntry}
            className="rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700"
            title="Thêm nhật ký mới"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-2 space-y-2">
          {entries.length === 0 ? (
            <p className="text-center text-gray-500 mt-10">Chưa có nhật ký nào</p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  setActiveEntryId(entry.id);
                  setIsEditing(false);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  activeEntryId === entry.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                } border border-transparent`}
              >
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{entry.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{entry.date}</p>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px] text-gray-600 dark:text-gray-300">
                        #{tag}
                      </span>
                    ))}
                    {entry.tags.length > 2 && <span className="text-[10px] text-gray-500">...</span>}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {activeEntry ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex-grow">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold bg-transparent border-b border-blue-500 focus:outline-none w-full dark:text-white"
                  />
                ) : (
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">{activeEntry.title}</h3>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">{activeEntry.date}</p>
              </div>
              <div className="flex space-x-2">
                {isEditing ? (
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Lưu
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Sửa
                  </button>
                )}
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  title="Xóa nhật ký"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6">
              {isEditing ? (
                <div className="h-full flex flex-col space-y-4">
                  <div className="flex flex-wrap gap-2 items-center p-2 border rounded-md dark:border-gray-600">
                    {editTags.map((tag) => (
                      <span key={tag} className="flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm">
                        #{tag}
                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">×</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Thêm tag..."
                      className="bg-transparent focus:outline-none text-sm dark:text-white"
                    />
                  </div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-grow w-full p-4 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none font-mono"
                    placeholder="Viết nội dung nhật ký ở đây (hỗ trợ Markdown)..."
                  />
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {activeEntry.tags && activeEntry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {activeEntry.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-300">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeEntry.content || '*Nội dung trống*'}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p>Chọn một nhật ký để xem hoặc tạo mới</p>
              <button
                onClick={onNewEntry}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
              >
                Tạo nhật ký mới
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Xác nhận xóa nhật ký"
        confirmLabel="Xóa"
        onConfirm={() => {
          if (activeEntry) {
            onDeleteEntry(activeEntry.id);
            setActiveEntryId(null);
          }
        }}
      >
        <p className="text-gray-700 dark:text-gray-300">
          Bạn có chắc chắn muốn xóa nhật ký này không? Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
};

export default JournalView;
