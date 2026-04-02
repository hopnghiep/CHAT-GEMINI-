import React, { useState } from 'react';
import { ChatMessage, TextPart, ContentPart, LinkPart } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getMessageDisplayContent } from '../services/messageUtils';

interface MessageBubbleProps {
  message: ChatMessage;
  onEditMessageParts: (messageId: string, newParts: ContentPart[]) => void; // Generalized edit
  onSpeakContent: (messageId: string, content: string) => void;
  isPlaying: boolean;
  onTogglePin: (messageId: string) => void;
  isPinned: boolean;
  onRetryMessage: (messageId: string) => void; // New prop for retrying messages
  onDeleteMessage: (messageId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onEditMessageParts,
  onSpeakContent,
  isPlaying,
  onTogglePin,
  isPinned,
  onRetryMessage,
  onDeleteMessage,
}) => {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentParts = message.editedParts || message.parts;
  const firstTextPart = currentParts.find((part): part is TextPart => 'text' in part);
  const otherParts = currentParts.filter(part => !('text' in part));

  // State for editing, initialized from current text parts
  const initialEditedText = currentParts
    .filter((part): part is TextPart => 'text' in part)
    .map(part => part.text)
    .join('\n\n'); // Join multiple text parts with double newline
  const [editedText, setEditedText] = useState(initialEditedText);

  // Determine if the message can be edited (only if it has at least one text part for now)
  const canEditText = firstTextPart !== undefined;
  const canEdit = isUser; // Only user messages can be edited for now (model messages are generated)

  const handleSaveEdit = () => {
    if (!canEdit) return;

    // Preserve non-text parts and update the text part(s)
    const newParts: ContentPart[] = [];
    let textPartHandled = false;

    currentParts.forEach(part => {
      if ('text' in part && !textPartHandled) {
        newParts.push({ text: editedText.trim() });
        textPartHandled = true; // Only add the combined text once
      } else if (!('text' in part)) {
        newParts.push(part); // Add non-text parts as they are
      }
    });

    if (!textPartHandled && editedText.trim()) {
      newParts.unshift({ text: editedText.trim() }); // If there were no text parts but user typed something
    }

    onEditMessageParts(message.id, newParts);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(initialEditedText); // Reset to current saved content
    setIsEditing(false);
  };

  const handleRemoveLink = (linkToRemove: LinkPart) => {
    const newParts = currentParts.filter(part => !('link' in part) || part.link.url !== linkToRemove.link.url);
    onEditMessageParts(message.id, newParts);
  };

  // Concatenate all text parts for speech and copy
  const speechAndCopyContent = getMessageDisplayContent(message);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(speechAndCopyContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset "Copied!" message after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Optionally, show an error message to the user
    }
  };

  // Base classes for all action buttons
  const buttonBaseClasses = 'absolute p-1 shadow-sm rounded-full flex items-center justify-center';
  const defaultButtonColors = 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 text-gray-600';
  const widerButtonClasses = 'w-24'; // Fixed width to accommodate "Đã sao chép!" text

  const pinButtonClasses = `${buttonBaseClasses} w-8 h-8 ${isPinned ? 'text-yellow-500 bg-gray-50 dark:bg-gray-600 dark:text-yellow-400' : defaultButtonColors}`;
  const speakButtonClasses = `${buttonBaseClasses} w-8 h-8 ${defaultButtonColors} ${isPlaying ? 'text-red-500' : ''}`;
  const editButtonClasses = `${buttonBaseClasses} w-8 h-8 ${defaultButtonColors}`;
  const deleteButtonClasses = `${buttonBaseClasses} w-8 h-8 ${defaultButtonColors} hover:text-red-500 dark:hover:text-red-400`;
  // Copy button might be wider for "Copied!" text
  const copyButtonClasses = `${buttonBaseClasses} ${copied ? widerButtonClasses : 'w-8 h-8'} ${defaultButtonColors} ${copied ? 'text-green-500 dark:text-green-400' : ''}`;


  // Dynamic positioning logic to ensure consistent spacing and order
  const offsetStep = 32; // Each button roughly takes 32px (w-8 h-8)

  // Returns the 'right' values for user buttons
  const getUserButtonPosition = () => {
    const positions: { [key: string]: string } = {};
    let currentOffset = 8; // Initial offset from the edge of the bubble

    // Delete (rightmost)
    positions['delete'] = `${currentOffset}px`;
    currentOffset += offsetStep;
    
    // Edit
    if (canEdit && canEditText) {
      positions['edit'] = `${currentOffset}px`;
      currentOffset += offsetStep;
    }
    // Copy
    positions['copy'] = `${currentOffset}px`;
    currentOffset += copied ? 80 : offsetStep; // Adjust for wider "Copied!" text

    // Speak
    if (speechAndCopyContent) {
      positions['speak'] = `${currentOffset}px`;
      currentOffset += offsetStep;
    }
    // Pin (leftmost of the group)
    positions['pin'] = `${currentOffset}px`;
    
    return positions;
  };

  // Returns the 'left' values for model buttons
  const getModelButtonPosition = () => {
    const positions: { [key: string]: string } = {};
    let currentOffset = 8; // Reset for left side

    // Pin (leftmost)
    positions['pin'] = `${currentOffset}px`;
    currentOffset += offsetStep;

    // Speak
    if (speechAndCopyContent) {
      positions['speak'] = `${currentOffset}px`;
      currentOffset += offsetStep;
    }

    // Copy
    positions['copy'] = `${currentOffset}px`;
    currentOffset += copied ? 80 : offsetStep;

    // Retry Button for Error messages
    if (message.isError) {
      positions['retry'] = `${currentOffset}px`;
      currentOffset += offsetStep;
    }
    
    // Delete Button
    positions['delete'] = `${currentOffset}px`;
    
    return positions;
  };

  const buttonPositions = isUser ? getUserButtonPosition() : getModelButtonPosition();

  return (
    <div
      id={message.id} // Add ID for scrolling to message
      className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}
    >
      <div
        className={`relative max-w-[70%] rounded-lg px-4 py-3 shadow-md ${
          isUser
            ? 'bg-blue-500 text-white dark:bg-blue-600'
            : message.isError
              ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-100' // Error message styling
              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
        }`}
      >
        {isEditing && canEditText ? (
          <>
            <textarea
              className="w-full resize-y rounded bg-blue-400 p-2 text-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white dark:bg-blue-700"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={Math.max(3, editedText.split('\n').length)}
              autoFocus
            />
            <div className="mt-2 flex justify-end space-x-2">
              <button
                onClick={handleCancelEdit}
                className="rounded px-3 py-1 text-sm text-white hover:bg-white/20"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded bg-white px-3 py-1 text-sm text-blue-600 hover:bg-blue-100"
              >
                Lưu
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Action Buttons (placed directly as absolute children of the relative bubble) */}
            {isUser && (
              <>
                {/* Delete button */}
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className={`${deleteButtonClasses} -top-3`}
                  style={{ right: buttonPositions['delete'] }}
                  title="Xóa tin nhắn"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
                {/* Edit button */}
                {canEdit && canEditText && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`${editButtonClasses} -top-3`}
                    style={{ right: buttonPositions['edit'] }}
                    title="Chỉnh sửa tin nhắn"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      ></path>
                    </svg>
                  </button>
                )}
                {/* Copy Button */}
                <button
                  onClick={handleCopyMessage}
                  className={`${copyButtonClasses} -top-3`}
                  style={{ right: buttonPositions['copy'] }}
                  title="Sao chép tin nhắn"
                >
                  {copied ? (
                    <span className="text-xs font-semibold whitespace-nowrap">Đã sao chép!</span>
                  ) : (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                    </svg>
                  )}
                </button>
                {/* Speak Button */}
                {speechAndCopyContent && (
                  <button
                    onClick={() => onSpeakContent(message.id, speechAndCopyContent)}
                    className={`${speakButtonClasses} -top-3`}
                    style={{ right: buttonPositions['speak'] }}
                    title={isPlaying ? "Dừng phát âm" : "Phát âm tin nhắn"}
                  >
                    {isPlaying ? (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.5 7L14.5 17 21 12 14.5 7zM3 6L3 18 9 18 9 6 3 6zM11 6L11 18 13 18 13 6 11 6z" />
                      </svg>
                    )}
                  </button>
                )}
                {/* Pin/Unpin Button */}
                <button
                  onClick={() => onTogglePin(message.id)}
                  className={`${pinButtonClasses} -top-3`}
                  style={{ right: buttonPositions['pin'] }}
                  title={isPinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                >
                  {isPinned ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 12V2h-4v10l-2 2v8h2v-6l2-2z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7h3a5 5 0 015 5v5a5 5 0 01-5 5h-3m-1 0v-2a5 5 0 01-5-5V7a5 5 0 015-5h1m0 0h2m-6 0h2m0 0V2a5 5 0 00-5 5v5a5 5 0 005 5v2m6-10V2a5 5 0 015 5v5a5 5 0 01-5 5v2" />
                    </svg>
                  )}
                </button>
              </>
            )}

            {/* Model Message Buttons (left-aligned, order: Pin, Speak, Copy, Retry, Delete) */}
            {!isUser && (
              <>
                {/* Pin/Unpin Button */}
                <button
                  onClick={() => onTogglePin(message.id)}
                  className={`${pinButtonClasses} -top-3`}
                  style={{ left: buttonPositions['pin'] }}
                  title={isPinned ? "Bỏ ghim tin nhắn" : "Ghim tin nhắn"}
                >
                  {isPinned ? (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 12V2h-4v10l-2 2v8h2v-6l2-2z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7h3a5 5 0 015 5v5a5 5 0 01-5 5h-3m-1 0v-2a5 5 0 01-5-5V7a5 5 0 015-5h1m0 0h2m-6 0h2m0 0V2a5 5 0 00-5 5v5a5 5 0 005 5v2m6-10V2a5 5 0 015 5v5a5 5 0 01-5 5v2" />
                    </svg>
                  )}
                </button>
                {/* Speak Button */}
                {speechAndCopyContent && (
                  <button
                    onClick={() => onSpeakContent(message.id, speechAndCopyContent)}
                    className={`${speakButtonClasses} -top-3`}
                    style={{ left: buttonPositions['speak'] }}
                    title={isPlaying ? "Dừng phát âm" : "Phát âm tin nhắn"}
                  >
                    {isPlaying ? (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.5 7L14.5 17 21 12 14.5 7zM3 6L3 18 9 18 9 6 3 6zM11 6L11 18 13 18 13 6 11 6z" />
                      </svg>
                    )}
                  </button>
                )}
                {/* Copy Button */}
                <button
                  onClick={handleCopyMessage}
                  className={`${copyButtonClasses} -top-3`}
                  style={{ left: buttonPositions['copy'] }}
                  title="Sao chép tin nhắn"
                >
                  {copied ? (
                    <span className="text-xs font-semibold whitespace-nowrap">Đã sao chép!</span>
                  ) : (
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                    </svg>
                  )}
                </button>
                {/* Retry Button for Error messages */}
                {message.isError && (
                  <button
                    onClick={() => onRetryMessage(message.id)}
                    className={`${buttonBaseClasses} w-8 h-8 -top-3 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-600`}
                    style={{ left: buttonPositions['retry'] }}
                    title="Thử lại tin nhắn"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.88 15.19 20 13.67 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.12 9.07 4 10.59 4 12c0 4.42 3.58 8 8 8V23l4-4-4-4v3z" />
                    </svg>
                  </button>
                )}
                {/* Delete button */}
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className={`${deleteButtonClasses} -top-3`}
                  style={{ left: buttonPositions['delete'] }}
                  title="Xóa tin nhắn"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
              </>
            )}

            {currentParts.map((part, index) => {
              if ('text' in part) {
                return (
                  <div key={index} className="markdown-body prose prose-sm break-words dark:prose-invert">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                    >
                      {part.text}
                    </Markdown>
                  </div>
                );
              } else if ('inlineData' in part) {
                return (
                  <img
                    key={index}
                    src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                    alt={`Hình ảnh ${index + 1}`}
                    className="mt-2 max-h-64 max-w-full rounded-lg object-contain"
                    style={{ maxWidth: '100%', height: 'auto' }} // Ensure image scales
                    loading="lazy"
                    decoding="async"
                  />
                );
              } else if ('link' in part) { // Render LinkPart
                return (
                  <div key={index} className="mt-2 rounded-lg bg-blue-100 p-3 shadow-sm dark:bg-blue-800">
                    <a
                      href={part.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-blue-800 hover:underline dark:text-blue-200"
                    >
                      <p className="font-semibold">{part.link.title || 'Link'}</p>
                      <p className="break-all text-sm text-blue-600 dark:text-blue-300">{part.link.url}</p>
                    </a>
                    <div className="mt-2 flex items-center justify-end space-x-2 text-sm">
                      <button
                        onClick={() => navigator.clipboard.writeText(part.link.url)}
                        className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                        title="Sao chép liên kết"
                      >
                        <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                        </svg>
                        Sao chép
                      </button>
                      {isUser && isEditing && (
                         <button
                           onClick={() => handleRemoveLink(part)}
                           className="flex items-center text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                           title="Xóa liên kết"
                         >
                           <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 18L18 6M6 6l12 12"></path></svg>
                           Xóa
                         </button>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </>
        )}
        {/* Timestamp is now inside the bubble, always visible */}
        <span className="mt-1 block text-right text-xs text-gray-500 dark:text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;