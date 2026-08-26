const instructor = PG.requireRole("instructor");

if (!instructor) {
    throw new Error("Unauthorized");
}


// Make special characters safe before showing text in HTML
function regexEscape(value) {
    const specialChars = [
        "\\", ".", "*", "+", "?", "^", "$",
        "{", "}", "(", ")", "|", "[", "]"
    ];

    return Array.from(String(value))
        .map(function (char) {
            if (specialChars.includes(char)) {
                return "\\" + char;
            }

            return char;
        })
        .join("");
}


// Highlight matching words in the submission
function highlightMatchingText(text, matchingNgrams = []) {

    const source = String(text || "");

    const phrases = [...new Set(
        (matchingNgrams || [])
            .map(String)
            .filter(Boolean)
    )].slice(0, 30);

    const matches = [];


    phrases.forEach(function (phrase, phraseIndex) {

        const words = phrase
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);

        if (words.length === 0) {
            return;
        }


        const pattern = words
            .map(function (word) {
                return "\\b" + regexEscape(word) + "\\b";
            })
            .join("(?:[^A-Za-z0-9_]+)");

        const regex = new RegExp(pattern, "gi");

        let match;


        while ((match = regex.exec(source)) !== null) {

            if (match[0].length === 0) {
                regex.lastIndex += 1;
                continue;
            }


            matches.push({
                start: match.index,
                end: match.index + match[0].length,
                phrase: phrase,
                phraseIndex: phraseIndex
            });


            if (matches.length >= 180) {
                break;
            }
        }
    });


    if (matches.length === 0) {
        return PG.escapeHtml(source).replace(/\n/g, "<br>");
    }


    // Sort matches by their position
    matches.sort(function (a, b) {

        if (a.start !== b.start) {
            return a.start - b.start;
        }

        return (b.end - b.start) - (a.end - a.start);
    });


    // Remove overlapping matches
    const selectedMatches = [];
    let currentPosition = 0;


    matches.forEach(function (item) {

        if (item.start < currentPosition) {
            return;
        }

        selectedMatches.push(item);
        currentPosition = item.end;
    });


    // Create highlighted HTML
    let html = "";
    let position = 0;


    selectedMatches.forEach(function (item) {

        const normalText =
            source.slice(position, item.start);

        html += PG.escapeHtml(normalText)
            .replace(/\n/g, "<br>");


        const colorClass =
            "match-color-" + ((item.phraseIndex % 5) + 1);


        html += `
            <mark
                class="match-highlight ${colorClass}"
                title="Shared phrase: ${PG.escapeHtml(item.phrase)}"
            >
                ${PG.escapeHtml(
                    source.slice(item.start, item.end)
                ).replace(/\n/g, "<br>")}
            </mark>
        `;


        position = item.end;
    });


    html += PG.escapeHtml(
        source.slice(position)
    ).replace(/\n/g, "<br>");


    return html;
}


// Show matching phrases above the comparison
function renderMatchLegend(phrases) {

    if (!phrases || phrases.length === 0) {
        return `
            <span class="match-legend-empty">
                No overlapping phrases found.
            </span>
        `;
    }


    return phrases
        .slice(0, 8)
        .map(function (phrase, index) {

            const colorClass =
                "match-color-" + ((index % 5) + 1);

            return `
                <button
                    type="button"
                    class="match-legend-item ${colorClass}"
                    data-match-index="${index}"
                    title="Find this shared phrase"
                >
                    <span class="match-legend-dot"></span>
                    <span>
                        ${PG.escapeHtml(phrase)}
                    </span>
                </button>
            `;
        })
        .join("");
}


// Decide the color/status of a similarity score
function toneFor(value) {

    const threshold =
        PG.getSettings().similarityThreshold;

    const similarity =
        Number(value || 0);


    if (similarity >= threshold) {
        return "danger";
    }


    if (similarity >= threshold / 2) {
        return "watch";
    }


    return "safe";
}


