const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const fields = Object.keys(err.keyValue)[0];
  const value = err.keyValue[fields];

  const message = `This email is already registered. Please use a different email address.`;

  return new AppError(message, 400);
};

const handleValidationErrorDB = (err, res) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = ` ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

const sendErrorDev = (err, res) => {
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log the error
    console.error("ERROR 💥", err);

    // 2) Send generic message
    return res.status(500).json({
      status: "error",
      message:
        "Something went very wrong. Or check your internet connection and try again",
    });
  }
};

module.exports = (err, req, res, next) => {
  // check if headr have already been sent
  if (res.headerSent) {
    return next(err);
  }
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    return sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err, name: err.name, message: err.message };
    if (error.name === "CastError") {
      error = handleCastErrorDB(error);
    }

    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }

    if (error.name === "ValidationError") {
      error = handleValidationErrorDB(error);
    }

    if (error.name === "JsonWebTokenError") {
      error = handleJWTError();
    }

    if (error.name === "TokenExpiredError") {
      error = handleJWTExpiredError();
    }
    return sendErrorProd(error, res);
  }
};
