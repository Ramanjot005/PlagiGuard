/*
 * PlagiGuard
 * Browser-only implementation: no API, no backend, no external plagiarism API.
 * Data is intentionally stored in localStorage for this academic/demo phase.
 */

const PG = (() => {
    const KEYS = {
        users: 'pg_users_v1',
        assignments: 'pg_assignments_v1',
        submissions: 'pg_submissions_v1',
        settings: 'pg_settings_v1',
        session: 'pg_session_v1'
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
            id: 'usr-inst-1', name: 'Demo Instructor', email: 'instructor@university.edu',
            password: 'password123', role: 'instructor', studentId: '',
            bio: 'Instructor account', createdAt: new Date().toISOString()
        },
        {
            id: 'usr-stu-1', name: 'Aarav Sharma', email: 'aarav@student.edu',
            password: 'password123', role: 'student', studentId: 'STU001',
            bio: 'JavaScript student', createdAt: new Date().toISOString()
        },
        {
            id: 'usr-stu-2', name: 'Meera Kapoor', email: 'meera@student.edu',
            password: 'password123', role: 'student', studentId: 'STU002',
            bio: 'Frontend development student', createdAt: new Date().toISOString()
        }
    ];

    function read(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch (error) {
            console.error('Storage read failed', error);
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

    function formatDate(dateString) {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString(undefined, {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }

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
        const shared = [...new Set(gramsA)].filter(gram => new Set(gramsB).has(gram));
        return {
            similarity: jaccard(gramsA, gramsB) * 100,
            matchingNgrams: shared.slice(0, 30),
            ngramsA: gramsA,
            ngramsB: gramsB
        };
    }

    function getSettings() {
        return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
    }

    function saveSettings(next) {
        write(KEYS.settings, { ...getSettings(), ...next });
    }

    function init() {
        if (!localStorage.getItem(KEYS.users)) write(KEYS.users, DEFAULT_USERS);
        if (!localStorage.getItem(KEYS.assignments)) write(KEYS.assignments, DEFAULT_ASSIGNMENTS);
        if (!localStorage.getItem(KEYS.submissions)) write(KEYS.submissions, []);
        if (!localStorage.getItem(KEYS.settings)) write(KEYS.settings, DEFAULT_SETTINGS);
    }

    function getUsers() { return read(KEYS.users, []); }
    function getAssignments() { return read(KEYS.assignments, DEFAULT_ASSIGNMENTS); }
    function getSubmissions() { return read(KEYS.submissions, []); }
    function getCurrentUser() {
        const id = sessionStorage.getItem(KEYS.session);
        return getUsers().find(user => user.id === id) || null;
    }

    function saveUsers(users) { write(KEYS.users, users); }
    function saveSubmissions(submissions) { write(KEYS.submissions, submissions); }

    function register({ name, email, password, role, studentId }) {
        const users = getUsers();
        const cleanEmail = email.trim().toLowerCase();
        if (users.some(user => user.email.toLowerCase() === cleanEmail)) {
            throw new Error('An account with this email already exists. Please login instead.');
        }
        const user = {
            id: uid('usr'),
            name: name.trim(),
            email: cleanEmail,
            password,
            role,
            studentId: role === 'student' ? studentId.trim() : '',
            bio: '',
            createdAt: new Date().toISOString()
        };
        users.push(user);
        saveUsers(users);
        return user;
    }

    function login(email, password) {
        const user = getUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
        if (!user) throw new Error('Invalid email or password. Please sign up first if you do not have an account.');
        sessionStorage.setItem(KEYS.session, user.id);
        return user;
    }

    function logout() { sessionStorage.removeItem(KEYS.session); }

    function updateCurrentUser(changes) {
        const current = getCurrentUser();
        if (!current) throw new Error('Please login first.');
        const users = getUsers().map(user => user.id === current.id ? { ...user, ...changes } : user);
        saveUsers(users);
        return users.find(user => user.id === current.id);
    }

    function requireRole(role) {
        const user = getCurrentUser();
        if (!user) {
            window.location.href = `../login.html?next=${encodeURIComponent(window.location.pathname)}`;
            return null;
        }
        if (user.role !== role) {
            window.location.href = user.role === 'student' ? '../student/dashboard.html' : '../instructor/dashboard.html';
            return null;
        }
        return user;
    }

    function saveSubmission({ assignmentId, text, filename }) {
        const student = getCurrentUser();
        if (!student || student.role !== 'student') throw new Error('Only students can submit assignments.');

        const settings = getSettings();
        const wordCount = tokenize(text).length;
        if (wordCount < settings.minimumWords) {
            throw new Error(`Your submission has ${wordCount} words. Minimum required words: ${settings.minimumWords}.`);
        }

        const assignment = getAssignments().find(a => a.id === assignmentId);
        if (!assignment) throw new Error('Assignment not found.');

        const submissions = getSubmissions();
        const existing = submissions.find(s => s.assignmentId === assignmentId && s.studentId === student.id);
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

        const next = existing ? submissions.map(s => s.id === existing.id ? submission : s) : [submission, ...submissions];
        saveSubmissions(next);
        recalculateSimilarities();
        return getSubmissions().find(s => s.id === submission.id);
    }

    function recalculateSimilarities() {
        const settings = getSettings();
        const submissions = getSubmissions();
        const updated = submissions.map(sub => ({ ...sub, maxSimilarity: 0, flagged: false, topMatchStudent: '', matchingNgrams: [] }));

        for (let i = 0; i < updated.length; i += 1) {
            for (let j = i + 1; j < updated.length; j += 1) {
                if (updated[i].assignmentId !== updated[j].assignmentId) continue;
                const result = compareTexts(updated[i].text, updated[j].text, settings.ngramSize);
                if (result.similarity > updated[i].maxSimilarity) {
                    updated[i].maxSimilarity = result.similarity;
                    updated[i].topMatchStudent = updated[j].studentName;
                    updated[i].matchingNgrams = result.matchingNgrams;
                }
                if (result.similarity > updated[j].maxSimilarity) {
                    updated[j].maxSimilarity = result.similarity;
                    updated[j].topMatchStudent = updated[i].studentName;
                    updated[j].matchingNgrams = result.matchingNgrams;
                }
            }
        }

        updated.forEach(sub => {
            sub.flagged = sub.maxSimilarity >= settings.similarityThreshold;
        });
        saveSubmissions(updated);
        return updated;
    }

    function getStudentSubmissions(studentId) {
        return getSubmissions().filter(s => s.studentId === studentId);
    }

    function getInstructorSubmissions() {
        return recalculateSimilarities();
    }

    function markSubmission(submissionId, marks, feedback, status) {
        const submissions = getSubmissions();
        const index = submissions.findIndex(s => s.id === submissionId);
        if (index === -1) throw new Error('Submission not found.');
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

    function getInitialPage() {
        const user = getCurrentUser();
        return user ? (user.role === 'student' ? 'student/dashboard.html' : 'instructor/dashboard.html') : 'index.html';
    }

    init();

    return {
        KEYS, DEFAULT_SETTINGS, init, getSettings, saveSettings, getUsers, getAssignments, getSubmissions,
        getCurrentUser, register, login, logout, updateCurrentUser, requireRole, saveSubmission,
        recalculateSimilarities, getStudentSubmissions, getInstructorSubmissions, markSubmission,
        tokenize, createNGrams, jaccard, compareTexts, normalizeText, escapeHtml, formatDate,
        getInitialPage
    };
})();
