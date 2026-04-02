
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDocs, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ShortcutDisplay from './components/ShortcutDisplay';
import Modal from './components/Modal';
import ThemeSettingsModal from './components/ThemeSettingsModal';
import LoadingDots from './components/LoadingDots';
import {
  ChatSession,
  Folder,
  ChatMessage,
  AppLink,
  TtsSettings,
  ThemeSettings,
  ContentPart,
  JournalEntry,
} from './types';
import JournalView from './components/JournalView';
import { generateChatName, sendMessageToGemini } from './services/geminiService';
import {
  KEYBOARD_SHORTCUTS,
  DEFAULT_TTS_SETTINGS,
  DEFAULT_THEME_SETTINGS,
} from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [appLinks, setAppLinks] = useState<AppLink[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isLinksFolderExpanded, setIsLinksFolderExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isShortcutsVisible, setIsShortcutsVisible] = useState(false);
  const [ttsSettings, setTtsSettings] = useState<TtsSettings>(DEFAULT_TTS_SETTINGS);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [isThemeSettingsModalOpen, setIsThemeSettingsModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<{ chatId: string; messageId: string } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [view, setView] = useState<'chat' | 'journal'>('chat');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    const handleWindowResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 600) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync: Folders
  useEffect(() => {
    if (!user) {
      setFolders([]);
      return;
    }
    const q = query(collection(db, `users/${user.uid}/folders`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const folderData = snapshot.docs.map(doc => doc.data() as Folder);
      setFolders(folderData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/folders`));
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: Chats
  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }
    const q = query(collection(db, `users/${user.uid}/chats`), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatSessions = snapshot.docs.map(doc => ({
        ...doc.data(),
        messages: [] // Messages will be synced separately for the active chat
      } as ChatSession));
      setChats(chatSessions);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/chats`));
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: Active Chat Messages
  useEffect(() => {
    if (!user || !activeChatId) return;
    const q = query(collection(db, `users/${user.uid}/chats/${activeChatId}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => doc.data() as ChatMessage);
      setChats(prevChats => prevChats.map(chat => 
        chat.id === activeChatId ? { ...chat, messages } : chat
      ));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/chats/${activeChatId}/messages`));
    return () => unsubscribe();
  }, [user, activeChatId]);

  // Firestore Sync: AppLinks
  useEffect(() => {
    if (!user) {
      setAppLinks([]);
      return;
    }
    const q = query(collection(db, `users/${user.uid}/links`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const linkData = snapshot.docs.map(doc => doc.data() as AppLink);
      setAppLinks(linkData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/links`));
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: User Settings
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.themeSettings) setThemeSettings(data.themeSettings);
        if (data.ttsSettings) setTtsSettings(data.ttsSettings);
      } else {
        // Initialize user doc if it doesn't exist
        setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          themeSettings: DEFAULT_THEME_SETTINGS,
          ttsSettings: DEFAULT_TTS_SETTINGS,
          updatedAt: new Date().toISOString()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`));
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Journal Entries Listener
  useEffect(() => {
    if (!user) {
      setJournalEntries([]);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'journal'),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as JournalEntry[];
      setJournalEntries(entries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/journal`);
    });

    return () => unsubscribe();
  }, [user]);

  // Effect to apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (themeSettings.theme === 'system') {
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemIsDark);
    } else {
      root.classList.toggle('dark', themeSettings.theme === 'dark');
    }
    root.classList.toggle('high-contrast', themeSettings.contrast === 'high');
    document.body.style.fontSize = themeSettings.fontSize;
    document.body.style.fontFamily = themeSettings.fontFamily;
  }, [themeSettings]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setFolders([]);
      setChats([]);
      setAppLinks([]);
      setJournalEntries([]);
      setActiveChatId(null);
      setActiveFolderId(null);
      setView('chat');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleNewJournalEntry = async () => {
    if (!user) return;
    const id = uuidv4();
    const now = new Date().toISOString();
    const date = now.split('T')[0];
    const newEntry: JournalEntry = {
      id,
      title: 'Nhật ký mới',
      content: '',
      tags: [],
      ownerId: user.uid,
      createdAt: now,
      updatedAt: now,
      date,
    };

    try {
      await setDoc(doc(db, 'users', user.uid, 'journal', id), newEntry);
      setView('journal');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/journal/${id}`);
    }
  };

  const handleUpdateJournalEntry = async (id: string, updates: Partial<JournalEntry>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'journal', id), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/journal/${id}`);
    }
  };

  const handleDeleteJournalEntry = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'journal', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/journal/${id}`);
    }
  };

  const handleSelectLinksFolder = useCallback(() => {
    setIsLinksFolderExpanded(prev => !prev);
    setActiveFolderId(null);
  }, []);

  const handleSelectFolder = useCallback((folderId: string) => {
    setActiveFolderId(prevId => (prevId === folderId ? null : folderId));
    setIsLinksFolderExpanded(false);
  }, []);

  // Handle New Chat
  const handleNewChat = useCallback(async () => {
    if (!user) return;
    const chatId = uuidv4();
    const newChat = {
      id: chatId,
      name: `Chat mới ${chats.length + 1}`,
      folderId: activeFolderId,
      ownerId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, `users/${user.uid}/chats`, chatId), newChat);
      setActiveChatId(chatId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats/${chatId}`);
    }
  }, [chats.length, activeFolderId, user]);

  // Handle New Folder
  const handleNewFolder = useCallback(async (name: string) => {
    if (!user) return;
    const folderId = uuidv4();
    const newFolder: Folder = {
      id: folderId,
      name: name,
      ownerId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, `users/${user.uid}/folders`, folderId), newFolder);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/folders/${folderId}`);
    }
  }, [user]);

  // Handle Rename Folder
  const handleRenameFolder = useCallback(async (id: string, newName: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/folders`, id), {
        name: newName,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/folders/${id}`);
    }
  }, [user]);

  // Handle Delete Folder
  const handleDeleteFolder = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/folders`, id));
      // Also update chats in this folder to have no folderId
      const chatsInFolder = chats.filter(c => c.folderId === id);
      for (const chat of chatsInFolder) {
        await updateDoc(doc(db, `users/${user.uid}/chats`, chat.id), { folderId: null });
      }
      if (activeFolderId === id) setActiveFolderId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/folders/${id}`);
    }
  }, [user, chats, activeFolderId]);

  // Handle Rename Chat
  const handleRenameChat = useCallback(async (id: string, newName: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/chats`, id), {
        name: newName,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/chats/${id}`);
    }
  }, [user]);

  // Handle Delete Chat
  const handleDeleteChat = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/chats`, id));
      if (activeChatId === id) setActiveChatId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/chats/${id}`);
    }
  }, [user, activeChatId]);

  // Handle Copy Chat
  const handleCopyChat = useCallback(async (chatId: string) => {
    if (!user) return;
    const originalChat = chats.find(chat => chat.id === chatId);
    if (originalChat) {
      const newChatId = uuidv4();
      const newChat = {
        ...originalChat,
        id: newChatId,
        name: `${originalChat.name} (Bản sao)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      delete (newChat as any).messages; // Don't store messages array in chat doc
      
      try {
        await setDoc(doc(db, `users/${user.uid}/chats`, newChatId), newChat);
        // Copy messages
        for (const msg of originalChat.messages) {
          const newMsgId = uuidv4();
          await setDoc(doc(db, `users/${user.uid}/chats/${newChatId}/messages`, newMsgId), {
            ...msg,
            id: newMsgId
          });
        }
        setActiveChatId(newChatId);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/chats/${newChatId}`);
      }
    }
  }, [chats, user]);

  // Handle Clear All Messages
  const handleClearAllMessages = useCallback(async (chatId: string) => {
    if (!user) return;
    try {
      const messagesQ = query(collection(db, `users/${user.uid}/chats/${chatId}/messages`));
      const snapshot = await getDocs(messagesQ);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      await updateDoc(doc(db, `users/${user.uid}/chats`, chatId), { updatedAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/chats/${chatId}/messages`);
    }
  }, [user]);

  // Handle Delete Single Message
  const handleDeleteMessage = useCallback(async () => {
    if (!messageToDelete || !user) return;
    const { chatId, messageId } = messageToDelete;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/chats/${chatId}/messages`, messageId));
      await updateDoc(doc(db, `users/${user.uid}/chats`, chatId), { updatedAt: new Date().toISOString() });
      setMessageToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/chats/${chatId}/messages/${messageId}`);
    }
  }, [messageToDelete, user]);

  const handleSendMessage = useCallback(async (chatId: string, contentParts: ContentPart[]) => {
    if (!user) return;

    try {
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        parts: contentParts,
        timestamp: new Date().toISOString(),
      };

      // Add user message to Firestore
      const userMsgRef = doc(db, `users/${user.uid}/chats/${chatId}/messages`, userMessage.id);
      await setDoc(userMsgRef, userMessage);

      // Update chat's updatedAt
      const chatRef = doc(db, `users/${user.uid}/chats`, chatId);
      await updateDoc(chatRef, { updatedAt: new Date().toISOString() });

      // Generate chat name if it's the first message
      const currentChat = chats.find(c => c.id === chatId);
      if (currentChat && currentChat.messages.length === 0) {
        const generatedName = await generateChatName(contentParts);
        if (generatedName) {
          await updateDoc(chatRef, { name: generatedName });
        }
      }

      // Prepare AI message
      const aiMessageId = `msg-${Date.now()}-ai`;
      const aiMsgRef = doc(db, `users/${user.uid}/chats/${chatId}/messages`, aiMessageId);
      
      let accumulatedResponse = '';
      
      await sendMessageToGemini(
        [...currentChat?.messages || [], userMessage],
        contentParts,
        (chunk) => {
          accumulatedResponse += chunk;
        },
        async (err) => {
          const errorMsg: ChatMessage = {
            id: aiMessageId,
            role: 'model',
            parts: [{ text: `Error: ${err}` }],
            timestamp: new Date().toISOString(),
            isError: true
          };
          await setDoc(aiMsgRef, errorMsg);
        }
      );

      const finalAiMessage: ChatMessage = {
        id: aiMessageId,
        role: 'model',
        parts: [{ text: accumulatedResponse }],
        timestamp: new Date().toISOString(),
      };
      await setDoc(aiMsgRef, finalAiMessage);

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/chats/${chatId}/messages`);
    }
  }, [user, chats]);

  const handleUpdateMessage = useCallback(async (chatId: string, messageId: string, newParts: ContentPart[]) => {
    if (!user) return;
    try {
      const msgRef = doc(db, `users/${user.uid}/chats/${chatId}/messages`, messageId);
      await updateDoc(msgRef, { 
        editedParts: newParts,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/chats/${chatId}/messages/${messageId}`);
    }
  }, [user]);

  const handleTogglePin = useCallback(async (chatId: string, messageId: string, isPinned: boolean) => {
    if (!user) return;
    try {
      const msgRef = doc(db, `users/${user.uid}/chats/${chatId}/messages`, messageId);
      await updateDoc(msgRef, { isPinned });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/chats/${chatId}/messages/${messageId}`);
    }
  }, [user]);

  const handleUpdateChat = useCallback(async (updater: ChatSession | ((prevChat: ChatSession) => ChatSession)) => {
    if (!user || !activeChatId) return;
    const currentChat = chats.find(c => c.id === activeChatId);
    if (!currentChat) return;

    let updatedChat: ChatSession;
    if (typeof updater === 'function') {
      updatedChat = updater(currentChat);
    } else {
      updatedChat = updater;
    }

    try {
      const chatRef = doc(db, `users/${user.uid}/chats`, activeChatId);
      await updateDoc(chatRef, {
        name: updatedChat.name,
        folderId: updatedChat.folderId,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/chats/${activeChatId}`);
    }
  }, [activeChatId, chats, user]);

  // Handle Move Chat to Folder
  const handleMoveChatToFolder = useCallback(async (chatId: string, folderId: string | null) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/chats`, chatId), {
        folderId: folderId,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/chats/${chatId}`);
    }
  }, [user]);

  // Handle New Link
  const handleNewLink = useCallback(async (url: string, title: string) => {
    if (!user) return;
    const linkId = uuidv4();
    const newLink: AppLink = {
      id: linkId,
      url,
      title,
      ownerId: user.uid,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, `users/${user.uid}/links`, linkId), newLink);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/links/${linkId}`);
    }
  }, [user]);

  // Handle Delete Link
  const handleDeleteLink = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/links`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/links/${id}`);
    }
  }, [user]);

  const currentChat = useMemo(() => activeChatId ? chats.find((chat) => chat.id === activeChatId) : null, [activeChatId, chats]);

  // Keyboard Shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;
      if (
        (event.target as HTMLElement).tagName === 'INPUT' ||
        (event.target as HTMLElement).tagName === 'TEXTAREA'
      ) {
        return;
      }

      for (const shortcut of KEYBOARD_SHORTCUTS) {
        if (shortcut.combo) {
          const isComboMatch = isCtrlOrCmd && event.key.toLowerCase() === shortcut.key.toLowerCase();
          if (isComboMatch) {
            event.preventDefault();
            switch (shortcut.action) {
              case 'newChat': handleNewChat(); break;
              case 'saveChat': alert('Chat được tự động lưu!'); break;
              case 'toggleShortcuts': setIsShortcutsVisible((prev) => !prev); break;
              default: break;
            }
          }
        }
      }
    },
    [handleNewChat],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <LoadingDots />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
          <h1 className="mb-6 text-center text-3xl font-bold text-gray-900 dark:text-white">Gemini Chat</h1>
          <p className="mb-8 text-center text-gray-600 dark:text-gray-400">
            Đăng nhập để lưu trữ và đồng bộ hóa các cuộc trò chuyện của bạn.
          </p>
          <button
            onClick={handleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-all hover:bg-blue-700 active:scale-95"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Đăng nhập với Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col lg:flex-row overflow-hidden">
      <div 
        className="relative z-10 flex-shrink-0 border-b lg:border-r lg:border-b-0 dark:border-gray-700 bg-gray-100 dark:bg-gray-900"
        style={{ width: windowWidth >= 1024 ? `${sidebarWidth}px` : '100%' }}
      >
        <Sidebar
          folders={folders}
          chats={chats}
          appLinks={appLinks}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          activeFolderId={activeFolderId}
          isLinksFolderExpanded={isLinksFolderExpanded}
          onSelectFolder={handleSelectFolder}
          onSelectLinksFolder={handleSelectLinksFolder}
          onNewChat={handleNewChat}
          onNewFolder={handleNewFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onRenameChat={handleRenameChat}
          onDeleteChat={handleDeleteChat}
          onCopyChat={handleCopyChat}
          onMoveChatToFolder={handleMoveChatToFolder}
          onNewLink={handleNewLink}
          onDeleteLink={handleDeleteLink}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          user={user}
          onLogout={handleLogout}
          currentView={view}
          onViewChange={setView}
        />
      </div>
      
      {/* Resizer */}
      <div
        onMouseDown={startResizing}
        className={`hidden lg:flex w-1.5 cursor-col-resize items-center justify-center hover:bg-blue-400/30 transition-colors z-20 relative group ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`}
      >
        <div className={`w-px h-8 bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-400 ${isResizing ? 'bg-blue-300' : ''}`} />
      </div>

      <main className="flex flex-grow dark:bg-gray-800 overflow-hidden">
        {view === 'chat' ? (
          <ChatWindow
            currentChat={currentChat}
            onUpdateChat={handleUpdateChat}
            onNewChat={handleNewChat}
            onClearAllMessages={handleClearAllMessages}
            ttsSettings={ttsSettings}
            setTtsSettings={async (settings) => {
              setTtsSettings(settings);
              if (user) {
                await updateDoc(doc(db, 'users', user.uid), { ttsSettings: settings });
              }
            }}
            setMessageToDelete={setMessageToDelete}
            onOpenThemeSettings={() => setIsThemeSettingsModalOpen(true)}
            onSendMessage={handleSendMessage}
            onUpdateMessage={handleUpdateMessage}
            onTogglePin={handleTogglePin}
          />
        ) : (
          <JournalView
            entries={journalEntries}
            onUpdateEntry={handleUpdateJournalEntry}
            onDeleteEntry={handleDeleteJournalEntry}
            onNewEntry={handleNewJournalEntry}
          />
        )}
      </main>
      <ShortcutDisplay
        isVisible={isShortcutsVisible}
        onClose={() => setIsShortcutsVisible(false)}
      />
      <ThemeSettingsModal
        isOpen={isThemeSettingsModalOpen}
        onClose={() => setIsThemeSettingsModalOpen(false)}
        settings={themeSettings}
        onSettingsChange={async (settings) => {
          setThemeSettings(settings);
          if (user) {
            await updateDoc(doc(db, 'users', user.uid), { themeSettings: settings });
          }
        }}
      />
      <Modal
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        title="Xác nhận xóa tin nhắn"
        confirmLabel="Xóa"
        onConfirm={handleDeleteMessage}
      >
        <p className="text-gray-700 dark:text-gray-300">
          Bạn có chắc chắn muốn xóa tin nhắn này không? Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
};

export default App;
