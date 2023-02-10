module.exports = (req, res, next) => {
    if (req.session.passport.user[0].userType !== 'Fan') {
        return res.redirect('/signin');
    } else if (req.session.user[0].userType !== 'Fan') {
        return res.redirect('/signin');
    }
    next();
}