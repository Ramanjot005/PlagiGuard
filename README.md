# PlagiGuard

## Plagiarism & Similarity Detection Platform for Academic Integrity

PlagiGuard is a full-stack academic assignment management and similarity detection platform built with a **Node.js/Express backend, MongoDB database, and a responsive HTML5, CSS3, and Vanilla JavaScript frontend**.

It provides separate **Student** and **Instructor** workspaces:
* **Students** can register, log in, view coursework, submit assignments (typed or text file upload), review similarity scores and flagged statuses, and view instructor marks and feedback.
* **Instructors** can create, edit, and delete coursework, view submission reports, inspect pairwise similarity matrices/heatmaps, review side-by-side matching passages, configure similarity analysis thresholds, and record marks and feedback.

Similarity detection uses **text normalization, tokenization, N-gram generation, and Jaccard similarity calculation**, with automatic background re-analysis and cross-submission comparison.

---

## 1. System Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   Frontend Client                      │
│     (HTML5, CSS3, Vanilla JS, API Client, Fetch)       │
│                  Dev Server: Port 8080                 │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON REST APIs
                            │ Authorization: Bearer <JWT>
┌───────────────────────────▼────────────────────────────┐
│                    Express Backend                     │
│               (Node.js REST API Server)                │
│                      Port: 5000                        │
├────────────────────────────────────────────────────────┤
│ • Auth & Role Middleware (protect, authorizeRoles)     │
│ • Assignment Controller (CRUD, ownership validation)   │
│ • Submission Controller (Upload, Reports, Grading)     │
│ • Similarity Engine (Tokenize, N-Grams, Jaccard)       │
│ • Settings & Profile Controllers                       │
└───────────────────────────┬────────────────────────────┘
                            │ Mongoose ODM
┌───────────────────────────▼────────────────────────────┐
│                    MongoDB Database                    │
│             (MongoDB Atlas or Local MongoDB)           │
│   Collections: users, assignments, submissions,        │
│                settings                                │
└────────────────────────────────────────────────────────┘
```

---

## 2. Technologies Used

### Backend
* **Node.js** (v18+) — runtime environment
* **Express.js** (v5) — RESTful API framework
* **MongoDB & Mongoose** (v9) — document database and object data modeling
* **jsonwebtoken (JWT)** — stateless authentication and role-based session management
* **bcryptjs** — secure 12-round salted password hashing
* **cors** & **dotenv** — cross-origin resource sharing and environment configuration

### Frontend
* **HTML5** — semantic page structure and accessible forms
* **CSS3** — responsive layout, custom dashboard grids, glassmorphism, themes (dark/light), animations
* **Vanilla JavaScript (ES6+)** — API integration, DOM manipulation, real-time client-side word count, modal dialogs

---

## 3. Core API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new student account ($\ge 8$ char password required) |
| `POST` | `/api/auth/login` | Public | Authenticate user, returns 1-day signed JWT |
| `GET` | `/api/auth/profile` | Authenticated | Retrieve authenticated user profile |
| `PATCH` | `/api/auth/profile` | Authenticated | Update user display name and profile image |

### Coursework & Assignments (`/api/assignments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/assignments` | Authenticated | List assignments (students see all; instructors see own) |
| `POST` | `/api/assignments` | Instructor | Create new assignment (title, course, dueDate, maxMarks, minWords) |
| `GET` | `/api/assignments/:id` | Authenticated | Fetch single assignment by MongoDB ID |
| `PUT` | `/api/assignments/:id` | Instructor Owner | Update assignment details (only assignment creator) |
| `DELETE` | `/api/assignments/:id`| Instructor Owner | Delete assignment (only creator, blocked if submissions exist) |

### Submissions & Similarity (`/api/submissions`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/submissions` | Student | Submit assignment text; runs automatic similarity analysis |
| `GET` | `/api/submissions/my` | Student | Retrieve student's own submission history |
| `GET` | `/api/submissions/:id` | Owner / Instructor | Retrieve submission details (IDOR protected) |
| `GET` | `/api/submissions/reports` | Instructor | Retrieve submissions and pairwise comparisons for instructor |
| `GET` | `/api/submissions/reports/pairwise` | Instructor | Retrieve scoped pairwise comparisons |
| `GET` | `/api/submissions/assignment/:id` | Instructor Owner | Retrieve submissions for a specific assignment |
| `PATCH`| `/api/submissions/:id/grade` | Instructor Owner | Record marks, feedback, and grading status |
| `PATCH`| `/api/submissions/:id` | Student Owner | Update submission text before grading (re-analyzes similarity) |

