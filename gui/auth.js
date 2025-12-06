const jwt = require('jsonwebtoken');

function attachUser(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        req.user = null;
    }

    next();
}

function requireAuth(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.redirect('/login');
        }
        if (role && req.user.role !== role) {
            return res.status(403).render('error', {message: 'Forbidden'});
        }
        next();
    }
}

module.exports = { attachUser, requireAuth };