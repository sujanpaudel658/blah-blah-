const { getKey } = require('../services/geminiChat.service');

describe('geminiChat.service - env helpers', () => {
  const originalGemini = process.env.GEMINI_API_KEY;
  const originalGoogle = process.env.GOOGLE_AI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalGemini;
    process.env.GOOGLE_AI_API_KEY = originalGoogle;
  });

  test('returns empty string when no key is set', () => {
    expect(getKey()).toBe('');
  });

  test('prefers GEMINI_API_KEY over GOOGLE_AI_API_KEY', () => {
    process.env.GOOGLE_AI_API_KEY = 'google-key';
    process.env.GEMINI_API_KEY = 'gemini-key';
    expect(getKey()).toBe('gemini-key');
  });

  test('normalizes quoted and whitespace-wrapped values', () => {
    process.env.GEMINI_API_KEY = '  "quoted-key"  ';
    expect(getKey()).toBe('quoted-key');
  });
});

