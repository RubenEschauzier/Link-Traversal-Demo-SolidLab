import React, { type ReactNode } from 'react';
export interface User {
    id: string;
    username: string;
    name: string;
    avatar?: string;
}
interface AuthContextType {
    user: User | null;
    login: (mockUser: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}
export declare const AuthProvider: React.FC<{
    children: ReactNode;
}>;
export declare const useAuth: () => AuthContextType;
export {};
//# sourceMappingURL=AuthContext.d.ts.map