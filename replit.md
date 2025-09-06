# Overview

ChatFlow is a real-time chat application built with a modern full-stack architecture. It enables users to create and join chat rooms, send text and image messages, and manage room participation with admin controls. The application features a responsive design with mobile support, persistent user sessions, and WebSocket-based real-time communication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **State Management**: React hooks with local storage persistence for user preferences and chat history
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Real-time Communication**: WebSocket client with custom hook (useSocket) for managing connection state
- **Data Fetching**: TanStack Query for server state management and caching

## Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **WebSocket Server**: Built-in WebSocket server for real-time messaging
- **Data Storage**: In-memory storage implementation with interface abstraction (IStorage) for future database migration
- **File Handling**: Multer middleware for image upload processing with file size and type validation
- **Development Setup**: Vite integration for hot module replacement in development

## Data Models
- **User Schema**: ID, username, avatar, online status, current room
- **Room Schema**: ID, name, description, creator, privacy settings, member lists, blocked users
- **Message Schema**: ID, room reference, user reference, content, message type (text/image), timestamp

## Authentication & Session Management
- **Session Storage**: Local storage-based user persistence without traditional authentication
- **User State**: Managed through WebSocket connection state and local storage
- **Auto-reconnection**: Automatic session restoration on page refresh

## File Upload System
- **Image Processing**: Multer-based file upload with 5MB size limit
- **File Storage**: Local filesystem storage in uploads directory
- **Static Serving**: Express static middleware for serving uploaded images
- **File Validation**: Image-only file type filtering

## Real-time Features
- **WebSocket Events**: Join/leave rooms, send messages, typing indicators, user status updates
- **Message Broadcasting**: Real-time message distribution to room members
- **Presence System**: Online/offline status tracking and display
- **Typing Indicators**: Real-time typing status updates

# External Dependencies

## Core Framework Dependencies
- **React & Ecosystem**: React 18, React DOM, TypeScript support
- **Build Tools**: Vite with React plugin, esbuild for production builds
- **Development**: Replit-specific plugins for development environment

## UI & Styling
- **Component Library**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with PostCSS processing
- **Utilities**: class-variance-authority for component variants, clsx for conditional classes

## Backend Services
- **Database ORM**: Drizzle ORM configured for PostgreSQL (currently using in-memory storage)
- **Database Provider**: Neon Database serverless PostgreSQL
- **Session Management**: connect-pg-simple for PostgreSQL session storage (when database is connected)

## Validation & Forms
- **Schema Validation**: Zod for runtime type checking and data validation
- **Form Handling**: React Hook Form with Hookform resolvers for form state management

## Utilities
- **Date Handling**: date-fns for date formatting and manipulation
- **WebSocket**: Native WebSocket API with custom connection management
- **File Upload**: Multer for multipart form data processing
- **Unique IDs**: crypto.randomUUID for generating unique identifiers

## Development Tools
- **Type Safety**: TypeScript with strict configuration
- **Code Quality**: ESLint and Prettier configurations (implied by project structure)
- **Hot Reload**: Vite HMR with WebSocket proxy support