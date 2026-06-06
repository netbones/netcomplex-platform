# Soralia Village Community Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0-green)](https://prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-orange)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-blue)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#license)

A comprehensive community management platform for the Soralia Village residential community, featuring resident directory, community services marketplace, real estate agent marketplace, and real-time messaging.

![Soralia Village](public/soralia.jpg)

## 🌟 Features

### 👥 Resident Directory

- **Community Directory**: Browse and search all residents
- **Advanced Filtering**: Filter by role, street, interests
- **Profile Management**: Detailed resident profiles with contact information
- **Grid/List Views**: Multiple viewing options for different preferences

### 🛠️ Community Services Marketplace

- **Service Listings**: Community members can offer services (gardening, plumbing, electrical, cleaning, etc.)
- **Service Categories**: Organized by service type with professional verification
- **Provider Ratings**: Review and rating system for service quality
- **Service Types**: Community services, member services, trusted third-party providers
- **Admin Moderation**: Content moderation and quality assurance

### 🏠 Real Estate Agent Marketplace

- **Verified Agents**: EAAB-registered real estate professionals
- **Property Listings**: Create and manage property listings for sale/rent
- **Commission Tracking**: Transparent commission management
- **Agent Verification**: Background checks and licensing verification
- **Premium Features**: Advanced portfolio management for property investors

### 💬 Real-Time Messaging

- **Direct Messaging**: Private conversations between residents
- **Real-Time Updates**: Instant message delivery via Supabase Realtime
- **Unread Indicators**: Visual notifications for new messages
- **Message History**: Persistent conversation history
- **Read Receipts**: Track message delivery and read status

### 👨‍💼 Admin Dashboard

- **User Management**: Resident account administration
- **Content Moderation**: Review and approve service listings
- **Analytics Dashboard**: Platform usage statistics and insights
- **System Configuration**: Platform settings and maintenance

## 🏗️ Architecture

### Tech Stack

| Layer              | Technology                       | Purpose                                 |
| ------------------ | -------------------------------- | --------------------------------------- |
| **Frontend**       | Next.js 15, React 18, TypeScript | Modern React framework with type safety |
| **Styling**        | TailwindCSS, PostCSS             | Utility-first CSS framework             |
| **Backend**        | Next.js API Routes               | Serverless API endpoints                |
| **Database**       | PostgreSQL                       | Primary data storage                    |
| **ORM**            | Prisma 5                         | Type-safe database access               |
| **Authentication** | Better Auth                      | Secure user authentication              |
| **Real-Time**      | Supabase Realtime                | Live messaging and notifications        |
| **Deployment**     | Vercel                           | Global CDN and serverless deployment    |
| **Testing**        | Vitest, Playwright               | Unit and E2E testing                    |

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│   API Routes    │────│   PostgreSQL    │
│                 │    │                 │    │   (Prisma)      │
│ • Pages         │    │ • REST APIs     │    │                 │
│ • Components    │    │ • Auth          │    │ • Users         │
│ • State Mgmt    │    │ • Realtime      │    │ • Conversations │
│                 │    │ • File Upload   │    │ • Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Supabase      │
                    │   Realtime      │
                    │                 │
                    │ • Chat Messages │
                    │ • Notifications │
                    └─────────────────┘
```

### Key Components

- **ResidentCard**: Reusable component for displaying resident information
- **ServiceCard**: Component for service listings with provider details
- **UnifiedResidentCard**: Combined component with chat functionality
- **DirectoryGrid**: Main directory browsing interface
- **ChatModal**: Real-time messaging interface
- **AdminDashboard**: Administrative controls and analytics

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** database (local or Supabase)
- **Supabase** account for real-time features

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/soralia-village.git
   cd soralia-village
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**

   ```bash
   cp .env.example .env.local
   ```

   Configure your environment variables:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/soralia_village"

   # Authentication
   NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
   BETTER_AUTH_SECRET="your-secret-key"

   # Real-time (Supabase)
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```

4. **Database setup**

   ```bash
   # Push schema to database
   npm run db:push

   # Seed with sample data
   npm run db:seed
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📖 Usage

### For Residents

1. **Register/Login**: Create your account or sign in
2. **Complete Profile**: Add your contact information and interests
3. **Browse Directory**: Discover other residents and community services
4. **Connect**: Start conversations with other community members
5. **Access Services**: Browse and book community services

### For Service Providers

1. **Create Listings**: Add your services to the marketplace
2. **Manage Availability**: Set your service hours and areas
3. **Respond to Inquiries**: Handle booking requests from residents
4. **Build Reputation**: Earn reviews and ratings

### For Property Owners

1. **Access Premium Features**: Upgrade to Premium Seat
2. **Manage Portfolio**: Track multiple properties
3. **Connect with Agents**: Work with verified real estate professionals
4. **List Properties**: Create property listings for sale/rent

### For Administrators

1. **Access Admin Panel**: Use admin dashboard for oversight
2. **Moderate Content**: Review and approve service listings
3. **Manage Users**: Handle resident accounts and permissions
4. **View Analytics**: Monitor platform usage and performance

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:push          # Push schema changes to database
npm run db:seed          # Seed database with sample data
npm run db:studio        # Open Prisma Studio

# Testing
npm test                 # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type checking
npm run format           # Format code with Prettier
```

### Project Structure (FSD)

