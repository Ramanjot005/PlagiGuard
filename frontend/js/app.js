
/*
 * PlagiGuard
 * Existing frontend functionality with backend authentication support.
 * Backend: Node.js + Express + MongoDB
 */

const PG = (() => {
    const API_BASE_URL = 'http://localhost:5000/api';

    const KEYS = {
        users: 'pg_users_v1',
        assignments: 'pg_assignments_v1',
        submissions: 'pg_submissions_v1',
        settings: 'pg_settings_v1',
        session: 'pg_session_v1',
        authToken: 'pg_auth_token',
        authUser: 'pg_auth_user'
    };

    const DEFAULT_SETTINGS = {
        ngramSize: 3,
        similarityThreshold: 30,
        minimumWords: 20,
        method: 'Jaccard'
    };

    const DEFAULT_ASSIGNMENTS = [
        {
            id: 'asg-101',
            title: 'Introduction to JavaScript',
            course: 'Web Development',
            description: 'Explain variables, data types, operators and conditional statements with small examples.',
            dueDate: '2026-09-05',
            maxMarks: 10
        },
        {
            id: 'asg-102',
            title: 'Loops and Functions',
            course: 'JavaScript Programming',
            description: 'Write a short explanation and examples for loops, functions, parameters, return values and arrow functions.',
            dueDate: '2026-09-12',
            maxMarks: 10
        },
        {
            id: 'asg-103',
            title: 'DOM and Form Validation',
            course: 'Frontend Development',
            description: 'Describe DOM selection/manipulation, events, form validation and preventDefault with practical examples.',
            dueDate: '2026-09-19',
            maxMarks: 10
        }
    ];

    const DEFAULT_USERS = [
        {
            id: 'usr-inst-1',
            name: 'Demo Instructor',
            email: 'instructor@university.edu',
            password: 'password123',
            role: 'instructor',
            studentId: '',
            bio: 'Instructor account',
            avatar: '',
            createdAt: new Date().toISOString()
        },
        {
            id: 'usr-stu-1',
            name: 'Aarav Sharma',
            email: 'aarav@student.edu',
            password: 'password123',
            role: 'student',
            studentId: 'STU001',
            bio: 'JavaScript student',
            avatar: '',
            createdAt: new Date().toISOString()
        },
        {
            id: 'usr-stu-2',
            name: 'Meera Kapoor',
            email: 'meera@student.edu',
            password: 'password123',
            role: 'student',
            studentId: 'STU002',
            bio: '',
            avatar: '',
            createdAt: new Date().toISOString()
        }
    ];

    // ==================== STORAGE HELPERS ====================

    function read(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.error('Storage read failed:', error);
            return fallback;
        }
    }

    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function uid(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    // ==================== DATE HELPERS ====================

    function daysUntil(dateString) {
        if (!dateString) return 'No due date';

        const due = new Date(`${dateString}T23:59:59`);
        const now = new Date();
        const diff = Math.ceil((due - now) / 86400000);

        if (Number.isNaN(diff)) return 'Invalid date';
        if (diff < 0) {
            return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`;
        }
        if (diff === 0) return 'Due today';
        if (diff === 1) return 'Due tomorrow';

        return `${diff} days left`;
    }

    function deadlineState(dateString) {
        if (!dateString) return 'none';

        const due = new Date(`${dateString}T23:59:59`);
        const now = new Date();
        const diff = Math.ceil((due - now) / 86400000);

        if (Number.isNaN(diff)) return 'none';
        if (diff < 0) return 'overdue';
        if (diff <= 2) return 'urgent';
        if (diff <= 7) return 'soon';

        return 'normal';
    }

    function formatDate(dateString) {
        if (!dateString) return '—';

        const date = new Date(dateString);

        return Number.isNaN(date.getTime())
            ? dateString
            : date.toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
    }

    // ==================== TEXT SIMILARITY HELPERS ====================

    function normalizeText(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function tokenize(text) {
        return normalizeText(text).split(' ').filter(Boolean);
    }

    function createNGrams(tokens, n) {
        const grams = [];

        if (tokens.length < n) return grams;

        for (let i = 0; i <= tokens.length - n; i += 1) {
            grams.push(tokens.slice(i, i + n).join(' '));
        }

        return grams;
    }

    function jaccard(setA, setB) {
        const a = new Set(setA);
        const b = new Set(setB);

        if (a.size === 0 && b.size === 0) return 0;

        const intersection = [...a].filter(item => b.has(item)).length;
        const union = new Set([...a, ...b]).size;

        return union === 0 ? 0 : intersection / union;
    }

    function compareTexts(textA, textB, n) {
        const gramsA = createNGrams(tokenize(textA), n);
        const gramsB = createNGrams(tokenize(textB), n);
        const gramsBSet = new Set(gramsB);

        const shared = [...new Set(gramsA)]
            .filter(gram => gramsBSet.has(gram));

        return {
            similarity: jaccard(gramsA, gramsB) * 100,
            matchingNgrams: shared.slice(0, 30),
            ngramsA: gramsA,
            ngramsB: gramsB
        };
    }

    // ==================== SETTINGS ====================

    function getSettings() {
        return {
            ...DEFAULT_SETTINGS,
            ...read(KEYS.settings, {})
        };
    }

    function saveSettings(next) {
        write(KEYS.settings, {
            ...getSettings(),
            ...next
        });
    }

    // ==================== INITIALIZATION ====================

    function init() {
        if (!localStorage.getItem(KEYS.users)) {
            write(KEYS.users, DEFAULT_USERS);
        }

        if (!localStorage.getItem(KEYS.assignments)) {
            write(KEYS.assignments, DEFAULT_ASSIGNMENTS);
        }

        if (!localStorage.getItem(KEYS.submissions)) {
            write(KEYS.submissions, []);
        }

        if (!localStorage.getItem(KEYS.settings)) {
            write(KEYS.settings, DEFAULT_SETTINGS);
        }
    }

    function getUsers() {
        return read(KEYS.users, []);
    }

    function getAssignments() {
        return read(KEYS.assignments, DEFAULT_ASSIGNMENTS);
    }

    function getSubmissions() {
        return read(KEYS.submissions, []);
    }

    function saveUsers(users) {
        write(KEYS.users, users);
    }

    function saveAssignments(assignments) {
        write(KEYS.assignments, assignments);
    }

    function saveSubmissions(submissions) {
        write(KEYS.submissions, submissions);
    }

    // ==================== CURRENT USER ====================

    function getCurrentUser() {
        // Prefer a user authenticated by the backend.
        const backendUser = sessionStorage.getItem(KEYS.authUser);
        const backendToken = sessionStorage.getItem(KEYS.authToken);

        if (backendUser && backendToken) {
            try {
                return JSON.parse(backendUser);
            } catch (error) {
                console.error('Unable to read authenticated user:', error);
            }
        }

        // Preserve compatibility with the old browser-only session.
        const id = sessionStorage.getItem(KEYS.session);

        return getUsers().find(user => user.id === id) || null;
    }

    // ==================== BACKEND API HELPERS ====================

    async function apiRequest(path, options = {}) {
        const token = sessionStorage.getItem(KEYS.authToken);

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        let response;

        try {
            response = await fetch(`${API_BASE_URL}${path}`, {
                ...options,
                headers
            });
        } catch (error) {
            throw new Error(
                'Cannot connect to the PlagiGuard backend. Make sure the server is running on port 5000.'
            );
        }

        let result;

        try {
            result = await response.json();
        } catch (error) {
            throw new Error('The server returned an invalid response.');
        }

        if (!response.ok || result.success === false) {
            throw new Error(result.message || `Request failed (${response.status}).`);
        }

        return result;
    }

    // ==================== BACKEND LOGIN ====================

    async function loginWithBackend(email, password) {
        const result = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: String(email || '').trim(),
                password
            })
        });

        if (!result.token || !result.data) {
            throw new Error('The server did not return a valid login session.');
        }

        const user = result.data;

        // Remove the old browser-only session so it cannot override this login.
        sessionStorage.removeItem(KEYS.session);

        sessionStorage.setItem(KEYS.authToken, result.token);
        sessionStorage.setItem(KEYS.authUser, JSON.stringify(user));

        return user;
    }

    // Optional helper for other frontend features to call the backend.
    function getAuthToken() {
        return sessionStorage.getItem(KEYS.authToken);
    }
    
    // ==================== BACKEND DATA API ====================

    async function fetchAssignments() {
        const result = await apiRequest('/assignments', {
            method: 'GET'
        });

        return result.data || result.assignments || [];
    }

    async function createAssignmentAPI(assignment) {
        return await apiRequest('/assignments', {
            method: 'POST',
            body: JSON.stringify(assignment)
        });
    }

    async function updateAssignmentAPI(id, changes) {
        return await apiRequest(`/assignments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(changes)
        });
    }
    async function fetchMySubmissions() {
        const result = await apiRequest('/submissions/my', {
            method: 'GET'
        });

        return result.submissions || result.data || [];
    }
    async function createSubmissionAPI(submission) {
        return await apiRequest('/submissions', {
            method: 'POST',
            body: JSON.stringify(submission)
        });
    }

    async function fetchInstructorReports() {
        const result = await apiRequest('/submissions/reports', {
            method: 'GET'
        });

        return result.data || result.submissions || [];
    }


    // ==================== ASSIGNMENTS ====================

    function createAssignment({
        title,
        course,
        description,
        dueDate,
        maxMarks
    }) {
        const user = getCurrentUser();

        if (!user || user.role !== 'instructor') {
            throw new Error('Only instructors can create assignments.');
        }

        const cleanTitle = String(title || '').trim();
        const cleanCourse = String(course || '').trim();
        const cleanDescription = String(description || '').trim();
        const cleanDueDate = String(dueDate || '').trim();
        const marks = Number(maxMarks);

        if (!cleanTitle || !cleanCourse || !cleanDescription || !cleanDueDate) {
            throw new Error('Please complete all assignment fields.');
        }

        if (!Number.isFinite(marks) || marks <= 0) {
            throw new Error('Maximum marks must be greater than 0.');
        }

        const assignments = getAssignments();

        const assignment = {
            id: uid('asg'),
            title: cleanTitle,
            course: cleanCourse,
            description: cleanDescription,
            dueDate: cleanDueDate,
            maxMarks: marks,
            createdBy: user.id,
            createdAt: new Date().toISOString()
        };

        assignments.unshift(assignment);
        saveAssignments(assignments);

        return assignment;
    }

    function updateAssignment(id, changes) {
        const user = getCurrentUser();

        if (!user || user.role !== 'instructor') {
            throw new Error('Only instructors can edit assignments.');
        }

        const assignments = getAssignments();
        const index = assignments.findIndex(a => a.id === id);

        if (index === -1) {
            throw new Error('Assignment not found.');
        }

        const next = {
            ...assignments[index],
            ...changes,
            updatedAt: new Date().toISOString()
        };

        assignments[index] = next;
        saveAssignments(assignments);

        return next;
    }

    function deleteAssignment(id) {
        const user = getCurrentUser();

        if (!user || user.role !== 'instructor') {
            throw new Error('Only instructors can delete assignments.');
        }

        const assignments = getAssignments().filter(a => a.id !== id);

        saveAssignments(assignments);

        return true;
    }

    // ==================== LEGACY REGISTRATION ====================

    // This function still registers users in browser storage.
    // Backend registration must be integrated separately.
    function register({ name, email, password, role, studentId }) {
        const users = getUsers();
        const cleanEmail = email.trim().toLowerCase();

        if (users.some(user => user.email.toLowerCase() === cleanEmail)) {
            throw new Error(
                'An account with this email already exists. Please login instead.'
            );
        }

        const user = {
            id: uid('usr'),
            name: name.trim(),
            email: cleanEmail,
            password,
            role,
            studentId: role === 'student' ? studentId.trim() : '',
            bio: '',
            avatar: '',
            createdAt: new Date().toISOString()
        };

        users.push(user);
        saveUsers(users);

        return user;
    }

    // ==================== LEGACY LOGIN ====================

    // Kept so existing code does not break.
    // New login pages should use loginWithBackend().
    function login(email, password) {
        const user = getUsers().find(
            u =>
                u.email.toLowerCase() === email.trim().toLowerCase() &&
                u.password === password
        );

        if (!user) {
            throw new Error(
                'Invalid email or password. Please sign up first if you do not have an account.'
            );
        }

        sessionStorage.setItem(KEYS.session, user.id);

        return user;
    }

    // ==================== LOGOUT ====================

    function logout() {
        sessionStorage.removeItem(KEYS.session);
        sessionStorage.removeItem(KEYS.authToken);
        sessionStorage.removeItem(KEYS.authUser);
    }

    // ==================== USER PROFILE ====================

    function updateCurrentUser(changes) {
        const current = getCurrentUser();

        if (!current) {
            throw new Error('Please login first.');
        }

        // Backend users should not be silently written into local demo users.
        if (sessionStorage.getItem(KEYS.authToken)) {
            throw new Error(
                'Profile updates for backend accounts must be saved through the backend API.'
            );
        }

        const users = getUsers().map(user =>
            user.id === current.id
                ? { ...user, ...changes }
                : user
        );

        saveUsers(users);

        return users.find(user => user.id === current.id);
    }

    // ==================== ROLE PROTECTION ====================

    function requireRole(role) {
        const user = getCurrentUser();

        if (!user) {
            window.location.href =
                '../login.html?next=' +
                encodeURIComponent(window.location.pathname);

            return null;
        }

        if (user.role !== role) {
            window.location.href =
                user.role === 'student'
                    ? '../student/dashboard.html'
                    : '../instructor/dashboard.html';

            return null;
        }

        return user;
    }

    // ==================== SUBMISSIONS ====================

    // This remains the original browser-storage submission feature.
    // Backend submission integration is a separate step.
    function saveSubmission({ assignmentId, text, filename }) {
        const student = getCurrentUser();

        if (!student || student.role !== 'student') {
            throw new Error('Only students can submit assignments.');
        }

        if (sessionStorage.getItem(KEYS.authToken)) {
            throw new Error(
                'Backend accounts must submit assignments through the submissions API.'
            );
        }

        const settings = getSettings();
        const wordCount = tokenize(text).length;

        if (wordCount < settings.minimumWords) {
            throw new Error(
                `Your submission has ${wordCount} words. Minimum required words: ${settings.minimumWords}.`
            );
        }

        const assignment = getAssignments().find(
            a => a.id === assignmentId
        );

        if (!assignment) {
            throw new Error('Assignment not found.');
        }

        const submissions = getSubmissions();

        const existing = submissions.find(
            s =>
                s.assignmentId === assignmentId &&
                s.studentId === student.id
        );

        const submission = {
            id: existing?.id || uid('sub'),
            assignmentId,
            studentId: student.id,
            studentName: student.name,
            filename: filename || 'typed-submission.txt',
            text: text.trim(),
            wordCount,
            submittedAt: new Date().toISOString(),
            marks: existing?.marks ?? null,
            feedback: existing?.feedback || '',
            status: existing?.status || 'Submitted'
        };

        const next = existing
            ? submissions.map(s =>
                s.id === existing.id ? submission : s
            )
            : [submission, ...submissions];

        saveSubmissions(next);
        recalculateSimilarities();

        return getSubmissions().find(s => s.id === submission.id);
    }

    // ==================== SIMILARITY ANALYSIS ====================

    function recalculateSimilarities() {
        const settings = getSettings();
        const submissions = getSubmissions();

        const updated = submissions.map(sub => ({
            ...sub,
            maxSimilarity: 0,
            flagged: false,
            topMatchStudent: '',
            topMatchSubmissionId: '',
            matchingNgrams: []
        }));

        // Compare submissions belonging to different students.
        for (let i = 0; i < updated.length; i += 1) {
            for (let j = i + 1; j < updated.length; j += 1) {
                if (updated[i].studentId === updated[j].studentId) {
                    continue;
                }

                const result = compareTexts(
                    updated[i].text,
                    updated[j].text,
                    settings.ngramSize
                );

                if (result.similarity > updated[i].maxSimilarity) {
                    updated[i].maxSimilarity = result.similarity;
                    updated[i].topMatchStudent = updated[j].studentName;
                    updated[i].topMatchSubmissionId = updated[j].id;
                    updated[i].matchingNgrams = result.matchingNgrams;
                }

                if (result.similarity > updated[j].maxSimilarity) {
                    updated[j].maxSimilarity = result.similarity;
                    updated[j].topMatchStudent = updated[i].studentName;
                    updated[j].topMatchSubmissionId = updated[i].id;
                    updated[j].matchingNgrams = result.matchingNgrams;
                }
            }
        }

        updated.forEach(sub => {
            sub.flagged =
                sub.maxSimilarity >= settings.similarityThreshold;
        });

        saveSubmissions(updated);

        return updated;
    }

    function getStudentSubmissions(studentId) {
        return getSubmissions().filter(
            s => s.studentId === studentId
        );
    }

    function getInstructorSubmissions() {
        return recalculateSimilarities();
    }

    function markSubmission(submissionId, marks, feedback, status) {
        const submissions = getSubmissions();

        const index = submissions.findIndex(
            s => s.id === submissionId
        );

        if (index === -1) {
            throw new Error('Submission not found.');
        }

        submissions[index] = {
            ...submissions[index],
            marks: Number(marks),
            feedback: String(feedback || '').trim(),
            status: status || 'Marked',
            markedAt: new Date().toISOString()
        };

        saveSubmissions(submissions);

        return submissions[index];
    }

    // ==================== INITIAL PAGE ====================

    function getInitialPage() {
        const user = getCurrentUser();

        if (!user) {
            return '../html/index.html';
        }

        if (user.role === 'student') {
            return '../student/dashboard.html';
        }

        if (user.role === 'instructor') {
            return '../instructor/dashboard.html';
        }

        return '../html/index.html';
    }

    // Initialize the existing browser-side features.
    init();

    return {
        KEYS,
        API_BASE_URL,
        init,
        apiRequest,
        getAuthToken,
        fetchAssignments,
        createAssignmentAPI,
        updateAssignmentAPI,
        fetchMySubmissions,
        createSubmissionAPI,
        fetchInstructorReports,
        getSettings,
        saveSettings,
        getUsers,
        getAssignments,
        getSubmissions,
        getCurrentUser,
        register,
        login,
        loginWithBackend,
        logout,
        updateCurrentUser,
        requireRole,
        saveSubmission,
        createAssignment,
        updateAssignment,
        deleteAssignment,
        recalculateSimilarities,
        getStudentSubmissions,
        getInstructorSubmissions,
        markSubmission,
        tokenize,
        createNGrams,
        jaccard,
        compareTexts,
        normalizeText,
        escapeHtml,
        formatDate,
        daysUntil,
        deadlineState,
        getInitialPage
        
    };
})();
