import React, { createContext, useContext, useState, type ReactNode } from 'react';

// 1. Define the shape of your User
export interface User {
  id: string;
  username: string;
  name: string; // Display name
  avatar?: string;
}

// 2. Define the shape of the Context (what data/functions are available)
interface AuthContextType {
  user: User | null;
  login: (mockUser: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// 3. Create the Context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 4. Create the Provider Component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Mock Login Function
  const login = (mockUser: User) => {
    setUser(mockUser);
    console.log("Mock user logged in:", mockUser.username);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// 5. Create a custom hook for easy access
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};