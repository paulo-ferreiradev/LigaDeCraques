# Project Context: Liga-Craques (LDC)

## Overview
Liga-Craques is a management system for a private football league. The core goal is to generate an automated league standings table (leaderboard) based on match results (3 points for a win, 2 for a draw, 1 for a loss). The system allows manual match reporting by Admins, tracks MVP awards, and securely manages financial contributions.

## Stakeholders & Roles
- **Admin:** Full access to the system. Manages players, seasons, manually assigns teams post-match, and registers match scores.
- **Treasurer (Tesoureiro):** Access to view tables and full control over the financial/payment module.
- **User (Normal):** Read-only access to standings, match history, and personal statistics.

## Tech Stack
- **Backend:** NestJS (Node.js) with TypeScript.
- **Database:** PostgreSQL hosted on Supabase.
- **ORM:** Prisma v7+.
- **Mobile:** React Native with Expo (planned).