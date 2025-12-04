export const errorHandler = (err, req, res, next) => {
    console.log("ERROR:", err);

    // ----- Default Error Setup -----
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

    // ------------ Decide JSON or HTML ------------
    const wantsJSON =
        req.xhr ||
        req.headers.accept?.includes("application/json") ||
        req.originalUrl.startsWith("/api");

    // API → send real error message
    if (wantsJSON) {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message, // APIs need real error
        });
    }

    // ------------ HTML Error Page (Safe Message Only) ------------
    const userSafeMessage =
        err.statusCode === 404
            ? "Page Not Found"
            : err.statusCode === 401
                ? "Unauthorized Access"
                : err.statusCode === 400
                    ? "Bad Request"
                    : "Something went wrong. Please try again later.";

    return res.status(err.statusCode).render("errorPage", {
        message: userSafeMessage,
        statusCode: err.statusCode,
    });
};
