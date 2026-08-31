import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/* Every suite starts from an empty store. The app persists to `gequ_*` keys and
   several modules read them at import time, so a leaked key from one test would
   surface as an unrelated failure in another. */
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); });