// Build the similarity heatmap
function buildHeatmapRows(submissions) {

    const settings = PG.getSettings();


    const header = submissions
        .map(function (submission) {

            const shortName =
                submission.studentName.slice(0, 8);

            return `
                <th title="${PG.escapeHtml(submission.studentName)}">
                    ${PG.escapeHtml(shortName)}
                </th>
            `;
        })
        .join("");


    const body = submissions
        .map(function (row) {

            let cells = "";


            submissions.forEach(function (column) {

                // Same submission
                if (row.id === column.id) {
                    cells += `
                        <td class="heat-diag">—</td>
                    `;
                    return;
                }


                // Same student
                if (row.studentId === column.studentId) {
                    cells += `
                        <td class="heat-empty">—</td>
                    `;
                    return;
                }


                const result =
                    PG.compareTexts(
                        row.text,
                        column.text,
                        settings.ngramSize
                    );


                const similarity =
                    result.similarity;


                const intensity =
                    Math.max(
                        0,
                        Math.min(
                            1,
                            similarity / 100
                        )
                    );


                const tone =
                    toneFor(similarity);


                cells += `
                    <td
                        class="heat-cell tone-${tone}"
                        title="${PG.escapeHtml(row.studentName)}
                        ↔
                        ${PG.escapeHtml(column.studentName)}
                        : ${similarity.toFixed(1)}%"
                        style="--heat:${intensity}"
                    >
                        ${similarity.toFixed(0)}%
                    </td>
                `;
            });


            return `
                <tr>

                    <th title="${PG.escapeHtml(row.studentName)}">
                        ${PG.escapeHtml(
                            row.studentName.slice(0, 14)
                        )}
                    </th>

                    ${cells}

                </tr>
            `;
        })
        .join("");


    return `
        <div class="heatmap-shell">

            <div class="heatmap-toolbar">

                <span>
                    <strong>
                        Pairwise similarity matrix
                    </strong>

                    <small>
                        Each cell compares two different students.
                    </small>
                </span>


                <span class="heatmap-key">
                    <i></i> Low
                    <i></i> Medium
                    <i></i> High
                </span>

            </div>


            <div class="heatmap-wrap">

                <table class="heatmap">

                    <thead>

                        <tr>
                            <th>Student</th>
                            ${header}
                        </tr>

                    </thead>


                    <tbody>
                        ${body}
                    </tbody>

                </table>

            </div>

        </div>
    `;
}


