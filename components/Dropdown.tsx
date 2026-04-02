
import React, { useState, useRef, useEffect } from 'react';

interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface DropdownProps {
  children: React.ReactNode;
  items: DropdownItem[];
  position?: 'left' | 'right'; // Controls dropdown alignment relative to trigger
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ children, items, position = 'right', className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent click from bubbling up to parent elements
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const dropdownMenuClasses = `absolute z-10 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-700 dark:ring-gray-600 ${
    position === 'left' ? 'right-0' : 'left-0'
  } ${isOpen ? '' : 'hidden'}`;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-100 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
          id="menu-button"
          aria-expanded="true"
          aria-haspopup="true"
          onClick={toggleDropdown}
        >
          {children}
          <svg
            className="-mr-1 h-5 w-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className={dropdownMenuClasses} role="menu" aria-orientation="vertical" aria-labelledby="menu-button" tabIndex={-1}>
        <div className="py-1" role="none">
          {items.map((item, index) => (
            <a
              key={index}
              href="#"
              className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
              role="menuitem"
              tabIndex={-1}
              id={`menu-item-${index}`}
              onClick={(e) => {
                e.preventDefault();
                item.onClick();
                setIsOpen(false);
              }}
            >
              {item.icon && <span className="mr-3 text-lg group-hover:text-indigo-500 dark:group-hover:text-indigo-400">{item.icon}</span>}
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dropdown;
