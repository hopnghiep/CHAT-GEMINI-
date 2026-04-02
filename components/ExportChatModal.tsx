
import React, { useState } from 'react';
import Modal from './Modal';
import { ChatSession } from '../types';

interface ExportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ChatSession | null;
  onExport: (format: 'txt' | 'json' | 'pdf' | 'print') => void;
}

const ExportChatModal: React.FC<ExportChatModalProps> = ({ isOpen, onClose, chat, onExport }) => {
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'json' | 'pdf' | 'print'>('txt');

  if (!isOpen || !chat) return null;

  const handleExportClick = () => {
    onExport(selectedFormat);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Xuất lịch sử chat: ${chat.name}`}
      confirmLabel="Xuất"
      onConfirm={handleExportClick}
    >
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Chọn định dạng bạn muốn xuất cuộc trò chuyện này:
        </p>
        <div className="flex flex-col space-y-2">
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600 dark:text-blue-400"
              name="exportFormat"
              value="txt"
              checked={selectedFormat === 'txt'}
              onChange={() => setSelectedFormat('txt')}
            />
            <span className="ml-2 text-gray-700 dark:text-gray-300">Văn bản thuần túy (.txt)</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600 dark:text-blue-400"
              name="exportFormat"
              value="json"
              checked={selectedFormat === 'json'}
              onChange={() => setSelectedFormat('json')}
            />
            <span className="ml-2 text-gray-700 dark:text-gray-300">JSON (.json)</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600 dark:text-blue-400"
              name="exportFormat"
              value="pdf"
              checked={selectedFormat === 'pdf'}
              onChange={() => setSelectedFormat('pdf')}
            />
            <span className="ml-2 text-gray-700 dark:text-gray-300">PDF (.pdf)</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              className="form-radio text-blue-600 dark:text-blue-400"
              name="exportFormat"
              value="print"
              checked={selectedFormat === 'print'}
              onChange={() => setSelectedFormat('print')}
            />
            <span className="ml-2 text-gray-700 dark:text-gray-300">In (Hỗ trợ tiếng Việt tốt nhất)</span>
          </label>
        </div>
      </div>
    </Modal>
  );
};

export default ExportChatModal;
