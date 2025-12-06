/**
 * Simple Chat Message Formatter
 * 
 * Formats chat messages to display bullet points on separate lines
 * for better readability for children.
 */

/**
 * Formats a message by converting bullet points to separate lines
 * @param {string} content - Raw message content
 * @returns {string} Formatted HTML string
 */
export function formatChatMessage(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Split by lines
  const lines = content.split('\n');
  let formattedHtml = '';
  let inBulletList = false;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Check for bullet points (•, *, -, or numbered)
    const bulletMatch = trimmedLine.match(/^([\*\-\•\d+\.])\s+(.+)$/);
    
    if (bulletMatch) {
      // Start bullet list if not already started
      if (!inBulletList) {
        formattedHtml += '<div class="chat-bullet-list">';
        inBulletList = true;
      }
      
      // Add bullet point
      const bulletText = escapeHtml(bulletMatch[2]);
      formattedHtml += `<div class="chat-bullet-item">`;
      formattedHtml += `<span class="chat-bullet-icon">•</span>`;
      formattedHtml += `<span class="chat-bullet-text">${bulletText}</span>`;
      formattedHtml += `</div>`;
    } else if (trimmedLine.length > 0) {
      // Regular text line
      // Close bullet list if open
      if (inBulletList) {
        formattedHtml += '</div>';
        inBulletList = false;
      }
      
      // Add regular paragraph
      const escapedText = escapeHtml(trimmedLine);
      formattedHtml += `<p class="chat-text-line">${escapedText}</p>`;
    } else {
      // Empty line - close bullet list if open
      if (inBulletList) {
        formattedHtml += '</div>';
        inBulletList = false;
      }
      // Add line break for spacing
      formattedHtml += '<br>';
    }
  });
  
  // Close bullet list if still open
  if (inBulletList) {
    formattedHtml += '</div>';
  }
  
  return formattedHtml || escapeHtml(content);
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

