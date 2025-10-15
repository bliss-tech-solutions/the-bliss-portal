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
