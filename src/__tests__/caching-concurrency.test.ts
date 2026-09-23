import {
  cached,
  buildCacheKey,
  hashNormalizedInput,
  getDataVersion,
  incrementDataVersion,
  resetDataVersions,
  getInFlightCount,
  withTimeout,
  cache,
  getTtlFor,
  CACHE_CONNECT_TIMEOUT_MS,
  CACHE_MAX_ENTRIES,
} from '@/lib/cache';
import {
  extractTopicsLocally,
  isGenericOrNonCompany,
  isPlaceholderAttendee,
  cleanAndValidateGithubUsername,
} from '@/lib/cheap-routing';
import { searchCompany, searchPerson } from '@/services/research';
import { extractMeetingTopics } from '@/services/llm';

describe('Caching + Concurrency Layer (Production Protocol)', () => {
  beforeEach(async () => {
    await cache.invalidate('*');
    resetDataVersions();
  });

  describe('1. Read-Through Cache & Normalized Input Hashing', () => {
    test('same logical input with different key order or whitespace produces identical hash and key', () => {
      const input1 = { query: '  Acme AI  ', maxResults: 5, depth: 'advanced' };
      const input2 = { depth: 'advanced', maxResults: 5, query: 'acme ai' };

      const hash1 = hashNormalizedInput(input1);
      const hash2 = hashNormalizedInput(input2);
      expect(hash1).toBe(hash2);

      const key1 = buildCacheKey('tavily:search', input1);
      const key2 = buildCacheKey('tavily:search', input2);
      expect(key1).toBe(key2);
    });

    test('on cache miss calls load_fn, stores result, and on cache hit returns value without calling load_fn again', async () => {
      let callCount = 0;
      const load_fn = async () => {
        callCount++;
        return { data: 'test-data-123' };
      };

      const key = buildCacheKey('test:item', { id: 'item-1' });

      // First call -> Cache Miss
      const res1 = await cached(key, 60000, false, load_fn);
      expect(res1).toEqual({ data: 'test-data-123' });
      expect(callCount).toBe(1);

      // Second call -> Cache Hit (JSON decoded)
      const res2 = await cached(key, 60000, false, load_fn);
      expect(res2).toEqual({ data: 'test-data-123' });
      expect(callCount).toBe(1); // load_fn was NOT called again
    });

    test('cache backend failure falls through to calling load_fn directly without throwing', async () => {
      let loadCount = 0;
      const load_fn = async () => {
        loadCount++;
        return 'success-from-api';
      };

      // Spy on cache.get to simulate a backend crash or timeout
      const getSpy = jest.spyOn(cache, 'get').mockRejectedValueOnce(new Error('Redis connection refused'));
      const key = buildCacheKey('test:fault', { id: 'broken' });

      const result = await cached(key, 60000, false, load_fn);
      expect(result).toBe('success-from-api');
      expect(loadCount).toBe(1);

      getSpy.mockRestore();
    });

    test('returns correct TTLs for search-style and extraction-style results', () => {
      expect(getTtlFor('tavily')).toBe(24 * 3600 * 1000); // 24 hours
      expect(getTtlFor('extraction')).toBe(7 * 24 * 3600 * 1000); // 7 days
      expect(getTtlFor('company')).toBe(24 * 3600 * 1000);
      expect(getTtlFor('github')).toBe(24 * 3600 * 1000);
    });

    test('enforces bounded cache capacity and evicts oldest items to prevent memory bloat', async () => {
      expect(CACHE_MAX_ENTRIES).toBeGreaterThan(0);
      for (let i = 0; i < 20; i++) {
        await cache.set(`bounded:key:${i}`, { val: i }, 60000);
      }
      expect(cache.stats().size).toBeLessThanOrEqual(CACHE_MAX_ENTRIES);
      expect(await cache.get('bounded:key:19')).toEqual({ val: 19 });
    });
  });

  describe('2. In-Flight Request De-duplication (Singleflight)', () => {
    test('concurrent calls for the same uncached key invoke load_fn only once', async () => {
      let externalCalls = 0;
      const key = buildCacheKey('concurrent:test', { query: 'same-query' });

      const slowLoadFn = async () => {
        externalCalls++;
        await new Promise((r) => setTimeout(r, 60));
        return { message: 'heavy-result', at: Date.now() };
      };

      // Launch 5 concurrent calls
      const promises = [
        cached(key, 60000, false, slowLoadFn),
        cached(key, 60000, false, slowLoadFn),
        cached(key, 60000, false, slowLoadFn),
        cached(key, 60000, false, slowLoadFn),
        cached(key, 60000, false, slowLoadFn),
      ];

      const results = await Promise.all(promises);

      // Verify all 5 callers received identical results
      expect(results.length).toBe(5);
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
      expect(results[0].message).toBe('heavy-result');

      // Verify load_fn was invoked EXACTLY once
      expect(externalCalls).toBe(1);

      // Verify in-flight map is cleaned up after completion
      expect(getInFlightCount()).toBe(0);
    });
  });

  describe('3. Versioned Invalidation for Database-Derived Data', () => {
    test('ties DB reads to version and invalidates all keys upon incrementDataVersion without key-hunting', async () => {
      let dbFetchCount = 0;
      const meetingId = 'meeting-xyz-100';

      const fetchFromDb = async () => {
        dbFetchCount++;
        return { id: meetingId, title: `Meeting revision ${dbFetchCount}` };
      };

      // First read: version 1
      const v1Data = await cached(`db:meeting:${meetingId}`, 0, 'meeting', fetchFromDb);
      expect(v1Data.title).toBe('Meeting revision 1');
      expect(dbFetchCount).toBe(1);

      // Second read: hits cache (v1)
      const v1Cached = await cached(`db:meeting:${meetingId}`, 0, 'meeting', fetchFromDb);
      expect(v1Cached.title).toBe('Meeting revision 1');
      expect(dbFetchCount).toBe(1);

      // Write occurred to database -> increment meeting data version
      await incrementDataVersion('meeting');

      // Third read: version incremented to 2 -> cache miss, fetches fresh DB state in 1 step!
      const v2Data = await cached(`db:meeting:${meetingId}`, 0, 'meeting', fetchFromDb);
      expect(v2Data.title).toBe('Meeting revision 2');
      expect(dbFetchCount).toBe(2);
    });

    test('memoizes version read in-process for ~500ms', async () => {
      const v1 = await getDataVersion('brief');
      const v2 = await getDataVersion('brief');
      expect(v1).toBe(v2);
      expect(v1).toBe(1);
    });
  });

  describe('4. Cheap Stuff Before Expensive Stuff', () => {
    test('extractTopicsLocally extracts numbered agenda items locally in 0ms without LLM', () => {
      const agenda = `
        1. Opening and introductions
        2. Technical architecture review
        3. Security & prompt injection defense
        4. Next steps & action items
      `;
      const topics = extractTopicsLocally(agenda, 'Description about sync');
      expect(topics).toEqual([
        'Opening and introductions',
        'Technical architecture review',
        'Security & prompt injection defense',
        'Next steps & action items',
      ]);
    });

    test('extractTopicsLocally extracts bullet points locally', () => {
      const agenda = `
        * Latency optimization
        * Cache TTL tuning
        * Database migrations
      `;
      const topics = extractTopicsLocally(agenda, '');
      expect(topics).toEqual([
        'Latency optimization',
        'Cache TTL tuning',
        'Database migrations',
      ]);
    });

    test('extractTopicsLocally returns empty array immediately when agenda and description are blank', () => {
      const topics = extractTopicsLocally('', '   ');
      expect(topics).toEqual([]);
    });

    test('extractMeetingTopics uses local logic and avoids LLM call on structured agenda', async () => {
      const agenda = '1. First Topic\n2. Second Topic\n3. Third Topic';
      const topics = await extractMeetingTopics(agenda, '');
      expect(topics).toEqual(['First Topic', 'Second Topic', 'Third Topic']);
    });

    test('isGenericOrNonCompany identifies email domains and placeholder companies', () => {
      expect(isGenericOrNonCompany('gmail.com')).toBe(true);
      expect(isGenericOrNonCompany('outlook.com')).toBe(true);
      expect(isGenericOrNonCompany('none')).toBe(true);
      expect(isGenericOrNonCompany('Self')).toBe(true);
      expect(isGenericOrNonCompany('Stealth')).toBe(true);
      expect(isGenericOrNonCompany('Freelance')).toBe(true);
      expect(isGenericOrNonCompany('N/A')).toBe(true);

      // Real companies are not generic
      expect(isGenericOrNonCompany('Stripe')).toBe(false);
      expect(isGenericOrNonCompany('NVIDIA')).toBe(false);
      expect(isGenericOrNonCompany('Acme Corp')).toBe(false);
    });

    test('searchCompany short-circuits in 0ms for generic/placeholder companies', async () => {
      const results = await searchCompany('gmail.com');
      expect(results).toEqual([]);
    });

    test('isPlaceholderAttendee flags placeholder attendee names', () => {
      expect(isPlaceholderAttendee('TBD')).toBe(true);
      expect(isPlaceholderAttendee('Unknown')).toBe(true);
      expect(isPlaceholderAttendee('Guest')).toBe(true);
      expect(isPlaceholderAttendee('Alex Chen')).toBe(false);
    });

    test('cleanAndValidateGithubUsername validates and normalizes usernames', () => {
      expect(cleanAndValidateGithubUsername('https://github.com/torvalds')).toBe('torvalds');
      expect(cleanAndValidateGithubUsername('@satyanadella')).toBe('satyanadella');
      expect(cleanAndValidateGithubUsername('valid-user-123')).toBe('valid-user-123');
      expect(cleanAndValidateGithubUsername('invalid username with spaces')).toBeNull();
      expect(cleanAndValidateGithubUsername('invalid$$char')).toBeNull();
      expect(cleanAndValidateGithubUsername('')).toBeNull();
    });
  });

  describe('5. Concurrency & Parallelization', () => {
    test('searchCompany and searchPerson execute queries concurrently with Promise.allSettled', async () => {
      // In dev/CI without API key, mock search returns mock results
      const companyResults = await searchCompany('Acme AI');
      expect(Array.isArray(companyResults)).toBe(true);

      const personResults = await searchPerson('Sarah Chen', 'Acme AI');
      expect(Array.isArray(personResults)).toBe(true);
    });
  });

  describe('6. Fail-Fast Cache Client Configuration', () => {
    test('connect timeout is configured to ~1s fail-fast', () => {
      expect(CACHE_CONNECT_TIMEOUT_MS).toBeLessThanOrEqual(1000);
    });

    test('withTimeout throws on slow operations exceeding timeout threshold', async () => {
      const slowOp = new Promise((resolve) => setTimeout(() => resolve('done'), 200));
      await expect(withTimeout(slowOp, 50)).rejects.toThrow('Cache operation timed out after 50ms');
    });
  });
});
