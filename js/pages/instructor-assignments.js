// Only instructor can open this page
const instructor = PG.requireRole("instructor");

if (!instructor) {
    throw new Error("Unauthorized");
}

function render() {

    const assignments = PG.getAssignments();

    pgLayout({
        active: "assignments",
        role: "instructor",
        title: "Assignments & Submissions",
        subtitle:
            "Create assignments, check student work, and give marks and feedback.",

        content: `
            <div class="management-grid">

                <!-- Create Assignment -->
                <section class="section-card" id="new-assignment">

                    <div class="section-heading">
                        <div>
                            <h2 class="section-title">
                                Create New Assignment
                            </h2>

                            <p class="text-muted">
                                New assignments will be visible to students.
                            </p>
                        </div>

                        <span class="badge badge-success">
                            Instructor only
                        </span>
                    </div>
                <form id="create-assignment-form" class="stack-form">

                        <div class="form-grid-2">

                            <div class="form-group">
                                <label class="form-label" for="a-title">
                                    Assignment title
                                </label>

                                <input
                                    id="a-title"
                                    class="form-input"
                                    type="text"
                                    required
                                    placeholder="e.g. ES6 Features">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="a-course">
                                    Course / module
                                </label>

                                <input
                                    id="a-course"
                                    class="form-input"
                                    type="text"
                                    required
                                    placeholder="e.g. JavaScript Programming">
                            </div>

                        </div>
                      <div class="form-group">

                            <label class="form-label" for="a-description">
                                Instructions
                            </label>

                            <textarea
                                id="a-description"
                                class="form-textarea"
                                rows="4"
                                required
                                placeholder="Explain what students should submit..."></textarea>

                        </div>
                        <div class="form-grid-2">
                        <div class="form-group">
                          <label class="form-label" for="a-due">
                                    Due date
                                </label>
                                <input
                                    id="a-due"
                                    class="form-input"
                                    type="date"
                                    required>
                                    </div>
         <div class="form-group">

                                <label class="form-label" for="a-marks">
                                    Maximum marks
                                </label>

                                <input
                                    id="a-marks"
                                    class="form-input"
                                    type="number"
                                    min="1"
                                    max="1000"
                                    value="10"
                                    required>
                                    </div>

                        </div>
 <div
        id="create-assignment-error"
                            class="auth-error"></div>
                       <button
                            class="btn btn-primary"
                            type="submit">
                            ＋ Publish Assignment
                        </button>

                    </form>

                </section>
                
                <!-- Published Assignments -->
                <section class="section-card">

                    <div class="section-heading">

                        <div>
                            <h2 class="section-title">
                                Published Assignments
                            </h2>

                            <p class="text-muted">
                                ${assignments.length}
                                available assignment${assignments.length === 1 ? "" : "s"}
                            </p>
                        </div>

                    </div>
                   
                    <div class="assignment-toolbar compact-toolbar">

                        <div>
                            <span class="eyebrow">
                                PUBLISHED WORK
                            </span>

                            <strong>
                                Manage assignments
                            </strong>

                            <small>
                                Search, edit or delete assignments.
                            </small>
                        </div>

                        <input
                            id="assignment-search"
                            class="form-input search-input"
                            type="search"
                            placeholder="Search assignments..."
                        >

                    </div>
                    <div
                        class="assignment-admin-list"
                        id="assignment-admin-list"
                    >

                        ${
                            assignments.length
                                ? assignments.map(function (assignment) {

                                    const searchText =
                                        `${assignment.title}
                                        ${assignment.course}
                                        ${assignment.description}`
                                        .toLowerCase();

                                    return `
                                        <article
                                            class="admin-assignment-card"
                                            data-assignment-search="${PG.escapeHtml(searchText)}">
                                            
                                            <div>

                                                <span class="eyebrow">
                                                    ${PG.escapeHtml(
                                                        assignment.course
                                                    )}
                                                </span>

                                                <h3>
                                                    ${PG.escapeHtml(
                                                        assignment.title
                                                    )}
                                                </h3>

                                                <p>
                                                    ${PG.escapeHtml(
                                                        assignment.description
                                                    )}
                                                </p>

                                            </div>


                                            <div class="admin-assignment-meta">

                                                <span
                                                    class="deadline-badge ${PG.deadlineState(
                                                        assignment.dueDate
                                                    )}"
                                                >
                                                    ${PG.daysUntil(
                                                        assignment.dueDate
                                                    )}
                                                </span>


                                                <span>
                                                    Due
                                                    ${PG.formatDate(
                                                        assignment.dueDate
                                                    )}
                                                </span>


                                                <strong>
                                                    ${assignment.maxMarks} marks
                                                </strong>


                                                <div class="admin-card-actions">

                                                    <button
                                                        class="btn btn-secondary btn-sm edit-assignment-btn"
                                                        data-id="${assignment.id}"
                                                    >
                                                        Edit
                                                    </button>


                                                    <button
                                                        class="btn btn-danger btn-sm delete-assignment-btn"
                                                        data-id="${assignment.id}"
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

                                            </div>

                                        </article>
                                    `;

                                }).join("")
                                : `
                                    <div class="empty-state">

                                        <div>◌</div>

                                        <p>
                                            No assignments have been created yet.
                                        </p>

                                    </div>
                                `
                        }

                    </div>

                </section>

            </div>

<!-- Student Submissions -->
            <section
                class="section-card"
                style="margin-top: 1rem;"
            >

                <div class="section-heading">

                    <div>

                        <h2 class="section-title">
                            Student Submissions
                        </h2>

                        <p class="text-muted">
                            Review submissions, similarity results and marks.
                        </p>

                    </div>

                    <div class="filter-group">

                        <select
                            id="assignment-filter"
                            class="form-input form-input-sm"
                        >

                            <option value="all">
                                All assignments
                            </option>

                            ${assignments.map(function (assignment) {

                                return `
                                    <option value="${assignment.id}">
                                        ${PG.escapeHtml(
                                            assignment.title
                                        )}
                                    </option>
                                `;

                            }).join("")}

                        </select>

                        <label>

                            <input
                                type="checkbox"
                                id="flag-filter"
                            >

                            Flagged only

                        </label>

                    </div>

                </div>


                <div class="table-responsive">

                    <table class="data-table">

                        <thead>
                              <tr>
                                <th>Student</th>
                                <th>Assignment</th>
                                <th>Words</th>
                                <th>Similarity</th>
                                <th>Status</th>
                                <th>Marks</th>
                                <th></th>
                            </tr>

                        </thead>


                        <tbody id="submission-rows"></tbody>

                    </table>

                </div>

            </section>
        `
    })
    const createForm =
        document.getElementById("create-assignment-form");

    createForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const errorBox =
            document.getElementById("create-assignment-error");

        errorBox.textContent = "";


        try {

            const assignment = PG.createAssignment({

                title:
                    document.getElementById("a-title").value,

                course:
                    document.getElementById("a-course").value,

                description:
                    document.getElementById("a-description").value,

                dueDate:
                    document.getElementById("a-due").value,

                maxMarks:
                    document.getElementById("a-marks").value

            });


            showToast(
                `"${assignment.title}" is now available to students.`,
                "success"
            );


            render();

        } catch (error) {

            errorBox.textContent =
                error.message;

        }

    });

