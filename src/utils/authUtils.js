// Utility functions for authentication persistence

export const saveAuthState = (authData) => {
    try {
        localStorage.setItem('authState', JSON.stringify(authData));
    } catch (error) {
        console.error('Error saving auth state:', error);
    }
};

export const getAuthState = () => {
    try {
        const authState = localStorage.getItem('authState');
        return authState ? JSON.parse(authState) : null;
    } catch (error) {
        console.error('Error getting auth state:', error);
        return null;
    }
};

export const clearAuthState = () => {
    try {
        localStorage.removeItem('authState');
    } catch (error) {
        console.error('Error clearing auth state:', error);
    }
};

export const isAuthValid = (authState) => {
    if (!authState || !authState.isAuthenticated || !authState.token) {
        return false;
    }
    
    // You can add token expiration check here if needed
    // For now, just check if the basic structure is valid
    return true;
};

// Utility functions for create account authentication (temporary, session-based)
export const setCreateAccountAuth = () => {
    try {
        sessionStorage.setItem('createAccountAuth', 'true');
    } catch (error) {
        console.error('Error setting create account auth:', error);
    }
};

export const getCreateAccountAuth = () => {
    try {
        return sessionStorage.getItem('createAccountAuth') === 'true';
    } catch (error) {
        console.error('Error getting create account auth:', error);
        return false;
    }
};

export const clearCreateAccountAuth = () => {
    try {
        sessionStorage.removeItem('createAccountAuth');
    } catch (error) {
        console.error('Error clearing create account auth:', error);
    }
};
