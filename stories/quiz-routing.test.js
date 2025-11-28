import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase createClient
const mockCreateClient = vi.fn();
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm', () => ({
  createClient: mockCreateClient
}));

// Mock config
vi.mock('../config.js', () => ({
  supabaseConfig: {
    url: 'https://test.supabase.co',
    anonKey: 'test-anon-key'
  }
}));

describe('getQuizUrl', () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateClient.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Grade level mapping', () => {
    it('should return beginner quiz for K, 1, 2 grade levels (photosynthesis story)', async () => {
      const module = await import('./quiz-routing.js');
      
      // Mock Supabase client and auth
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'test-user' } } },
            error: null
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { grade_level: 'K', age: 5 },
                error: null
              })
            })
          })
        })
      };
      mockCreateClient.mockReturnValue(mockSupabase);

      const story = {
        id: 'photosynthesis-story',
        topicTag: 'Photosynthesis',
        title: 'How Plants Make Food'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/quizzes/photosynthesis-quiz-beginner.html');
    });

    it('should return beginner quiz for grade 1 (photosynthesis story)', async () => {
      const module = await import('./quiz-routing.js');
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'test-user' } } },
            error: null
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { grade_level: '1', age: 6 },
                error: null
              })
            })
          })
        })
      };
      mockCreateClient.mockReturnValue(mockSupabase);

      const story = {
        id: 'photosynthesis-story',
        topicTag: 'Photosynthesis',
        title: 'How Plants Make Food'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/quizzes/photosynthesis-quiz-beginner.html');
    });

    it('should return beginner quiz for grade 2 (photosynthesis story)', async () => {
      const module = await import('./quiz-routing.js');
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'test-user' } } },
            error: null
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { grade_level: '2', age: 7 },
                error: null
              })
            })
          })
        })
      };
      mockCreateClient.mockReturnValue(mockSupabase);

      const story = {
        id: 'photosynthesis-story',
        topicTag: 'Photosynthesis',
        title: 'How Plants Make Food'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/quizzes/photosynthesis-quiz-beginner.html');
    });

    it('should return intermediate quiz for grade 3 (photosynthesis story)', async () => {
      const module = await import('./quiz-routing.js');
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'test-user' } } },
            error: null
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { grade_level: '3', age: 8 },
                error: null
              })
            })
          })
        })
      };
      mockCreateClient.mockReturnValue(mockSupabase);

      const story = {
        id: 'photosynthesis-story',
        topicTag: 'Photosynthesis',
        title: 'How Plants Make Food'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/quizzes/photosynthesis-quiz-intermediate.html');
    });

    it('should return intermediate quiz for grade 4 (photosynthesis story)', async () => {
      const module = await import('./quiz-routing.js');
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'test-user' } } },
            error: null
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { grade_level: '4', age: 9 },
                error: null
              })
            })
          })
        })
      };
      mockCreateClient.mockReturnValue(mockSupabase);

      const story = {
        id: 'photosynthesis-story',
        topicTag: 'Photosynthesis',
        title: 'How Plants Make Food'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/quizzes/photosynthesis-quiz-intermediate.html');
    });

    it('should return advanced quiz for grade 5 (photosynthesis story)', async () => {
      const module = await import('./quiz-routing.js');
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'test-user' } } },
            error: null
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { grade_level: '5', age: 10 },
                error: null
              })
            })
          })
        })
      };
      mockCreateClient.mockReturnValue(mockSupabase);

      const story = {
        id: 'photosynthesis-story',
        topicTag: 'Photosynthesis',
        title: 'How Plants Make Food'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/quizzes/photosynthesis-quiz-advanced.html');
    });

    it('should return advanced quiz for grade 6 (photosynthesis story)', async () => {
      const module = await import('./quiz-routing.js');
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'test-user' } } },
            error: null
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { grade_level: '6', age: 11 },
                error: null
              })
            })
          })
        })
      };
      mockCreateClient.mockReturnValue(mockSupabase);

      const story = {
        id: 'photosynthesis-story',
        topicTag: 'Photosynthesis',
        title: 'How Plants Make Food'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/quizzes/photosynthesis-quiz-advanced.html');
    });
  });

  describe('Non-photosynthesis stories', () => {
    it('should return fallback URL for non-photosynthesis story', async () => {
      const module = await import('./quiz-routing.js');
      // No need to mock getUserProfile for non-photosynthesis stories
      // as it returns early

      const story = {
        id: 'solar-system-story',
        topicTag: 'Solar System',
        title: 'Exploring the Planets'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/stories/solar-system-story/quiz');
    });

    it('should return fallback URL even when profile is null', async () => {
      const module = await import('./quiz-routing.js');
      // Mock Supabase to return no session
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null
          })
        }
      };
      mockCreateClient.mockReturnValue(mockSupabase);

      const story = {
        id: 'ocean-life-story',
        topicTag: 'Ocean Life',
        title: 'Under the Sea'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/stories/ocean-life-story/quiz');
    });
  });

  describe('Edge cases', () => {
    it('should handle story with null id', async () => {
      const module = await import('./quiz-routing.js');

      const story = {
        id: null,
        topicTag: 'Solar System',
        title: 'Exploring the Planets'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/stories/unknown/quiz');
    });

    it('should handle story with undefined id', async () => {
      const module = await import('./quiz-routing.js');

      const story = {
        topicTag: 'Solar System',
        title: 'Exploring the Planets'
      };

      const result = await module.getQuizUrl(story);
      expect(result).toBe('/stories/unknown/quiz');
    });
  });
});