// Open detailed comparison between two submissions
function openPairReport(submission) {

    const allSubmissions =
        PG.getSubmissions();

    const settings =
        PG.getSettings();


    const topSubmission =
        submission.topMatchSubmissionId
            ? allSubmissions.find(function (item) {
                return item.id === submission.topMatchSubmissionId;
            })
            : null;


    if (!topSubmission) {
        return;
    }


    const comparison =
        PG.compareTexts(
            submission.text,
            topSubmission.text,
            settings.ngramSize
        );


    const assignmentA =
        PG.getAssignments().find(function (assignment) {
            return assignment.id === submission.assignmentId;
        });


    const assignmentB =
        PG.getAssignments().find(function (assignment) {
            return assignment.id === topSubmission.assignmentId;
        });


    const modal =
        document.createElement("div");

    modal.className =
        "report-modal-backdrop";


    const tone =
        toneFor(comparison.similarity);


    const isFlagged =
        comparison.similarity >=
        settings.similarityThreshold;


    modal.innerHTML = `

        <div class="report-modal report-modal-instructor">

            <div class="report-modal-topbar">

                <div class="report-brand">

                    <span class="brand-icon">
                        🛡️
                    </span>

                    <div>
                        <strong>
                            PlagiGuard Pair Report
                        </strong>

                        <small>
                            ${PG.escapeHtml(
                                submission.studentName
                            )}

                            ↔

                            ${PG.escapeHtml(
                                topSubmission.studentName
                            )}
                        </small>
                    </div>

                </div>


                <div class="report-modal-actions">

                    <button
                        class="btn btn-secondary btn-sm"
                        id="print-report"
                    >
                        Print report
                    </button>


                    <button
                        class="report-close"
                        aria-label="Close"
                    >
                        ×
                    </button>

                </div>

            </div>


            <div class="report-modal-body">

                <!-- Report heading -->
                <section class="report-cover report-cover-pair">

                    <div class="report-cover-main">

                        <span class="eyebrow">
                            INSTRUCTOR REVIEW
                        </span>


                        <h2>

                            ${PG.escapeHtml(
                                assignmentA?.title ||
                                "Submission"
                            )}

                            vs

                            ${PG.escapeHtml(
                                topSubmission.studentName
                            )}

                        </h2>


                        <p>

                            ${PG.escapeHtml(
                                submission.studentName
                            )}

                            ·

                            ${PG.escapeHtml(
                                topSubmission.studentName
                            )}

                            ·

                            ${settings.ngramSize}-gram Jaccard

                        </p>

                    </div>


                    <div
                        class="report-score-ring ${tone}"
                        style="
                            --report-score:${
                                Math.min(
                                    100,
                                    Math.max(
                                        0,
                                        comparison.similarity
                                    )
                                ) * 3.6
                            }deg
                        "
                    >

                        <div>

                            <strong>
                                ${comparison.similarity.toFixed(1)}%
                            </strong>

                            <span>
                                pair similarity
                            </span>

                        </div>

                    </div>

                </section>



                <!-- Status message -->
                <section
                    class="report-alert ${
                        isFlagged
                            ? "alert-danger"
                            : "alert-safe"
                    }"
                >

                    <div class="report-alert-icon">
                        ${isFlagged ? "!" : "✓"}
                    </div>


                    <div>

                        <strong>

                            ${
                                isFlagged
                                    ? "Flagged for instructor review"
                                    : "Below current review threshold"
                            }

                        </strong>


                        <p>

                            ${
                                isFlagged
                                    ? `This pair meets or exceeds the ${settings.similarityThreshold}% threshold.`
                                    : `This pair is below the ${settings.similarityThreshold}% threshold.`
                            }

                            Inspect the shared wording before making
                            any academic decision.

                        </p>

                    </div>

                </section>



                <!-- Report statistics -->
                <section class="report-stat-grid">

                    <div class="report-stat">

                        <span>
                            Student A
                        </span>

                        <strong>
                            ${PG.escapeHtml(
                                submission.studentName
                            )}
                        </strong>

                        <small>
                            ${PG.escapeHtml(
                                assignmentA?.title ||
                                "Submission"
                            )}
                        </small>

                    </div>


                    <div class="report-stat">

                        <span>
                            Student B
                        </span>

                        <strong>
                            ${PG.escapeHtml(
                                topSubmission.studentName
                            )}
                        </strong>

                        <small>
                            ${PG.escapeHtml(
                                assignmentB?.title ||
                                "Submission"
                            )}
                        </small>

                    </div>


                    <div class="report-stat">

                        <span>
                            Shared n-grams
                        </span>

                        <strong>
                            ${comparison.matchingNgrams.length}
                        </strong>

                        <small>
                            ${settings.ngramSize}-word phrases
                        </small>

                    </div>


                    <div class="report-stat">

                        <span>
                            Threshold
                        </span>

                        <strong>
                            ${settings.similarityThreshold}%
                        </strong>

                        <small>
                            Instructor setting
                        </small>

                    </div>

                </section>



                <!-- Matching N-grams -->
                <section class="report-section">

                    <div class="report-section-heading">

                        <div>

                            <span class="eyebrow">
                                MATCHING EVIDENCE
                            </span>

                            <h3>
                                Shared n-grams
                            </h3>

                        </div>


                        <span class="report-method">
                            ${settings.ngramSize}-gram + Jaccard
                        </span>

                    </div>


                    <div class="report-match-grid">

                        ${
                            comparison.matchingNgrams
                                .slice(0, 24)
                                .map(function (ngram, index) {

                                    return `
                                        <article class="report-match-card">

                                            <div class="match-index">
                                                ${String(
                                                    index + 1
                                                ).padStart(2, "0")}
                                            </div>

                                            <div>

                                                <strong>
                                                    ${PG.escapeHtml(
                                                        ngram
                                                    )}
                                                </strong>

                                                <small>
                                                    Shared phrase
                                                </small>

                                            </div>

                                        </article>
                                    `;
                                })
                                .join("")
                            ||

                            `
                                <div class="report-empty-inline">
                                    No shared phrases found.
                                </div>
                            `
                        }

                    </div>

                </section>



                <!-- Side by side -->
                <section
                    class="report-section report-side-by-side-section"
                >

                    <div class="report-section-heading">

                        <div>

                            <span class="eyebrow">
                                SIDE-BY-SIDE REVIEW
                            </span>

                            <h3>
                                Highlighted matching passages
                            </h3>

                            <p class="text-muted">
                                The same shared n-grams are highlighted
                                in both submissions.
                            </p>

                        </div>


                        <span class="report-method">
                            ${comparison.matchingNgrams.length}
                            shared phrases
                        </span>

                    </div>


                    <div class="match-legend">

                        ${renderMatchLegend(
                            comparison.matchingNgrams
                        )}

                    </div>


                    <div class="report-side-by-side">


                        <!-- Submission A -->
                        <article class="report-source-pane">

                            <header>

                                <div>

                                    <span class="eyebrow">
                                        SUBMISSION A
                                    </span>

                                    <h3>
                                        ${PG.escapeHtml(
                                            submission.studentName
                                        )}
                                    </h3>

                                </div>


                                <span class="source-badge">
                                    ${PG.escapeHtml(
                                        assignmentA?.title ||
                                        "Submission"
                                    )}
                                </span>

                            </header>


                            <div class="report-source-text">

                                ${highlightMatchingText(
                                    submission.text,
                                    comparison.matchingNgrams
                                )}

                            </div>

                        </article>



                        <!-- Submission B -->
                        <article class="report-source-pane">

                            <header>

                                <div>

                                    <span class="eyebrow">
                                        SUBMISSION B
                                    </span>

                                    <h3>
                                        ${PG.escapeHtml(
                                            topSubmission.studentName
                                        )}
                                    </h3>

                                </div>


                                <span class="source-badge">
                                    ${PG.escapeHtml(
                                        assignmentB?.title ||
                                        "Submission"
                                    )}
                                </span>

                            </header>


                            <div class="report-source-text">

                                ${highlightMatchingText(
                                    topSubmission.text,
                                    comparison.matchingNgrams
                                )}

                            </div>

                        </article>

                    </div>

                </section>



                <!-- Note -->
                <section class="report-disclaimer">

                    <strong>
                        Instructor guidance
                    </strong>

                    <p>
                        Similarity shows shared wording between
                        saved submissions. Review the highlighted
                        text before making an academic decision.
                    </p>

                </section>

            </div>

        </div>
    `;


    document.body.appendChild(modal);

    document.body.classList.add("report-modal-open");


    // Close report
    function closeReport() {

        modal.remove();
        document.body.classList.remove(
            "report-modal-open"
        );
    }


    modal
        .querySelector(".report-close")
        .addEventListener(
            "click",
            closeReport
        );


    // Close when clicking outside the report
    modal.addEventListener(
        "click",
        function (event) {

            if (event.target === modal) {
                closeReport();
            }

        }
    );


    // Print report
    modal
        .querySelector("#print-report")
        .addEventListener(
            "click",
            function () {
                window.print();
            }
        );


    // Highlight selected phrase
    modal
        .querySelectorAll(".match-legend-item")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    const index =
                        Number(
                            button.dataset.matchIndex
                        );


                    modal
                        .querySelectorAll(
                            ".match-highlight"
                        )
                        .forEach(function (mark) {

                            mark.classList.remove(
                                "match-highlight-focus"
                            );

                        });


                    const colorClass =
                        "match-color-" +
                        ((index % 5) + 1);


                    modal
                        .querySelectorAll(
                            "." + colorClass
                        )
                        .forEach(function (mark) {

                            mark.classList.add(
                                "match-highlight-focus"
                            );

                        });


                    const firstMatch =
                        modal.querySelector(
                            ".report-source-text ." +
                            colorClass
                        );


                    if (firstMatch) {

                        firstMatch.scrollIntoView({
                            behavior: "smooth",
                            block: "center"
                        });

                    }

                }
            );

        });
}


