
(async function () {
    const instructor = PG.requireRole("instructor");
    if (!instructor) return;

    const isBackend = Boolean(PG.getAuthToken());

    let assignments = [];
    let submissions = [];

    async function loadData() {
        if (isBackend) {
            assignments = await PG.getBackendAssignments();

            const results = await Promise.all(
                assignments.map(async assignment => {
                    try {
                        const id = assignment._id || assignment.id;
                        const response = await PG.apiRequest(
                            `/submissions/assignment/${encodeURIComponent(id)}`
                        );

                        return response.submissions || response.data || [];
                    } catch (error) {
                        console.error("Could not load submissions:", error);
                        return [];
                    }
                })
            );

            submissions = results.flat().map(s => ({
                ...s,
                id: s._id || s.id,
                studentId: s.student?._id || s.student?.id || s.student,
                studentName: s.student?.name || s.studentName || "Student",
                assignmentId: s.assignment?._id || s.assignment?.id || s.assignment,
                assignmentTitle:
                    s.assignment?.title || s.assignmentTitle || "Assignment",
                wordCount: s.wordCount ?? PG.tokenize(s.text || "").length,
                maxSimilarity: s.maxSimilarity ?? 0,
                flagged: s.flagged ?? s.status === "flagged",
                marks: s.marks ?? s.grade ?? null,
                feedback: s.feedback || "",
                submittedAt: s.createdAt || s.submittedAt,
                matchingNgrams: s.matchingNGrams || s.matchingNgrams || []
            }));
        } else {
            assignments = PG.getAssignments();
            submissions = PG.getInstructorSubmissions();
        }
    }

    function findAssignment(id) {
        return assignments.find(a =>
            String(a._id || a.id) === String(id)
        );
    }

    async function render() {
        try {
            await loadData();
        } catch (error) {
            console.error("Failed to load instructor data:", error);
            showToast(error.message || "Unable to load instructor data.", "error");
            return;
        }

        pgLayout({
            active: "assignments",
            role: "instructor",
            title: "Assignments & Submissions",
            subtitle: "Create assignments, review student work and manage marks.",
            content: `
                <div class="management-grid">
                    <section class="section-card" id="new-assignment">
                        <div class="section-heading">
                            <div>
                                <h2 class="section-title">Create New Assignment</h2>
                                <p class="text-muted">New assignments appear in student accounts.</p>
                            </div>
                            <span class="badge badge-success">Instructor only</span>
                        </div>

                        <form id="create-assignment-form" class="stack-form">
                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label class="form-label" for="a-title">Assignment title</label>
                                    <input id="a-title" class="form-input" required placeholder="e.g. ES6 Features">
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="a-course">Course / module</label>
                                    <input id="a-course" class="form-input" required placeholder="e.g. JavaScript Programming">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="a-description">Instructions</label>
                                <textarea id="a-description" class="form-textarea" rows="4" required placeholder="Explain what students should submit..."></textarea>
                            </div>

                            <div class="form-grid-2">
                                <div class="form-group">
                                    <label class="form-label" for="a-due">Due date</label>
                                    <input id="a-due" class="form-input" type="date" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="a-marks">Maximum marks</label>
                                    <input id="a-marks" class="form-input" type="number" min="1" max="1000" value="10" required>
                                </div>
                            </div>

                            <div id="create-assignment-error" class="auth-error"></div>
                            <div>
                                <button class="btn btn-primary" type="submit">＋ Publish Assignment</button>
                            </div>
                        </form>
                    </section>

                    <section class="section-card">
                        <div class="section-heading">
                            <div>
                                <h2 class="section-title">Published Assignments</h2>
                                <p class="text-muted">${assignments.length} available assignment${assignments.length === 1 ? "" : "s"}</p>
                            </div>
                        </div>

                        <div class="assignment-toolbar compact-toolbar">
                            <div>
                                <span class="eyebrow">PUBLISHED WORK</span>
                                <strong>Manage the assignment cycle</strong>
                                <small>Search assignments.</small>
                            </div>
                            <input id="assignment-search" class="form-input search-input" type="search" placeholder="Search assignments...">
                        </div>

                        <div class="assignment-admin-list" id="assignment-admin-list">
                            ${assignments.map(a => {
                                const id = a._id || a.id;
                                const course = a.course || "";
                                const dueDate = a.dueDate
                                    ? String(a.dueDate).slice(0, 10)
                                    : "";

                                return `
                                    <article class="admin-assignment-card"
                                        data-assignment-search="${PG.escapeHtml(`${a.title} ${course} ${a.description || ""}`.toLowerCase())}">
                                        <div>
                                            <span class="eyebrow">${PG.escapeHtml(course)}</span>
                                            <h3>${PG.escapeHtml(a.title)}</h3>
                                            <p>${PG.escapeHtml(a.description || "")}</p>
                                        </div>
                                        <div class="admin-assignment-meta">
                                            <span class="deadline-badge ${PG.deadlineState(dueDate)}">${PG.daysUntil(dueDate)}</span>
                                            <span>Due ${PG.formatDate(dueDate)}</span>
                                            <strong>${a.maxMarks ?? 100} marks</strong>
                                            <div class="admin-card-actions">
                                                <button class="btn btn-secondary btn-sm edit-assignment-btn" data-id="${PG.escapeHtml(id)}">Edit</button>
                                                <button class="btn btn-danger btn-sm delete-assignment-btn" data-id="${PG.escapeHtml(id)}">Delete</button>
                                            </div>
                                        </div>
                                    </article>
                                `;
                            }).join("")}
                        </div>
                    </section>
                </div>

                <section class="section-card" style="margin-top:1rem">
                    <div class="section-heading">
                        <div>
                            <h2 class="section-title">Student Submissions</h2>
                            <p class="text-muted">Review submissions, similarity results and marking status.</p>
                        </div>
                        <div class="filter-group">
                            <select id="assignment-filter" class="form-input form-input-sm">
                                <option value="all">All assignments</option>
                                ${assignments.map(a => `
                                    <option value="${PG.escapeHtml(a._id || a.id)}">${PG.escapeHtml(a.title)}</option>
                                `).join("")}
                            </select>
                            <label><input type="checkbox" id="flag-filter"> Flagged only</label>
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
        });

        bindEvents();
        updateRows();
    }

    function updateRows() {
        const selected = document.getElementById("assignment-filter").value;
        const flaggedOnly = document.getElementById("flag-filter").checked;

        const rows = submissions
            .filter(s =>
                (selected === "all" || String(s.assignmentId) === String(selected)) &&
                (!flaggedOnly || s.flagged)
            )
            .map(s => {
                const assignment = findAssignment(s.assignmentId);
                const maxMarks = assignment?.maxMarks ?? 100;
                const status = String(s.status || "submitted");

                const displayStatus =
                    status === "graded" ? "Marked" :
                    status === "flagged" ? "Flagged" :
                    status === "submitted" || status === "analyzed" ? "Submitted" :
                    status;

                return `
                    <tr>
                        <td><strong>${PG.escapeHtml(s.studentName || "Student")}</strong></td>
                        <td>${PG.escapeHtml(assignment?.title || s.assignmentTitle || "Assignment")}</td>
                        <td>${Number(s.wordCount || 0)}</td>
                        <td>
                            ${similarityBadge(Number(s.maxSimilarity || 0))}
                            ${s.topMatch?.student?.name
                                ? `<div class="table-sub">Top match: ${PG.escapeHtml(s.topMatch.student.name)}</div>`
                                : ""}
                        </td>
                        <td>${badge(displayStatus, s.flagged ? "danger" : displayStatus === "Marked" ? "success" : "review")}</td>
                        <td>${s.marks == null ? "Pending" : `${s.marks}/${maxMarks}`}</td>
                        <td><button class="btn btn-primary btn-sm review-btn" data-id="${PG.escapeHtml(s.id)}">Review & Mark</button></td>
                    </tr>
                `;
            }).join("");

        document.getElementById("submission-rows").innerHTML = rows ||
            `<tr><td colspan="7"><div class="empty-state"><div>◌</div><p>No submissions match this filter.</p></div></td></tr>`;

        document.querySelectorAll(".review-btn").forEach(button => {
            button.addEventListener("click", () => openReview(button.dataset.id));
        });
    }

    function bindEvents() {
        document.getElementById("create-assignment-form").addEventListener("submit", async event => {
            event.preventDefault();

            const error = document.getElementById("create-assignment-error");
            error.textContent = "";

            try {
                const data = {
                    title: document.getElementById("a-title").value.trim(),
                    course: document.getElementById("a-course").value.trim(),
                    description: document.getElementById("a-description").value.trim(),
                    dueDate: document.getElementById("a-due").value,
                    maxMarks: Number(document.getElementById("a-marks").value)
                };

                const assignment = isBackend
                    ? await PG.createBackendAssignment(data)
                    : PG.createAssignment(data);

                showToast(`"${assignment.title}" is now available to students.`, "success");
                await render();
            } catch (err) {
                error.textContent = err.message;
            }
        });

        document.getElementById("assignment-filter").addEventListener("change", updateRows);
        document.getElementById("flag-filter").addEventListener("change", updateRows);

        document.getElementById("assignment-search").addEventListener("input", event => {
            const query = event.target.value.trim().toLowerCase();

            document.querySelectorAll("#assignment-admin-list .admin-assignment-card").forEach(card => {
                card.hidden = Boolean(query) &&
                    !card.dataset.assignmentSearch.includes(query);
            });
        });

        document.querySelectorAll(".edit-assignment-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const assignment = findAssignment(button.dataset.id);
                if (!assignment) return;

                const title = prompt("Assignment title", assignment.title);
                if (title === null) return;

                const course = prompt("Course / module", assignment.course || "");
                if (course === null) return;

                const description = prompt("Instructions", assignment.description || "");
                if (description === null) return;

                const dueDate = prompt(
                    "Due date (YYYY-MM-DD)",
                    String(assignment.dueDate || "").slice(0, 10)
                );
                if (dueDate === null) return;

                const marks = prompt("Maximum marks", assignment.maxMarks);
                if (marks === null) return;

                try {
                    await PG.updateAssignment(assignment._id || assignment.id, {
                        title: title.trim(),
                        course: course.trim(),
                        description: description.trim(),
                        dueDate: dueDate.trim(),
                        maxMarks: Number(marks)
                    });

                    await render();
                    showToast("Assignment updated.", "success");
                } catch (error) {
                    showToast(error.message, "error");
                }
            });
        });

        document.querySelectorAll(".delete-assignment-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const assignment = findAssignment(button.dataset.id);

                if (!assignment ||
                    !confirm(`Delete "${assignment.title}"?`)) {
                    return;
                }

                try {
                    await PG.deleteAssignment(assignment._id || assignment.id);
                    await render();
                    showToast("Assignment deleted.", "success");
                } catch (error) {
                    showToast(error.message, "error");
                }
            });
        });
    }

    async function openReview(id) {
        let submission = submissions.find(s => String(s.id) === String(id));

        if (!submission) {
            showToast("Submission not found. Refresh the page and try again.", "error");
            return;
        }

        if (isBackend) {
            try {
                const result = await PG.apiRequest(
                    `/submissions/${encodeURIComponent(id)}`
                );

                if (!result.submission) {
                    throw new Error("The server did not return the submission.");
                }

                const fullSubmission = result.submission;

                submission = {
                    ...submission,
                    ...fullSubmission,
                    id: fullSubmission._id || fullSubmission.id,
                    studentName:
                        fullSubmission.student?.name ||
                        submission.studentName ||
                        "Student",
                    assignmentId:
                        fullSubmission.assignment?._id ||
                        fullSubmission.assignment?.id ||
                        submission.assignmentId,
                    assignmentTitle:
                        fullSubmission.assignment?.title ||
                        submission.assignmentTitle ||
                        "Assignment",
                    submittedAt:
                        fullSubmission.createdAt || submission.submittedAt,
                    matchingNgrams:
                        fullSubmission.matchingNGrams ||
                        fullSubmission.matchingNgrams ||
                        [],
                    text: fullSubmission.text || ""
                };
            } catch (error) {
                showToast(error.message || "Unable to load submission.", "error");
                return;
            }
        }

        const assignment = findAssignment(submission.assignmentId);
        const maxMarks = assignment?.maxMarks ?? 100;

        const wrap = document.createElement("div");
        wrap.className = "modal-backdrop";

        wrap.innerHTML = `
            <div class="modal-card">
                <button class="modal-close" type="button">×</button>

                <div class="modal-header">
                    <div>
                        <span class="eyebrow">SUBMISSION REVIEW</span>
                        <h2>${PG.escapeHtml(assignment?.title || submission.assignmentTitle || "Submission")}</h2>
                        <p class="text-muted">${PG.escapeHtml(submission.studentName || "Student")} · ${PG.formatDate(submission.submittedAt)}</p>
                    </div>
                    <div>${similarityBadge(Number(submission.maxSimilarity || 0))}</div>
                </div>

                <div class="review-grid">
                    <div>
                        <h3>Student submission</h3>
                        <pre class="submission-preview">${PG.escapeHtml(submission.text || "")}</pre>
                    </div>

                    <div>
                        <h3>Instructor marking</h3>
                        <form id="mark-form" class="stack-form">
                            <div class="form-group">
                                <label class="form-label" for="marks">Marks / ${maxMarks}</label>
                                <input
                                    class="form-input"
                                    id="marks"
                                    type="number"
                                    min="0"
                                    max="${maxMarks}"
                                    step="0.5"
                                    value="${submission.marks ?? ""}"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="feedback">Feedback</label>
                                <textarea
                                    class="form-textarea"
                                    id="feedback"
                                    rows="5"
                                    placeholder="Write feedback for the student..."
                                >${PG.escapeHtml(submission.feedback || "")}</textarea>
                            </div>

                            <div id="mark-error" class="auth-error"></div>
                            <button class="btn btn-primary" type="submit">Save Mark</button>
                        </form>
                    </div>
                </div>

                ${submission.matchingNgrams?.length ? `
                    <div class="match-panel">
                        <strong>Matching n-grams</strong>
                        <div class="ngram-list">
                            ${submission.matchingNgrams.map(gram =>
                                `<span class="ngram-tag">${PG.escapeHtml(gram)}</span>`
                            ).join("")}
                        </div>
                    </div>
                ` : ""}
            </div>
        `;

        document.body.appendChild(wrap);

        wrap.querySelector(".modal-close").addEventListener("click", () => wrap.remove());

        wrap.addEventListener("click", event => {
            if (event.target === wrap) wrap.remove();
        });

        wrap.querySelector("#mark-form").addEventListener("submit", async event => {
            event.preventDefault();

            const error = wrap.querySelector("#mark-error");
            error.textContent = "";

            const marks = Number(wrap.querySelector("#marks").value);
            const feedback = wrap.querySelector("#feedback").value.trim();

            if (!Number.isFinite(marks) || marks < 0 || marks > maxMarks) {
                error.textContent = "Marks must be inside the assignment range.";
                return;
            }

            try {
                if (isBackend) {
                    await PG.apiRequest(
                        `/submissions/${encodeURIComponent(submission.id)}/grade`,
                        {
                            method: "PATCH",
                            body: JSON.stringify({ marks, feedback })
                        }
                    );
                } else {
                    PG.markSubmission(
                        submission.id,
                        marks,
                        feedback,
                        "Marked"
                    );
                }

                wrap.remove();
                showToast("Mark saved successfully.", "success");
                await render();
            } catch (err) {
                error.textContent = err.message;
            }
        });
    }

    await render();
})();
