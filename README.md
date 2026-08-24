# PlagiGuard

## Free Plagiarism & Similarity Checker for Students and Researchers

PlagiGuard is a browser-based academic assignment management and similarity detection platform built using **HTML5, CSS3, and Vanilla JavaScript**.

It provides separate **Student** and **Instructor** environments. Students can view assignments, submit work, check similarity results, and view marks and feedback. Instructors can create assignments, review submissions, compare student work, calculate similarity, and provide marks and feedback.

The project uses **tokenization, N-gram generation, and Jaccard similarity** and does not require an external API or backend server.

---

## 1. Project Objectives

The main objectives of PlagiGuard are to:

* Develop a modern academic assignment platform.
* Provide separate Student and Instructor dashboards.
* Allow instructors to create and manage assignments.
* Allow students to submit assignments and track results.
* Validate minimum word requirements.
* Implement tokenization and N-gram generation.
* Calculate Jaccard similarity between submissions.
* Perform pairwise comparison.
* Identify potentially similar submissions.
* Provide detailed similarity reports.
* Highlight matching passages.
* Allow instructors to mark work and provide feedback.
* Provide analytics, notifications, deadlines, and profile management.

---

## 2. Scope

### Student Features

Students can:

* Register and log in.
* View assignments and instructions.
* Submit assignment content.
* Check word count.
* View similarity scores.
* See Flagged / Not Flagged status.
* View marks and instructor feedback.
* Track deadlines and notifications.
* Edit profiles and upload profile pictures.
* View analytics and submission history.

### Instructor Features

Instructors can:

* Register and log in.
* Create, edit, and delete assignments.
* Set word limits, marks, and deadlines.
* View student submissions.
* Search and filter submissions.
* Run similarity analysis.
* View similarity heatmaps.
* View side-by-side highlighted matches.
* Mark submissions and provide feedback.
* Configure N-gram and similarity settings.
* View instructor analytics.

---

## 3. Technologies Used

### Frontend

* **HTML5** — page structure and forms
* **CSS3** — responsive layouts, dashboards, glassmorphism, themes, and animations
* **Vanilla JavaScript** — application logic, DOM manipulation, validation, similarity detection, dashboards, analytics, and interactions

### Browser Storage

* `localStorage`
* `sessionStorage`

No external API or backend is required in the current version.

---

## 4. Similarity Detection

PlagiGuard follows this workflow:

```text
Submission
   ↓
Tokenization
   ↓
N-Gram Generation
   ↓
Pairwise Comparison
   ↓
Jaccard Similarity
   ↓
Threshold Check
   ↓
Flagged / Not Flagged
   ↓
Similarity Report
```

### Tokenization

Text is normalized and divided into tokens.

Example:

```text
"JavaScript Variables are useful!"
```

becomes:

```text
["javascript", "variables", "are", "useful"]
```

### N-Grams

For `N = 3`:

```text
javascript variables are
variables are useful
```

### Jaccard Similarity

The project uses:

```text
J(A,B) = |A ∩ B| / |A ∪ B|
```

The result is shown as a percentage.

---

## 5. Similarity Reports

The report provides:

* Similarity percentage
* Flagged / Not Flagged status
* Highest matching submission
* Matching N-grams
* Similarity threshold
* Word count
* Marks and feedback
* Similarity heatmap
* Side-by-side submission comparison
* Highlighted matching text
* Print/PDF-friendly report

A flagged result indicates that the similarity has reached the configured threshold and requires instructor review. It does **not** automatically prove plagiarism.

---

## 6. Assignment Workflow

```text
Instructor Creates Assignment
          ↓
Assignment Published
          ↓
Student Views Assignment
          ↓
Student Submits
          ↓
Similarity Analysis
          ↓
Instructor Reviews
          ↓
Marks + Feedback
          ↓
Student Views Result
```

Assignments can contain:

* Title
* Instructions
* Minimum word count
* Maximum marks
* Due date
* Publication status

---

## 7. Notifications and Deadlines

The system provides browser-based notifications for:

* New assignments
* Upcoming deadlines
* New submissions
* Similarity results
* Marking updates

Assignments can display:

```text
7 days left
2 days left
Due tomorrow
Due today
Overdue
Submitted
```

---

## 8. Analytics

### Student Analytics

Students can view:

* Assignment completion
* Average marks
* Similarity trends
* Flagged submissions
* Recent activity

### Instructor Analytics

Instructors can view:

* Total students
* Total assignments
* Total submissions
* Flagged submissions
* Average marks
* Average similarity
* Submission trends
* Assignment performance

---

## 9. User Profiles

Users can:

* Edit profile information
* Upload a profile picture
* View role information
* View account statistics

The profile system works with browser storage.

---

## 10. Theme and Responsive Design

PlagiGuard supports:

* Light mode
* Dark mode
* Responsive navigation
* Responsive dashboards
* Mobile-friendly forms and reports

The interface uses a modern academic SaaS-style design with cards, gradients, glassmorphism, visual status indicators, and responsive layouts.

---

## 11. Project Structure

```text
PlagiGuard/
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── banners/
│
├── css/
├── js/
│   └── pages/
│
├── student/
├── instructor/
│
├── index.html
├── about.html
├── how-it-works.html
├── login.html
├── signup.html
├── profile.html
├── setting.html
└── README.md
```

---

## 12. How to Run

1. Clone or download the repository.
2. Open the project in VS Code.
3. Install the **Live Server** extension.
4. Open `index.html`.
5. Select **Open with Live Server**.

Example:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

---

## 13. JavaScript Concepts Demonstrated

The project demonstrates:

* Variables and data types
* Operators
* Conditional statements
* Loops
* Functions
* Arrow functions
* Arrays and array methods
* Higher-order functions
* Objects and JSON
* DOM manipulation
* Events
* Form validation
* LocalStorage
* SessionStorage
* ES6 features

These concepts are applied to a practical academic web application.

---

## 14. Limitations

The current version is frontend-only, so:

* Data is stored in the browser.
* There is no centralized database.
* Authentication is intended for demonstration.
* The system does not search the entire internet.
* Similarity is calculated from submissions available in the application.
* Clearing browser storage may remove local data.

---

## 15. Future Scope

Future versions could include:

* Backend authentication
* Database integration
* Secure user accounts
* Cloud storage
* PDF/DOCX processing
* Large-scale similarity indexing
* External academic source checking
* Email notifications
* Advanced document analysis

---

## 16. Conclusion

PlagiGuard is an educational academic similarity and assignment-management platform that combines modern web development with text-similarity techniques.

It demonstrates:

* Assignment management
* Student submissions
* Similarity detection
* Tokenization
* N-Grams
* Jaccard similarity
* Pairwise comparison
* Similarity reports
* Highlighted matching evidence
* Instructor marking
* Analytics
* Notifications
* Responsive UI

The project is designed as an academic demonstration and provides a foundation for future development into a full-stack institutional system.

---

## Project Information

**Project:** PlagiGuard
**Domain:** Web Development / Academic Similarity Detection
**Technology:** HTML5, CSS3, Vanilla JavaScript
**Storage:** LocalStorage / SessionStorage
**Architecture:** Frontend-Only
**Purpose:** Academic Project / Educational Demonstration
