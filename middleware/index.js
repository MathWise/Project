const middleware = {
    // Ensures the user is logged in
    ensureLoggedIn: (req, res, next) => {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash("warning", "Please log in first to continue");
        res.redirect("/login"); // Redirect to the login page
    },

    ensureRoomAccess: (req, res, next) => {
        const roomId = req.params.roomId;

        // Check if the user has access to the room in the session
        if (req.session.roomAccess && req.session.roomAccess[roomId]) {
            return next(); // User has access, proceed to the next middleware
        }

        // Redirect to homeAdmin if access is not granted
        req.flash('warning', 'Please enter the room password to access this page.');
        res.redirect('/admin/homeAdmin');
    },

    // Ensures the user is an admin
    ensureAdminLoggedIn: (req, res, next) => {
          console.log("Is user authenticated?", req.isAuthenticated());
        if (!req.isAuthenticated()) {
            console.log("User is not authenticated, redirecting to login");
            req.session.returnTo = req.originalUrl; // Store original URL for post-login redirect
            req.flash("warning", "Please log in first to continue");
            return res.redirect("/login"); // Redirect to login
        }
    
        if (req.user.role !== "admin") {
            console.log("User is not an admin, redirecting to homeUser");
            req.flash("warning", "This route is allowed for admin only!");
            return res.redirect("/user/homeUser"); // Redirect non-admin users
        }
        console.log("User is authenticated and is an admin");
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
            return res.redirect("/login"); // Redirect to the admin home page
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
