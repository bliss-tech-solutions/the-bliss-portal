/**
 * Configuration for notification sounds
 * 
 * HOW TO CHANGE NOTIFICATION SOUNDS:
 * 
 * 1. Add your sound file to: /public/NotificationSoundFile/
 *    Example: /public/NotificationSoundFile/MyCustomSound.wav
 * 
 * 2. Update the path below to point to your sound file:
 *    - Change 'taskCompleted' for task completion notifications (currently set to iOS default)
 *    - Change 'newTask' for new task notifications
 *    - Change 'default' for general notifications
 * 
 * 3. Supported formats: .wav, .mp3, .ogg, .m4a
 * 
 * 4. Example:
 *    taskCompleted: '/NotificationSoundFile/MyCustomSound.wav',
 * 
 * 5. You can also add new sound types by adding new keys to SOUND_PATHS
 * 
 * iOS NOTIFICATION SOUND:
 * - The taskCompleted sound is configured to use iOS default notification (Tri-tone/Note)
 * - To use it, download the iOS notification sound and save it as: iOSNotification.wav
 * - Place it in: /public/NotificationSoundFile/iOSNotification.wav
 * - Download from: https://www.zedge.net/notification-sounds/ (search for "iOS notification")
 */

export const SOUND_PATHS = {
    // Default notification sound
    default: '/NotificationSoundFile/IOSNotification.mp3',
    
    // Task completion sound - Using iOS default notification sound (Tri-tone/Note)
    // File: IOSNotification.mp3 (uppercase IOS, .mp3 format)
    taskCompleted: '/NotificationSoundFile/IOSNotification.mp3',
    
    // New task notification sound
    newTask: '/NotificationSoundFile/IOSNotification.mp3',
    
    // iOS default notification sound (Tri-tone/Note)
    // This is the classic iOS notification sound
    iosDefault: '/NotificationSoundFile/IOSNotification.mp3',
    
    // You can add more sound types here:
    // taskUpdated: '/NotificationSoundFile/AnotherSound.wav',
    // messageReceived: '/NotificationSoundFile/MessageSound.wav',
};

/**
 * Get sound path by type
 * @param {string} type - Sound type (default, taskCompleted, newTask, etc.)
 * @returns {string} Sound file path
 */
export const getSoundPath = (type = 'default') => {
    return SOUND_PATHS[type] || SOUND_PATHS.default;
};

