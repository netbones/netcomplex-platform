# System Testing Methods for Soralia Village Platform

## Overview

This document outlines comprehensive testing strategies for the Soralia Village community platform, covering unit tests, integration tests, end-to-end tests, and specialized testing approaches.

## 1. Unit Testing

### Component Testing with Vitest + Testing Library

**Setup:** Already configured with Vitest, @testing-library/react, and jsdom.

**Key Components to Test:**

#### Resident Cards

```typescript
// src/components/directory/__tests__/ResidentCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResidentCard } from '../ResidentCard';

describe('ResidentCard', () => {
  const mockResident = {
    id: '1',
    name: 'John Smith',
    email: 'john@example.com',
    interests: ['gardening', 'tennis'],
    avatar: '/avatar.jpg',
    isPublic: true,
    standardSeats: [{
      household: {
        street: 'Main St',
        unit: '12',
        homeImage: '/home.jpg'
      }
    }]
  };

  it('displays resident name and address', () => {
    render(<ResidentCard resident={mockResident} viewMode="grid" />);
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Main St, 12')).toBeInTheDocument();
  });

  it('shows chat icon for other users', () => {
    render(<ResidentCard resident={mockResident} isChatVisible={true} />);
    const chatIcon = screen.getByRole('button', { name: /start chat/i });
    expect(chatIcon).toBeInTheDocument();
  });

  it('displays unread message badge for current user', () => {
    render(
      <ResidentCard
        resident={mockResident}
        isCurrentUser={true}
        unreadCount={3}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
```

#### Service Components

```typescript
// src/components/services/__tests__/ServiceCard.test.tsx
describe('ServiceCard', () => {
  it('displays service information correctly', () => {
    // Test service title, pricing, provider info
  });

  it('shows correct service type badge', () => {
    // Test Community/Member/Third Party badges
  });

  it('handles inquiry button clicks', () => {
    // Test onInquiry callback
  });
});
```

#### Form Components

```typescript
// src/components/forms/__tests__/LoginForm.test.tsx
describe('LoginForm', () => {
  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
});
```

### Utility Function Testing

**Authentication Helpers:**

```typescript
// src/lib/__tests__/permissions.test.ts
import { hasPermission } from '../permissions';

describe('hasPermission', () => {
  it('allows admins to access all features', () => {
    expect(hasPermission('ADMIN', 'users')).toBe(true);
    expect(hasPermission('ADMIN', 'settings')).toBe(true);
  });

  it('restricts resident permissions', () => {
    expect(hasPermission('RESIDENT', 'users')).toBe(false);
    expect(hasPermission('RESIDENT', 'directory')).toBe(true);
  });
});
```

**Data Validation:**

```typescript
// src/lib/__tests__/validation.test.ts
import { messageSchema } from '../schemas';

describe('messageSchema', () => {
  it('validates correct message data', () => {
    const validData = {
      conversationId: 'conv-123',
      content: 'Hello world',
      type: 'TEXT',
    };
    expect(messageSchema.safeParse(validData).success).toBe(true);
  });

  it('rejects empty content', () => {
    const invalidData = {
      conversationId: 'conv-123',
      content: '',
      type: 'TEXT',
    };
    expect(messageSchema.safeParse(invalidData).success).toBe(false);
  });
});
```

## 2. Integration Testing

### API Route Testing

**Database Integration:**

```typescript
// src/app/api/users/__tests__/route.test.ts
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';

describe('/api/users', () => {
  beforeEach(async () => {
    // Reset database state
    await prisma.user.deleteMany();
  });

  it('returns paginated user list', async () => {
    // Create test users
    await prisma.user.createMany({
      data: [
        { name: 'User 1', email: 'user1@test.com' },
        { name: 'User 2', email: 'user2@test.com' },
      ],
    });

    const response = await fetch('http://localhost:3000/api/users?limit=1');
    const data = await response.json();

    expect(data.users).toHaveLength(1);
    expect(data.total).toBe(2);
    expect(data.users[0].name).toBe('User 1');
  });

  it('filters users by search term', async () => {
    await prisma.user.create({
      data: { name: 'John Doe', email: 'john@test.com' },
    });

    const response = await fetch('http://localhost:3000/api/users?search=john');
    const data = await response.json();

    expect(data.users[0].name).toBe('John Doe');
  });
});
```