function updateRows() {

        const selectedAssignment =
            document.getElementById("assignment-filter").value;

        const flaggedOnly =
            document.getElementById("flag-filter").checked;


        const submissions =
            PG.getInstructorSubmissions();

        const allAssignments =
            PG.getAssignments();


        const filteredSubmissions =
            submissions.filter(function (submission) {

                const assignmentMatches =
                    selectedAssignment === "all" ||
                    submission.assignmentId === selectedAssignment;


                const flagMatches =
                    !flaggedOnly ||
                    submission.flagged;


                return (
                    assignmentMatches &&
                    flagMatches
                );

            });


        let rows = "";


        filteredSubmissions.forEach(function (submission) {

            const assignment =
                allAssignments.find(function (item) {

                    return (
                        item.id ===
                        submission.assignmentId
                    );

                });


            const user =
                PG.getUsers().find(function (item) {

                    return (
                        item.id ===
                        submission.studentId
                    );

                });


            let marks = "Pending";


            if (submission.marks !== null) {

                marks =
                    `${submission.marks}/${assignment?.maxMarks ?? 10}`;

            }


            let topMatch = "";


            if (submission.topMatchStudent) {

                topMatch = `
                    <div class="table-sub">
                        vs.
                        ${PG.escapeHtml(
                            submission.topMatchStudent
                        )}
                    </div>
                `;

            }
 rows += `

                <tr>

                    <td>

                        <strong>
                            ${PG.escapeHtml(
                                submission.studentName
                            )}
                        </strong>

                        <div class="table-sub">
                            ${PG.escapeHtml(
                                user?.studentId || ""
                            )}
                        </div>

                    </td>


                    <td>
                        ${PG.escapeHtml(
                            assignment?.title || ""
                        )}
                    </td>


                    <td>
                        ${submission.wordCount}
                    </td>


                    <td>

                        ${similarityBadge(
                            submission.maxSimilarity
                        )}

                        ${topMatch}

                    </td>


                    <td>

                        ${badge(
                            submission.status,
                            submission.status === "Marked"
                                ? "success"
                                : submission.flagged
                                ? "danger"
                                : "review"
                        )}

                    </td>


                    <td>
                        ${marks}
                    </td>


                    <td>

                        <button
                            class="btn btn-primary btn-sm review-btn"
                            data-id="${submission.id}"
                        >
                            Review & Mark
                        </button>

                    </td>

                </tr>
                `;

        });


        const tableBody =
            document.getElementById(
                "submission-rows"
            );


        if (rows === "") {

            tableBody.innerHTML = `

                <tr>

                    <td colspan="7">

                        <div class="empty-state">

                            <div>◌</div>

                            <p>
                                No submissions match this filter.
                            </p>

                        </div>

                    </td>

                </tr>

            `;

        } else {

            tableBody.innerHTML = rows;

        }


        // Add review button events
        document.querySelectorAll(".review-btn")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        openReview(
                            button.dataset.id
                        );

                    }
                );

            });

    }


    // First table load
    updateRows();


    // Change assignment filter
    document
        .getElementById("assignment-filter")
        .addEventListener(
            "change",
            updateRows
        );


    // Change flagged filter
    document
        .getElementById("flag-filter")
        .addEventListener(
            "change",
            updateRows
        );


    // Add search, edit and delete events
    bindAssignmentManagement();

}
function openReview(id) {

    const submission =
        PG.getSubmissions().find(function (item) {

            return item.id === id;

        });


    if (!submission) {
        return;
    }


    const assignment =
        PG.getAssignments().find(function (item) {

            return (
                item.id ===
                submission.assignmentId
            );

        });


    if (!assignment) {
        return;
    }


    const wrapper =
        document.createElement("div");

    wrapper.className =
        "modal-backdrop";


    let matchingNgrams = "";


    if (
        submission.matchingNgrams &&
        submission.matchingNgrams.length
    ) {

        matchingNgrams = `

            <div class="match-panel">

                <strong>
                    Matching n-grams
                </strong>


                <div class="ngram-list">

                    ${
                        submission.matchingNgrams
                            .map(function (item) {

                                return `
                                    <span class="ngram-tag">
                                        ${PG.escapeHtml(item)}
                                    </span>
                                `;

                            })
                            .join("")
                    }

                </div>


                ${
                    submission.topMatchStudent
                        ? `
                            <p class="text-muted">
                                Top match:
                                ${PG.escapeHtml(
                                    submission.topMatchStudent
                                )}
                            </p>
                        `
                        : ""
                }

            </div>

        `;

    }


    wrapper.innerHTML = `

        <div class="modal-card">

            <button class="modal-close">
                ×
            </button>


            <div class="modal-header">

                <div>

                    <span class="eyebrow">
                        SUBMISSION REVIEW
                    </span>

                    <h2>
                        ${PG.escapeHtml(
                            assignment.title
                        )}
                    </h2>

                    <p class="text-muted">

                        ${PG.escapeHtml(
                            submission.studentName
                        )}

                        ·

                        ${PG.formatDate(
                            submission.submittedAt
                        )}

                    </p>

                </div>


                <div>
                    ${similarityBadge(
                        submission.maxSimilarity
                    )}
                </div>

            </div>


            <div class="review-grid">

                <!-- Student submission -->
                <div>

                    <h3>
                        Student submission
                    </h3>

                    <pre class="submission-preview">
${PG.escapeHtml(submission.text)}
                    </pre>

                </div>


                <!-- Instructor marking -->
                <div>

                    <h3>
                        Instructor marking
                    </h3>


                    <form
                        id="mark-form"
                        class="stack-form"
                    >

                        <div class="form-group">

                            <label class="form-label">
                                Marks /
                                ${assignment.maxMarks ?? 10}
                            </label>


                            <input
                                class="form-input"
                                id="marks"
                                type="number"
                                min="0"
                                max="${assignment.maxMarks ?? 10}"
                                step="0.5"
                                value="${submission.marks ?? ""}"
                                required
                            >

                        </div>


                        <div class="form-group">

                            <label class="form-label">
                                Status
                            </label>


                            <select
                                class="form-input"
                                id="status"
                            >

                                <option
                                    ${
                                        submission.status ===
                                        "Marked"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Marked
                                </option>


                                <option
                                    ${
                                        submission.status ===
                                        "Needs Revision"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Needs Revision
                                </option>


                                <option
                                    ${
                                        submission.status ===
                                        "Approved"
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    Approved
                                </option>

                            </select>

                        </div>


                        <div class="form-group">

                            <label class="form-label">
                                Feedback
                            </label>


                            <textarea
                                class="form-textarea"
                                id="feedback"
                                rows="5"
                                placeholder="Write feedback for the student..."
                            >${PG.escapeHtml(
                                submission.feedback || ""
                            )}</textarea>

                        </div>


                        <div
                            id="mark-error"
                            class="auth-error"
                        ></div>


                        <button
                            class="btn btn-primary"
                            type="submit"
                        >
                            Save Mark
                        </button>

                    </form>

                </div>

            </div>


            ${matchingNgrams}

        </div>

    `;


    document.body.appendChild(wrapper);


    // Close button
    wrapper
        .querySelector(".modal-close")
        .addEventListener(
            "click",
            function () {

                wrapper.remove();

            }
        );


    // Click outside modal
    wrapper.addEventListener(
        "click",
        function (event) {

            if (event.target === wrapper) {

                wrapper.remove();

            }

        }
    );


    // Save marking
    wrapper
        .querySelector("#mark-form")
        .addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                const errorBox =
                    wrapper.querySelector(
                        "#mark-error"
                    );

                errorBox.textContent = "";


                try {

                    const marks =
                        Number(
                            wrapper.querySelector(
                                "#marks"
                            ).value
                        );


                    const maxMarks =
                        assignment.maxMarks ?? 10;


                    if (
                        marks < 0 ||
                        marks > maxMarks
                    ) {

                        throw new Error(
                            "Marks must be inside the assignment range."
                        );

                    }


                    PG.markSubmission(

                        id,

                        marks,

                        wrapper.querySelector(
                            "#feedback"
                        ).value,

                        wrapper.querySelector(
                            "#status"
                        ).value

                    );


                    wrapper.remove();


                    showToast(
                        "Mark saved successfully.",
                        "success"
                    );


                    render();

                } catch (error) {

                    errorBox.textContent =
                        error.message;

                }

            }
        );

}



