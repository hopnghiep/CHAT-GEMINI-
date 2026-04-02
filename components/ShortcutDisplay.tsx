
import React from 'react';
import { KEYBOARD_SHORTCUTS } from '../constants';
import { KeyboardShortcut } from '../types';

interface ShortcutDisplayProps {
  isVisible: boolean;
  onClose: () => void;
}

const ShortcutDisplay: React.FC<ShortcutDisplayProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">Phím Tắt Bàn Phím</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none dark:hover:text-gray-300"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <div className="py-4">
          <ul className="space-y-2">
            {KEYBOARD_SHORTCUTS.map((shortcut: KeyboardShortcut, index: number) => (
              <li key={index} className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                <span className="font-medium">{shortcut.description}</span>
                <span className="flex space-x-1">
                  {shortcut.combo ? (
                    shortcut.combo.map((key, i) => (
                      <kbd
                        key={i}
                        className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-600 dark:text-gray-100"
                      >
                        {key}
                      </kbd>
                    ))
                  ) : (
                    <kbd className="rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                      {shortcut.key}
                    </kbd>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShortcutDisplay;