**Authentication Integration:**

```typescript
// src/app/api/messages/__tests__/route.test.ts
describe('/api/messages', () => {
  it('requires authentication', async () => {
    const response = await fetch('http://localhost:3000/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'test',
        content: 'test message',
      }),
    });

    expect(response.status).toBe(401);
  });

  it('creates message with valid auth', async () => {
    // Mock authentication
    const authToken = 'mock-jwt-token';

    const response = await fetch('http://localhost:3000/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        conversationId: 'conv-123',
        content: 'Hello world',
      }),
    });

    expect(response.status).toBe(201);
    const message = await response.json();
    expect(message.content).toBe('Hello world');
  });
});
```

### Database Integration

**Prisma Client Testing:**

```typescript
// src/lib/__tests__/prisma-integration.test.ts
import { prisma } from '../prisma';

describe('Prisma Integration', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.conversation.deleteMany();
  });

  it('creates user with profile relationships', async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        standardSeats: {
          create: {
            household: {
              create: {
                street: 'Test St',
                unit: '1',
                platformAddress: 'unit001@test.com',
              },
            },
          },
        },
      },
      include: {
        standardSeats: {
          include: { household: true },
        },
      },
    });

    expect(user.standardSeats[0].household.street).toBe('Test St');
  });

  it('handles conversation relationships', async () => {
    const conversation = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        participants: {
          create: [
            { user: { create: { name: 'User 1', email: 'u1@test.com' } } },
            { user: { create: { name: 'User 2', email: 'u2@test.com' } } },
          ],
        },
      },
      include: { participants: { include: { user: true } } },
    });

    expect(conversation.participants).toHaveLength(2);
    expect(conversation.type).toBe('DIRECT');
  });
});
```

## 3. End-to-End Testing

### Playwright Setup

**Installation:**

```bash
npm install -D @playwright/test
npx playwright install
```

**Configuration:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### Critical User Journeys

**User Registration & Authentication:**

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('complete user registration flow', async ({ page }) => {
  await page.goto('/auth/register');

  await page.fill('[name="name"]', 'Test User');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('[type="submit"]');

  await expect(page).toHaveURL('/directory');
  await expect(page.locator('text=Welcome, Test User')).toBeVisible();
});
```

**Directory Browsing:**

```typescript
// e2e/directory.spec.ts
test('browse and filter residents', async ({ page }) => {
  await page.goto('/directory');

  // Check initial load
  await expect(page.locator('.resident-card')).toHaveCount(10);

  // Test search
  await page.fill('input[placeholder*="Search"]', 'John');
  await expect(page.locator('.resident-card')).toHaveCount(1);

  // Test filtering
  await page.selectOption('select', 'Board Members');
  await expect(page.locator('.resident-card')).toHaveCount(2);
});
```

**Community Services Marketplace:**

```typescript
// e2e/services.spec.ts
test('browse and inquire about services', async ({ page }) => {
  await page.goto('/directory');
  await page.click('text=Services');

  // Check service listings
  await expect(page.locator('.service-card')).toHaveCount(8);

  // Test service inquiry
  await page.click('.service-card:first-child button:has-text("Inquire")');
  await expect(page.locator('text=Service inquiry sent')).toBeVisible();
});
```

**Chat Functionality:**

```typescript
// e2e/chat.spec.ts
test('send and receive messages', async ({ page, context }) => {
  // Login as user 1
  await page.goto('/auth/login');
  await page.fill('[name="email"]', 'user1@test.com');
  await page.click('[type="submit"]');

  // Start chat with user 2
  await page.goto('/directory');
  await page.click('.resident-card:has-text("User 2") button[title="Start chat"]');

  // Send message
  await page.fill('input[placeholder*="message"]', 'Hello from user 1');
  await page.press('Enter');

  // Check message appears
  await expect(page.locator('text=Hello from user 1')).toBeVisible();

  // Open second browser context for user 2
  const page2 = await context.newPage();
  await page2.goto('/auth/login');
  await page2.fill('[name="email"]', 'user2@test.com');
  await page2.click('[type="submit"]');

  // User 2 should see unread indicator
  await expect(page2.locator('.chat-icon.unread')).toBeVisible();
  await expect(page2.locator('.unread-badge')).toHaveText('1');
});
```

**Agent Marketplace:**

```typescript
// e2e/agent-marketplace.spec.ts
test('browse agents and create listing', async ({ page }) => {
  await page.goto('/dashboard');
  await page.click('text=Portfolio');

  // Create property listing
  await page.click('button:has-text("Create Listing")');
  await page.fill('[name="title"]', 'Beautiful Family Home');
  await page.fill('[name="price"]', '2500000');
  await page.click('button:has-text("Create Listing")');

  await expect(page.locator('text=Beautiful Family Home')).toBeVisible();
});
```

## 4. API Testing

### REST API Testing with Supertest

**Setup:**

```bash
npm install -D supertest @types/supertest
```

**API Tests:**

```typescript
// src/app/api/__tests__/integration.test.ts
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import request from 'supertest';
import { app } from '@/pages/api/_app'; // Next.js API routes

