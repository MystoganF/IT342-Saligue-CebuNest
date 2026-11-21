<div align="center">
  <img src="web/public/cebunest-logo.png" alt="CebuNest Logo" width="140" />
  <h1>CebuNest</h1>
  <p><strong>A Full-Stack Property Rental & Lease Management Platform for Cebu</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Spring%20Boot-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin" />
    <img src="https://img.shields.io/badge/Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  </p>
</div>

---

## 📖 Overview

**CebuNest** is a multi-platform property rental and lease management ecosystem developed for **IT342**. It connects property seekers (**Tenants**), property landlords (**Owners**), and platform moderators (**Admins**) across a unified **Spring Boot REST API**, a **React + TypeScript Web Application**, and a native **Kotlin Android Mobile App**.

From browsing available properties and submitting rental applications to handling **PayMongo** rental payments, lease extensions, owner analytics, and admin audit logs, CebuNest streamlines the entire rental lifecycle.

---

## ✨ Key Features

### 🔐 Authentication & Security
* **JWT-Based Authentication:** Stateless session management across web and mobile clients.
* **Google OAuth Integration:** Seamless sign-in and registration via Google accounts.
* **Password Recovery Flow:** Email-based OTP verification and secure password reset.
* **Role-Based Access Control (RBAC):** Dedicated interfaces and protected routes for **Tenants**, **Owners**, and **Admins**.

### 🏠 Tenant Experience *(Web & Android Mobile)*
* **Property Catalog:** Browse available rentals with property types, photo galleries, and detailed descriptions.
* **Rental Applications:** Submit and track rental requests directly from the app.
* **My Rentals & Lease Management:** View active leases, monitor lease timelines, and request lease extensions.
* **Online Payments:** Pay monthly rent securely via **PayMongo** integration and view payment history.
* **Reviews & Ratings:** Leave reviews and read feedback from other tenants.
* **Real-Time Notifications:** Receive updates on application statuses, payments, and admin announcements.

### 📊 Property Owner Experience *(Web)*
* **Property Management:** Create, manage, and upload images (stored via **Supabase Storage**) for rental listings.
* **Property Edit Requests:** Submit listing modifications for admin review and approval.
* **Rental & Lease Tracking:** Approve/reject tenant applications, track active leases, and manage lease extension requests.
* **Owner Analytics Dashboard:** Monitor occupancy, rental revenue, and property performance.
* **Billing Overview:** Track tenant payment statuses and billing cycles.

### 🛡️ Admin Dashboard *(Web)*
* **User Management:** View, manage, and moderate platform accounts and roles.
* **Property Moderation:** Review, edit, override, or deactivate property listings.
* **Edit Request Review:** Inspect side-by-side property edit requests and approve or reject changes.
* **Rental Oversight:** Monitor platform-wide rental requests.
* **Broadcast Notifications:** Send system-wide announcements to users.
* **Audit Logs:** Track administrative actions for accountability and security.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Java, Spring Boot, Spring Security, JWT, Maven, Docker |
| **Web Frontend** | React, TypeScript, Vite, Axios, CSS Modules |
| **Mobile App** | Android (Kotlin), XML Layouts, Retrofit, ViewBinding / Navigation Component |
| **Storage & Services** | Supabase Storage (Media), PayMongo (Payment Gateway), JavaMail / SMTP (Email) |
| **Testing** | JUnit / Mockito (Backend Service Unit Tests) |

---

## 📂 Project Structure

