# n8n Chat Payload Analysis

## Overview

This document provides a detailed analysis of the payload structure sent to n8n webhook for chat interactions.

## Payload Structure

The payload is created by the `prepareN8nPayload()` function in `chat/chat-services.js` and sent via `sendToN8n()`.

**Important**: The payload is sent as a **single object** (not an array) to match n8n Chat Trigger node format. The Chat Trigger node expects `sessionId` at the top level of the object.

### Complete Payload Schema

```json
{
  "sessionId": "string",
  "conversation_id": "string",
  "user_message": "string",
  "topic": "string",
  "guide_name": "string",
  "grade_level": "string",
  "chat_history": [
    {
      "role": "user" | "guide",
      "content": "string",
      "timestamp": "ISO8601 string"
    }
  ],
  "timestamp": "ISO8601 string",
  "user_id": "string"
}
```

**Note**: `topic_id` field has been removed to match n8n expected format.

## Field-by-Field Analysis

### 1. `sessionId` (string, required)

**Source**: Constructed from `user_id` and `conversation_id`

**Format**: 
- Pattern: `{user_id}_{conversation_id}`
- Example: `"96565315-a1ca-4fa8-9283-f8ec43ee6c1e_e5d3647b-6733-4650-9f6f-198ecf4cf859"`

**Construction**:
- Extracts `user_id` from user profile (or uses "guest-user")
- Uses `conversation_id` (UUID format)
- Combines: `${user_id}_${conversation_id}`

**Purpose**: Unique identifier for the chat session combining user and conversation

---

### 2. `conversation_id` (string, required)

**Source**: Extracted from `sessionId` or generated as UUID

**Format**: UUID v4 format
- Pattern: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
- Example: `"e5d3647b-6733-4650-9f6f-198ecf4cf859"`

**Resolution**:
1. If `sessionId` contains `_`: extracts part after last underscore
2. Validates it's a UUID format
3. If not valid UUID or missing: generates new UUID via `crypto.randomUUID()` or fallback generator

**Purpose**: Conversation identifier for n8n workflow tracking (UUID format)

---

### 3. `user_message` (string, required)

**Source**: Direct parameter from `sendMessage()` call

**Format**: Plain text string containing user's input message

**Example**: `"How do plants make food?"`

**Purpose**: The current user message to process

---

### 4. `topic` (string, required)

**Source**: Topic name from database or fallback

**Resolution Logic**:
1. If `topicId` provided → Try `getTopicById(topicId)`
2. If topic not found → Try `getOrCreatePhotosynthesisTopic()`
3. If still not found → Hardcoded fallback:
   ```json
   {
     "id": "photosynthesis",
     "name": "Photosynthesis",
     "title": "Photosynthesis",
     "description": "Learn how plants make their own food..."
   }
   ```

**Format**: 
- Uses `topic.name || topic.title || 'Photosynthesis'`
- Example: `"Photosynthesis"`

**Purpose**: Topic name for context

---

### 5. `topic_id` (removed)

**Status**: This field has been removed from the payload to match n8n expected format.

**Note**: Only `topic` (name) is sent, not `topic_id`

---

### 6. `guide_name` (string, required)

**Source**: `getGuideName(topicName)` function

**Mapping**:
```javascript
{
  'Photosynthesis': 'Mr. Chloro',
  'Nature & Animals': 'Flora the Forest Friend',
  // Default: `${topicName} Guide`
}
```

**Format**: String with guide's name
- Example: `"Mr. Chloro"`

**Purpose**: AI guide character name for personalized responses

---

### 7. `grade_level` (string, required)

**Source**: User profile from Supabase

**Resolution**:
1. Calls `getCurrentUserProfile()` → Fetches from `user_profiles` table
2. Extracts `profile.grade_level`
3. Fallback: `"5"` (default grade level)

**Format**: String representation of grade
- Example: `"5"`, `"3"`, `"7"`

**Purpose**: Adjusts response complexity based on user's grade level