describe('API Integration', () => {
  beforeEach(async () => {
    // Reset database
    await prisma.user.deleteMany();
    await prisma.conversation.deleteMany();
  });

  describe('/api/conversations', () => {
    it('creates direct conversation', async () => {
      const user1 = await prisma.user.create({
        data: { name: 'User 1', email: 'u1@test.com' },
      });
      const user2 = await prisma.user.create({
        data: { name: 'User 2', email: 'u2@test.com' },
      });

      const response = await request(app)
        .post('/api/conversations/find')
        .send({ participantIds: [user1.id, user2.id] });

      expect(response.status).toBe(201);
      expect(response.body.conversation.type).toBe('DIRECT');
      expect(response.body.conversation.participants).toHaveLength(2);
    });
  });

  describe('/api/messages', () => {
    it('sends message and broadcasts', async () => {
      // Mock authentication
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', 'Bearer mock-token')
        .send({
          conversationId: 'conv-123',
          content: 'Test message',
        });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe('Test message');
    });
  });
});
```

### GraphQL API Testing (Future)

If implementing GraphQL:

```typescript
// Using Apollo Server testing
import { createTestClient } from 'apollo-server-testing';
import { gql } from 'apollo-server';

const { query, mutate } = createTestClient(server);

describe('GraphQL API', () => {
  it('fetches user profile', async () => {
    const GET_USER = gql`
      query GetUser($id: ID!) {
        user(id: $id) {
          name
          email
        }
      }
    `;

    const res = await query({
      query: GET_USER,
      variables: { id: 'user-123' },
    });

    expect(res.data.user.name).toBe('John Smith');
  });
});
```

## 5. Performance Testing

### Load Testing with Artillery

**Setup:**

```bash
npm install -D artillery
```

**Configuration:** `artillery.yml`

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: 'Warm up'
    - duration: 120
      arrivalRate: 20
      name: 'Load testing'
    - duration: 60
      arrivalRate: 5
      name: 'Cool down'

scenarios:
  - name: 'Browse directory'
    weight: 70
    flow:
      - get:
          url: '/directory'

  - name: 'View resident profile'
    weight: 20
    flow:
      - get:
          url: '/directory'
      - get:
          url: '/resident/{{ residentId }}'

  - name: 'Send message'
    weight: 10
    flow:
      - post:
          url: '/api/messages'
          json:
            conversationId: '{{ conversationId }}'
            content: 'Load test message'
```

**Run Load Test:**

```bash
npx artillery run artillery.yml
```

### Lighthouse Performance Testing

