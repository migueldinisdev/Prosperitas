/**
 * Utility functions for generating unique IDs.
 */

import { customAlphabet } from 'nanoid';

/**
 * Generates a unique, readable ID using NanoID with hex alphabet, salted with timestamp.
 * @param prefix Optional prefix to prepend to the ID (e.g., "cat_" for categories).
 */
export const generateUniqueId = (prefix?: string): string => {
    const timestampHex = Date.now().toString(16).padStart(12, '0');
    const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);
    const randomHex = nanoid();
    const id = timestampHex + randomHex;
    return prefix ? `${prefix}${id}` : id;
};