**Note**: Returns `null` if:
- Supabase client not available
- No active session
- Profile fetch fails

---

### 8. `chat_history` (array, required)

**Source**: `messages` parameter (array of message objects)

**Transformation**:
1. **Filter**: Removes loading messages (`role === 'ai' && content === '...'`)
2. **Map**: Transforms message structure:
   ```javascript
   {
     role: m.role === 'user' ? 'user' : 'guide',
     content: m.content,
     timestamp: m.timestamp
   }
   ```

**Format**: Array of message objects
```json
[
  {
    "role": "guide",
    "content": "Hi! I'm here to help...",
    "timestamp": "2025-01-15T10:30:00.000Z"
  },
  {
    "role": "user",
    "content": "How do plants make food?",
    "timestamp": "2025-01-15T10:30:15.000Z"
  }
]
```

**Role Mapping**:
- `'user'` → `'user'` (unchanged)
- `'ai'` → `'guide'` (renamed for n8n)
- Other roles → `'guide'`

**Purpose**: Provides conversation context to n8n workflow

---

### 9. `timestamp` (string, required)

**Source**: Generated at payload creation time

**Format**: ISO 8601 timestamp string
- Example: `"2025-01-15T10:30:15.123Z"`
- Generated via: `new Date().toISOString()`

**Purpose**: Timestamp of the current message

---

### 10. `user_id` (string, required)

**Source**: User profile from Supabase

**Resolution**:
1. Calls `getCurrentUserProfile()` → Fetches from `user_profiles` table
2. Extracts `profile.id` (matches Supabase auth user ID)
3. Fallback: `"guest-user"`

**Format**: 
- UUID string (authenticated users)
- Example: `"550e8400-e29b-41d4-a716-446655440000"`
- Or: `"guest-user"` (unauthenticated)

**Purpose**: User identifier for personalization and analytics

---

## Complete Example Payloads

### Example 1: Authenticated User, First Message

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000_e5d3647b-6733-4650-9f6f-198ecf4cf859",
  "conversation_id": "e5d3647b-6733-4650-9f6f-198ecf4cf859",
  "user_message": "How do plants make food?",
  "topic": "Photosynthesis",
  "guide_name": "Mr. Chloro",
  "grade_level": "5",
  "chat_history": [
    {
      "role": "guide",
      "content": "Hi! I'm Mr. Chloro, your plant wizard guide!",
      "timestamp": "2025-01-15T10:30:00.000Z"
    }
  ],
  "timestamp": "2025-01-15T10:30:15.123Z",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Example 2: Guest User, Continuing Conversation

```json
{
  "sessionId": "guest-user_e5d3647b-6733-4650-9f6f-198ecf4cf859",
  "conversation_id": "e5d3647b-6733-4650-9f6f-198ecf4cf859",
  "user_message": "What about water?",
  "topic": "Photosynthesis",
  "guide_name": "Mr. Chloro",
  "grade_level": "5",
  "chat_history": [
    {
      "role": "guide",
      "content": "Hi! I'm Mr. Chloro, your plant wizard guide!",
      "timestamp": "2025-01-15T10:30:00.000Z"
    },
    {
      "role": "user",
      "content": "How do plants make food?",
      "timestamp": "2025-01-15T10:30:15.000Z"
    },
    {
      "role": "guide",
      "content": "Plants make food through photosynthesis...",
      "timestamp": "2025-01-15T10:30:20.000Z"
    }
  ],
  "timestamp": "2025-01-15T10:30:25.456Z",
  "user_id": "guest-user"
}
```

### Example 3: Different Topic (Nature & Animals)

```json
{
  "sessionId": "96565315-a1ca-4fa8-9283-f8ec43ee6c1e_e5d3647b-6733-4650-9f6f-198ecf4cf859",
  "conversation_id": "e5d3647b-6733-4650-9f6f-198ecf4cf859",
  "user_message": "Tell me about forest animals",
  "topic": "Nature & Animals",
  "guide_name": "Flora the Forest Friend",
  "grade_level": "3",
  "chat_history": [],
  "timestamp": "2025-01-15T10:35:00.789Z",
  "user_id": "96565315-a1ca-4fa8-9283-f8ec43ee6c1e"
}
```

