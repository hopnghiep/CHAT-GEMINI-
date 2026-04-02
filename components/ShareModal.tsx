import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { ChatSession } from '../types';
import { getMessageDisplayContent } from '../services/messageUtils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ChatSession | null;
}

// Helper to generate plain text content for sharing
const generateShareText = (chat: ChatSession): string => {
  let textContent = `Cuộc trò chuyện: ${chat.name}\n\n`;
  chat.messages.forEach((message) => {
    const role = message.role === 'user' ? 'Bạn' : 'Gemini';
    const content = getMessageDisplayContent(message);
    textContent += `--- ${role} ---\n${content}\n\n`;
  });
  return textContent.trim();
};

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, chat }) => {
  const [copyButtonText, setCopyButtonText] = useState('Sao chép vào Clipboard');

  const shareText = useMemo(() => {
    if (!chat) return '';
    return generateShareText(chat);
  }, [chat]);

  if (!isOpen || !chat) return null;

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyButtonText('Đã sao chép!');
      setTimeout(() => setCopyButtonText('Sao chép vào Clipboard'), 2000);
    } catch (err) {
      console.error('Không thể sao chép:', err);
      setCopyButtonText('Sao chép thất bại');
      setTimeout(() => setCopyButtonText('Sao chép vào Clipboard'), 2000);
    }
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Trò chuyện Gemini: ${chat.name}`,
          text: shareText,
        });
      } catch (err) {
        console.error('Lỗi khi chia sẻ:', err);
      }
    } else {
      alert('Trình duyệt của bạn không hỗ trợ API Chia sẻ Web. Vui lòng sử dụng tính năng sao chép.');
    }
  };

  const isWebShareSupported = typeof navigator.share === 'function';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chia sẻ cuộc trò chuyện: ${chat.name}`}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="share-preview" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Xem trước nội dung:
          </label>
          <textarea
            id="share-preview"
            readOnly
            className="mt-1 h-40 w-full resize-none rounded-md border border-gray-300 p-2 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            value={shareText}
          />
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <button
            onClick={handleCopyToClipboard}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {copyButtonText}
          </button>
          {isWebShareSupported && (
            <button
              onClick={handleWebShare}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            >
              Chia sẻ qua...
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ShareModal;