// ----------------------------------------------------
// Search, edit and delete assignments
// ----------------------------------------------------
function bindAssignmentManagement() {

    const searchBox =
        document.getElementById(
            "assignment-search"
        );


    // Search
    if (searchBox) {

        searchBox.addEventListener(
            "input",
            function (event) {

                const searchValue =
                    event.target.value
                        .trim()
                        .toLowerCase();


                document
                    .querySelectorAll(
                        "#assignment-admin-list .admin-assignment-card"
                    )
                    .forEach(
                        function (card) {

                            const text =
                                card.dataset
                                    .assignmentSearch || "";


                            card.hidden =
                                searchValue !== "" &&
                                !text.includes(
                                    searchValue
                                );

                        }
                    );

            }
        );

    }


    // Delete
    document
        .querySelectorAll(
            ".delete-assignment-btn"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const assignment =
                            PG.getAssignments().find(
                                function (item) {

                                    return (
                                        item.id ===
                                        button.dataset.id
                                    );

                                }
                            );


                        if (!assignment) {
                            return;
                        }


                        const shouldDelete =
                            confirm(
                                `Delete "${assignment.title}"? Existing student submissions will remain as historical records.`
                            );


                        if (!shouldDelete) {
                            return;
                        }


                        PG.deleteAssignment(
                            assignment.id
                        );


                        render();


                        showToast(
                            "Assignment deleted.",
                            "success"
                        );

                    }
                );

            }
        );


    // Edit
    document
        .querySelectorAll(
            ".edit-assignment-btn"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const assignment =
                            PG.getAssignments().find(
                                function (item) {

                                    return (
                                        item.id ===
                                        button.dataset.id
                                    );

                                }
                            );


                        if (!assignment) {
                            return;
                        }


                        const title =
                            prompt(
                                "Assignment title",
                                assignment.title
                            );


                        if (title === null) {
                            return;
                        }


                        const course =
                            prompt(
                                "Course / module",
                                assignment.course
                            );


                        if (course === null) {
                            return;
                        }


                        const description =
                            prompt(
                                "Instructions",
                                assignment.description
                            );


                        if (description === null) {
                            return;
                        }


                        const dueDate =
                            prompt(
                                "Due date (YYYY-MM-DD)",
                                assignment.dueDate
                            );


                        if (dueDate === null) {
                            return;
                        }


                        const marks =
                            prompt(
                                "Maximum marks",
                                assignment.maxMarks
                            );


                        if (marks === null) {
                            return;
                        }


                        try {

                            PG.updateAssignment(
                                assignment.id,
                                {
                                    title:
                                        title.trim(),

                                    course:
                                        course.trim(),

                                    description:
                                        description.trim(),

                                    dueDate:
                                        dueDate.trim(),

                                    maxMarks:
                                        Number(marks)
                                }
                            );


                            render();


                            showToast(
                                "Assignment updated.",
                                "success"
                            );

                        } catch (error) {

                            showToast(
                                error.message,
                                "error"
                            );

                        }

                    }
                );

            }
        );

}


// Start the page
render();