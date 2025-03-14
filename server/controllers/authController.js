const { promisify } = require("util");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const User = require("./../model/userModel");
const jwt = require("jsonwebtoken");
const sendEmail = require("./../utils/email");
const crypto = require("crypto");

const signToken = (id) => {
  return jwt.sign(
    {
      id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

function createSendToken(user, statusCode, res) {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIES_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
}

exports.signup = catchAsync(async (req, res, next) => {
  const { email, password, confirmPassword } = req.body;
  // create new user from request body
  const newUser = new User({
    email,
    password,
    confirmPassword,
  });

  // Call the method to create the email verification token
  const verificationToken = newUser.createEmailVerificationToken();

  // Construct the verification link using the token
  const verificationLink = `https://alvin-devlinks.vercel.app/verify-email?token=${verificationToken}`;
  // Construct the email options
  const emailOptions = {
    email,
    subject: "Welcome to DevLinks! Confirm Your Email Address",
    message: `
    <div style="background-color: #fafafa; padding: 20px; border-radius: 10px;">
    <h1 style="color: #633cff; margin-bottom: 20px;">Welcome aboard!</h1>
    <p style="color: #737373; margin-bottom: 15px;">Greetings from DevLinks! We're thrilled to have you join our community.</p>
    <p style="color: #737373; margin-bottom: 15px;">To complete your registration and unlock all the amazing features, please click the button below to verify your email address:</p>
    <p style="text-align: center; margin-bottom: 20px;"><a href="${verificationLink}" style="background-color: #633cff; color: #fafafa; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Verify Email Address</a></p>
    <p style="color: #737373; margin-bottom: 15px;">Alternatively, you can copy and paste the following link into your browser:</p>
    <p style="color: #737373; margin-bottom: 15px;"><em>${verificationLink}</em></p>
    <p style="color: #737373; font-weight: bold;">If you didn't sign up for  DevLinks, no worries! Simply ignore this email.</p>
  </div>
    `,
  };

  // Send verification email
  await sendEmail(emailOptions);

  res.status(201).json({
    status: "success",
    message: "Verification email sent. Please verify your email address.",
  });

  // Save the user to the database
  await newUser.save();
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  // Get the token from the query string
  const { token } = req.query;

  // Convert the token to a hashed value
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find the user with the hashed token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
  });

  // Send an error response if the user is not found
  if (!user) {
    return next(new AppError("Invalid or expired verification token.", 400));
  }

  // Update the user's verification status
  user.isVerified = true;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Email verified successfully.",
  });
});

exports.login = catchAsync(async (req, res, next) => {
  // Get email and password from request body
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return next(new AppError("Please provide email and password.", 400));
  }

  // Find the user with the email in our database
  const user = await User.findOne({ email }).select("+password");

  // send an error response if the user is not found or the password is incorrect
  if (!user || !(await user.matchPassword(password, user.password))) {
    return next(new AppError("Invalid email or password.", 401));
  }
  if (!user.isVerified) {
    return next(
      new AppError(
        "Your email is not verified. Please verify your email address.",
        401
      )
    );
  }

  req.user = user;

  // Create a token for the user
  createSendToken(user, 200, res);
});

exports.protected = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }
  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token  no longer exists.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;

  next();
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return next(
      new AppError("We can't find a user with that email address.", 404)
    );
  }

  const resetPasswordToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetPasswordLink = `https://alvin-devlinks.vercel.app/reset-password?token=${resetPasswordToken}`;

  const emailOptions = {
    email,
    subject: "DevLinks - Reset Password (Expires in 10 Minutes)",
    message: `
    <div style="background-color: #fafafa; padding: 20px; border-radius: 10px;">
    <h1 style="color: #633cff; margin-bottom: 20px;">Hello there!</h1>
    <p style="color: #737373; margin-bottom: 15px;">You are receiving this email because you (or someone else) has requested to reset the password for your account.</p>
    <p style="color: #737373; margin-bottom: 15px;">To proceed with the password reset process, please click on the button below:</p>
    <p style="text-align: center; margin-bottom: 20px;">
      <a href="${resetPasswordLink}" style="background-color: #633cff; color: #fafafa; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Reset Password</a>
    </p>
    <p style="color: #737373; margin-bottom: 15px;">Alternatively, you can copy and paste the following link into your browser:</p>
    <p style="color: #737373; margin-bottom: 15px;"><em>${resetPasswordLink}</em></p>
    <p style="color: #737373; margin-bottom: 15px;">If you did not initiate this request, please disregard this email. Your account's password will remain unchanged.</p>
    <p style="color: #737373; margin-bottom: 15px;">Please note that this link expires in 10 minutes for security purposes.</p>
  </div>
    `,
  };

  try {
    await sendEmail(emailOptions);
    res.status(200).json({
      status: "success",
      message: "Password reset email sent. Please check your email.",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "There was an error sending the password reset email. Please try again later.",
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { password, confirmPassword } = req.body;
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.query.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new AppError("Password reset token is invalid or has expired.", 400)
    );
  }

  user.password = password;
  user.confirmPassword = confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  req.user = null;
  res.clearCookie("jwt");
  res.status(200).json({
    status: "success",
    message: "Successfully logged out.",
  });
});
