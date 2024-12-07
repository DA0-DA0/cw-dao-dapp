global.console = {
  ...console,
  // Don't log errors to the console during tests.
  error: jest.fn(),
}