```text
IT342-Saligue-CebuNest/
├── backend/
│   └── cebunest/                 # Spring Boot REST API
│       ├── src/main/java/edu/cit/saligue/cebunest/
│       │   ├── analytics/        # Owner analytics endpoints & logic
│       │   ├── auth/             # Login, Register, Google OAuth, JWT, Password Reset
│       │   ├── health/           # API health check endpoint
│       │   ├── infrastructure/   # DataInitializer, EmailService, SupabaseStorageService
│       │   ├── notifications/    # User notifications & Admin broadcasts
│       │   ├── payments/         # Billing & PayMongo gateway integration
│       │   ├── properties/       # Catalog, Management, Edit Requests, Admin & Audit Logs
│       │   ├── rentals/          # Applications, Lease Tracking & Extensions
│       │   ├── reviews/          # Property reviews & ratings
│       │   ├── scheduler/        # Automated scheduled jobs
│       │   └── users/            # Profile & Admin user management
│       ├── src/test/             # Unit tests for core services
│       ├── Dockerfile            # Container configuration
│       └── pom.xml               # Maven dependencies
│
├── web/                          # React + TypeScript + Vite Web App
│   ├── public/                   # Static assets & branding
│   ├── src/
│   │   ├── api/                  # Axios instance & shared API helpers
│   │   ├── components/           # Navbar, OwnerNavbar, AdminSidebar, ProtectedRoute
│   │   └── modules/              # Feature-based modules (Auth, Admin, Owner, Tenant)
│   └── package.json
│
├── mobile/                       # Native Android App (Kotlin)
│   └── app/src/main/
│       ├── java/com/cebunest/app/
│       │   ├── core/             # RetrofitClient, ApiError, SessionManager
│       │   └── modules/          # Auth & Tenant features (Home, Rentals, Profile, Notifications)
│       └── res/                  # XML layouts, drawables, navigation graph
│
└── docs/                         # Project Documentation
    ├── SDD_CebuNest_Saligue.pdf
    └── SDD_CebuNest_Saligue.docx
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed:
* **Java 17+** & **Maven** (or use the included `./mvnw` wrapper)
* **Node.js 18+** & **npm**
* **Android Studio** (for building/running the Kotlin mobile app)
* **PostgreSQL / MySQL** (matching your `application.properties` database setup)
* Accounts/API keys for **Supabase Storage**, **PayMongo**, **Google OAuth**, and **SMTP Mail**

---

### 1. Backend Setup (`backend/cebunest`)

1. Navigate to the backend directory:
   ```bash
   cd backend/cebunest
   ```
2. Configure your environment variables or update `src/main/resources/application.properties` with your database credentials, JWT secret, Supabase keys, PayMongo keys, Google Client ID, and SMTP mail settings.
3. Run the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```
   *(On Windows, use `mvnw.cmd spring-boot:run`)*

#### Optional: Run with Docker
```bash
cd backend/cebunest
docker build -t cebunest-backend .
docker run -p 8080:8080 cebunest-backend
```

---

### 2. Web Application Setup (`web`)

1. Navigate to the web directory:
   ```bash
   cd web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your `.env` file in the `web/` directory (e.g., backend API URL and Google OAuth Client ID):
   ```env
   VITE_API_BASE_URL=http://localhost:8080/api
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

---

### 3. Mobile Application Setup (`mobile`)

1. Open **Android Studio** and select **Open** -> choose the `mobile/` directory.
2. Wait for Gradle to sync all dependencies.
3. Update the base API URL in `RetrofitClient.kt` to point to your running backend (e.g., `http://10.0.2.2:8080/` for the Android Emulator or your local machine's IP address for physical devices).
4. Build and run the app on an emulator or physical Android device.

---

## 🧪 Running Tests

To execute the backend unit test suite (covering Analytics, Auth, Payments, Properties, Rentals, Reviews, and User services):

```bash
cd backend/cebunest
./mvnw test
```

---

## 📄 Documentation

Detailed system architecture, database schemas, and design specifications are available in the `docs/` folder:
* [`SDD_CebuNest_Saligue.pdf`](docs/SDD_CebuNest_Saligue.pdf)

---

## 👤 Author

**Saligue**  
*IT342 — Cebu Institute of Technology - University*

---

<div align="center">
  <sub>Built with ❤️ for CebuNest</sub>
</div>
