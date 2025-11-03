const auth = require('../auth');
const bcrypt = require('bcryptjs');
const db = require('../db'); // <- NEW: talk to DB via DatabaseManager

getLoggedIn = async (req, res) => {
  try {
    let userId = auth.verifyUser(req);
    if (!userId) {
      return res.status(200).json({
        loggedIn: false,
        user: null,
        errorMessage: "?"
      });
    }

    // NEW: DB-agnostic lookup
    const loggedInUser = await db.getUserById(String(userId));
    console.log("loggedInUser: ", loggedInUser);

    if (!loggedInUser) {
      return res.status(200).json({
        loggedIn: false,
        user: null,
        errorMessage: "?"
      });
    }

    return res.status(200).json({
      loggedIn: true,
      user: {
        firstName: loggedInUser.firstName,
        lastName: loggedInUser.lastName,
        email: loggedInUser.email
      }
    });
  } catch (err) {
    console.log("err: " + err);
    res.json(false);
  }
}

loginUser = async (req, res) => {
  console.log("loginUser");
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ errorMessage: "Please enter all required fields." });
    }

    // NEW: DB-agnostic lookup
    const existingUser = await db.getUserByEmail(email);
    console.log("existingUser: ", existingUser);
    if (!existingUser) {
      return res
        .status(401)
        .json({
          errorMessage: "Wrong email or password provided."
        });
    }

    console.log("provided password: " + password);
    const passwordCorrect = await bcrypt.compare(password, existingUser.passwordHash);
    if (!passwordCorrect) {
      console.log("Incorrect password");
      return res
        .status(401)
        .json({
          errorMessage: "Wrong email or password provided."
        });
    }

    // LOGIN THE USER
    const idForToken = String(existingUser._id || existingUser.id);
    const token = auth.signToken(idForToken);
    console.log(token);

    // Keep your original cookie behavior
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: true
    }).status(200).json({
      success: true,
      user: {
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        email: existingUser.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send();
  }
}

logoutUser = async (_req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    secure: true,
    sameSite: "none"
  }).send();
}

registerUser = async (req, res) => {
  console.log("REGISTERING USER IN BACKEND");
  try {
    const { firstName, lastName, email, password, passwordVerify } = req.body;
    console.log("create user: " + firstName + " " + lastName + " " + email + " " + password + " " + passwordVerify);

    if (!firstName || !lastName || !email || !password || !passwordVerify) {
      return res
        .status(400)
        .json({ errorMessage: "Please enter all required fields." });
    }
    console.log("all fields provided");

    if (password.length < 8) {
      return res
        .status(400)
        .json({
          errorMessage: "Please enter a password of at least 8 characters."
        });
    }
    console.log("password long enough");

    if (password !== passwordVerify) {
      return res
        .status(400)
        .json({
          errorMessage: "Please enter the same password twice."
        });
    }
    console.log("password and password verify match");

    // NEW: DB-agnostic uniqueness check
    const existingUser = await db.getUserByEmail(email);
    console.log("existingUser: ", existingUser);
    if (existingUser) {
      return res
        .status(400)
        .json({
          success: false,
          errorMessage: "An account with this email address already exists."
        });
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);
    console.log("passwordHash: " + passwordHash);

    // NEW: DB-agnostic create
    const savedUser = await db.createUser({ firstName, lastName, email, passwordHash });
    console.log("new user saved: ", savedUser && (savedUser._id || savedUser.id));

    // LOGIN THE USER
    const idForToken = String(savedUser._id || savedUser.id);
    const token = auth.signToken(idForToken);
    console.log("token:" + token);

    await res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    }).status(200).json({
      success: true,
      user: {
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email
      }
    });

    console.log("token sent");
  } catch (err) {
    console.error(err);
    res.status(500).send();
  }
}

module.exports = {
  getLoggedIn,
  registerUser,
  loginUser,
  logoutUser
};
