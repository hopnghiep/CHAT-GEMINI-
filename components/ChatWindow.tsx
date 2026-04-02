
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatSession, ChatMessage, ContentPart, TextPart, ImageDataPart, LinkPart, TtsSettings } from '../types';
import { sendMessageToGemini, generateChatName, generateSpeech } from '../services/geminiService';
import { fileToBase64, readFileAsText, isImageFile, isTextFile } from '../services/fileUtils';
import MessageBubble from './MessageBubble';
import LoadingDots from './LoadingDots';
import Modal from './Modal';
import Dropdown from './Dropdown';
import { decode, decodeAudioData } from '../services/audioUtils';
import ExportChatModal from './ExportChatModal';
import ShareModal from './ShareModal';
import { exportToPlainText, exportToJson, exportToPdf, printChat } from '../services/exportService';
import { v4 as uuidv4 } from 'uuid';
import { LOCAL_STORAGE_KEY_MESSAGE_DRAFT, AVAILABLE_TTS_VOICES } from '../constants'; // Import new constants

interface ChatWindowProps {
  currentChat: ChatSession | null;
  onUpdateChat: (updater: ChatSession | ((prevChat: ChatSession) => ChatSession)) => void;
  onNewChat: () => void;
  onClearAllMessages: (chatId: string) => void;
  ttsSettings: TtsSettings;
  setTtsSettings: React.Dispatch<React.SetStateAction<TtsSettings>>;
  setMessageToDelete: (details: { chatId: string; messageId: string } | null) => void;
  onOpenThemeSettings: () => void;
  onSendMessage: (chatId: string, contentParts: ContentPart[]) => Promise<void>;
  onUpdateMessage: (chatId: string, messageId: string, newParts: ContentPart[]) => Promise<void>;
  onTogglePin: (chatId: string, messageId: string, isPinned: boolean) => Promise<void>;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  currentChat, 
  onUpdateChat, 
  onNewChat, 
  onClearAllMessages, 
  ttsSettings, 
  setTtsSettings, 
  setMessageToDelete, 
  onOpenThemeSettings,
  onSendMessage,
  onUpdateMessage,
  onTogglePin
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [currentlyPlayingMessageId, setCurrentlyPlayingMessageId] = useState<string | null>(null);
  const [showPinnedMessages, setShowPinnedMessages] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTtsSettingsModalOpen, setIsTtsSettingsModalOpen] = useState(false);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false); // New: Link modal state
  const [currentLinkUrl, setCurrentLinkUrl] = useState('');           // New: Link URL input
  const [currentLinkTitle, setCurrentLinkTitle] = useState('');       // New: Link Title input
  const [linksToAttach, setLinksToAttach] = useState<LinkPart[]>([]); // New: Links for current message

  // Store the last sent user message for retry functionality
  const lastSentUserMessagePartsRef = useRef<ContentPart[]>([]);

  // File Upload States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ id: string; url: string; name: string; mimeType: string; isImage: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Refs for audio playback
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0); // For sequential playback

  // Initialize AudioContext on mount
  useEffect(() => {
    // FIX: Use standard AudioContext instead of deprecated webkitAudioContext
    outputAudioContextRef.current = new AudioContext({sampleRate: 24000}); // Ensure correct sample rate for output
    outputNodeRef.current = outputAudioContextRef.current.createGain();
    outputNodeRef.current.connect(outputAudioContextRef.current.destination);

    return () => {
      if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
      }
    };
  }, []);

  const stopAllAudio = useCallback(() => {
    outputSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source might already be stopped or invalid, ignore error
      }
    });
    outputSourcesRef.current.clear();
    setCurrentlyPlayingMessageId(null);
    nextStartTimeRef.current = 0; // Reset start time
  }, []);

  const handleSpeakMessage = useCallback(async (messageId: string, content: string) => {
    if (!outputAudioContextRef.current || !outputNodeRef.current) return;

    if (currentlyPlayingMessageId === messageId) {
      // If the same message is clicked, stop playback
      stopAllAudio();
      return;
    }

    // Stop any currently playing audio before starting a new one
    stopAllAudio();
    setCurrentlyPlayingMessageId(messageId);
    setError(null);

    try {
      // Ensure AudioContext is running before attempting to play audio
      if (outputAudioContextRef.current.state === 'suspended') {
          await outputAudioContextRef.current.resume();
      }

      const base64Audio = await generateSpeech(content, ttsSettings.voiceName, ttsSettings.speakingRate);
      if (base64Audio) {
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          outputAudioContextRef.current,
          24000, // Sample rate as defined in API guidelines
          1,     // Number of channels as defined in API guidelines (PCM is mono)
        );

        const source = outputAudioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputNodeRef.current);

        source.onended = () => {
          outputSourcesRef.current.delete(source);
          if (outputSourcesRef.current.size === 0) {
            setCurrentlyPlayingMessageId(null);
            nextStartTimeRef.current = 0;
          }
        };

        const currentTime = outputAudioContextRef.current.currentTime;
        // Ensure playback starts smoothly, not before current time
        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
        outputSourcesRef.current.add(source);
      } else {
        setError("Không thể tạo giọng nói cho tin nhắn này.");
        setCurrentlyPlayingMessageId(null);
      }
    } catch (e: any) {
      console.error("Lỗi khi phát âm thanh:", e);
      setError(`Lỗi phát âm thanh: ${e.message}`);
      setCurrentlyPlayingMessageId(null);
      stopAllAudio(); // Ensure all audio is stopped on error
    }
  }, [currentlyPlayingMessageId, stopAllAudio, ttsSettings.voiceName, ttsSettings.speakingRate]);

  const handleTogglePinLocal = useCallback((messageId: string) => {
    if (!currentChat) return;
    const message = currentChat.messages.find(m => m.id === messageId);
    if (message) {
      onTogglePin(currentChat.id, messageId, !message.isPinned);
    }
  }, [currentChat, onTogglePin]);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []); // messagesEndRef is not needed here

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesEndRef]);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages.length, scrollToBottom, isLoading]); // Scroll on message count or loading state change

  // Auto-save message draft to localStorage
  useEffect(() => {
    if (!currentChat) return;

    const draftKey = `${LOCAL_STORAGE_KEY_MESSAGE_DRAFT}_${currentChat.id}`;
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, messageInput);
    }, 1000); // Save every 1 second

    return () => {
      clearTimeout(timer);
    };
  }, [messageInput, currentChat]);

  // Restore message draft from localStorage when currentChat changes
  useEffect(() => {
    if (currentChat) {
      const draftKey = `${LOCAL_STORAGE_KEY_MESSAGE_DRAFT}_${currentChat.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setMessageInput(savedDraft);
      } else {
        setMessageInput(''); // Clear if no draft for this chat
      }
    } else {
      setMessageInput(''); // Clear if no active chat
    }
    // Also clear any file selections/previews and links when chat changes
    setSelectedFiles([]);
    setFilePreviews([]);
    setLinksToAttach([]);
    setError(null); // Clear errors
  }, [currentChat]); // Run when currentChat object or its ID changes

  const MAX_FILE_SIZE_MB = 5; // Max 5MB per file
  const MAX_FILES = 5; // Max 5 files per message

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    const filesArray: File[] = Array.from(event.target.files);
    const newFiles: File[] = [];
    const newPreviews: { id: string; url: string; name: string; mimeType: string; isImage: boolean }[] = [];
    const errors: string[] = [];

    for (const file of filesArray) {
      if (selectedFiles.length + newFiles.length >= MAX_FILES) {
        errors.push(`Chỉ có thể tải lên tối đa ${MAX_FILES} tệp.`);
        break;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(`Tệp "${file.name}" quá lớn (tối đa ${MAX_FILE_SIZE_MB}MB).`);
        continue;
      }
      if (!isImageFile(file) && !isTextFile(file)) {
        errors.push(`Tệp "${file.name}" không phải là định dạng hình ảnh hoặc văn bản được hỗ trợ.`);
        continue;
      }

      newFiles.push(file);
      const previewId = uuidv4();
      if (isImageFile(file)) {
        newPreviews.push({
          id: previewId,
          url: URL.createObjectURL(file),
          name: file.name,
          mimeType: file.type,
          isImage: true,
        });
      } else { // Text file
        newPreviews.push({
          id: previewId,
          url: '', // No URL for text file preview
          name: file.name,
          mimeType: file.type,
          isImage: false,
        });
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError(null);
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);

    // Reset the input value to allow selecting the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (idToRemove: string) => {
    const indexToRemove = filePreviews.findIndex(p => p.id === idToRemove);
    if (indexToRemove < 0) return;

    const previewToRemove = filePreviews[indexToRemove];
    if (previewToRemove.isImage) {
        URL.revokeObjectURL(previewToRemove.url);
    }

    const newPreviews = filePreviews.filter(p => p.id !== idToRemove);
    const newFiles = selectedFiles.filter((_, index) => index !== indexToRemove);

    setFilePreviews(newPreviews);
    setSelectedFiles(newFiles);

    if (error) setError(null); // Clear error if files are removed
  };

  const handleAddLink = () => {
    if (!currentLinkUrl.trim()) {
      setError("URL không được để trống.");
      return;
    }
    const newLink: LinkPart = {
      link: {
        url: currentLinkUrl.trim(),
        title: currentLinkTitle.trim() || undefined,
      },
    };
    setLinksToAttach(prev => [...prev, newLink]);
    setCurrentLinkUrl('');
    setCurrentLinkTitle('');
    setIsAddLinkModalOpen(false);
    setError(null); // Clear any previous error
  };

  const removeAttachedLink = (idToRemove: string) => {
    setLinksToAttach(prev => prev.filter(link => link.link.url !== idToRemove));
  };


  const handleSendMessage = useCallback(async () => {
    if ((!messageInput.trim() && selectedFiles.length === 0 && linksToAttach.length === 0) || !currentChat || isLoading) return;

    setIsLoading(true);
    setError(null);

    const newMessageParts: ContentPart[] = [];

    if (messageInput.trim()) {
      newMessageParts.push({ text: messageInput.trim() });
    }

    newMessageParts.push(...linksToAttach);

    for (const file of selectedFiles) {
      if (isImageFile(file)) {
        try {
          const base64 = await fileToBase64(file);
          newMessageParts.push({
            inlineData: {
              mimeType: file.type,
              data: base64,
            },
          });
        } catch (e) {
          console.error("Lỗi khi chuyển đổi hình ảnh sang base64:", e);
          setError(`Không thể xử lý hình ảnh "${file.name}".`);
          setIsLoading(false);
          return;
        }
      } else if (isTextFile(file)) {
        try {
          const textContent = await readFileAsText(file);
          newMessageParts.push({ text: `\`\`\`${file.name}\n${textContent}\n\`\`\`` });
        } catch (e) {
          console.error("Lỗi khi đọc tệp văn bản:", e);
          setError(`Không thể đọc tệp văn bản "${file.name}".`);
          setIsLoading(false);
          return;
        }
      }
    }

    try {
      await onSendMessage(currentChat.id, newMessageParts);
      setMessageInput('');
      setSelectedFiles([]);
      setFilePreviews([]);
      setLinksToAttach([]);
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_MESSAGE_DRAFT}_${currentChat.id}`);
    } catch (e: any) {
      setError(e.message || "Lỗi khi gửi tin nhắn.");
    } finally {
      setIsLoading(false);
    }
  }, [messageInput, selectedFiles, linksToAttach, currentChat, isLoading, onSendMessage]);

  const handleRetryMessage = useCallback(async (messageId: string) => {
    if (!currentChat || isLoading) return;

    const messageIndex = currentChat.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return;

    const lastUserMessage = currentChat.messages[messageIndex - 1];

    if (lastUserMessage.role === 'user') {
      setIsLoading(true);
      try {
        await onSendMessage(currentChat.id, lastUserMessage.parts);
      } catch (e: any) {
        setError(e.message || "Lỗi khi thử lại.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setError("Không thể thử lại: Tin nhắn trước đó không phải là tin nhắn của người dùng.");
    }
  }, [currentChat, isLoading, onSendMessage]);

  const handleEditMessageParts = useCallback((messageId: string, newParts: ContentPart[]) => {
    if (!currentChat) return;
    onUpdateMessage(currentChat.id, messageId, newParts);
  }, [currentChat, onUpdateMessage]);

  const confirmClearAllMessages = useCallback(() => {
    if (currentChat) {
      onClearAllMessages(currentChat.id);
      setIsClearAllModalOpen(false);
      stopAllAudio(); // Stop audio if all messages are cleared
      // Clear the draft from localStorage when all messages are cleared
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_MESSAGE_DRAFT}_${currentChat.id}`);
    }
  }, [currentChat, onClearAllMessages, stopAllAudio]);

  const handleExportChat = useCallback((format: 'txt' | 'json' | 'pdf' | 'print') => {
    if (!currentChat) return;
    if (format === 'txt') {
      exportToPlainText(currentChat);
    } else if (format === 'json') {
      exportToJson(currentChat);
    } else if (format === 'pdf') {
      exportToPdf(currentChat);
    } else if (format === 'print') {
      printChat(currentChat);
    }
    // Close modal is handled by ExportChatModal's onConfirm
  }, [currentChat]);

  if (!currentChat) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white p-4 dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
          Chọn một cuộc trò chuyện hoặc tạo một cuộc trò chuyện mới
        </h2>
        <button
          onClick={onNewChat}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Tạo chat mới
        </button>
      </div>
    );
  }

  const hasMessages = currentChat.messages.length > 0;
  const pinnedMessages = currentChat.messages.filter(msg => msg.isPinned);

  return (
    <div className="relative flex h-full flex-col bg-white dark:bg-gray-800">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
          {currentChat.name} <span className="text-gray-500 dark:text-gray-400 text-sm">({currentChat.messages.length} tin nhắn)</span>
        </h2>
        <div className="flex items-center space-x-2">
          {/* Theme Settings Button */}
          <button
            onClick={onOpenThemeSettings}
            className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Cài đặt giao diện"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
            <span>Giao diện</span>
          </button>
          {/* TTS Settings Button */}
          <button
            onClick={() => setIsTtsSettingsModalOpen(true)}
            className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Cài đặt chuyển văn bản thành giọng nói"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m-4 10h8a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zm12-7a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <span>TTS</span>
          </button>

          {/* Share Button */}
          <button
            className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium ${
              hasMessages
                ? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-gray-700'
                : 'cursor-not-allowed text-gray-400 opacity-50 dark:text-gray-600'
            }`}
            disabled={!hasMessages}
            title="Chia sẻ cuộc trò chuyện"
            onClick={() => setIsShareModalOpen(true)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.516 3.832m-6.516-7.516l6.516-3.832m-6.516 7.516H12a3 3 0 003-3V6a3 3 0 013-3h2.328a.75.75 0 01.514 1.25l-1.574 1.574m-4.269 1.134a3 3 0 00-3-3h-2.328a.75.75 0 00-.514 1.25l1.574 1.574m-4.269 1.134a3 3 0 01-3 3v6a3 3 0 003 3h2.328a.75.75 0 00.514-1.25l-1.574-1.574m4.269-1.134a3 3 0 003 3h2.328a.75.75 0 01.514-1.25l-1.574-1.574"></path>
            </svg>
            <span>Chia sẻ</span>
          </button>

          {/* Export Chat Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium ${
              hasMessages
                ? 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-gray-700'
                : 'cursor-not-allowed text-gray-400 opacity-50 dark:text-gray-600'
            }`}
            disabled={!hasMessages}
            title="Xuất lịch sử chat"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            <span>Xuất</span>
          </button>

          {/* Clear Messages Button */}
          <button
            onClick={() => setIsClearAllModalOpen(true)}
            className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium ${
              hasMessages
                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700'
                : 'cursor-not-allowed text-gray-400 opacity-50 dark:text-gray-600'
            }`}
            disabled={!hasMessages}
            title="Xóa tất cả tin nhắn"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            <span>Xóa</span>
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
        {hasMessages ? (
          <>
            {/* Pinned Messages Section */}
            {pinnedMessages.length > 0 && (
              <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-gray-700">
                <button
                  onClick={() => setShowPinnedMessages(!showPinnedMessages)}
                  className="mb-2 flex w-full items-center justify-between font-semibold text-yellow-800 dark:text-yellow-300"
                >
                  <span>Tin nhắn đã ghim ({pinnedMessages.length})</span>
                  <svg
                    className={`h-5 w-5 transform transition-transform ${showPinnedMessages ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                {showPinnedMessages && (
                  <div className="space-y-2">
                    {pinnedMessages.map(msg => {
                      const textPart = (msg.editedParts || msg.parts).find(part => 'text' in part) as TextPart | undefined;
                      const textSnippet = textPart?.text.substring(0, 50) + (textPart && textPart.text.length > 50 ? '...' : '');
                      return (
                        <div
                          key={msg.id}
                          onClick={() => handleScrollToMessage(msg.id)}
                          className="cursor-pointer rounded-md bg-white p-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                        >
                          {textSnippet || "[Tin nhắn không có văn bản]"}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            
            {currentChat.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onEditMessageParts={handleEditMessageParts} // Changed to handleEditMessageParts
                onSpeakContent={handleSpeakMessage}
                isPlaying={currentlyPlayingMessageId === message.id}
                onTogglePin={handleTogglePinLocal}
                isPinned={!!message.isPinned}
                onRetryMessage={handleRetryMessage} // Pass retry handler
                onDeleteMessage={(messageId) => {
                  if (currentChat) {
                    setMessageToDelete({ chatId: currentChat.id, messageId });
                  }
                }}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[70%] rounded-lg bg-gray-200 px-4 py-3 shadow-md dark:bg-gray-700">
                  <LoadingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Gửi tin nhắn để bắt đầu cuộc trò chuyện.</p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 p-4 dark:border-gray-700">
        {error && (
          <div className="mb-2 rounded-md bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        {/* File Preview Area */}
        {(filePreviews.length > 0 || linksToAttach.length > 0) && (
          <div className="mb-2 flex flex-wrap gap-2 overflow-y-auto rounded-md border border-gray-300 p-2 dark:border-gray-600" style={{ maxHeight: '150px' }}>
            {linksToAttach.map((linkPart, index) => (
              <div key={`link-${index}`} className="relative rounded-md border border-blue-300 bg-blue-50 p-2 text-sm dark:border-blue-600 dark:bg-blue-900">
                <p className="font-semibold text-blue-800 dark:text-blue-200">{linkPart.link.title || 'Link'}</p>
                <p className="truncate text-blue-600 dark:text-blue-300" title={linkPart.link.url}>
                  {linkPart.link.url}
                </p>
                <button
                  onClick={() => removeAttachedLink(linkPart.link.url)}
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white shadow-md hover:bg-red-600"
                  title="Xóa liên kết"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            ))}
            {filePreviews.map((preview) => (
              <div key={preview.id} className="relative rounded-md border p-1 dark:border-gray-500">
                {preview.isImage ? (
                  <img src={preview.url} alt={preview.name} className="h-16 w-full rounded-md object-cover" />
                ) : (
                  <div className="flex h-16 w-full flex-col items-center justify-center rounded-md bg-gray-200 dark:bg-gray-600">
                    <svg className="h-8 w-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                )}
                <p className="mt-1 truncate text-xs text-gray-600 dark:text-gray-300" title={preview.name}>
                  {preview.name}
                </p>
                <button
                  onClick={() => removeFile(preview.id)}
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white shadow-md hover:bg-red-600"
                  title="Xóa tệp"
                >
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center space-x-2">
          {/* File input button */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,text/plain,.json,.md"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
            title="Đính kèm tệp"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path>
            </svg>
          </button>
          {/* Add Link button */}
          <button
            onClick={() => setIsAddLinkModalOpen(true)}
            className="rounded-md p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
            title="Thêm liên kết"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.135a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m7.586-13.828a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.135a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"></path>
            </svg>
          </button>
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Nhập tin nhắn của bạn..."
            className="flex-grow resize-none rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            rows={1}
            style={{ maxHeight: '100px', overflowY: 'auto' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || (!messageInput.trim() && selectedFiles.length === 0 && linksToAttach.length === 0)}
            className="rounded-md bg-blue-600 p-3 text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            title="Gửi tin nhắn (Enter)"
          >
            {isLoading ? (
              <LoadingDots />
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            )}
          </button>
        </div>
      </div>
      <Modal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        title="Xác nhận xóa tất cả tin nhắn"
        confirmLabel="Xóa"
        onConfirm={confirmClearAllMessages}
      >
        <p className="text-gray-700 dark:text-gray-300">
          Bạn có chắc chắn muốn xóa tất cả tin nhắn trong cuộc trò chuyện này không? Hành động này không thể hoàn tác.
        </p>
      </Modal>
      <ExportChatModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        chat={currentChat}
        onExport={handleExportChat}
      />
      {/* TTS Settings Modal */}
      <Modal
        isOpen={isTtsSettingsModalOpen}
        onClose={() => setIsTtsSettingsModalOpen(false)}
        title="Cài đặt chuyển văn bản thành giọng nói"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="tts-voice" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Giọng nói:
            </label>
            <select
              id="tts-voice"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
              value={ttsSettings.voiceName}
              onChange={(e) => setTtsSettings(prev => ({ ...prev, voiceName: e.target.value }))}
            >
              {AVAILABLE_TTS_VOICES.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tts-speaking-rate" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Tốc độ nói: <span className="font-semibold">{ttsSettings.speakingRate.toFixed(2)}</span>
            </label>
            <input
              type="range"
              id="tts-speaking-rate"
              min="0.25"
              max="4.0"
              step="0.05"
              value={ttsSettings.speakingRate}
              onChange={(e) => setTtsSettings(prev => ({ ...prev, speakingRate: parseFloat(e.target.value) }))}
              className="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>
      </Modal>

      {/* Add Link Modal */}
      <Modal
        isOpen={isAddLinkModalOpen}
        onClose={() => {
          setIsAddLinkModalOpen(false);
          setCurrentLinkUrl('');
          setCurrentLinkTitle('');
          setError(null);
        }}
        title="Thêm Liên kết"
        confirmLabel="Thêm"
        onConfirm={handleAddLink}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              URL: <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="link-url"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={currentLinkUrl}
              onChange={(e) => setCurrentLinkUrl(e.target.value)}
              placeholder="https://example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="link-title" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Tiêu đề (Tùy chọn):
            </label>
            <input
              type="text"
              id="link-title"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={currentLinkTitle}
              onChange={(e) => setCurrentLinkTitle(e.target.value)}
              placeholder="Tiêu đề hiển thị cho liên kết"
            />
          </div>
          {error && (
            <div className="rounded-md bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900 dark:text-red-200">
              {error}
            </div>
          )}
        </div>
      </Modal>
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        chat={currentChat}
      />
    </div>
  );
};

export default ChatWindow;