### Analysis Settings (`/api/settings`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/settings` | Authenticated | Get global analysis settings (N-gram size, threshold, minWords) |
| `PUT` | `/api/settings` | Instructor | Update similarity engine configuration |

---

## 4. Similarity Detection Algorithm

```text
Student Submission Text
          ↓
     Tokenization
(lowercase, strip non-alphanumeric, split whitespace)
          ↓
   N-Gram Generation
(sliding window of N words, default N = 3)
          ↓
  Pairwise Comparison
(compare against existing student submissions)
          ↓
   Jaccard Similarity
J(A, B) = |A ∩ B| / |A ∪ B| × 100%
          ↓
    Threshold Check
(score ≥ threshold AND shared n-grams ≥ minimum matching)
          ↓
Flagged / Clear Status + Bidirectional Update
```

---

## 5. Prerequisites & Environment Setup

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **npm** (v9.0.0 or higher)
* **MongoDB** (Local instance or MongoDB Atlas connection URI)

### Configuration
1. Navigate to the `backend/` directory.
2. Ensure `.env` exists by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/plagiguard?retryWrites=true&w=majority
   JWT_SECRET=your_secure_development_jwt_secret_key_minimum_32_chars
   ```
   *(Never commit `.env` containing production credentials to source control).*

---

## 6. How to Run

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Seed an Instructor Account
Public registration creates student accounts for academic integrity. To provision an authorized instructor account:
```bash
cd backend
node createInstructor.js
```
*(You can customize the email and password within your local setup as needed).*

### Step 3: Start the Backend Server
```bash
cd backend
npm run dev
```
The backend server runs at `http://localhost:5000`. You can verify health via `http://localhost:5000/api/health`.

### Step 4: Start the Frontend
From the project root:
```bash
# Using Python
python -m http.server 8080

# Or using npx serve / http-server
npx serve -l 8080 .
```
Access the application at `http://localhost:8080/frontend/html/index.html` or `http://localhost:8080/frontend/html/login.html`.

---

## 7. Running Automated Tests

PlagiGuard includes a comprehensive test suite testing unit algorithms, authentication, role barriers, ownership scoping, assignment CRUD, submissions, similarity detection, grading, settings, and error handling.

To run the automated test suite:
```bash
cd backend
npm test
```

The test runner:
1. Connects to MongoDB safely.
2. Runs unit and endpoint integration checks.
3. Automatically deletes only its own temporary test records on completion.
4. Leaves existing student, instructor, assignment, and grade records intact.

---

## 8. Security & Data Protection Features

* **JWT Verification:** All protected routes require a signed `Bearer` token with user existence checks in MongoDB.
* **Role-Based Authorization:** Strict middleware guards separate Student routes from Instructor administrative tools.
* **IDOR Protection:** Students can only view their own submissions; cross-student access attempts return HTTP 403.
* **Instructor Ownership Scoping:** Instructors can only update, delete, or grade submissions for assignments they personally created.
* **Tamper Prevention:** Submission text cannot be edited by instructors, and students cannot mutate submissions that have already been graded.
* **Input Validation & Sanitization:** Strict bounds checking on marks, word count, email syntax, password length, and MongoDB ObjectIds.
* **Information Leak Prevention:** Passwords use salted hashes (`select: false`); malformed requests and unhandled errors return clean JSON without exposing stack traces or environment variables.

---

## Project Information

**Project:** PlagiGuard
**Domain:** Academic Integrity & Assignment Similarity Detection
**Architecture:** Full-Stack (Node.js/Express REST API + MongoDB + Vanilla JS Client)
**Port Configuration:** Backend `5000`, Frontend `8080`
