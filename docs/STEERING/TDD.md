# Test-Driven Development (TDD) Workflow

This document describes the TDD approach for Soralia Village - a Next.js + TypeScript project.

## Core Principles

1. **Write the test first** - Test describes the desired behavior before implementation
2. **Red-Green-Refactor** - Failing test → Passing code → Clean up
3. **One test at a time** - Focus on single behavior per test
4. **Test behavior, not implementation** - Test the public API, not internal details

## When to Use TDD

TDD is recommended for:

- Complex business logic (validation, calculations)
- Utility functions and helpers
- Data transformation functions
- API route handlers
- Custom hooks

For UI components, prefer **component testing** with visual validation rather than pure unit TDD.

## Workflow

### 1. Identify the Behavior

Before writing code, clearly define:

- What the feature should do
- What the expected output/input is
- What edge cases need handling

### 2. Write a Failing Test

```typescript
// Example: validateEmail utility
describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('not-an-email')).toBe(false);
  });
});
```

### 3. Run Tests to Verify Failure

```bash
npm run test        # Run all tests
npm run test:watch  # Watch mode for development
```

The test should fail with a clear error message.

### 4. Write Minimal Code to Pass

```typescript
export function validateEmail(email: string): boolean {
  return email.includes('@') && email.includes('.');
}
```

### 5. Run Tests to Verify Pass

If tests pass, proceed. If not, iterate.

### 6. Refactor

Clean up the implementation while keeping tests passing:

- Remove duplication
- Improve naming
- Optimize performance

### 7. Commit

Commit both the test and implementation together with a descriptive message.

## Test Organization

### File Placement

```
src/
├── lib/
│   ├── validation.ts       # Implementation
│   └── validation.test.ts # Tests (colocated)
├── hooks/
│   ├── useAuth.ts         # Hook
│   └── useAuth.test.ts    # Tests
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── Button.test.tsx
```

### Naming Conventions

- **Describe**: `describe('validateEmail', () => { ... })`
- **It**: `it('should return true for valid email', () => { ... })`
- **Test**: `test('handles null input', () => { ... })`

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should calculate total correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
```

### Given-When-Then

```typescript
describe('calculateTotal', () => {
  it('given multiple items, when summing prices, then returns correct total', () => {
    const items = [{ price: 10 }, { price: 20 }];
    const total = calculateTotal(items);
    expect(total).toBe(30);
  });
});
```

## Running Tests

```bash
# Run all tests
npm run test

# Run tests matching pattern
npm run test -- --grep "validateEmail"

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Run in CI mode (single run)
npm run test:ci
```

## Test Utilities

### Testing Library

Use `@testing-library/react` for component testing:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';

it('should submit form on button click', () => {
  render(<Form onSubmit={mockSubmit} />);
  fireEvent.click(screen.getByText('Submit'));
  expect(mockSubmit).toHaveBeenCalled();
});
```

### Mocking

Use Jest mocks for external dependencies:

```typescript
// Mock API calls
jest.mock('@api/db', () => ({
  db: {
    query: jest.fn(),
  },
}));

// Mock hooks
jest.mock('@api/tenant', () => ({
  useTenant: () => ({ id: 'test-tenant' }),
}));
```

### Fixtures

Create reusable test data:

```typescript
// tests/fixtures/user.ts
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'resident',
};

export const createMockUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides,
});
```

## Coverage Guidelines

| Category          | Target                           |
| ----------------- | -------------------------------- |
| Business Logic    | 90%+                             |
| Utility Functions | 85%+                             |
| Hooks             | 80%+                             |
| Components        | 70%+ (focus on user interaction) |
| API Routes        | 80%+                             |

**Note:** High coverage doesn't mean good tests. Focus on meaningful test cases that verify behavior and catch bugs.

## Common Pitfalls

### ❌ Don't Test Implementation Details

```typescript
// Bad - tests internal state
expect(component.state('count')).toBe(5);

// Good - tests observable behavior
expect(screen.getByText('Count: 5')).toBeInTheDocument();
```

### ❌ Don't Over-Mock

```typescript
// Bad - mocks everything, tests nothing real
jest.mock('some-lib');
const result = someLib.method();

// Good - mock only external dependencies
jest.mock('@api/db');
const result = await fetchUserData(); // Tests real logic with mocked DB
```

### ❌ Don't Write Tests After

TDD means tests come first. If you're adding tests after implementation:

1. You're likely testing what's implemented, not what's needed
2. Tests may miss edge cases that TDD would catch

## Integration with BD Issues

When working on a BD task:

1. Write failing tests first (Red)
2. Implement to pass tests (Green)
3. Refactor for quality (Refactor)
4. Run full test suite
5. Commit with message: `test: add validation tests for user input`

## Resources

- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest](https://vitest.io/) - Alternative test runner (faster, Vite-native)
