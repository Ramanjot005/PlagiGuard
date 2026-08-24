// ==========================================
// STUDENT DATA
// ==========================================

const user = {
    name: "Aditi",
    role: "student"
};


// ==========================================
// ASSIGNMENT DATA
// ==========================================

const assignments = [
    {
        id: 1,
        title: "JavaScript Assignment",
        course: "Web Development",
        dueDate: "2026-08-28"
    },
    {
        id: 2,
        title: "Data Structures Assignment",
        course: "DSA",
        dueDate: "2026-09-02"
    },
    {
        id: 3,
        title: "Database Assignment",
        course: "DBMS",
        dueDate: "2026-09-05"
    },
    {
        id: 4,
        title: "Machine Learning Assignment",
        course: "AI/ML",
        dueDate: "2026-09-10"
    }
];


// ==========================================
// SUBMISSION DATA
// ==========================================

const submissions = [
    {
        id: 1,
        assignmentId: 1,
        marks: 85,
        similarity: 18,
        flagged: false,
        submittedAt: "2026-08-20"
    },
    {
        id: 2,
        assignmentId: 2,
        marks: 78,
        similarity: 42,
        flagged: false,
        submittedAt: "2026-08-21"
    },
    {
        id: 3,
        assignmentId: 3,
        marks: 65,
        similarity: 76,
        flagged: true,
        submittedAt: "2026-08-23"
    }
];


// ==========================================
// FUNCTION: CALCULATE DAYS LEFT
// ==========================================

function daysUntil(dateString) {

    const targetDate = new Date(dateString);
    const today = new Date();

    const difference =
        targetDate - today;

    const days =
        Math.ceil(difference / (1000 * 60 * 60 * 24));

    if (days < 0) {
        return "Past due";
    }
    else if (days === 0) {
        return "Due today";
    }
    else if (days === 1) {
        return "Due tomorrow";
    }
    else {
        return `${days} days left`;
    }
}


// ==========================================
// CALCULATE AVERAGE MARKS
// ==========================================

const markedSubmissions =
    submissions.filter(
        submission => submission.marks !== null
    );

const averageMarks =
    markedSubmissions.length > 0
        ? markedSubmissions.reduce(
            (sum, submission) =>
                sum + submission.marks,
            0
        ) / markedSubmissions.length
        : 0;


// ==========================================
// COUNT FLAGGED SUBMISSIONS
// ==========================================

const flaggedSubmissions =
    submissions.filter(
        submission => submission.flagged === true
    );

const flaggedCount =
    flaggedSubmissions.length;


// ==========================================
// COMPLETION PERCENTAGE
// ==========================================

const completedPercentage =
    assignments.length > 0
        ? Math.round(
            (submissions.length / assignments.length) * 100
        )
        : 0;


// ==========================================
// FIND PENDING ASSIGNMENTS
// ==========================================

const pendingAssignments =
    assignments
        .filter(assignment => {

            const submitted =
                submissions.some(
                    submission =>
                        submission.assignmentId === assignment.id
                );

            return !submitted;
        })
        .sort(
            (a, b) =>
                new Date(a.dueDate) -
                new Date(b.dueDate)
        );


// ==========================================
// FIND RECENT SUBMISSIONS
// ==========================================

const recentSubmissions =
    [...submissions]
        .sort(
            (a, b) =>
                new Date(b.submittedAt) -
                new Date(a.submittedAt)
        );


// ==========================================
// RENDER DASHBOARD
// ==========================================

function renderStudentDashboard() {

    const dashboard =
        document.getElementById("student-dashboard");

    dashboard.innerHTML = `

        <section class="dashboard-hero-card">

            <div class="hero-copy">

                <span class="eyebrow">
                    STUDENT WORKSPACE
                </span>

                <h2>
                    Welcome back, ${user.name}
                </h2>

                <p>
                    Track your assignments,
                    submissions and similarity results.
                </p>

            </div>

            <div class="completion-orb">

                <strong>
                    ${completedPercentage}%
                </strong>

                <span>
                    completed
                </span>

            </div>

        </section>


        <!-- STATISTICS -->

        <div class="stats-grid">

            <div class="stat-card">

                <div class="stat-title">
                    Assignments
                </div>

                <div class="stat-value">
                    ${assignments.length}
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-title">
                    Submitted
                </div>

                <div class="stat-value">
                    ${submissions.length}
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-title">
                    Average Marks
                </div>

                <div class="stat-value">
                    ${averageMarks.toFixed(1)}
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-title">
                    Similarity Flags
                </div>

                <div class="stat-value">
                    ${flaggedCount}
                </div>

            </div>

        </div>


        <!-- SIMILARITY RESULTS -->

        <section class="section-card">

            <h2>
                Similarity Results
            </h2>

            <div class="activity-list">

                ${submissions.map(submission => {

                    const assignment =
                        assignments.find(
                            assignment =>
                                assignment.id ===
                                submission.assignmentId
                        );

                    return `

                        <div class="activity-item">

                            <strong>
                                ${assignment.title}
                            </strong>

                            <span>
                                ${submission.similarity}% similarity
                            </span>

                            <span>
                                Marks:
                                ${submission.marks}
                            </span>

                            <span>
                                ${
                                    submission.flagged
                                    ? "⚠ Flagged"
                                    : "✓ Clear"
                                }
                            </span>

                        </div>

                    `;

                }).join("")}

            </div>

        </section>


        <!-- UPCOMING ASSIGNMENTS -->

        <section class="section-card">

            <h2>
                Upcoming Assignments
            </h2>

            <div class="upcoming-list">

                ${
                    pendingAssignments.length > 0

                    ?

                    pendingAssignments.map(
                        assignment => `

                        <div class="upcoming-item">

                            <strong>
                                ${assignment.title}
                            </strong>

                            <span>
                                ${assignment.course}
                            </span>

                            <span>
                                ${daysUntil(
                                    assignment.dueDate
                                )}
                            </span>

                        </div>

                    `
                    ).join("")

                    :

                    `
                    <p>
                        All assignments are completed.
                    </p>
                    `
                }

            </div>

        </section>


        <!-- QUICK ACTIONS -->

        <section class="section-card">

            <h2>
                Quick Actions
            </h2>

            <button id="submitButton">
                Submit Assignment
            </button>

            <button id="assignmentButton">
                View Assignments
            </button>

            <button id="resultButton">
                View Results
            </button>

        </section>

    `;
}


// ==========================================
// DOM EVENT HANDLING
// ==========================================

renderStudentDashboard();


const submitButton =
    document.getElementById("submitButton");

const assignmentButton =
    document.getElementById("assignmentButton");

const resultButton =
    document.getElementById("resultButton");


submitButton.addEventListener(
    "click",
    function () {

        alert("Submit Assignment clicked");

    }
);


assignmentButton.addEventListener(
    "click",
    function () {

        alert("View Assignments clicked");

    }
);


resultButton.addEventListener(
    "click",
    function () {

        alert("View Results clicked");

    }
);