## Data Flow

```
User sends message
    ↓
sendMessage(topicId, message, context, sessionId, messages)
    ↓
prepareN8nPayload(topicId, message, context, sessionId, messages)
    ↓
[Resolve topic] → getTopicById() OR getOrCreatePhotosynthesisTopic()
[Get user profile] → getCurrentUserProfile()
[Transform chat history] → Filter & map messages
[Generate IDs] → sessionId, conversation_id
    ↓
Payload object created
    ↓
sendToN8n(payload)
    ↓
POST to N8N_CHAT_URL with JSON payload
```

## Fallback Chain

### Topic Resolution
1. Try `getTopicById(topicId)` (if topicId provided)
2. Try `getOrCreatePhotosynthesisTopic()` (creates if missing)
3. Hardcoded Photosynthesis topic object

### User Profile
1. Try `getCurrentUserProfile()` → Supabase `user_profiles` table
2. Fallback: `null` → Uses defaults:
   - `grade_level`: `"5"`
   - `user_id`: `"guest-user"`

### Session ID
1. Use provided `sessionId` parameter
2. Fallback: `generateSessionId()` → `chat_${Date.now()}_${random}`

## Validation & Error Handling

### Payload Preparation Errors
- If topic resolution fails → Uses hardcoded Photosynthesis topic
- If profile fetch fails → Uses default values
- If sessionId missing → Generates new one
- **Never throws** → Always returns valid payload

### Required Fields
All fields are **always present** due to fallback logic:
- ✅ `sessionId` - Always generated
- ✅ `conversation_id` - Always derived
- ✅ `user_message` - Required parameter
- ✅ `topic` - Always falls back to "Photosynthesis"
- ✅ `guide_name` - Always mapped (default: `${topic} Guide`)
- ✅ `grade_level` - Always defaults to "5"
- ✅ `chat_history` - Always array (may be empty)
- ✅ `timestamp` - Always generated
- ✅ `user_id` - Always defaults to "guest-user"

## n8n Response Format

n8n should return JSON with one of these fields (in order of preference):
1. `response` (preferred)
2. `content`
3. `message`
4. `answer`
5. `ai_response`
6. `text`

The system extracts the AI response from the first available field.

**Example n8n Response**:
```json
{
  "response": "Great question! Plants make food through photosynthesis..."
}
```

## Testing the Payload

### 1. Check Payload in Console
```javascript
// In browser console on chat page
import { sendMessage } from './chat-services.js';

// Send a test message and check network tab
// Or add console.log in prepareN8nPayload()
```

### 2. Network Tab Inspection
1. Open DevTools → Network tab
2. Filter by your n8n domain
3. Find POST request to n8n webhook
4. Check Request Payload

### 3. n8n Workflow Testing
1. Add HTTP Request node in n8n
2. Set method to POST
3. Check incoming payload structure
4. Verify all fields are present

## Common Issues

### Issue: Missing `grade_level`
**Cause**: User profile not found, Supabase not configured
**Solution**: Check `getCurrentUserProfile()` returns valid profile

### Issue: Empty `chat_history`
**Cause**: No previous messages in session
**Solution**: Normal for first message, will populate as conversation continues

### Issue: Wrong `guide_name`
**Cause**: Topic name doesn't match guide mapping
**Solution**: Check `getGuideName()` mapping or topic name format

### Issue: `user_id` always "guest-user"
**Cause**: User not authenticated or profile fetch failing
**Solution**: Check Supabase auth session and user_profiles table

## Summary

The n8n payload is **robust and always valid** due to comprehensive fallback logic. All fields are guaranteed to be present with sensible defaults, ensuring n8n workflows always receive complete data for processing.

