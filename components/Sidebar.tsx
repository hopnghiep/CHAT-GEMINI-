
import React, { useState } from 'react';
import { ChatSession, Folder, TextPart, AppLink } from '../types';
import { FirebaseUser } from '../firebase';
import Dropdown from './Dropdown';
import Modal from './Modal';
import { v4 as uuidv4 } from 'uuid';

interface SidebarProps {
  folders: Folder[];
  chats: ChatSession[];
  appLinks: AppLink[];
  activeChatId: string | null;
  activeFolderId: string | null;
  isLinksFolderExpanded: boolean;
  onSelectChat: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onSelectLinksFolder: () => void;
  onNewChat: () => void;
  onNewFolder: (name: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameChat: (id: string, newName: string) => void;
  onDeleteChat: (id: string) => void;
  onCopyChat: (id: string) => void;
  onMoveChatToFolder: (chatId: string, folderId: string | null) => void;
  onNewLink: (url: string, title: string) => void;
  onDeleteLink: (id: string) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  user: FirebaseUser | null;
  onLogout: () => void;
  currentView: 'chat' | 'journal';
  onViewChange: (view: 'chat' | 'journal') => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  folders,
  chats,
  appLinks,
  activeChatId,
  activeFolderId,
  isLinksFolderExpanded,
  onSelectChat,
  onSelectFolder,
  onSelectLinksFolder,
  onNewChat,
  onNewFolder,
  onRenameFolder,
  onDeleteFolder,
  onRenameChat,
  onDeleteChat,
  onCopyChat,
  onMoveChatToFolder,
  onNewLink,
  onDeleteLink,
  searchTerm,
  onSearchTermChange,
  user,
  onLogout,
  currentView,
  onViewChange,
}) => {
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderModalTitle, setFolderModalTitle] = useState('');
  const [folderModalInput, setFolderModalInput] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatModalTitle, setChatModalTitle] = useState('');
  const [chatModalInput, setChatModalInput] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isMoveChatModalOpen, setIsMoveChatModalOpen] = useState(false);

  // New states for delete confirmation modals
  const [isDeleteChatModalOpen, setIsDeleteChatModalOpen] = useState(false);
  const [chatToDeleteId, setChatToDeleteId] = useState<string | null>(null);
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [folderToDeleteId, setFolderToDeleteId] = useState<string | null>(null);
  
  // New states for Link management
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalUrl, setLinkModalUrl] = useState('');
  const [linkModalTitle, setLinkModalTitle] = useState('');
  const [linkToDeleteId, setLinkToDeleteId] = useState<string | null>(null);
  const [isDeleteLinkModalOpen, setIsDeleteLinkModalOpen] = useState(false);

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  
  const filteredLinks = appLinks.filter(
    (link) =>
      link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const chatsWithoutFolder = filteredChats.filter((chat) => !chat.folderId);

  const handleCreateFolder = () => {
    setFolderModalTitle('Tạo thư mục mới');
    setFolderModalInput('');
    setCurrentFolderId(null);
    setIsFolderModalOpen(true);
  };

  const handleRenameFolder = (folder: Folder) => {
    setFolderModalTitle(`Đổi tên thư mục: ${folder.name}`);
    setFolderModalInput(folder.name);
    setCurrentFolderId(folder.id);
    setIsFolderModalOpen(true);
  };

  const handleFolderSubmit = () => {
    if (!folderModalInput.trim()) return;
    if (currentFolderId) {
      onRenameFolder(currentFolderId, folderModalInput);
    } else {
      onNewFolder(folderModalInput);
    }
    setIsFolderModalOpen(false);
  };

  const openDeleteFolderConfirm = (folderId: string) => {
    setFolderToDeleteId(folderId);
    setIsDeleteFolderModalOpen(true);
  };

  const confirmDeleteFolder = () => {
    if (folderToDeleteId) {
      onDeleteFolder(folderToDeleteId);
    }
    setIsDeleteFolderModalOpen(false);
    setFolderToDeleteId(null);
  };

  const handleRenameChat = (chat: ChatSession) => {
    setChatModalTitle(`Đổi tên chat: ${chat.name}`);
    setChatModalInput(chat.name);
    setCurrentChatId(chat.id);
    setIsChatModalOpen(true);
  };

  const handleChatSubmit = () => {
    if (!chatModalInput.trim() || !currentChatId) return;
    onRenameChat(currentChatId, chatModalInput);
    setIsChatModalOpen(false);
  };

  const openDeleteChatConfirm = (chatId: string) => {
    setChatToDeleteId(chatId);
    setIsDeleteChatModalOpen(true);
  };

  const confirmDeleteChat = () => {
    if (chatToDeleteId) {
      onDeleteChat(chatToDeleteId);
    }
    setIsDeleteChatModalOpen(false);
    setChatToDeleteId(null);
  };

  const handleMoveChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setIsMoveChatModalOpen(true);
  };
  
  const handleCreateLink = () => {
    setLinkModalUrl('');
    setLinkModalTitle('');
    setIsLinkModalOpen(true);
  };

  const handleLinkSubmit = () => {
    if (!linkModalUrl.trim() || !linkModalTitle.trim()) return;
    onNewLink(linkModalUrl, linkModalTitle);
    setIsLinkModalOpen(false);
  };

  const openDeleteLinkConfirm = (linkId: string) => {
    setLinkToDeleteId(linkId);
    setIsDeleteLinkModalOpen(true);
  };

  const confirmDeleteLink = () => {
    if (linkToDeleteId) {
      onDeleteLink(linkToDeleteId);
    }
    setIsDeleteLinkModalOpen(false);
    setLinkToDeleteId(null);
  };

  const handleCopyFirstMessageToRename = () => {
    if (!currentChatId) return;
    const chatToRename = chats.find(chat => chat.id === currentChatId);
    if (chatToRename && chatToRename.messages.length > 0) {
      const firstTextPart = chatToRename.messages[0].parts.find((part): part is TextPart => 'text' in part);
      if (firstTextPart) {
        setChatModalInput(firstTextPart.text);
      } else {
        setChatModalInput('Tin nhắn đầu tiên không có văn bản');
      }
    }
  };

  const folderOptions = folders.map((folder) => ({
    label: folder.name,
    value: folder.id,
  }));

  const chatBeingRenamed = chats.find(chat => chat.id === currentChatId);
  const hasFirstMessage = chatBeingRenamed && chatBeingRenamed.messages.length > 0;
  const hasFirstMessageText = hasFirstMessage && chatBeingRenamed?.messages[0].parts.some(part => 'text' in part);


  return (
    <div className="flex h-full w-full flex-col bg-gray-100 p-4 dark:bg-gray-900">
      <div className="mb-4 flex flex-shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Gemini Chat</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => onViewChange(currentView === 'chat' ? 'journal' : 'chat')}
            className="rounded-md bg-gray-200 p-2 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            title={currentView === 'chat' ? "Chuyển sang Nhật ký" : "Chuyển sang Chat"}
          >
            {currentView === 'chat' ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            )}
          </button>
          <button
            onClick={onNewChat}
            className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            title="Tạo chat mới (Ctrl + N)"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Tìm kiếm chats, thư mục, liên kết..."
        className="mb-4 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
      />
      
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {/* Journal Section */}
        <div className="mb-2">
          <div
            onClick={() => onViewChange('journal')}
            className={`flex items-center justify-between rounded-md p-2 cursor-pointer transition-colors ${
              currentView === 'journal' ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center truncate">
              <svg className="h-5 w-5 mr-2 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Nhật ký</h2>
            </div>
          </div>
        </div>

        {/* Links Section */}
        <div className="mb-2">
          <div
            onClick={onSelectLinksFolder}
            className="flex items-center justify-between rounded-md p-2 cursor-pointer transition-colors hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <div className="flex items-center truncate">
              <svg
                className={`h-5 w-5 mr-2 transform transition-transform flex-shrink-0 text-gray-600 dark:text-gray-300 ${
                  isLinksFolderExpanded ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Liên kết</h2>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateLink();
              }}
              className="rounded-md bg-teal-600 p-2 text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:bg-teal-500 dark:hover:bg-teal-600"
              title="Tạo liên kết mới"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.72"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.72-1.72"></path></svg>
            </button>
          </div>

          {isLinksFolderExpanded && filteredLinks.length > 0 && (
            <ul className="mt-2 mb-4 space-y-1 pl-7">
              {filteredLinks.map((link) => (
                <li
                  key={link.id}
                  className="group flex items-center justify-between rounded-md p-2 text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full truncate text-left"
                    title={link.url}
                  >
                    {link.title}
                  </a>
                  <button
                    onClick={() => openDeleteLinkConfirm(link.id)}
                    className="ml-2 hidden p-1 text-red-500 opacity-75 hover:opacity-100 group-hover:block"
                    title="Xóa liên kết"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd"></path></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>


        {/* Folders Section */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Thư mục</h2>
          <button
            onClick={handleCreateFolder}
            className="rounded-md bg-green-600 p-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:bg-green-500 dark:hover:bg-green-600"
            title="Tạo thư mục mới (Ctrl + E)"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              ></path>
            </svg>
          </button>
        </div>

        {filteredFolders.map((folder) => (
          <div key={folder.id} className="mb-2 rounded-md bg-gray-200 p-2 dark:bg-gray-700">
            <div
              onClick={() => onSelectFolder(folder.id)}
              className={`flex items-center justify-between rounded-md p-2 -m-2 cursor-pointer transition-colors ${
                activeFolderId === folder.id ? 'bg-green-300 dark:bg-green-800' : 'hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center truncate">
                <svg
                  className={`h-5 w-5 mr-2 transform transition-transform flex-shrink-0 text-gray-600 dark:text-gray-300 ${
                    activeFolderId === folder.id ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
                <span className="font-medium text-gray-800 dark:text-gray-100 truncate">{folder.name}</span>
              </div>
              <Dropdown
                items={[
                  { label: 'Đổi tên', onClick: () => handleRenameFolder(folder), icon: '✏️' },
                  { label: 'Xóa', onClick: () => openDeleteFolderConfirm(folder.id), icon: '🗑️' },
                ]}
                position="left"
              >
                <svg
                  className="h-4 w-4 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  ></path>
                </svg>
              </Dropdown>
            </div>
            {activeFolderId === folder.id && (
              <ul className="mt-2 pl-4">
                {filteredChats
                  .filter((chat) => chat.folderId === folder.id)
                  .map((chat) => (
                    <li
                      key={chat.id}
                      className={`flex items-center justify-between rounded-md p-2 text-gray-700 hover:bg-gray-300 dark:text-gray-200 dark:hover:bg-gray-600 ${
                        activeChatId === chat.id ? 'bg-blue-200 dark:bg-blue-800' : ''
                      }`}
                    >
                      <button onClick={() => onSelectChat(chat.id)} className="w-full text-left truncate">
                        {chat.name}
                      </button>
                      <Dropdown
                        items={[
                          { label: 'Đổi tên', onClick: () => handleRenameChat(chat), icon: '✏️' },
                          { label: 'Sao chép', onClick: () => onCopyChat(chat.id), icon: '📄' },
                          { label: 'Di chuyển', onClick: () => handleMoveChat(chat.id), icon: '📁' },
                          { label: 'Xóa', onClick: () => openDeleteChatConfirm(chat.id), icon: '🗑️' },
                        ]}
                        position="left"
                      >
                        <svg
                          className="h-4 w-4 text-gray-600 dark:text-gray-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          ></path>
                        </svg>
                      </Dropdown>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ))}

        <h2 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">Chats không có thư mục</h2>
        <ul className="mt-2">
          {chatsWithoutFolder.map((chat) => (
            <li
              key={chat.id}
              className={`flex items-center justify-between rounded-md p-2 text-gray-700 hover:bg-gray-300 dark:text-gray-200 dark:hover:bg-gray-600 ${
                activeChatId === chat.id ? 'bg-blue-200 dark:bg-blue-800' : ''
              }`}
            >
              <button onClick={() => onSelectChat(chat.id)} className="w-full text-left truncate">
                {chat.name}
              </button>
              <Dropdown
                items={[
                  { label: 'Đổi tên', onClick: () => handleRenameChat(chat), icon: '✏️' },
                  { label: 'Sao chép', onClick: () => onCopyChat(chat.id), icon: '📄' },
                  { label: 'Di chuyển', onClick: () => handleMoveChat(chat.id), icon: '📁' },
                  { label: 'Xóa', onClick: () => openDeleteChatConfirm(chat.id), icon: '🗑️' },
                ]}
                position="left"
              >
                <svg
                  className="h-4 w-4 text-gray-600 dark:text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  ></path>
                </svg>
              </Dropdown>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {user?.displayName || 'Người dùng'}
              </span>
              <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-200 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-red-400"
            title="Đăng xuất"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title={folderModalTitle}>
        <input
          type="text"
          className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={folderModalInput}
          onChange={(e) => setFolderModalInput(e.target.value)}
          placeholder="Nhập tên thư mục"
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleFolderSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {currentFolderId ? 'Đổi tên' : 'Tạo'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={isChatModalOpen} onClose={() => setIsChatModalOpen(false)} title={chatModalTitle}>
        <input
          type="text"
          className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={chatModalInput}
          onChange={(e) => setChatModalInput(e.target.value)}
          placeholder="Nhập tên chat"
        />
        <div className="mt-4 flex justify-between">
          <button
            onClick={handleCopyFirstMessageToRename}
            className={`rounded-md px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 ${
              !hasFirstMessageText ? 'cursor-not-allowed opacity-50' : 'bg-gray-200'
            }`}
            disabled={!hasFirstMessageText}
          >
            Sao chép tin nhắn đầu tiên
          </button>
          <button
            onClick={handleChatSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Đổi tên
          </button>
        </div>
      </Modal>

      <Modal isOpen={isMoveChatModalOpen} onClose={() => setIsMoveChatModalOpen(false)} title="Di chuyển chat">
        <label htmlFor="folder-select" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Chọn thư mục:
        </label>
        <select
          id="folder-select"
          className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
          onChange={(e) => {
            if (currentChatId) {
              onMoveChatToFolder(currentChatId, e.target.value === 'none' ? null : e.target.value);
            }
            setIsMoveChatModalOpen(false);
          }}
          value={
            chats.find((c) => c.id === currentChatId)?.folderId || 'none'
          }
        >
          <option value="none">Không có thư mục</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setIsMoveChatModalOpen(false)}
            className="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            Hủy
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteChatModalOpen}
        onClose={() => setIsDeleteChatModalOpen(false)}
        title="Xác nhận xóa chat"
        confirmLabel="Xóa"
        onConfirm={confirmDeleteChat}
      >
        <p className="text-gray-700 dark:text-gray-300">
          Bạn có chắc chắn muốn xóa cuộc trò chuyện này không? Hành động này không thể hoàn tác.
        </p>
      </Modal>

      <Modal
        isOpen={isDeleteFolderModalOpen}
        onClose={() => setIsDeleteFolderModalOpen(false)}
        title="Xác nhận xóa thư mục"
        confirmLabel="Xóa"
        onConfirm={confirmDeleteFolder}
      >
        <p className="text-gray-700 dark:text-gray-300">
          Bạn có chắc chắn muốn xóa thư mục này không? Tất cả các cuộc trò chuyện trong thư mục này cũng sẽ bị xóa. Hành động này không thể hoàn tác.
        </p>
      </Modal>

      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Tạo liên kết mới">
        <div className="space-y-4">
          <div>
            <label htmlFor="link-title" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Tiêu đề <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="link-title"
              className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={linkModalTitle}
              onChange={(e) => setLinkModalTitle(e.target.value)}
              placeholder="Nhập tiêu đề"
            />
          </div>
          <div>
            <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 dark:text-gray-200">URL <span className="text-red-500">*</span></label>
            <input
              type="url"
              id="link-url"
              className="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              value={linkModalUrl}
              onChange={(e) => setLinkModalUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleLinkSubmit}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Tạo
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteLinkModalOpen}
        onClose={() => setIsDeleteLinkModalOpen(false)}
        title="Xác nhận xóa liên kết"
        confirmLabel="Xóa"
        onConfirm={confirmDeleteLink}
      >
        <p className="text-gray-700 dark:text-gray-300">
          Bạn có chắc chắn muốn xóa liên kết này không? Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
};

export default Sidebar;
