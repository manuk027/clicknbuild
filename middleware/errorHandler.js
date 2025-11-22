export const errorHandler = (err, req, res, next) => {
    console.log("ERROR:", err);
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";
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
    return res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
    });
};
