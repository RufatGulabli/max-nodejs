const { validationResult } = require("express-validator/check");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  console.log(email);
  const name = req.body.name;
  const password = req.body.password;
  bcrypt
    .hash(password, 12)
    .then(hashedPw => {
      const user = new User({
        email: email,
        password: hashedPw,
        name: name
      });
      return user.save();
    })
    .then(result => {
      res.status(201).json({ message: "User created!", userId: result._id });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        const error = new Error("A user with this email could not be found.");
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then(isEqual => {
      if (!isEqual) {
        const error = new Error("Wrong password!");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString()
        },
        "somesupersecretsecret",
        { expiresIn: "1h" }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString() });
    })
    .catch(err => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getUserStatus = (req, res, next) => {
  let token = undefined;
  try {
    token = jwt.decode(req.headers.authorization.split(" ")[1]);
  } catch (err) {
    const error = new Error("Unauthorized request.");
    error.errorStatus = 403;
    error.data = err;
    throw error;
  }
  User.findById(token.userId)
    .then(user => {
      if (!user) {
        const error = new Error("User not found.");
        error.errorStatus = 404;
        throw error;
      }
      res.status(200).json({ status: user.status });
    })
    .catch(err => {
      const error = new Error("Internal server error.");
      error.errorStatus = 500;
      error.data = err;
      next(error);
    });
};

exports.updateUserStatus = (req, res, next) => {
  console.log(req.body);
  let token = undefined;
  try {
    token = jwt.decode(req.headers.authorization.split(" ")[1]);
  } catch (err) {
    const error = new Error("Unauthorized request.");
    error.errorStatus = 403;
    error.data = err;
    throw error;
  }
  User.findById(token.userId)
    .then(user => {
      if (!user) {
        const error = new Error("User not found.");
        error.statusCode = 404;
        throw error;
      }
      user.status = req.body.status;
      return user.save();
    })
    .then(result => {
      res.status(200).json("Updated successfully");
    })
    .catch(err => {
      const error = new Error("Internal server error...");
      error.errorStatus = 500;
      error.data = err;
      next(error);
    });
};
