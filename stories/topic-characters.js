/**
 * Topic to Character Name Mapping
 * Maps topic IDs to their corresponding character names for chat button labels
 */

export const TOPIC_CHARACTER_MAP = {
  'photosynthesis': 'Mr. Chloro',
  'solar-system': 'Solaris',
  'water-cycle': 'Water Wizard', // Placeholder - update if you have a specific character
  'human-body': 'Dr. Body', // Placeholder - update if you have a specific character
  'electricity': 'Sparky', // Placeholder - update if you have a specific character
  'magnetism': 'Magno',
  // Add more topic-character mappings as needed
};

/**
 * Get character name for a topic
 * @param {string} topicId - Topic identifier (e.g., "photosynthesis")
 * @returns {string} Character name (e.g., "Mr. Chloro") or default
 */
export function getCharacterNameForTopic(topicId) {
  if (!topicId) return 'the AI';
  return TOPIC_CHARACTER_MAP[topicId.toLowerCase()] || 'the AI';
}

/**
 * Generate chat button label for a topic
 * @param {string} topicId - Topic identifier
 * @returns {string} Chat button label (e.g., "Ask Mr. Chloro")
 */
export function getChatButtonLabel(topicId) {
  const characterName = getCharacterNameForTopic(topicId);
  return `Ask ${characterName}`;
}

