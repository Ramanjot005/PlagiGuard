// Check that the logged-in user is an instructor
const instructor = PG.requireRole("instructor");

if (!instructor) {
    throw new Error("Unauthorized");
}


// Show the instructor dashboard
function renderInstructorDashboard() {

    // Get data from the application
    const submissions = PG.getInstructorSubmissions();
    const students = PG.getUsers().filter(function (user) {
        return user.role === "student";
    });
    const assignments = PG.getAssignments();


    // Basic statistics
    const flaggedSubmissions = submissions.filter(function (submission) {
        return submission.flagged;
    });

    const markedSubmissions = submissions.filter(function (submission) {
        return submission.marks !== null &&
               submission.marks !== undefined;
    });

    const pendingSubmissions =
        submissions.length - markedSubmissions.length;


    // Calculate average marks
    let averageMarks = 0;

    if (markedSubmissions.length > 0) {

        const totalMarks = markedSubmissions.reduce(
            function (total, submission) {
                return total + Number(submission.marks);
            },
            0
        );

        averageMarks =
            totalMarks / markedSubmissions.length;
    }


    // Calculate marking progress
    let reviewRate = 0;

    if (submissions.length > 0) {
        reviewRate = Math.round(
            (markedSubmissions.length / submissions.length) * 100
        );
    }


    // Get latest submissions
    const recentSubmissions = [...submissions]
        .sort(function (a, b) {
            return new Date(b.submittedAt) -
                   new Date(a.submittedAt);
        })
        .slice(0, 7);


    // ----------------------------------------
    // Similarity distribution
    // ----------------------------------------

    const similarityBands = [
        {
            label: "0–20%",
            min: 0,
            max: 20
        },
        {
            label: "21–40%",
            min: 21,
            max: 40
        },
        {
            label: "41–60%",
            min: 41,
            max: 60
        },
        {
            label: "61–80%",
            min: 61,
            max: 80
        },
        {
            label: "81–100%",
            min: 81,
            max: 100
        }
    ];


    similarityBands.forEach(function (band) {

        band.count = submissions.filter(
            function (submission) {

                const similarity =
                    Number(submission.maxSimilarity) || 0;

                return (
                    similarity >= band.min &&
                    similarity <= band.max
                );
            }
        ).length;

    });


    let maxBandCount = 1;

    similarityBands.forEach(function (band) {

        if (band.count > maxBandCount) {
            maxBandCount = band.count;
        }

    });


    // ----------------------------------------
    // Assignment statistics
    // ----------------------------------------

    const assignmentStats =
        assignments.slice(0, 5).map(
            function (assignment) {

                const assignmentSubmissions =
                    submissions.filter(
                        function (submission) {
                            return (
                                submission.assignmentId ===
                                assignment.id
                            );
                        }
                    );


                let average = 0;

                if (assignmentSubmissions.length > 0) {

                    const totalMarks =
                        assignmentSubmissions.reduce(
                            function (total, submission) {
                                return (
                                    total +
                                    Number(submission.marks || 0)
                                );
                            },
                            0
                        );

                    average =
                        totalMarks /
                        assignmentSubmissions.length;
                }


                return {
                    title: assignment.title,
                    course: assignment.course,
                    maxMarks: assignment.maxMarks,
                    count: assignmentSubmissions.length,
                    averageMarks: average
                };

            }
        );


    // ----------------------------------------
    // Highest similarity cases
    // ----------------------------------------

    const prioritySubmissions =
        [...flaggedSubmissions]
            .sort(function (a, b) {

                return (
                    Number(b.maxSimilarity || 0) -
                    Number(a.maxSimilarity || 0)
                );

            })
            .slice(0, 5);


    // ----------------------------------------
    // Create dashboard
    // ----------------------------------------

    pgLayout({

        active: "dashboard",

        role: "instructor",

        title: "Instructor Dashboard",

        subtitle:
            "Manage assignments, review submissions and check similarity results.",


        headerAction: `
            <div class="dashboard-head-actions">

                <a
                    class="btn btn-secondary btn-sm"
                    href="reports.html"
                >
                    Open reports
                </a>

                <a
                    class="btn btn-primary"
                    href="assignments.html#new-assignment"
                >
                    ＋ New assignment
                </a>

            </div>
        `,


        content: `

            <!-- Dashboard welcome section -->
            <section class="dashboard-hero-card instructor-hero">

                <div class="hero-glow hero-glow-one"></div>
                <div class="hero-glow hero-glow-two"></div>


                <div class="hero-copy">

                    <span class="eyebrow">
                        INSTRUCTOR WORKSPACE
                    </span>


                    <h2>
                        A clearer view of your class.
                    </h2>


                    <p>
                        Check submissions, manage assignments and
                        review similarity results from one place.
                    </p>


                    <div class="hero-pills">

                        <span>
                            ✓ Pairwise comparison
                        </span>

                        <span>
                            ✓ Marking workflow
                        </span>

                        <span>
                            ✓ Assignment management
                        </span>

                    </div>

                </div>


                <div
                    class="review-orb"
                    style="--progress:${reviewRate * 3.6}deg"
                >

                    <div>

                        <strong>
                            ${reviewRate}%
                        </strong>

                        <span>
                            reviewed
                        </span>

                    </div>

                </div>

            </section>



            <!-- Statistics -->
            <div class="stats-grid premium-stats">

                <div class="stat-card stat-card-blue">

                    <div class="stat-icon">
                        ◉
                    </div>

                    <div class="stat-title">
                        Students
                    </div>

                    <div class="stat-value">
                        ${students.length}
                    </div>

                    <div class="stat-foot">
                        Registered learners
                    </div>

                </div>


                <div class="stat-card stat-card-purple">

                    <div class="stat-icon">
                        ▦
                    </div>

                    <div class="stat-title">
                        Assignments
                    </div>

                    <div class="stat-value">
                        ${assignments.length}
                    </div>

                    <div class="stat-foot">
                        Published coursework
                    </div>

                </div>


                <div class="stat-card stat-card-red">

                    <div class="stat-icon">
                        !
                    </div>

                    <div class="stat-title">
                        Flagged
                    </div>

                    <div class="stat-value">
                        ${flaggedSubmissions.length}
                    </div>

                    <div class="stat-foot">
                        Need review
                    </div>

                </div>


                <div class="stat-card stat-card-green">

                    <div class="stat-icon">
                        ✓
                    </div>

                    <div class="stat-title">
                        Avg. Marks
                    </div>

                    <div class="stat-value">
                        ${averageMarks.toFixed(1)}
                    </div>

                    <div class="stat-foot">
                        ${markedSubmissions.length}
                        marked ·
                        ${pendingSubmissions}
                        pending
                    </div>

                </div>

            </div>



            <!-- Analytics -->
            <div class="analytics-grid instructor-analytics">


                <!-- Similarity distribution -->
                <section class="section-card analytics-card">

                    <div class="section-heading">

                        <div>

                            <span class="eyebrow">
                                SIMILARITY PROFILE
                            </span>

                            <h2 class="section-title">
                                Submission similarity distribution
                            </h2>

                            <p class="text-muted">
                                Similarity levels across student submissions.
                            </p>

                        </div>


                        <a
                            class="chart-chip"
                            href="reports.html"
                        >
                            View full report →
                        </a>

                    </div>


                    <div class="distribution-chart">

                        ${similarityBands.map(
                            function (band) {

                                const percent =
                                    Math.max(
                                        5,
                                        Math.round(
                                            (band.count /
                                            maxBandCount) * 100
                                        )
                                    );

                                return `

                                    <div class="dist-row">

                                        <span>
                                            ${band.label}
                                        </span>

                                        <div class="dist-track">

                                            <i
                                                style="width:${percent}%"
                                            ></i>

                                        </div>

                                        <strong>
                                            ${band.count}
                                        </strong>

                                    </div>

                                `;

                            }
                        ).join("")}

                    </div>

                </section>



                <!-- Marking progress -->
                <section class="section-card analytics-card">

                    <div class="section-heading">

                        <div>

                            <span class="eyebrow">
                                REVIEW WORKLOAD
                            </span>

                            <h2 class="section-title">
                                Marking progress
                            </h2>

                            <p class="text-muted">
                                Quick view of reviewed and pending work.
                            </p>

                        </div>

                    </div>


                    <div class="review-progress-card">

                        <div
                            class="progress-ring-large purple"
                            style="--progress:${reviewRate * 3.6}deg"
                        >

                            <div>

                                <strong>
                                    ${reviewRate}%
                                </strong>

                                <span>
                                    complete
                                </span>

                            </div>

                        </div>


                        <div class="review-stats">

                            <div>

                                <strong>
                                    ${markedSubmissions.length}
                                </strong>

                                <span>
                                    Marked
                                </span>

                            </div>


                            <div>

                                <strong>
                                    ${pendingSubmissions}
                                </strong>

                                <span>
                                    Pending
                                </span>

                            </div>


                            <div>

                                <strong>
                                    ${flaggedSubmissions.length}
                                </strong>

                                <span>
                                    Flagged
                                </span>

                            </div>

                        </div>

                    </div>

                </section>

            </div>



            <!-- Priority and recent submissions -->
            <div class="dashboard-grid premium-dashboard-grid">


                <!-- Highest similarity -->
                <section class="section-card">

                    <div class="section-heading">

                        <div>

                            <span class="eyebrow">
                                PRIORITY QUEUE
                            </span>

                            <h2 class="section-title">
                                Highest similarity cases
                            </h2>

                            <p class="text-muted">
                                Start with submissions that need closer review.
                            </p>

                        </div>


                        <a
                            class="btn btn-secondary btn-sm"
                            href="reports.html"
                        >
                            All reports
                        </a>

                    </div>


                    <div class="priority-list">

                        ${
                            prioritySubmissions.length > 0

                                ?

                                prioritySubmissions.map(
                                    function (submission, index) {

                                        const assignment =
                                            assignments.find(
                                                function (item) {
                                                    return (
                                                        item.id ===
                                                        submission.assignmentId
                                                    );
                                                }
                                            );


                                        return `

                                            <article class="priority-item">

                                                <div class="priority-rank">
                                                    ${index + 1}
                                                </div>


                                                <div class="priority-main">

                                                    <strong>
                                                        ${PG.escapeHtml(
                                                            submission.studentName
                                                        )}
                                                    </strong>

                                                    <small>
                                                        ${PG.escapeHtml(
                                                            assignment?.title ||
                                                            "Assignment"
                                                        )}

                                                        ·

                                                        ${PG.formatDate(
                                                            submission.submittedAt
                                                        )}
                                                    </small>

                                                </div>


                                                <div class="priority-score">

                                                    <strong>
                                                        ${Number(
                                                            submission.maxSimilarity ||
                                                            0
                                                        ).toFixed(1)}%
                                                    </strong>

                                                    <span>
                                                        similarity
                                                    </span>

                                                </div>

                                            </article>

                                        `;

                                    }
                                ).join("")

                                :

                                `
                                    <div class="empty-state">

                                        <div>
                                            ✓
                                        </div>

                                        <strong>
                                            No flagged submissions
                                        </strong>

                                        <p>
                                            Nothing is currently above the
                                            review threshold.
                                        </p>

                                    </div>
                                `
                        }

                    </div>

                </section>



                <!-- Recent submissions -->
                <section class="section-card">

                    <div class="section-heading">

                        <div>

                            <span class="eyebrow">
                                RECENT ACTIVITY
                            </span>

                            <h2 class="section-title">
                                Latest submissions
                            </h2>

                            <p class="text-muted">
                                Recent student activity.
                            </p>

                        </div>


                        <a
                            class="btn btn-secondary btn-sm"
                            href="assignments.html"
                        >
                            Manage
                        </a>

                    </div>


                    <div class="activity-list compact">

                        ${
                            recentSubmissions.length > 0

                                ?

                                recentSubmissions.map(
                                    function (submission) {

                                        const assignment =
                                            assignments.find(
                                                function (item) {

                                                    return (
                                                        item.id ===
                                                        submission.assignmentId
                                                    );

                                                }
                                            );


                                        let result;


                                        if (
                                            submission.marks === null ||
                                            submission.marks === undefined
                                        ) {

                                            result =
                                                badge(
                                                    "Pending",
                                                    "review"
                                                );

                                        } else {

                                            result = `
                                                <strong>
                                                    ${submission.marks}/${assignment?.maxMarks ?? 10}
                                                </strong>
                                            `;

                                        }


                                        return `

                                            <article class="activity-item">

                                                <div
                                                    class="activity-dot ${
                                                        submission.flagged
                                                            ? "dot-danger"
                                                            : "dot-safe"
                                                    }"
                                                ></div>


                                                <div class="activity-main">

                                                    <strong>
                                                        ${PG.escapeHtml(
                                                            submission.studentName
                                                        )}
                                                    </strong>

                                                    <small>

                                                        ${PG.escapeHtml(
                                                            assignment?.title ||
                                                            "Assignment"
                                                        )}

                                                        ·

                                                        ${PG.formatDate(
                                                            submission.submittedAt
                                                        )}

                                                    </small>

                                                </div>


                                                <div>
                                                    ${result}
                                                </div>

                                            </article>

                                        `;

                                    }
                                ).join("")

                                :

                                `
                                    <div class="empty-state">

                                        <div>
                                            ◎
                                        </div>

                                        <strong>
                                            No submissions yet
                                        </strong>

                                        <p>
                                            Published assignments will appear
                                            here when students submit.
                                        </p>

                                    </div>
                                `
                        }

                    </div>

                </section>

            </div>



            <!-- Assignment statistics -->
            <section class="section-card">

                <div class="section-heading">

                    <div>

                        <span class="eyebrow">
                            ASSIGNMENT HEALTH
                        </span>

                        <h2 class="section-title">
                            Coursework snapshot
                        </h2>

                        <p class="text-muted">
                            Submission count and average marks for each assignment.
                        </p>

                    </div>


                    <a
                        class="btn btn-secondary btn-sm"
                        href="assignments.html"
                    >
                        Manage assignments
                    </a>

                </div>


                <div class="assignment-health-grid">

                    ${
                        assignmentStats.length > 0

                            ?

                            assignmentStats.map(
                                function (assignment) {

                                    let progress = 0;


                                    if (students.length > 0) {

                                        progress =
                                            (
                                                assignment.count /
                                                students.length
                                            ) * 100;

                                    }


                                    progress =
                                        Math.min(
                                            100,
                                            progress
                                        );


                                    const averageText =
                                        assignment.count > 0
                                            ? `${assignment.averageMarks.toFixed(1)} / ${assignment.maxMarks}`
                                            : "—";


                                    return `

                                        <article class="health-card">

                                            <div class="health-top">

                                                <div>

                                                    <strong>
                                                        ${PG.escapeHtml(
                                                            assignment.title
                                                        )}
                                                    </strong>

                                                    <small>
                                                        ${PG.escapeHtml(
                                                            assignment.course
                                                        )}
                                                    </small>

                                                </div>


                                                <span>
                                                    ${assignment.count}
                                                    submitted
                                                </span>

                                            </div>


                                            <div class="health-bar">

                                                <span
                                                    style="width:${progress}%"
                                                ></span>

                                            </div>


                                            <div class="health-meta">

                                                <span>
                                                    Avg. marks
                                                </span>

                                                <strong>
                                                    ${averageText}
                                                </strong>

                                            </div>

                                        </article>

                                    `;

                                }
                            ).join("")

                            :

                            `
                                <div class="empty-state">

                                    <div>
                                        ◎
                                    </div>

                                    <strong>
                                        No assignments yet
                                    </strong>

                                    <p>
                                        Create an assignment to see statistics here.
                                    </p>

                                </div>
                            `
                    }

                </div>

            </section>
        `
    });
}


// Start the instructor dashboard
renderInstructorDashboard();