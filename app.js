const express = require("express");
const app = express();
const path = require("path");
const userModel = require("./models/user.js");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const postModel = require("./models/post.js");
const upload = require("./configs/multerconfigs.js");
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
    return res.status(500).send("Username already taken");
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
      res.redirect("profile");
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

app.get("/post", isLoggedIn, (req, res) => {
  res.render("login");
});

app.post("/post", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let post = await postModel.create({
    user: user._id,
    content: req.body.content,
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOneAndUpdate(
    { _id: req.params.id },
    { content: req.body.content }
  );
  res.redirect("/profile");
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let posts = await postModel.find({ user: user._id });
  res.render("profile", { user, posts });
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }
  await post.save();
  res.redirect("/profile");
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
  let post = await postModel.findOne({ _id: req.params.id }).populate("user");
  console.log(post);
  res.render("edit", { post });
});

app.get("/editProfile", isLoggedIn, (req, res) => {
  res.render("editProfile");
});

app.post(
  "/change",
  isLoggedIn,
  upload.single("profilePic"),
  async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    user.profilePic = req.file.filename;
    await user.save();
    res.redirect("/profile");
  }
);

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

app.listen(3000, () => {
  console.log(`Server is running on port 3000`);
});
