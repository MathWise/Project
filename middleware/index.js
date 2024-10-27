const middleware = {
    // Ensures the user is logged in
    ensureLoggedIn: (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash("warning", "Please log in first to continue");
        res.redirect("/login"); // Redirect to the login page
    },

    // Ensures the user is an admin
    ensureAdminLoggedIn: (req, res, next) => {
        if (!req.isAuthenticated()) {
            req.session.returnTo = req.originalUrl;
            req.flash("warning", "Please log in first to continue");
            return res.redirect("/login"); // Redirect to the login page
        }
        if (req.user.role !== "admin") {
            req.flash("warning", "This route is allowed for admin only!");
            return res.redirect("/user/homeUser"); // Redirect to the student home page
        }
        next();
    },

    // Ensures the user is a student
    ensureStudentLoggedIn: (req, res, next) => {
        if (!req.isAuthenticated()) {
            req.session.returnTo = req.originalUrl;
            req.flash("warning", "Please log in first to continue");
            return res.redirect("/login"); // Redirect to the login page
        }
        if (req.user.role !== "student") {
            req.flash("warning", "This route is allowed for students only!");
            return res.redirect("/user/homeUser"); // Redirect to the admin home page
        }
        next();
    },

    // Ensures the user is not logged in (for routes like signup, login, etc.)
    ensureNotLoggedIn: (req, res, next) => {
        if (req.isAuthenticated()) {
            req.flash("warning", "Please log out first to continue");
            if (req.user.role === "admin") {
                return res.redirect("/admin/homeAdmin"); // Redirect to admin dashboard
            }
            if (req.user.role === "student") {
                return res.redirect("/user/homeUser"); // Redirect to student dashboard
            }
        }
        next();
    }
};

module.exports = middleware;
