import { vi } from 'vitest'

// Don't log errors to the console during tests.
vi.spyOn(console, 'error').mockImplementation(() => {})