The project follows [Feature-Sliced Design (FSD)](https://feature-sliced.design/) architecture:

```
soralia-village/
├── src/
│   ├── app/                    # Next.js App Router (thin composition layer)
│   ├── processes/              # Cross-slice workflows (auth init, tenant bootstrap)
│   ├── page-modules/           # Route-level page components (aliased as @pages)
│   ├── widgets/                # Large page sections composed from features/entities
│   ├── features/               # Interactive user actions and forms
│   ├── entities/               # Domain models, types, and read-only UI
│   └── shared/                 # Reusable UI kit, generic libs, and infra
│       ├── api/                # DB clients, tRPC, Auth, Supabase
│       ├── ui/                 # Atomic UI components (buttons, inputs, etc.)
│       └── lib/                # Generic utilities and hooks
├── prisma/                     # Database schema and migrations
├── drizzle/                    # Drizzle migrations and metadata
├── scripts/                    # Maintenance and seeding scripts
├── public/                     # Static assets and locales
└── package.json
```

## 🧪 Testing

The project includes comprehensive testing coverage:

### Unit Tests

```bash
npm run test              # Run tests in watch mode
npm run test:run          # Run all tests once
npm run test:coverage     # Generate coverage report
```

### End-to-End Tests

```bash
npx playwright test       # Run E2E tests
npx playwright show-report # View test results
```

### Testing Documentation

See [TESTING_METHODS.md](docs/TESTING_METHODS.md) for comprehensive testing strategies.

## 📚 API Documentation

### Authentication Endpoints

```
POST /api/auth/sign-in     # User login
POST /api/auth/sign-up     # User registration
POST /api/auth/sign-out    # User logout
GET  /api/auth/session     # Get current session
```

### User Management

```
GET    /api/users           # List users (with filtering)
GET    /api/users/[id]      # Get user details
PUT    /api/users/[id]      # Update user profile
DELETE /api/users/[id]      # Delete user (admin only)
```

### Community Services

```
GET    /api/community-services/listings           # Browse services
POST   /api/community-services/listings           # Create service listing
GET    /api/community-services/listings/[id]      # Get service details
PUT    /api/community-services/listings/[id]      # Update listing
DELETE /api/community-services/listings/[id]      # Delete listing
POST   /api/community-services/listings/[id]/publish # Publish/unpublish

GET    /api/community-services/reviews/[listingId] # Get reviews
POST   /api/community-services/reviews/[listingId] # Add review
POST   /api/community-services/inquiries           # Create service inquiry
```

### Messaging

```
GET    /api/messages?conversationId=<id>         # Get messages
POST   /api/messages                            # Send message
GET    /api/messages/unread                      # Get unread counts
POST   /api/messages/mark-read                   # Mark as read

POST   /api/conversations/find                   # Find/create conversation
GET    /api/conversations/[id]                   # Get conversation details
```

### Admin Endpoints

```
GET    /api/admin/users                          # List all users
GET    /api/admin/analytics                      # Platform analytics
POST   /api/admin/services/moderate/[id]         # Moderate content
```

## 🤝 Contributing

We welcome contributions to the Soralia Village platform!

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following our coding standards
4. **Run tests**: `npm run test:run`
5. **Commit your changes**: `git commit -m "Add your feature"`
6. **Push to your fork**: `git push origin feature/your-feature-name`
7. **Create a Pull Request**

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Airbnb configuration with TypeScript support
- **Prettier**: Consistent code formatting
- **Testing**: Minimum 80% test coverage required

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 📄 License

This project is proprietary software owned by Netbones Solutions Pty Ltd. All rights reserved.

See [SaaS_License_Agreement_Soralia_v4.md](docs/SaaS_License_Agreement_Soralia_v4.md) for detailed licensing terms.

## 📞 Support & Contact

### Community Support

- **Documentation**: [docs/](docs/) directory
- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and community support

### Technical Support

- **Email**: support@soralia.org
- **Admin Portal**: Available for authorized HOA administrators
- **Emergency**: For critical system issues

### Development Team

- **Project Lead**: Netbones Solutions Development Team
- **Architecture**: See [CHAT_DESIGN.md](docs/CHAT_DESIGN.md)
- **Testing**: See [TESTING_METHODS.md](docs/TESTING_METHODS.md)

## 🗺️ Roadmap

### Current Version (v1.0.0)

- ✅ Resident directory with advanced filtering
- ✅ Community services marketplace
- ✅ Real estate agent marketplace
- ✅ Real-time messaging system
- ✅ Admin moderation tools

### Upcoming Features

- **📱 Mobile App**: Native iOS/Android applications
- **📊 Advanced Analytics**: Detailed usage and engagement metrics
- **🎯 Push Notifications**: Browser and mobile push notifications
- **📅 Event Management**: Community event planning and RSVPs
- **💰 Payment Integration**: In-app payments for premium services
- **🌐 Multi-language**: Additional language support
- **♿ Enhanced Accessibility**: WCAG 2.1 AAA compliance

### Long-term Vision

- **🏢 Multi-Community Support**: Platform for multiple communities
- **🤖 AI Features**: Smart recommendations and automated moderation
- **📈 Advanced Reporting**: Comprehensive business intelligence
- **🔗 Third-party Integrations**: External service provider connections
- **🎮 Gamification**: Community engagement incentives

---

**Built with ❤️ for the Soralia Village community**

_Empowering communities through technology since 2024_
