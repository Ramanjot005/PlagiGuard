/**
 * PlagiGuard Phase 2 Comprehensive Test Suite
 * Covers Authentication, Role Barriers, Ownership Scoping,
 * Assignment CRUD, Submissions, Similarity Analysis, Grading, Settings, Profile & Error Handling.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const http = require('http');
const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const User = require('./models/User');
const Assignment = require('./models/Assignment');
const Submission = require('./models/Submission');
const Settings = require('./models/Settings');

const {
  tokenize,
  createNGrams,
  calculateJaccard
} = require('./services/similarityService');

// Track all test records created during test execution for cleanup
const createdUserIds = [];
const createdAssignmentIds = [];
const createdSubmissionIds = [];

const BASE_URL = 'http://127.0.0.1:5000/api';

async function req(endpoint, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });
  let body;
  try {
    body = await res.json();
  } catch (e) {
    body = await res.text();
  }
  return { status: res.status, body };
}

async function runAllTests() {
  console.log('==================================================');
  console.log('    PLAGIGUARD PHASE 2 AUTOMATED TEST SUITE       ');
  console.log('==================================================\n');

  const results = [];
  function record(category, testName, pass, details) {
    results.push({ category, testName, pass, details });
    const mark = pass ? '✓ PASS' : '✗ FAIL';
    console.log(`[${category}] ${mark}: ${testName} (${details})`);
  }

  try {
    // Connect to database to allow tracked cleanup
    await connectDB();

    // -----------------------------------------------------------------
    // 1. UNIT TESTS: Similarity Engine Core Algorithms
    // -----------------------------------------------------------------
    const tokens = tokenize('Hello World! This is a test, with punctuation.');
    record('Similarity Unit', 'tokenize normalizes text & strips punctuation',
      tokens.length === 8 && tokens[0] === 'hello' && !tokens.includes('!'),
      `Tokens: ${tokens.slice(0, 4).join(', ')}...`
    );

    const ngrams = createNGrams(['javascript', 'variables', 'are', 'useful'], 3);
    record('Similarity Unit', 'createNGrams produces correct 3-grams',
      ngrams.size === 2 && ngrams.has('javascript variables are'),
      `Count: ${ngrams.size}`
    );

    const setA = new Set(['word one two', 'word two three']);
    const setB = new Set(['word one two', 'different word phrase']);
    const jaccard = calculateJaccard(setA, setB);
    record('Similarity Unit', 'calculateJaccard calculates exact intersection/union percentage',
      jaccard.score === 33.33 && jaccard.matchingNGrams.length === 1,
      `Score: ${jaccard.score}%`
    );

    // -----------------------------------------------------------------
    // 2. SERVER & HEALTH CHECK
    // -----------------------------------------------------------------
    const health = await req('/health');
    record('Health Check', 'GET /api/health returns 200 OK',
      health.status === 200 && health.body.success === true,
      `status: ${health.status}`
    );

    // -----------------------------------------------------------------
    // 3. UNAUTHENTICATED ACCESS GUARDS (401)
    // -----------------------------------------------------------------
    const protectedRoutes = [
      { path: '/assignments', method: 'GET' },
      { path: '/submissions/my', method: 'GET' },
      { path: '/submissions/reports', method: 'GET' },
      { path: '/submissions/reports/pairwise', method: 'GET' },
      { path: '/settings', method: 'GET' },
      { path: '/auth/profile', method: 'GET' },
      { path: '/student/dashboard', method: 'GET' },
      { path: '/instructor/dashboard', method: 'GET' }
    ];
    for (const route of protectedRoutes) {
      const res = await req(route.path, { method: route.method });
      record('Auth Guard', `Unauthenticated ${route.method} ${route.path} blocked (401)`,
        res.status === 401 && res.body.success === false,
        `status: ${res.status}`
      );
    }

    // -----------------------------------------------------------------
    // 4. REGISTRATION VALIDATION
    // -----------------------------------------------------------------
    const runId = randomUUID().slice(0, 8);

    const shortPass = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Short', email: `short-${runId}@test.invalid`, password: 'short' })
    });
    record('Registration', 'Rejects password < 8 characters (400)',
      shortPass.status === 400,
      `status: ${shortPass.status}`
    );

    const badEmail = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bad Email', email: 'invalid-email', password: 'ValidPassword123!' })
    });
    record('Registration', 'Rejects malformed email (400)',
      badEmail.status === 400,
      `status: ${badEmail.status}`
    );

    const emptyName = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: '   ', email: `valid-${runId}@test.invalid`, password: 'ValidPassword123!' })
    });
    record('Registration', 'Rejects blank/whitespace name (400)',
      emptyName.status === 400,
      `status: ${emptyName.status}`
    );

    // Register Student A
    const stuAEmail = `stuA-${runId}@test.invalid`;
    const stuAPass = 'StudentPassword123!';
    const regStuA = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Student Alpha', email: stuAEmail, password: stuAPass })
    });
    if (regStuA.body.data?.id) createdUserIds.push(regStuA.body.data.id);
    record('Registration', 'Registers Student Alpha successfully (201)',
      regStuA.status === 201 && regStuA.body.data?.role === 'student',
      `status: ${regStuA.status}`
    );

    // Register Duplicate
    const regDup = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Duplicate Alpha', email: stuAEmail, password: stuAPass })
    });
    record('Registration', 'Rejects duplicate email with HTTP 409',
      regDup.status === 409,
      `status: ${regDup.status}`
    );

    // Register Student B
    const stuBEmail = `stuB-${runId}@test.invalid`;
    const stuBPass = 'StudentPassword123!';
    const regStuB = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Student Beta', email: stuBEmail, password: stuBPass })
    });
    if (regStuB.body.data?.id) createdUserIds.push(regStuB.body.data.id);
    record('Registration', 'Registers Student Beta successfully (201)',
      regStuB.status === 201 && regStuB.body.data?.role === 'student',
      `status: ${regStuB.status}`
    );

    // -----------------------------------------------------------------
    // 5. LOGIN & TOKEN VERIFICATION
    // -----------------------------------------------------------------
    const badLogin = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: stuAEmail, password: 'WrongPassword999!' })
    });
    record('Authentication', 'Rejects incorrect password (401)',
      badLogin.status === 401,
      `status: ${badLogin.status}`
    );

    const loginStuA = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: stuAEmail, password: stuAPass })
    });
    const stuAToken = loginStuA.body.token;
    record('Authentication', 'Student Alpha logs in and receives valid JWT (200)',
      loginStuA.status === 200 && !!stuAToken,
      `status: ${loginStuA.status}`
    );

    const loginStuB = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: stuBEmail, password: stuBPass })
    });
    const stuBToken = loginStuB.body.token;
    record('Authentication', 'Student Beta logs in and receives valid JWT (200)',
      loginStuB.status === 200 && !!stuBToken,
      `status: ${loginStuB.status}`
    );

    // Instructor 1 Login
    const loginInst1 = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'testinstructor@plagiguard.local', password: 'InstructorTest123!' })
    });
    const inst1Token = loginInst1.body.token;
    const inst1Id = loginInst1.body.data?.id;
    record('Authentication', 'Primary Instructor logs in successfully (200)',
      loginInst1.status === 200 && loginInst1.body.data?.role === 'instructor' && !!inst1Token,
      `status: ${loginInst1.status}`
    );

    // Create a Second Instructor for cross-instructor ownership testing
    const inst2Email = `instructor2-${runId}@test.invalid`;
    const inst2Pass = 'InstructorTest456!';
    const bcrypt = require('bcryptjs');
    const inst2Hash = await bcrypt.hash(inst2Pass, 10);
    const inst2User = await User.create({
      name: 'Second Instructor',
      email: inst2Email,
      passwordHash: inst2Hash,
      role: 'instructor'
    });
    createdUserIds.push(inst2User._id);

    const loginInst2 = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: inst2Email, password: inst2Pass })
    });
    const inst2Token = loginInst2.body.token;
    record('Authentication', 'Second Instructor logs in successfully (200)',
      loginInst2.status === 200 && !!inst2Token,
      `status: ${loginInst2.status}`
    );

    // -----------------------------------------------------------------
    // 6. ROLE-BASED ACCESS CONTROL (403 FORBIDDEN)
    // -----------------------------------------------------------------
    const stuToInstDash = await req('/instructor/dashboard', { method: 'GET' }, stuAToken);
    record('Role Barriers', 'Student blocked from GET /api/instructor/dashboard (403)',
      stuToInstDash.status === 403,
      `status: ${stuToInstDash.status}`
    );

    const stuToCreateAsg = await req('/assignments', {
      method: 'POST',
      body: JSON.stringify({ title: 'Illegal Asg', course: 'CS' })
    }, stuAToken);
    record('Role Barriers', 'Student blocked from POST /api/assignments (403)',
      stuToCreateAsg.status === 403,
      `status: ${stuToCreateAsg.status}`
    );

    const stuToReports = await req('/submissions/reports', { method: 'GET' }, stuAToken);
    record('Role Barriers', 'Student blocked from GET /api/submissions/reports (403)',
      stuToReports.status === 403,
      `status: ${stuToReports.status}`
    );

    const stuToPairwise = await req('/submissions/reports/pairwise', { method: 'GET' }, stuAToken);
    record('Role Barriers', 'Student blocked from GET /api/submissions/reports/pairwise (403)',
      stuToPairwise.status === 403,
      `status: ${stuToPairwise.status}`
    );

    const stuToGrade = await req('/submissions/000000000000000000000000/grade', {
      method: 'PATCH',
      body: JSON.stringify({ marks: 50 })
    }, stuAToken);
    record('Role Barriers', 'Student blocked from PATCH /api/submissions/:id/grade (403)',
      stuToGrade.status === 403,
      `status: ${stuToGrade.status}`
    );

    const stuToSettings = await req('/settings', {
      method: 'PUT',
      body: JSON.stringify({ ngramSize: 4 })
    }, stuAToken);
    record('Role Barriers', 'Student blocked from PUT /api/settings (403)',
      stuToSettings.status === 403,
      `status: ${stuToSettings.status}`
    );

    const instToStuDash = await req('/student/dashboard', { method: 'GET' }, inst1Token);
    record('Role Barriers', 'Instructor blocked from GET /api/student/dashboard (403)',
      instToStuDash.status === 403,
      `status: ${instToStuDash.status}`
    );

    const instToSubmit = await req('/submissions', {
      method: 'POST',
      body: JSON.stringify({ assignment: '000000000000000000000000', text: 'Illegal submission text' })
    }, inst1Token);
    record('Role Barriers', 'Instructor blocked from POST /api/submissions (403)',
      instToSubmit.status === 403,
      `status: ${instToSubmit.status}`
    );

    const instToMySubs = await req('/submissions/my', { method: 'GET' }, inst1Token);
    record('Role Barriers', 'Instructor blocked from GET /api/submissions/my (403)',
      instToMySubs.status === 403,
      `status: ${instToMySubs.status}`
    );

    // -----------------------------------------------------------------
    // 7. ASSIGNMENT CRUD & DELETION SAFETY
    // -----------------------------------------------------------------
    const asgInvalid = await req('/assignments', {
      method: 'POST',
      body: JSON.stringify({ title: 'Missing Course' })
    }, inst1Token);
    record('Assignment CRUD', 'Rejects assignment missing required course (400)',
      asgInvalid.status === 400,
      `status: ${asgInvalid.status}`
    );

    // Create Assignment 1 (Instructor 1)
    const asg1 = await req('/assignments', {
      method: 'POST',
      body: JSON.stringify({
        title: `Algorithms Test ${runId}`,
        course: 'Computer Science',
        description: 'Explain sorting and search algorithms with time complexity.',
        dueDate: '2026-11-30',
        maxMarks: 50,
        minWords: 20
      })
    }, inst1Token);
    const asg1Id = asg1.body.data?._id;
    if (asg1Id) createdAssignmentIds.push(asg1Id);
    record('Assignment CRUD', 'Instructor 1 creates assignment successfully (201)',
      asg1.status === 201 && !!asg1Id,
      `status: ${asg1.status}, id: ${asg1Id}`
    );

    // Create Temporary Assignment 2 for Deletion Testing
    const asgTemp = await req('/assignments', {
      method: 'POST',
      body: JSON.stringify({
        title: `Temp Assignment ${runId}`,
        course: 'Software Testing',
        description: 'To be deleted cleanly without submissions.',
        dueDate: '2026-12-15',
        maxMarks: 20
      })
    }, inst1Token);
    const asgTempId = asgTemp.body.data?._id;
    if (asgTempId) createdAssignmentIds.push(asgTempId);
    record('Assignment CRUD', 'Instructor 1 creates temporary assignment (201)',
      asgTemp.status === 201 && !!asgTempId,
      `status: ${asgTemp.status}`
    );

    // Test Deletion: Student blocked
    const delByStudent = await req(`/assignments/${asgTempId}`, { method: 'DELETE' }, stuAToken);
    record('Assignment Deletion', 'Student blocked from deleting assignment (403)',
      delByStudent.status === 403,
      `status: ${delByStudent.status}`
    );

    // Test Deletion: Non-owner Instructor blocked
    const delByNonOwner = await req(`/assignments/${asgTempId}`, { method: 'DELETE' }, inst2Token);
    record('Assignment Deletion', 'Non-owner Instructor blocked from deleting assignment (403)',
      delByNonOwner.status === 403,
      `status: ${delByNonOwner.status}`
    );

    // Test Deletion: Invalid ID format (400)
    const delBadId = await req('/assignments/invalid-id-format', { method: 'DELETE' }, inst1Token);
    record('Assignment Deletion', 'Rejects invalid assignment ID format (400)',
      delBadId.status === 400,
      `status: ${delBadId.status}`
    );

    // Test Deletion: Non-existent ID (404)
    const delNotFound = await req('/assignments/000000000000000000000000', { method: 'DELETE' }, inst1Token);
    record('Assignment Deletion', 'Returns 404 for non-existent assignment',
      delNotFound.status === 404,
      `status: ${delNotFound.status}`
    );

    // Test Deletion: Owner deletes empty assignment successfully (200)
    const delSuccess = await req(`/assignments/${asgTempId}`, { method: 'DELETE' }, inst1Token);
    record('Assignment Deletion', 'Owner deletes empty assignment successfully (200)',
      delSuccess.status === 200 && delSuccess.body.success === true,
      `status: ${delSuccess.status}`
    );

    // -----------------------------------------------------------------
    // 8. SUBMISSIONS & SIMILARITY FLOW
    // -----------------------------------------------------------------
    const subShort = await req('/submissions', {
      method: 'POST',
      body: JSON.stringify({
        assignment: asg1Id,
        text: 'Too short text phrase.'
      })
    }, stuAToken);
    record('Submissions', 'Rejects submission under minimum word count (400)',
      subShort.status === 400,
      `status: ${subShort.status}`
    );

    const essayA = "Distributed systems require consensus algorithms to maintain consistency across independent nodes. The Raft and Paxos protocols provide fault tolerance and leader election mechanisms for distributed databases and replicated state machines.";
    const subA = await req('/submissions', {
      method: 'POST',
      body: JSON.stringify({
        assignment: asg1Id,
        filename: 'alpha_essay.txt',
        text: essayA
      })
    }, stuAToken);
    const subAId = subA.body.submission?._id;
    if (subAId) createdSubmissionIds.push(subAId);
    record('Submissions', 'Student Alpha submits coursework successfully (201)',
      subA.status === 201 && !!subAId,
      `status: ${subA.status}, id: ${subAId}`
    );

    // Student B submits highly similar essay
    const essayB = "Distributed systems require consensus algorithms to maintain consistency across independent nodes. The Raft and Paxos protocols provide fault tolerance and leader election mechanisms for distributed databases and replicated state machines.";
    const subB = await req('/submissions', {
      method: 'POST',
      body: JSON.stringify({
        assignment: asg1Id,
        filename: 'beta_essay.txt',
        text: essayB
      })
    }, stuBToken);
    const subBId = subB.body.submission?._id;
    if (subBId) createdSubmissionIds.push(subBId);
    record('Submissions', 'Student Beta submits coursework and similarity analysis triggers (201)',
      subB.status === 201 && !!subBId && subB.body.analysis?.maxSimilarity === 100,
      `status: ${subB.status}, similarity: ${subB.body.analysis?.maxSimilarity}%`
    );

    // Verify deletion protection when submissions exist
    const delWithSubs = await req(`/assignments/${asg1Id}`, { method: 'DELETE' }, inst1Token);
    record('Assignment Deletion', 'Prevents deleting assignment that has active student submissions (400)',
      delWithSubs.status === 400 && delWithSubs.body.message.includes('existing student submission'),
      `status: ${delWithSubs.status}, msg: "${delWithSubs.body.message}"`
    );

    // -----------------------------------------------------------------
    // 9. SUBMISSION PRIVACY & OWNERSHIP BARRIERS
    // -----------------------------------------------------------------
    const crossStudent = await req(`/submissions/${subBId}`, { method: 'GET' }, stuAToken);
    record('Privacy Barrier', 'Student Alpha blocked from viewing Student Beta submission (403)',
      crossStudent.status === 403,
      `status: ${crossStudent.status}`
    );

    const ownSub = await req(`/submissions/${subAId}`, { method: 'GET' }, stuAToken);
    record('Privacy Barrier', 'Student Alpha can view own submission details (200)',
      ownSub.status === 200 && ownSub.body.submission?._id === subAId,
      `status: ${ownSub.status}`
    );

    const crossInstSub = await req(`/submissions/${subAId}`, { method: 'GET' }, inst2Token);
    record('Ownership Barrier', 'Non-owning Instructor blocked from viewing submission (403)',
      crossInstSub.status === 403,
      `status: ${crossInstSub.status}`
    );

    const ownerInstSub = await req(`/submissions/${subAId}`, { method: 'GET' }, inst1Token);
    record('Ownership Barrier', 'Owning Instructor can view submission and full text (200)',
      ownerInstSub.status === 200 && !!ownerInstSub.body.submission?.text,
      `status: ${ownerInstSub.status}`
    );

    // Test student-only submission editing
    const instEditSub = await req(`/submissions/${subAId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text: 'Instructor attempting to overwrite student text' })
    }, inst1Token);
    record('Integrity Barrier', 'Instructor blocked from modifying student submission text (403)',
      instEditSub.status === 403,
      `status: ${instEditSub.status}`
    );

    // -----------------------------------------------------------------
    // 10. GRADING & FEEDBACK WORKFLOW
    // -----------------------------------------------------------------
    const crossInstGrade = await req(`/submissions/${subAId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({ marks: 40, feedback: 'Non-owner grade' })
    }, inst2Token);
    record('Grading Ownership', 'Non-owning Instructor blocked from grading submission (403)',
      crossInstGrade.status === 403,
      `status: ${crossInstGrade.status}`
    );

    const gradeTooHigh = await req(`/submissions/${subAId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({ marks: 999, feedback: 'Over max' })
    }, inst1Token);
    record('Grading Validation', 'Rejects marks exceeding assignment maxMarks (400)',
      gradeTooHigh.status === 400,
      `status: ${gradeTooHigh.status}`
    );

    const gradeNeg = await req(`/submissions/${subAId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({ marks: -10 })
    }, inst1Token);
    record('Grading Validation', 'Rejects negative marks (400)',
      gradeNeg.status === 400,
      `status: ${gradeNeg.status}`
    );

    const validGrade = await req(`/submissions/${subAId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({ marks: 45, feedback: 'Excellent explanation of consensus protocols.', status: 'graded' })
    }, inst1Token);
    record('Grading Workflow', 'Owning Instructor saves marks and feedback successfully (200)',
      validGrade.status === 200 && validGrade.body.submission?.marks === 45,
      `status: ${validGrade.status}`
    );

    // After grading, student should not be able to mutate the submission
    const studentEditGraded = await req(`/submissions/${subAId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text: 'Student trying to change text after graded' })
    }, stuAToken);
    record('Academic Integrity', 'Student blocked from modifying already-graded submission (400)',
      studentEditGraded.status === 400,
      `status: ${studentEditGraded.status}`
    );

    // -----------------------------------------------------------------
    // 11. INSTRUCTOR SCOPED REPORTS
    // -----------------------------------------------------------------
    const reportsInst1 = await req('/submissions/reports', { method: 'GET' }, inst1Token);
    record('Scoped Reports', 'Instructor 1 reports contain their submissions',
      reportsInst1.status === 200 && reportsInst1.body.submissions.some(s => s._id === subAId),
      `count: ${reportsInst1.body.submissions?.length}`
    );

    const reportsInst2 = await req('/submissions/reports', { method: 'GET' }, inst2Token);
    record('Scoped Reports', 'Instructor 2 reports do NOT leak Instructor 1 submissions',
      reportsInst2.status === 200 && !reportsInst2.body.submissions.some(s => s._id === subAId),
      `count: ${reportsInst2.body.submissions?.length}`
    );

    // -----------------------------------------------------------------
    // 12. SETTINGS API
    // -----------------------------------------------------------------
    const getSettings = await req('/settings', { method: 'GET' }, inst1Token);
    record('Settings API', 'GET /api/settings retrieves global analysis config (200)',
      getSettings.status === 200 && !!getSettings.body.settings,
      `threshold: ${getSettings.body.settings?.similarityThreshold}%`
    );

    const putBadSettings = await req('/settings', {
      method: 'PUT',
      body: JSON.stringify({ similarityThreshold: 150 })
    }, inst1Token);
    record('Settings API', 'PUT /api/settings rejects threshold > 100 (400)',
      putBadSettings.status === 400,
      `status: ${putBadSettings.status}`
    );

    const putValidSettings = await req('/settings', {
      method: 'PUT',
      body: JSON.stringify({ ngramSize: 3, similarityThreshold: 35, minimumWords: 20 })
    }, inst1Token);
    record('Settings API', 'PUT /api/settings updates threshold and n-gram size (200)',
      putValidSettings.status === 200 && putValidSettings.body.settings?.similarityThreshold === 35,
      `threshold: ${putValidSettings.body.settings?.similarityThreshold}%`
    );

    // -----------------------------------------------------------------
    // 13. USER PROFILE API
    // -----------------------------------------------------------------
    const getProf = await req('/auth/profile', { method: 'GET' }, stuAToken);
    record('Profile API', 'GET /api/auth/profile returns user profile data (200)',
      getProf.status === 200 && getProf.body.data?.name === 'Student Alpha',
      `name: ${getProf.body.data?.name}`
    );

    const updateBadProf = await req('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'instructor' }) // Privilege escalation attempt
    }, stuAToken);
    record('Profile API', 'Rejects unauthorized role escalation attempts (400)',
      updateBadProf.status === 400,
      `status: ${updateBadProf.status}`
    );

    const updateGoodProf = await req('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Alpha S. Researcher', profileImageUrl: 'https://example.com/avatar.png' })
    }, stuAToken);
    record('Profile API', 'Updates user display name and avatar (200)',
      updateGoodProf.status === 200 && updateGoodProf.body.data?.name === 'Alpha S. Researcher',
      `name: ${updateGoodProf.body.data?.name}`
    );

    // -----------------------------------------------------------------
    // 14. ERROR HANDLING & UNKNOWN ROUTES
    // -----------------------------------------------------------------
    const badJson = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ broken json '
    });
    const badJsonBody = await badJson.json();
    record('Error Handling', 'Malformed JSON returns clean JSON error without stack leak (400)',
      badJson.status === 400 && badJsonBody.message === 'Invalid JSON payload received',
      `status: ${badJson.status}, msg: "${badJsonBody.message}"`
    );

    const unknownRoute = await req('/nonexistent/api/route', { method: 'GET' });
    record('Error Handling', 'Unknown route returns clean 404 JSON response',
      unknownRoute.status === 404 && unknownRoute.body.success === false,
      `status: ${unknownRoute.status}`
    );

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;

    console.log('\n==================================================');
    console.log(`TEST SUMMARY: ${total} Tests | ${passed} Passed | ${failed} Failed`);
    console.log('==================================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal error during test execution:', err);
    process.exitCode = 1;
  } finally {
    // Clean up ONLY the tracked test documents created during this run
    try {
      if (createdSubmissionIds.length > 0) {
        await Submission.deleteMany({ _id: { $in: createdSubmissionIds } });
      }
      if (createdAssignmentIds.length > 0) {
        await Assignment.deleteMany({ _id: { $in: createdAssignmentIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      console.log('Test cleanup completed: All temporary test records removed.');
    } catch (cleanupError) {
      console.error('Error during test cleanup:', cleanupError);
    }

    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  }
}

runAllTests();
