
(async function () {
    const user = PG.requireRole("student");
    if (!user) return;

    const errorBoxId = "submission-error";

    let assignments = [];
    const backendMode = Boolean(PG.getAuthToken());

    try {
        assignments = backendMode
            ? await PG.getBackendAssignments()
            : PG.getAssignments();
    } catch (error) {
        console.error("Unable to load assignments:", error);
        assignments = [];
    }

    const params = new URLSearchParams(window.location.search);
    const requestedAssignment = params.get("assignment");

    const requested = assignments.find(
        a => String(a._id || a.id) === requestedAssignment
    );

    const preselected =
        requested?._id ||
        requested?.id ||
        assignments[0]?._id ||
        assignments[0]?.id ||
        "";

    pgLayout({
        active: "upload",
        role: "student",
        title: "Upload Assignment",
        subtitle: "Type your assignment or load a local text file. Submit your work for backend processing.",
        content: `
            <div class="dashboard-grid">
                <section class="section-card">
                    <form id="submission-form" class="stack-form">
                        <div class="form-group">
                            <label class="form-label" for="assignment">
                                Assignment
                            </label>

                            <select id="assignment" class="form-input" required>
                                ${
                                    assignments.length
                                        ? assignments.map(a => {
                                            const id = a._id || a.id;
                                            const course = a.course || "Assignment";

                                            return `
                                                <option
                                                    value="${PG.escapeHtml(id)}"
                                                    ${String(id) === String(preselected) ? "selected" : ""}
                                                >
                                                    ${PG.escapeHtml(a.title)} — ${PG.escapeHtml(course)}
                                                </option>
                                            `;
                                        }).join("")
                                        : `
                                            <option value="">
                                                No published assignments available
                                            </option>
                                        `
                                }
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="file">
                                Load text file (optional)
                            </label>

                            <input
                                id="file"
                                class="form-input"
                                type="file"
                                accept=".txt,.md,.js,.html,.css,.json"
                            >
                        </div>

                        <div class="form-group">
                            <div class="label-row">
                                <label class="form-label" for="text">
                                    Submission text
                                </label>

                                <span id="word-count" class="text-muted">
                                    0 words
                                </span>
                            </div>

                            <textarea
                                id="text"
                                class="form-textarea"
                                rows="15"
                                placeholder="Paste or type your assignment here..."
                                required
                            ></textarea>
                        </div>

                        <div class="upload-rule">
                            <strong>
                                Minimum words: ${PG.getSettings().minimumWords}
                            </strong>

                            <span>
                                Plagiarism check: ${PG.getSettings().ngramSize}-gram + Jaccard
                            </span>
                        </div>

                        <div
                            id="${errorBoxId}"
                            class="auth-error"
                            role="alert"
                        ></div>

                        <button
                            class="btn btn-primary"
                            type="submit"
                            ${assignments.length ? "" : "disabled"}
                        >
                            Submit & Analyze
                        </button>
                    </form>
                </section>

                <aside class="section-card">
                    <h2 class="section-title">Your latest submission</h2>
                    <div id="latest-box"></div>
                </aside>
            </div>
        `
    });

    const form = document.getElementById("submission-form");
    const textArea = document.getElementById("text");
    const fileInput = document.getElementById("file");
    const assignmentSelect = document.getElementById("assignment");
    const errorBox = document.getElementById(errorBoxId);
    const submitButton = form.querySelector('button[type="submit"]');
    const latestBox = document.getElementById("latest-box");

    function updateWordCount() {
        const count = PG.tokenize(textArea.value).length;

        document.getElementById("word-count").textContent =
            `${count} words`;
    }

    function getSubmissionAssignmentId(submission) {
        const assignment = submission.assignment;

        if (assignment && typeof assignment === "object") {
            return String(assignment._id || assignment.id || "");
        }

        return String(submission.assignmentId || assignment || "");
    }

    function renderSubmission(submission) {
        if (!submission) {
            latestBox.innerHTML = `
                <div class="empty-state">
                    <div>📄</div>
                    <p>No submission for this assignment yet.</p>
                </div>
            `;
            return;
        }

        const similarity = Number(submission.maxSimilarity || 0);
        const flagged = Boolean(submission.flagged);
        const marks = submission.marks;
        const feedback = submission.feedback || "";
        const status = submission.status || (
            flagged ? "flagged" : "submitted"
        );

        const statusLabel = {
            submitted: "Submitted",
            flagged: "Flagged for instructor review",
            graded: "Graded"
        };

        const statusType = {
            submitted: "success",
            flagged: "danger",
            graded: "success"
        };

        latestBox.innerHTML = `
            <div class="score-ring">
                <strong>${similarity.toFixed(1)}%</strong>
                <span>max similarity</span>
            </div>

            <p>
                ${badge(
                    statusLabel[status] || status,
                    statusType[status] || "success"
                )}
            </p>

            <p class="text-muted">
                Submitted ${PG.formatDate(
                    submission.submittedAt || submission.createdAt
                )}
            </p>

            <p>
                ${
                    marks == null
                        ? "Marks are waiting for the instructor."
                        : `<strong>Score:</strong> ${PG.escapeHtml(marks)}`
                }
            </p>

            ${
                feedback
                    ? `
                        <div class="feedback">
                            <strong>Instructor feedback</strong>
                            <p>${PG.escapeHtml(feedback)}</p>
                        </div>
                    `
                    : ""
            }
        `;
    }

    async function showLatest() {
        const assignmentId = String(assignmentSelect.value || "");

        if (!assignmentId) {
            latestBox.innerHTML = `
                <div class="empty-state">
                    <p>Please select an assignment first.</p>
                </div>
            `;
            return;
        }

        if (!backendMode) {
            const submission = PG.getStudentSubmissions(user.id).find(
                s => String(s.assignmentId) === assignmentId
            );

            renderSubmission(submission);
            return;
        }

        latestBox.innerHTML = `
            <div class="empty-state">
                <p>Loading your latest submission...</p>
            </div>
        `;

        try {
            const result = await PG.apiRequest("/submissions/my");

            const allSubmissions = Array.isArray(result.submissions)
                ? result.submissions
                : [];

            const submission = allSubmissions.find(
                s => getSubmissionAssignmentId(s) === assignmentId
            );

            renderSubmission(submission);
        } catch (error) {
            console.error("Unable to load your submissions:", error);

            latestBox.innerHTML = `
                <div class="empty-state">
                    <p>Unable to load your latest submission.</p>
                    <p class="text-muted">
                        Your submission may still be saved. Please refresh
                        or try again later.
                    </p>
                </div>
            `;
        }
    }

    assignmentSelect.addEventListener("change", showLatest);

    textArea.addEventListener("input", updateWordCount);

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];

        if (!file) return;

        errorBox.textContent = "";

        try {
            textArea.value = await file.text();
            updateWordCount();
        } catch (error) {
            console.error("Unable to read file:", error);
            errorBox.textContent = "Unable to read this file.";
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        errorBox.textContent = "";

        if (!assignmentSelect.value) {
            errorBox.textContent =
                "Please select a published assignment.";
            return;
        }

        if (!textArea.value.trim()) {
            errorBox.textContent =
                "Please enter your assignment text.";
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        try {
            const saved = await PG.saveSubmission({
                assignmentId: assignmentSelect.value,
                text: textArea.value,
                filename: fileInput.files[0]?.name ||
                    "typed-submission.txt"
            });

            showToast("Assignment submitted successfully.", "success");

            if (saved && saved.text) {
                textArea.value = saved.text;
            }

            if (backendMode) {
                await showLatest();
            } else {
                showLatest();
            }

            updateWordCount();
        } catch (error) {
            console.error("Submission failed:", error);

            errorBox.textContent =
                error.message ||
                "Submission failed. Please try again.";
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit & Analyze";
        }
    });

    await showLatest();
    updateWordCount();
})();
