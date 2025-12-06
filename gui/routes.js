const express = require('express');
const { requireAuth } = require('./auth');
const grpc = require('@grpc/grpc-js');
const authClient = require('./grpc/authClient');
const viewOfferingClient = require('./grpc/viewOfferingClient');
const enrollmentClient = require('./grpc/enrollmentClient');
const studentGradesClient = require('./grpc/studentGradesClient');
const facultyGradesClient = require('./grpc/facultyGradesClient');
const registerClient = require('./grpc/registerClient');

const router = express.Router();

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

function retryGrpcCall(clientMethod, request, metadata, callback) {
    let attempts = 0;

    function attemptCall() {
        attempts++;
        clientMethod(request, metadata, (err, response) => {
            if (err) {
                if (attempts < MAX_RETRIES) {
                    console.log(`gRPC call failed (Attempt ${attempts}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                    setTimeout(attemptCall, RETRY_DELAY_MS);
                } else {
                    console.error(`gRPC call failed after ${MAX_RETRIES} attempts.`);
                    callback(err, null);
                }
            } else {
                callback(null, response);
            }
        });
    }

    attemptCall();
}

router.get('/', requireAuth(), (req, res) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    return res.redirect('/courses/view')
})

router.get('/login', (req, res) => {
    res.render('account', { mode: "login", error: null });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    retryGrpcCall(authClient.Login.bind(authClient), {email, password}, new grpc.Metadata(), (err, response) => {
        if (err) {
            let msg = 'Login service unavailable.  Please try again later.';
            return res.status(401).render('account', {mode: "login", error: msg});
        }

        const { token } = response;

        res.cookie('token', token, {
            httpOnly: true,
        });

        res.redirect('/courses/view');
    });
});

router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

router.get('/register', (req, res) => {
    res.render('account', { mode: "register", error: null });
});

router.post('/register', (req, res) => {
    const { email, password } = req.body;
    retryGrpcCall(registerClient.Register.bind(registerClient), {email, password}, new grpc.Metadata(), (err, response) => {
        if (err) {
            let msg = 'Register service unavailable.  Please try again later.';
            return res.status(401).render('account', {mode: "register", error: msg});
        }

        const { token } = response;

        res.cookie('token', token, {
            httpOnly: true,
        });

        res.redirect('/courses/view');
    });
});

router.get('/courses/view', requireAuth(), (req, res) => {
    const token = req.cookies.token;

    const metadata = new grpc.Metadata();
    if (token) {
        metadata.add('authorization', `Bearer ${token}`);
    }

    retryGrpcCall(viewOfferingClient.ListOfferings.bind(viewOfferingClient), {}, metadata, (err, response) => {
        if (err) {
            return res.render('courses', {
                offerings: [],
                error: 'Courses service unavailable.  Please try again later.',
                mode: 'view',
            });
        }

        const offerings = response.offerings || [];
        res.render('courses', { offerings, error: null, mode: 'view' });
    });
});

router.get('/student/enroll', requireAuth('student'), (req, res) => {
    const token = req.cookies.token;

    const metadata = new grpc.Metadata();
    if (token) {
        metadata.add('authorization', `Bearer ${token}`);
    }

    retryGrpcCall(enrollmentClient.ListOpenOfferings.bind(enrollmentClient), {}, metadata, (err, response) => {
        if (err) {
            return res.render('courses', {
                offerings: [],
                error:  'Enrollment service unavailable. Please try again later.',
                mode: 'enroll',
            });
        }

        const offerings = response.offerings || [];
        res.render('courses', { offerings, error: null, mode: 'enroll' });
    });
});

router.post('/student/enroll', requireAuth('student'), (req, res) => {
    const token = req.cookies.token;
    const { offeringId } = req.body;

    const metadata = new grpc.Metadata();
    if (token) {
        metadata.add('authorization', `Bearer ${token}`);
    }

    retryGrpcCall(enrollmentClient.Enroll.bind(enrollmentClient), { offeringId: Number(offeringId) }, metadata, (err, response) => {        if (err) {
            const msg = err.message;
            return res.redirect('/student/enroll');
        }

        const msg = response.message || 'Enrollment successful.';
        res.redirect('/student/enroll');
    });
});

router.get('/student/grades', requireAuth('student'), (req, res) => {
    const token = req.cookies.token;

    const metadata = new grpc.Metadata();
    if (token) {
        metadata.add('authorization', `Bearer ${token}`);
    }

    retryGrpcCall(studentGradesClient.ListMyEnrollments.bind(studentGradesClient), {}, metadata, (err, response) => {
        if (err) {
            return res.render('view-grades', {
                enrollments: [],
                error: 'Student Grades service unavailable. Please try again later.',
            });
        }

        const enrollments = response.enrollments || [];
        res.render('view-grades', { enrollments, error: null });
    });
});

router.get('/faculty/courses', requireAuth('faculty'), (req, res) => {
    const token = req.cookies.token;
    const metadata = new grpc.Metadata();
    if (token) {
        metadata.add('authorization', `Bearer ${token}`);
    }

    retryGrpcCall(facultyGradesClient.ListMyOfferings.bind(facultyGradesClient), {}, metadata, (err, response) => {
        if (err) {
            return res.render('faculty', {
                offerings: [],
                error: 'Faculty Grades service unavailable.  Please try again later.',
            });
        }
        const offerings = response.offerings || [];
        res.render('faculty', { offerings, error: null });
    });
});

router.get('/faculty/courses/:courseCode-:section-:offeringId', requireAuth('faculty'), (req, res) => {
    const token = req.cookies.token;

    const metadata = new grpc.Metadata();
    if (token) {
        metadata.add('authorization', `Bearer ${token}`);
    }

    const { offeringId } = req.params;

    retryGrpcCall(facultyGradesClient.ListStudents.bind(facultyGradesClient), {offeringId}, metadata, (err, response) => {
        if (err) {
            return res.render('upload-grades', {
                data: [],
                error: 'Faculty Grades service unavailable.  Please try again later.',
            });
        }
        res.render('upload-grades', { data: response, error: null });
    });
});

router.post('/faculty/grades-:courseCode-:section', requireAuth('faculty'), (req, res) => {
    const token = req.cookies.token;
    const { enrollmentId, grade, offeringId } = req.body;
    const { courseCode, section } = req.params;

    const metadata = new grpc.Metadata();
    if (token) {
        metadata.add('authorization', `Bearer ${token}`);
    }
        
    retryGrpcCall(facultyGradesClient.SetGrade.bind(facultyGradesClient), { enrollmentId: Number(enrollmentId), grade: String(grade) }, metadata, (err, response) => {
        res.redirect(`/faculty/courses/${courseCode}-${section}-${offeringId}`);
    });
});

module.exports = router;