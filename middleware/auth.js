//importing necessary modules and functions
import User from "../models/userSchema.js";


//middleware for user authentication
const userAuth = (req, res, next) => {
    let userId = req.session.user || req.user?._id;
    if (userId) {
        User.findById(userId)
            .then(data => {
                if (data && !data.isBlocked) {
                    next();
                } else {
                    res.redirect('/login');
                }
            })
            .catch(err => {
                console.error("Error in user authentication");
                res.status(500).send("Internal Server error");
            })
    } else {
        res.redirect('/login');
    }
}

//middleware for admin authentication
const adminAuth = (req, res, next) => {
    User.findById(req.session.admin)
        .then(data => {
            if (data) {
                next()
            } else {
                res.redirect('/admin/login');
            }
        })
        .catch(err => {
            console.error("Error in admin authentication");
            res.status(500).send("Internal Server error");
        })
}


//exporting middlewares
export default { userAuth, adminAuth, };