**Automated Lighthouse:**

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test('page performance meets standards', async ({ page }) => {
  const startTime = Date.now();

  await page.goto('/directory');
  await page.waitForLoadState('networkidle');

  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000); // 3 seconds

  // Check Core Web Vitals
  const metrics = await page.evaluate(() => {
    const observer = new PerformanceObserver(list => {
      // Collect metrics
    });
    // Monitor LCP, FID, CLS
  });
});
```

## 6. Security Testing

### Authentication Testing

**JWT Token Validation:**

```typescript
// src/lib/__tests__/auth.test.ts
describe('Authentication', () => {
  it('validates JWT tokens', () => {
    const validToken = generateValidToken();
    const invalidToken = 'invalid.jwt.token';

    expect(validateToken(validToken)).toBe(true);
    expect(validateToken(invalidToken)).toBe(false);
  });

  it('prevents unauthorized API access', async () => {
    const response = await fetch('/api/admin/users');
    expect(response.status).toBe(401);
  });
});
```

### Input Validation Testing

**SQL Injection Prevention:**

```typescript
// src/app/api/__tests__/security.test.ts
describe('Security', () => {
  it('prevents SQL injection in search', async () => {
    const maliciousQuery = "'; DROP TABLE users; --";

    const response = await fetch(`/api/users?search=${encodeURIComponent(maliciousQuery)}`);
    expect(response.status).toBe(200);

    // Verify no data loss
    const userCount = await prisma.user.count();
    expect(userCount).toBeGreaterThan(0);
  });

  it('validates input sanitization', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(maliciousInput);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });
});
```

### Rate Limiting Testing

**API Rate Limit Testing:**

```typescript
// src/app/api/__tests__/rate-limiting.test.ts
describe('Rate Limiting', () => {
  it('enforces API rate limits', async () => {
    const requests = Array(100)
      .fill()
      .map(() =>
        fetch('/api/users', {
          headers: { 'X-API-Key': 'test-key' },
        })
      );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

## 7. Accessibility Testing

### axe-playwright Integration

**Setup:**

```bash
npm install -D axe-playwright
```

**Accessibility Tests:**

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('directory page accessibility', async ({ page }) => {
  await page.goto('/directory');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('keyboard navigation works', async ({ page }) => {
  await page.goto('/directory');

  // Tab through interactive elements
  await page.keyboard.press('Tab');
  let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedElement).toBe('INPUT'); // Search input

  await page.keyboard.press('Tab');
  focusedElement = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedElement).toBe('SELECT'); // Filter dropdown
});

test('screen reader compatibility', async ({ page }) => {
  await page.goto('/directory');

  // Check ARIA labels
  const chatButton = page.locator('[aria-label="Start chat"]');
  await expect(chatButton).toBeVisible();

  // Check alt text
  const images = page.locator('img');
  for (const img of await images.all()) {
    const alt = await img.getAttribute('alt');
    expect(alt).toBeTruthy();
  }
});
```

## 8. Visual Regression Testing

### Playwright Visual Comparisons

**Setup:**

```bash
npm install -D @playwright/test
```

**Visual Tests:**

```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test('directory layout unchanged', async ({ page }) => {
  await page.goto('/directory');

  // Wait for content to load
  await page.waitForSelector('.resident-card');

  // Take screenshot and compare
  await expect(page).toHaveScreenshot('directory-layout.png', {
    fullPage: true,
    threshold: 0.1, // Allow 10% difference
  });
});

test('service cards consistent', async ({ page }) => {
  await page.goto('/directory');
  await page.click('text=Services');

  await page.waitForSelector('.service-card');

  const serviceCards = page.locator('.service-card');
  await expect(serviceCards.first()).toHaveScreenshot('service-card-sample.png');
});
```

## 9. Mobile Testing

### Responsive Design Testing

**Device-Specific Tests:**

```typescript
// e2e/mobile.spec.ts
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });

test('mobile directory navigation', async ({ page }) => {
  await page.goto('/directory');

  // Check mobile menu
  await page.click('[aria-label="Menu"]');
  await expect(page.locator('nav')).toBeVisible();

  // Test touch interactions
  await page.tap('.resident-card:first-child');
  await expect(page).toHaveURL(/\/resident\//);
});

test.use({ ...devices['Pixel 5'] });

test('android service marketplace', async ({ page }) => {
  await page.goto('/directory');
  await page.click('text=Services');

  // Check mobile filtering
  await page.tap('[aria-label="Filters"]');
  await expect(page.locator('.filter-options')).toBeVisible();

  // Test service inquiry on mobile
  await page.tap('.service-card button:has-text("Inquire")');
  await expect(page.locator('.inquiry-modal')).toBeVisible();
});
```

## 10. Continuous Integration

### GitHub Actions Testing Workflow

**`.github/workflows/test.yml`:**

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npx prisma migrate deploy

      - name: Seed database
        run: npm run db:seed

      - name: Run unit tests
        run: npm run test:run

      - name: Run E2E tests
        run: npx playwright test

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
```

### Test Coverage Requirements

**Coverage Configuration:** `vitest.config.ts`

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/**/*.config.*',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
```

## 11. Manual Testing Checklist

### Functional Testing

- [ ] User registration and login
- [ ] Directory browsing and filtering
- [ ] Resident profile viewing
- [ ] Service marketplace browsing
- [ ] Agent marketplace functionality
- [ ] Chat message sending/receiving
- [ ] Admin moderation tools
- [ ] Mobile responsiveness

### Usability Testing

- [ ] Intuitive navigation
- [ ] Clear visual hierarchy
- [ ] Helpful error messages
- [ ] Loading states
- [ ] Form validation feedback

### Performance Testing

- [ ] Page load times < 3 seconds
- [ ] Smooth scrolling and animations
- [ ] Image loading optimization
- [ ] Database query performance

## 12. Test Data Management

### Test Database Seeding

**Test-Specific Seed:**

```typescript
// prisma/seed-test.ts
export const testUsers = [
  {
    id: 'test-user-1',
    name: 'Test Resident',
    email: 'test@example.com',
    role: 'RESIDENT',
    standardSeats: {
      create: {
        household: {
          create: {
            street: 'Test Street',
            unit: '1',
            homeImage: '/carousel/1.jpg',
          },
        },
      },
    },
  },
];
```

### Test Fixtures

**Reusable Test Data:**

```typescript
// src/test/fixtures/users.ts
export const mockUser = {
  id: 'mock-user-id',
  name: 'Mock User',
  email: 'mock@example.com',
  avatar: '/mock-avatar.jpg',
};

export const mockService = {
  id: 'mock-service-id',
  title: 'Mock Service',
  provider: mockUser,
  category: 'GARDENING',
  price: 150,
};
```

## Summary

This comprehensive testing strategy covers:

1. **Unit Tests**: Component and utility function testing
2. **Integration Tests**: API and database integration
3. **E2E Tests**: Full user journey testing with Playwright
4. **Performance Tests**: Load testing and Core Web Vitals
5. **Security Tests**: Authentication and input validation
6. **Accessibility Tests**: WCAG compliance and keyboard navigation
7. **Visual Tests**: Layout regression prevention
8. **Mobile Tests**: Responsive design validation
9. **CI/CD**: Automated testing in GitHub Actions

**Key Tools:**

- **Vitest**: Fast unit testing framework
- **Playwright**: E2E testing with browser automation
- **Testing Library**: React component testing utilities
- **Artillery**: Load testing and performance monitoring
- **axe-playwright**: Accessibility testing
- **Supertest**: API integration testing

**Test Coverage Goals:**

- Unit Tests: 80%+ coverage
- E2E Tests: Critical user journeys
- Performance: <3s load times, Core Web Vitals compliance
- Accessibility: WCAG 2.1 AA compliance
- Security: No critical vulnerabilities

This testing strategy ensures the Soralia Village platform is reliable, performant, accessible, and secure for all community members.
