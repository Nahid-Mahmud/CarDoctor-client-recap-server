const express = require("express");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
var cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
      // "http://localhost:5173",
      "https://car-doctor-nahid.surge.sh",
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// custom Middle Ware

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Access Denied" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Access Denied" });
    }

    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_Pass}@cluster0.htztern.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const dbConnect = async () => {
  try {
    client.connect();
    console.log("DB Connected Successfully✅");
  } catch (error) {
    console.log(error.name, error.message);
  }
};
dbConnect();

const serviceCollection = client.db("carDoctor").collection("services");
const bookingCollection = client.db("carDoctor").collection("bookings");

app.get("/", (req, res) => {
  res.send("doctor is running");
});
// auth related api jwt
app.post("/jwt", async (req, res) => {
  const user = req.body;
  console.log("user for token", user);
  const secret = process.env.ACCESS_TOKEN_SECRET;
  const token = jwt.sign(user, secret, { expiresIn: "1800s" });
  res
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    })
    .send({ status: true });
});
// ismailjosim99@gmail.comreca
app.post("/logout", async (req, res) => {
  const user = req.body;
  console.log("Loogged out", user);
  res.clearCookie("token", { maxAge: 0 }).send({ success: true });
});

// services api

app.get("/services", async (req, res) => {
  const cursor = serviceCollection.find();
  const result = await cursor.toArray();
  res.send(result);
});

app.get("/services/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };

  const options = {
    // Include only the `title` and `imdb` fields in the returned document
    projection: { title: 1, price: 1, service_id: 1, img: 1 },
  };

  const result = await serviceCollection.findOne(query, options);
  res.send(result);
});

// bookings
app.get("/bookings", verifyToken, async (req, res) => {
  const email = req.query.email;

  if (!email) {
    res.send([]);
  }

  // check valid user
  const decodedEmail = req.decoded.email;
  if (email !== decodedEmail) {
    res.status(403).send({ message: "Forbidden Access" });
  }
  const query = { email: email };
  const result = await bookingCollection.find(query).toArray();
  res.send(result);
});

app.post("/bookings", async (req, res) => {
  const booking = req.body;
  // console.log(booking);
  const result = await bookingCollection.insertOne(booking);
  res.send(result);
});

app.patch("/bookings/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedBooking = req.body;
  // console.log(updatedBooking);
  const updateDoc = {
    $set: {
      status: updatedBooking.status,
    },
  };
  const result = await bookingCollection.updateOne(filter, updateDoc);
  res.send(result);
});

app.delete("/bookings/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await bookingCollection.deleteOne(query);
  res.send(result);
});

app.listen(port, () => {
  console.log(`Car Doctor Server is running on port ${port}`);
});
