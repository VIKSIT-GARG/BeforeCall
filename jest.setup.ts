import '@testing-library/jest-dom';

// In Next.js App Router, 'server-only' is a RSC build-time marker that throws in client/jsdom test environments
jest.mock('server-only', () => ({}));