const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const ws = require("ws");
const User = require("./models/User");
const Message = require("./models/Message");

dotenv.config();

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  console.log("database connected");
}
const jwtSecret = process.env.SECRET_KEY;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000",
  })
);

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json("no token");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const passOk = bcrypt.compareSync(password, foundUser.password);
    if (passOk) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          res.cookie("token", token, { sameSite: "none", secure: true }).json({
            id: foundUser._id,
          });
        }
      );
    }
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = bcrypt.hashSync(password, bcryptSalt);

  const createdUser = await User.create({
    username: username,
    password: hashedPassword,
  });
  //{} in jwt.sign we can define type of algorithm for encryption of the code
  jwt.sign(
    { userId: createdUser._id, username },
    jwtSecret,
    {},
    (err, token) => {
      if (err) throw err;
      res.cookie("token", token, { sameSite: "none", secure: true }).json({
        id: createdUser._id,
      });
    }
  );
});

const server = app.listen(4040, () => {
  console.log("server is running on the port 4040");
});

const wss = new ws.WebSocketServer({ server }); //ws is just a library

wss.on("connection", (connection, req) => {


  //read username and id from the cookie for this connection , whoever sends a message sets a connection as of now
  const cookies = req.headers.cookie;
  if (cookies) {
    // console.log(cookies);
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token"));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }
  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    const { recipient, text } = messageData;
    if (recipient && text) {
      const messageDoc = await Message.create({
        sender:connection.userId,
        recipient,
        text,
       
      });
      console.log('created message');
      [...wss.clients]
        .filter(c => c.userId === recipient)
        .forEach(c => c.send(JSON.stringify({
          text,
          sender:connection.userId,
          recipient,
           _id: messageDoc._id,
        }))); //same person can send messages to many people(recepient) one by mobile other by laptop
    }
  });

  //to show online peopl
  [...wss.clients].forEach((client) => {
    // console.log(client.username);
    client.send(
      JSON.stringify({
        online: [...wss.clients].map((c) => ({
          userId: c.userId,
          username: c.username,
        })),
      })
    );
  });
});
