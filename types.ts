

export type Role = 'user' | 'model';

export interface TextPart {
  text: string;
}

export interface ImageDataPart {
  inlineData: {
    mimeType: string;
    data: string; // Base64 encoded string
  };
}

export interface LinkPart {
  link: {
    url: string;
    title?: string;
  };
}

export type ContentPart = TextPart | ImageDataPart | LinkPart;

export interface ChatMessage {
  id: string;
  role: Role;
  parts: ContentPart[];
  editedParts?: ContentPart[]; // For "Canva-like" editing to store local edits
  timestamp: string;
  isPinned?: boolean; // Indicates if the message is pinned
  isError?: boolean; // Indicates if the message is an error message from the model
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  folderId: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppLink {
  id: string;
  url: string;
  title: string;
  ownerId: string;
  createdAt: string;
}

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: string;
  combo?: string[];
}

export interface ChatNameResponse {
  chatName: string;
}

export interface TtsSettings {
  voiceName: string;
  speakingRate: number;
}

// New Types for Theme Settings
export type Theme = 'light' | 'dark' | 'system';
export type Contrast = 'normal' | 'high';
export type FontSize = '14px' | '16px' | '18px'; // Represented as actual pixel values
export type FontFamily = 'Inter, sans-serif' | 'Lora, serif' | 'Fira Code, monospace';

export interface ThemeSettings {
  theme: Theme;
  contrast: Contrast;
  fontSize: FontSize;
  fontFamily: FontFamily;
}

export interface ParsedContent {
  text: string;
  images: ImageDataPart[];
  links: LinkPart[];
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string; // Markdown content
  tags: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  date: string; // ISO date string (YYYY-MM-DD) for daily grouping
}