// Show the report page
function renderReports() {

    const settings =
        PG.getSettings();


    const submissions =
        PG.getInstructorSubmissions()
            .sort(function (a, b) {

                return (
                    Number(b.maxSimilarity || 0) -
                    Number(a.maxSimilarity || 0)
                );

            });


    const assignments =
        PG.getAssignments();


    const flagged =
        submissions.filter(function (submission) {
            return submission.flagged;
        });


    const compared =
        submissions.filter(function (submission) {
            return submission.topMatchStudent;
        });


    let averageSimilarity = 0;


    if (compared.length > 0) {

        const totalSimilarity =
            compared.reduce(
                function (total, submission) {

                    return (
                        total +
                        Number(
                            submission.maxSimilarity || 0
                        )
                    );

                },
                0
            );


        averageSimilarity =
            totalSimilarity /
            compared.length;
    }


    const highestSubmission =
        submissions.length > 0
            ? submissions[0]
            : null;


    pgLayout({

        active: "reports",

        role: "instructor",

        title: "Similarity Reports",

        subtitle:
            "Review student similarity results and matching evidence.",


        content: `

            <div class="report-command-bar">

                <div>

                    <span class="eyebrow">
                        INSTRUCTOR REPORT CENTER
                    </span>

                    <strong>
                        ${flagged.length}
                        flagged pair${flagged.length === 1 ? "" : "s"}
                    </strong>

                    <span class="text-muted">
                        Threshold
                        ${settings.similarityThreshold}%
                        ·
                        ${settings.ngramSize}-gram Jaccard
                    </span>

                </div>


                <div class="report-command-meta">

                    <span class="mini-method">
                        ${submissions.length} submissions
                    </span>

                    <span class="mini-method">
                        ${assignments.length} assignments
                    </span>

                    <a
                        class="btn btn-primary btn-sm"
                        href="assignments.html"
                    >
                        Manage submissions
                    </a>

                </div>

            </div>



            <!-- Report stats -->
            <section class="report-stat-grid report-stat-grid-top">

                <div class="report-stat report-stat-primary">

                    <span>
                        Average similarity
                    </span>

                    <strong>
                        ${
                            compared.length > 0
                                ? averageSimilarity.toFixed(1) + "%"
                                : "—"
                        }
                    </strong>

                    <small>
                        Across comparable submissions
                    </small>

                </div>


                <div class="report-stat">

                    <span>
                        Flagged
                    </span>

                    <strong>
                        ${flagged.length}
                    </strong>

                    <small>
                        At or above
                        ${settings.similarityThreshold}%
                    </small>

                </div>


                <div class="report-stat">

                    <span>
                        Highest similarity
                    </span>

                    <strong>

                        ${
                            highestSubmission &&
                            highestSubmission.topMatchStudent

                                ? Number(
                                    highestSubmission.maxSimilarity || 0
                                ).toFixed(1) + "%"

                                : "—"
                        }

                    </strong>

                    <small>

                        ${
                            highestSubmission &&
                            highestSubmission.topMatchStudent

                                ? PG.escapeHtml(
                                    highestSubmission.topMatchStudent
                                )

                                : "No comparisons yet"
                        }

                    </small>

                </div>


                <div class="report-stat">

                    <span>
                        Pair method
                    </span>

                    <strong>
                        ${settings.ngramSize}-gram
                    </strong>

                    <small>
                        Jaccard similarity
                    </small>

                </div>

            </section>



            <!-- Heatmap and flagged list -->
            <section class="report-grid professional-report-layout">


                <div class="section-card report-heatmap-card">

                    <div class="report-section-heading">

                        <div>

                            <span class="eyebrow">
                                MATRIX
                            </span>

                            <h2 class="section-title">
                                Similarity map
                            </h2>

                            <p class="text-muted">
                                Use the matrix to find students
                                with high similarity.
                            </p>

                        </div>


                        <div class="heatmap-legend">

                            <span class="legend low"></span>
                            Low

                            <span class="legend med"></span>
                            Review

                            <span class="legend high"></span>
                            High

                        </div>

                    </div>


                    ${
                        submissions.length > 1

                            ? buildHeatmapRows(submissions)

                            : `
                                <div class="report-empty-state">
                                    At least two student submissions
                                    are needed for the comparison matrix.
                                </div>
                            `
                    }

                </div>



                <aside class="section-card flagged-inbox">

                    <div class="report-section-heading">

                        <div>

                            <span class="eyebrow">
                                PRIORITY QUEUE
                            </span>

                            <h2 class="section-title">
                                Flagged submissions
                            </h2>

                            <p class="text-muted">
                                Highest similarity comes first.
                            </p>

                        </div>


                        <span class="report-chip">
                            ${flagged.length}
                        </span>

                    </div>


                    <div class="priority-list">

                        ${
                            flagged.length > 0

                                ?

                                flagged.map(
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
                                                    ${String(
                                                        index + 1
                                                    ).padStart(2, "0")}
                                                </div>


                                                <div class="priority-main">

                                                    <strong>
                                                        ${PG.escapeHtml(
                                                            submission.studentName
                                                        )}
                                                    </strong>

                                                    <span>

                                                        ${
                                                            submission.topMatchStudent
                                                                ? "↔ " +
                                                                  PG.escapeHtml(
                                                                      submission.topMatchStudent
                                                                  )
                                                                : "No pair"
                                                        }

                                                        ·

                                                        ${PG.escapeHtml(
                                                            assignment?.title ||
                                                            "Assignment"
                                                        )}

                                                    </span>

                                                    <small>

                                                        ${
                                                            submission.matchingNgrams?.length ||
                                                            0
                                                        }

                                                        shared n-grams

                                                        ·

                                                        ${PG.formatDate(
                                                            submission.submittedAt
                                                        )}

                                                    </small>

                                                </div>


                                                <div class="priority-score">

                                                    ${
                                                        Number(
                                                            submission.maxSimilarity ||
                                                            0
                                                        ).toFixed(1)
                                                    }%

                                                </div>


                                                <button
                                                    class="btn btn-secondary btn-sm priority-open"
                                                    data-id="${submission.id}"
                                                >
                                                    Open
                                                </button>

                                            </article>

                                        `;

                                    }
                                ).join("")

                                :

                                `
                                    <div class="report-empty-state">
                                        No flagged submissions at the current threshold.
                                    </div>
                                `
                        }

                    </div>

                </aside>

            </section>



            <!-- All reports -->
            <section class="section-card report-all-card">

                <div class="report-section-heading">

                    <div>

                        <span class="eyebrow">
                            ALL REPORTS
                        </span>

                        <h2 class="section-title">
                            Submission report list
                        </h2>

                        <p class="text-muted">
                            Search and open a submission report.
                        </p>

                    </div>


                    <div class="report-tools">

                        <input
                            id="report-search"
                            class="form-input search-input"
                            type="search"
                            placeholder="Search student or assignment..."
                            aria-label="Search reports"
                        >


                        <div class="report-filter-tabs">

                            <button
                                class="active"
                                data-filter="all"
                            >
                                All
                            </button>

                            <button
                                data-filter="flagged"
                            >
                                Flagged
                            </button>

                            <button
                                data-filter="clear"
                            >
                                Below threshold
                            </button>

                        </div>

                    </div>

                </div>


                <div class="report-table-wrap">

                    <table class="report-table">

                        <thead>

                            <tr>

                                <th>
                                    Student
                                </th>

                                <th>
                                    Assignment
                                </th>

                                <th>
                                    Similarity
                                </th>

                                <th>
                                    Top match
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Marks
                                </th>

                                <th></th>

                            </tr>

                        </thead>


                        <tbody>

                            ${
                                submissions.length > 0

                                    ?

                                    submissions.map(
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


                                            const similarity =
                                                Number(
                                                    submission.maxSimilarity ||
                                                    0
                                                );


                                            let state =
                                                "pending";


                                            if (submission.flagged) {
                                                state = "flagged";
                                            } else if (
                                                submission.topMatchStudent
                                            ) {
                                                state = "clear";
                                            }


                                            const user =
                                                PG.getUsers().find(
                                                    function (item) {
                                                        return (
                                                            item.id ===
                                                            submission.studentId
                                                        );
                                                    }
                                                );


                                            return `

                                                <tr
                                                    data-filter-state="${state}"
                                                    data-report-search="${PG.escapeHtml(
                                                        `${submission.studentName}
                                                        ${assignment?.title || ""}
                                                        ${submission.status || ""}`
                                                            .toLowerCase()
                                                    )}"
                                                >

                                                    <td>

                                                        <strong>
                                                            ${PG.escapeHtml(
                                                                submission.studentName
                                                            )}
                                                        </strong>

                                                        <span>
                                                            ${PG.escapeHtml(
                                                                user?.studentId ||
                                                                ""
                                                            )}
                                                        </span>

                                                    </td>


                                                    <td>
                                                        ${PG.escapeHtml(
                                                            assignment?.title ||
                                                            "Unknown"
                                                        )}
                                                    </td>


                                                    <td>

                                                        <strong
                                                            class="score-${toneFor(
                                                                similarity
                                                            )}"
                                                        >
                                                            ${similarity.toFixed(1)}%
                                                        </strong>


                                                        <div class="report-table-bar">

                                                            <span
                                                                class="${toneFor(
                                                                    similarity
                                                                )}"
                                                                style="
                                                                    width:${Math.min(
                                                                        similarity,
                                                                        100
                                                                    )}%
                                                                "
                                                            ></span>

                                                        </div>

                                                    </td>


                                                    <td>

                                                        ${
                                                            submission.topMatchStudent
                                                                ? PG.escapeHtml(
                                                                    submission.topMatchStudent
                                                                  )
                                                                : "—"
                                                        }

                                                    </td>


                                                    <td>

                                                        ${
                                                            submission.flagged

                                                                ? `
                                                                    <span class="report-status flagged">
                                                                        Flagged
                                                                    </span>
                                                                `

                                                                : submission.topMatchStudent

                                                                    ? `
                                                                        <span class="report-status clear">
                                                                            Not flagged
                                                                        </span>
                                                                    `

                                                                    : `
                                                                        <span class="report-status pending">
                                                                            Awaiting
                                                                        </span>
                                                                    `
                                                        }

                                                    </td>


                                                    <td>

                                                        ${
                                                            submission.marks !== null &&
                                                            submission.marks !== undefined

                                                                ? `${submission.marks}/${assignment?.maxMarks ?? 10}`

                                                                : "Pending"
                                                        }

                                                    </td>


                                                    <td>

                                                        ${
                                                            submission.topMatchStudent

                                                                ? `
                                                                    <button
                                                                        class="btn btn-primary btn-sm report-pair-open"
                                                                        data-id="${submission.id}"
                                                                    >
                                                                        View report
                                                                    </button>
                                                                `

                                                                : `
                                                                    <span class="table-sub">
                                                                        No pair yet
                                                                    </span>
                                                                `
                                                        }

                                                    </td>

                                                </tr>

                                            `;

                                        }
                                    ).join("")

                                    :

                                    `
                                        <tr>
                                            <td
                                                colspan="7"
                                                class="report-empty-table"
                                            >
                                                No submissions yet.
                                            </td>
                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </section>
        `
    });


    // Open report buttons
    document
        .querySelectorAll(
            ".priority-open, .report-pair-open"
        )
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    const submission =
                        PG.getSubmissions().find(
                            function (item) {
                                return (
                                    item.id ===
                                    button.dataset.id
                                );
                            }
                        );


                    if (submission) {
                        openPairReport(submission);
                    }

                }
            );

        });


    // Report filter buttons
    document
        .querySelectorAll("[data-filter]")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    document
                        .querySelectorAll(
                            "[data-filter]"
                        )
                        .forEach(function (item) {

                            item.classList.remove(
                                "active"
                            );

                        });


                    button.classList.add(
                        "active"
                    );


                    const filter =
                        button.dataset.filter;


                    document
                        .querySelectorAll(
                            "[data-filter-state]"
                        )
                        .forEach(function (row) {

                            if (filter === "all") {
                                row.hidden = false;
                                return;
                            }


                            row.hidden =
                                row.dataset.filterState !==
                                filter;

                        });

                }
            );

        });


    // Search reports
    const reportSearch =
        document.getElementById("report-search");


    if (reportSearch) {

        reportSearch.addEventListener(
            "input",
            function () {

                const searchText =
                    reportSearch.value
                        .trim()
                        .toLowerCase();


                document
                    .querySelectorAll(
                        "[data-report-search]"
                    )
                    .forEach(function (row) {

                        const rowText =
                            row.dataset.reportSearch || "";


                        row.hidden =
                            searchText !== "" &&
                            !rowText.includes(
                                searchText
                            );

                    });

            }
        );

    }

}


// Start report page
renderReports();