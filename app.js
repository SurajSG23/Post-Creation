const express = require("express");
const app = express();
const path = require("path");
const userModel = require("./models/user.js");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const postModel = require("./models/post.js");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: "true" }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/register", async (req, res) => {
  let user = await userModel.findOne({ username: req.body.username });
  let email = await userModel.findOne({ email: req.body.email });
  if (user) {
    return res.status(500).send("User Name already taken");
  }
  if (email) {
    return res.status(500).send("Email already exists");
  }

  bcrypt.genSalt(10, async (err, salt) => {
    bcrypt.hash(req.body.password, salt, async (err, hash) => {
      let user = await userModel.create({
        name: req.body.name,
        username: req.body.username,
        age: req.body.age,
        email: req.body.email,
        password: hash,
      });

      let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
      res.cookie("Token", token);
      res.send("User created successfully");
    });
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  let user = await userModel.findOne({ username: req.body.username });
  if (!user) {
    return res.status(500).send("Something went wrong");
  }
  
  bcrypt.compare(req.body.password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email: user.email, userid: user._id }, "shhhh");
      res.cookie("token", token);
      res.redirect("/profile");
    } else {
      res.status(500).send("Invalid Password");
    }
  });
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

function isLoggedIn(req, res, next) {
  let token = req.cookies.token;
  if (!token) {
    return res.redirect("/login");
  }
  let data = jwt.verify(token, "shhhh");
  if (!data) {
    return res.redirect("/login");
  }
  req.user = data;
  next();
}

app.get("/profile", isLoggedIn, (req, res) => {
  console.log(req.user);
  res.send("Profile Page");
});

app.listen(3000, () => {
  console.log(`Server is running on port 3000`);
});
