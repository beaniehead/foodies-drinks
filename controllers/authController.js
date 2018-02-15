const passport = require("passport");
const crypto = require("crypto");
const mongoose = require("mongoose");

const User = mongoose.model("User");
const promisify = require("es6-promisify");
const mail = require("../handlers/mail");

exports.login = passport.authenticate("local", {
  failureRedirect: "/login",
  failureFlash: "Failed Login!",
  successRedirect: "/",
  successFlash: "You are now logged in!"
});

exports.logout = (req, res) => {
  req.logout();
  req.flash("flash", "You are logged out!");
  res.redirect("/");
};

exports.isLoggedIn = (req, res, next) => {
  // first check the user is authenticated
  if (req.isAuthenticated()) {
    next(); // carry on, they are logged in
    return;
  }
  req.flash("error", "Oops, you must be logged in to do that");
  res.redirect("/login");
};

exports.forgot = async (req, res) => {
  // 1. See if the user email exists
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash("success", "If an account with this email exists, a password reset has been emailed to you!");
    return res.redirect("/login");
  }
  // 2. Set reset tokens and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();
  // 3. Send them an email with the token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;

  await mail.send({
    user,
    filename: "password-reset",
    subject: "Password Reset",
    resetURL
  });

  req.flash("success", "If an account with this email exists, a password reset has been emailed to you!");
  // 4. Redirect to the login page
  res.redirect("/login");
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash("error", "Password reset is invalid or has expired");
    return res.redirect("/login");
  }
  // If there is a user, show the reset password form
  res.render("reset", { title: "Reset your password" });
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body["password-confirm"]) {
    next();
    return;
  }
  req.flash("error", "Passwords to not match!");
  res.redirect("back");
};

exports.updatePassword = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash("error", "Password reset is invalid or has expired");
    return res.redirect("/login");
  }
  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined; // removes field from user in DB
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash("success", "Nice, your password has been reset");
  res.redirect("/");
};
