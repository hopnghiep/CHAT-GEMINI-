
import React from 'react';
import Modal from './Modal';
import { ThemeSettings, Theme, Contrast, FontSize, FontFamily } from '../types';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ThemeSettings;
  onSettingsChange: (newSettings: ThemeSettings) => void;
}

const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  const handleSettingChange = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const fontSizes: { label: string; value: FontSize }[] = [
    { label: 'Nhỏ', value: '14px' },
    { label: 'Vừa', value: '16px' },
    { label: 'Lớn', value: '18px' },
  ];
  
  const fontFamilies: { label: string; value: FontFamily }[] = [
    { label: 'Sans-serif (Inter)', value: 'Inter, sans-serif' },
    { label: 'Serif (Lora)', value: 'Lora, serif' },
    { label: 'Monospace (Fira Code)', value: 'Fira Code, monospace' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cài đặt Giao diện">
      <div className="space-y-6 text-gray-800 dark:text-gray-200">
        {/* Theme Setting */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">Chủ đề</label>
          <div className="flex space-x-4 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
            {(['light', 'dark', 'system'] as Theme[]).map((theme) => (
              <button
                key={theme}
                onClick={() => handleSettingChange('theme', theme)}
                className={`w-full rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  settings.theme === theme
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Contrast Setting */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">Độ tương phản</label>
          <div className="flex space-x-4 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
            {(['normal', 'high'] as Contrast[]).map((contrast) => (
              <button
                key={contrast}
                onClick={() => handleSettingChange('contrast', contrast)}
                className={`w-full rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  settings.contrast === contrast
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {contrast === 'normal' ? 'Bình thường' : 'Cao'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Font Size Setting */}
        <div className="space-y-2">
            <label htmlFor="font-size-slider" className="block text-sm font-semibold">
                Kích thước chữ: <span className="font-bold">{parseInt(settings.fontSize)}px</span>
            </label>
            <input
                type="range"
                id="font-size-slider"
                min="14"
                max="18"
                step="2"
                value={parseInt(settings.fontSize)}
                onChange={(e) => handleSettingChange('fontSize', `${e.target.value}px` as FontSize)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
             <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Nhỏ</span>
                <span>Vừa</span>
                <span>Lớn</span>
            </div>
        </div>

        {/* Font Family Setting */}
        <div className="space-y-2">
          <label htmlFor="font-family-select" className="block text-sm font-semibold">
            Kiểu chữ
          </label>
          <select
            id="font-family-select"
            value={settings.fontFamily}
            onChange={(e) => handleSettingChange('fontFamily', e.target.value as FontFamily)}
            className="w-full rounded-md border-gray-300 p-2 text-gray-800 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {fontFamilies.map((font) => (
              <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
};

export default ThemeSettingsModal;
