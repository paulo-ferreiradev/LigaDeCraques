Markdown

# ⚽ Liga de Craques (LDC)

A full-stack mobile platform designed to manage weekly football leagues, track player performance, and organize matches.

## 🏗️ Project Structure

This project is organized as a **Monorepo**:

- `/api`: Backend REST API built with NestJS and Prisma ORM.
- `/mobile`: Cross-platform mobile application built with React Native and Expo (Work in Progress).

---

## 🚀 Tech Stack

### Backend

- **Framework:** [NestJS](https://nestjs.com/) (Node.js)
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/)
- **ORM:** [Prisma](https://www.prisma.io/) (v7+)
- **Documentation:** [Swagger/OpenAPI](https://swagger.io/)

### Frontend (Upcoming)

- **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Styling:** [NativeWind](https://www.nativewind.dev/) (Tailwind CSS)

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase project (PostgreSQL)

### Backend Setup (API)

1. **Navigate to the api folder:**
   ```bash
   cd api
   Install dependencies:
   ```

npm install
Environment Configuration:
Create a .env file in the /api directory and add your Supabase credentials:

DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_ID]:[YOUR_PASSWORD]@[aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true](https://aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true)"
DIRECT_URL="postgresql://postgres.[YOUR_PROJECT_ID]:[YOUR_PASSWORD]@db.[YOUR_PROJECT_ID].supabase.co:5432/postgres"
Database Migrations:
Sync your database schema with Prisma:

npx prisma migrate dev --name init
Run the application:

npm run start:dev
📖 API Documentation
Once the backend is running, you can access the interactive Swagger documentation at:
http://localhost:3000/api/docs

📜 Key Features (Roadmap)
[x] Database Schema Design (Players, Seasons, Matches)

[x] REST API Architecture with NestJS

[x] CRUD Operations for Players

[ ] Match Result Management

[ ] Season Standings Calculation

[ ] Mobile App UI Development
