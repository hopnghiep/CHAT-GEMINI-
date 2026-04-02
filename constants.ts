

import { KeyboardShortcut, TtsSettings, ThemeSettings } from './types';

export const LOCAL_STORAGE_KEY_FOLDERS = 'geminiChatFolders';
export const LOCAL_STORAGE_KEY_CHATS = 'geminiChatSessions';
export const LOCAL_STORAGE_KEY_ACTIVE_CHAT = 'geminiChatActiveChatId';
export const LOCAL_STORAGE_KEY_SHORTCUTS_VISIBLE = 'geminiChatShortcutsVisible';
export const LOCAL_STORAGE_KEY_MESSAGE_DRAFT = 'geminiChatMessageDraft';
export const LOCAL_STORAGE_KEY_APP_LINKS = 'geminiChatAppLinks';
export const LOCAL_STORAGE_KEY_TTS_SETTINGS = 'geminiChatTtsSettings';
export const LOCAL_STORAGE_KEY_THEME_SETTINGS = 'geminiChatThemeSettings'; // New constant for theme settings

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'N', description: 'Tạo chat mới', action: 'newChat', combo: ['Ctrl', 'N'] },
  { key: 'S', description: 'Lưu chat hiện tại', action: 'saveChat', combo: ['Ctrl', 'S'] },
  { key: 'F', description: 'Tìm kiếm', action: 'focusSearch', combo: ['Ctrl', 'F'] },
  { key: 'M', description: 'Mở/Đóng phím tắt', action: 'toggleShortcuts', combo: ['Ctrl', 'M'] },
  { key: 'Enter', description: 'Gửi tin nhắn', action: 'sendMessage' },
  { key: 'E', description: 'Tạo thư mục mới', action: 'newFolder', combo: ['Ctrl', 'E'] },
];

export const DEFAULT_MODEL = 'gemini-2.5-flash';

export const AVAILABLE_TTS_VOICES = [
  { name: 'Kore', label: 'Kore (Mặc định)' },
  { name: 'Puck', label: 'Puck' },
  { name: 'Charon', label: 'Charon' },
  { name: 'Fenrir', label: 'Fenrir' },
  { name: 'Zephyr', label: 'Zephyr' },
];

export const DEFAULT_TTS_SETTINGS: TtsSettings = {
  voiceName: 'Kore',
  speakingRate: 1.0,
};

// New Default Theme Settings
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  theme: 'system',
  contrast: 'normal',
  fontSize: '16px',
  fontFamily: 'Inter, sans-serif',
};
