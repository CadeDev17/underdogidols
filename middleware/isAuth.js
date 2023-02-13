module.exports = (req, res, next) => {
    if (!req.session.isLoggedIn || req.session.passport.user[0].userType !== 'Fan') {
        return res.redirect('/signin');
    }
    next();
}