module.exports = (req, res, next) => {
    console.log(req)
    if (req.session.passport.user[0].userType !== 'Fan') {
        return res.redirect('/signin');
    }
    next();
}