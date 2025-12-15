import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState } from 'react';
// 3. Create the Context with a default undefined value
const AuthContext = createContext(undefined);
// 4. Create the Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // Mock Login Function
    const login = (mockUser) => {
        setUser(mockUser);
        console.log("Mock user logged in:", mockUser.username);
    };
    const logout = () => {
        setUser(null);
    };
    return (_jsx(AuthContext.Provider, { value: { user, login, logout, isAuthenticated: !!user }, children: children }));
};
// 5. Create a custom hook for easy access
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
//# sourceMappingURL=AuthContext.js.map