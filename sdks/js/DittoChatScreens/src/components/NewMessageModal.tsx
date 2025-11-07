import React, { useState } from "react";
import type { User } from "../types";
import { Icons } from "./Icons";

interface NewMessageModalProps {
  onClose: () => void;
  users: User[];
}

const NewMessageModal: React.FC<NewMessageModalProps> = ({
  onClose,
  users,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="flex items-center justify-between p-4 border-b border-(--border-color) flex-shrink-0">
        <h1 className="text-xl font-bold">New Message</h1>
        <button
          onClick={onClose}
          className="text-(--text-color-lightest) hover:text-(--text-color-medium)"
        >
          <Icons.x className="w-6 h-6" />
        </button>
      </header>
      <div className="p-4 flex-shrink-0">
        <div className="relative">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-color-faint)" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-(--secondary-bg) border border-(--border-color) rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-(--primary-color-focus)"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul>
          {filteredUsers.map((user) => (
            <li key={user.id}>
              <button className="w-full text-left px-4 py-3 flex items-center space-x-4 hover:bg-(--surface-color-light) transition-colors">
                <div className="relative">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                  {user.isActive && (
                    <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-(--active-status-bg) border-2 border-white"></span>
                  )}
                </div>
                <span className="font-semibold">{user.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NewMessageModal;
