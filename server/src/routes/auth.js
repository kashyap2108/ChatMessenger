const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const keys = require("../../../config/keys");

// Load Input Validation
const validateRegisterInput = require("../validations/register");
const validateLoginInput = require("../validations/login");

// Load User Model
const User = require("../models/User");
const Channel = require("../models/Channel");
const Message = require("../models/Message");

// @route GET /
// @desc Tests users Auth route
// @access Public

router.get("/", (req, res) => {
  res.json({ msg: "Auth Route Works!!" });
});

// @route POST/login
// @desc Authenticate user details and redirect to respective page
// @access Private

router.post("/login", (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);

  // Check Validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  // Find user by email

  User.findOne({ email }).then(user => {
    // Check for user
    if (!user) {
      errors.email = "User not found!!";
      return res.status(404).json(errors);
    }

    // Check password
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        // User Matched
        const payload = { id: user.id, username: user.username }; // Create JWT Payload

        // Sign Token
        // console.log(payload, "hello");

        user = user.toObject();
        delete user.password;
        console.log(user);

        jwt.sign(
          payload,
          keys.secretOrKey,
          { expiresIn: 3600 },
          (err, token) => {
            res.json({
              user: user,
              token: "Bearer " + token
            });
          }
        );
      } else {
        errors.password = "Password incorrect";
        return res.status(400).json(errors);
      }
    });
  });
});

// @route POST /register
// @desc  Register User
// @access Public

router.post("/register", (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);
  // Check Form Validation

  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      errors.email = "Email already exists!!";
      return res.status(400).json(errors);
    } else {
      const newUser = new User({
        email: req.body.email,
        password: req.body.password,
        name: req.body.name
      });

      console.log(newUser);
      // Hash Password..
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(user => res.json(user))
            .catch(err => console.log(err));
        });
      });
    }
  });
});

// @route GET/users/auth/current
// @desc  Return current user
// @access Private

router.get(
  "/current",
  passport.authenticate("user-passport", { session: false }),
  (req, res) => {
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email
    });
  }
);

router.post("/search", (req, res) => {
  const keyword = req.body.search;
  console.log(keyword);

  const regex = new RegExp(keyword, "i");
  const query = {
    $or: [{ name: { $regex: regex } }]
  };
  User.find(query)
    .then(results => {
      return res.json(results);
    })
    .catch(err => console.log(err));
});
// @route GET/users/logout
// @desc  Logout user
// @access Private

router.get(`/channels/:id`, (req, res) => {
  const channelId = _.get(req, "params.id");
  if (!channelId) {
    return res.status(404).json({ error: { message: "Channel not found" } });
  }
  Channel.findById(channelId).then(channel => {
    const members = channel.members;
    const query = {
      _id: { $in: members }
    };
    const options = { _id: 1, name: 1, created: 1 };
    User.find(query, options)
      .then(users => {
        channel.users = users;
        return res.status(200).json(channel);
      })
      .catch(err => {
        return res.status(404).json({ error: { message: "Not found!" } });
      });
  });
});

router.get(
  "/me/channels",
  passport.authenticate("user-passport", { session: false }),
  (req, res) => {
    const { user } = req;
    console.log("User Id", user._id);
    const query = {
      members: { $all: [user._id] }
    };

    Channel.find(query)
      .populate("members", ["_id", "name", "created"])
      .then(channels => {
        return res.json(channels);
      })
      .catch(err => {
        return res
          .status(400)
          .json({ error: { channels: "channels not found!" } });
      });
  }
);

router.get(
  `/api/channels/:id/messages`,
  passport.authenticate("user-passport", { session: false }),
  (req, res) => {
    const channelId = req.params.id;

    Message.find({ channelId })
      .populate("user", ["_id", "email", "name", "online"])
      .then(messages => {
        return res.json(messages);
      })
      .catch(err => {
        return res
          .status(400)
          .json({ error: { messages: "messages not found!!" } });
      });
  }
);
router.get("/logout", (req, res) => {
  req.logout();
});

module.exports = router;
