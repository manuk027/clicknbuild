export const errorHandler = (err, req, res, next) => {
    console.log("ERROR:", err);

    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    // ----- Mongoose & JWT Common Errors -----
    if (err.name === "ValidationError") {
        err.message = Object.values(err.errors).map(el => el.message).join(", ");
        err.statusCode = 400;
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue);
        err.message = `${field} already exists`;
        err.statusCode = 400;
    }

    if (err.name === "CastError") {
        err.message = `Invalid ${err.path}: ${err.value}`;
        err.statusCode = 400;
    }

    if (err.name === "JsonWebTokenError") {
        err.message = "Invalid token. Please login again.";
        err.statusCode = 401;
    }

    if (err.name === "TokenExpiredError") {
        err.message = "Your session expired. Please login again.";
        err.statusCode = 401;
    }

    // ------------ HTML vs JSON Handling ------------
    const wantsJSON =
        req.xhr ||                                // AJAX calls
        req.headers.accept?.includes("application/json") ||
        req.originalUrl.startsWith("/api");       // Your API routes

    // If the request expects JSON -> return JSON
    if (wantsJSON) {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
        });
    }

    // Otherwise -> render your HTML error page
    return res.status(err.statusCode).render("errorPage", {
        message: err.message,
        statusCode: err.statusCode,
    });
};
