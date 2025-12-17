/**
 * User Utility Functions
 * Common functions for extracting user data to avoid code duplication
 */

/**
 * Get User ID from Redux state or user object
 * @param {Object} user - User object from Redux state
 * @param {string} userIdFromState - UserId directly from Redux state (selectUserId)
 * @returns {string|null} User ID
 */
export const getUserId = (user = null, userIdFromState = null) => {
    // First try userId from state
    if (userIdFromState) return userIdFromState;
    
    // Then try user object properties
    if (user?.userId) return user.userId;
    if (user?._id) return user._id;
    if (user?.id) return user.id;
    
    return null;
};

/**
 * Get User Name (Full Name) from user object
 * Priority: name > firstName + lastName > email > default
 * @param {Object} user - User object from Redux state
 * @returns {string} User's full name
 */
export const getUserName = (user = null) => {
    if (!user) return 'User';
    
    // First try full name field
    if (user.name) return user.name.trim();
    
    // Then try firstName + lastName
    if (user.firstName || user.lastName) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
        if (fullName) return fullName.trim();
    }
    
    // Fallback to email
    if (user.email) return user.email;
    
    // Fallback to userEmail
    if (user.userEmail) return user.userEmail;
    
    // Default fallback
    return 'User';
};

/**
 * Get User Email from user object
 * @param {Object} user - User object from Redux state
 * @returns {string|null} User's email
 */
export const getUserEmail = (user = null) => {
    if (!user) return null;
    
    // Try email first
    if (user.email) return user.email;
    
    // Try userEmail
    if (user.userEmail) return user.userEmail;
    
    return null;
};

/**
 * Get User Full Name (for display purposes)
 * Similar to getUserName but can be customized for greetings
 * @param {Object} user - User object from Redux state
 * @param {string} fallback - Fallback text (default: 'Your')
 * @returns {string} Formatted user name
 */
export const getUserFullName = (user = null, fallback = 'Your') => {
    const name = getUserName(user);
    return name !== 'User' ? name : fallback;
};

/**
 * Get User Display Name for greetings
 * Returns first name if available, otherwise full name
 * @param {Object} user - User object from Redux state
 * @returns {string} Display name for greetings
 */
export const getUserDisplayName = (user = null) => {
    if (!user) return 'User';
    
    // Prefer first name for greetings
    if (user.firstName) return user.firstName;
    
    // Fallback to full name
    return getUserName(user);
};

// Export all functions as default object (optional - for convenience)
export default {
    getUserId,
    getUserName,
    getUserEmail,
    getUserFullName,
    getUserDisplayName
};

