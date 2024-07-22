// Importing required modules
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const { Schema } = mongoose;
require("dotenv").config();

// Connecting to MongoDB using the MONGO_KEY environment variable
mongoose.connect(process.env.MONGO_KEY);

// Defining the user schema
const userSchema = new Schema({
  username: { type: String, required: true }, // username is a required string field
});

// Creating a mongoose model for the user schema
const user = mongoose.model("user", userSchema);

// Defining the exercise schema
const exerciseSchema = new Schema({
  userid: { type: String, required: true }, // userid is a required string field
  description: String, // description is an optional string field
  duration: Number, // duration is an optional number field
  date: Date, // date is an optional date field
});

// Creating a mongoose model for the exercise schema
const exercise = mongoose.model("exercise", exerciseSchema);

// Enabling CORS (Cross-Origin Resource Sharing) for the app
app.use(cors());

// Serving static files from the "public" directory
app.use(express.static("public"));

// Parsing URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Parsing JSON request bodies
app.use(express.json());

// Serving the index.html file when the root URL is accessed
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Starting the server and listening on the specified port
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// Handling POST requests to create a new user
app.post("/api/users", (req, res) => {
  const username = req.body.username;
  const User = new user({
    username: username,
  });
  User.save(); // saving the new user to the database
  res.json(User); // returning the newly created user as JSON
});

// Handling POST requests to create a new exercise for a user
app.post("/api/users/:_id/exercises", (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  // Finding the user with the specified ID
  user
    .findById(id)
    .then((User) => {
      if (!User) {
        res.send("No user with that ID in database");
      } else {
        // Creating a new exercise for the user
        const Exercise = new exercise({
          userid: User._id,
          description: description,
          duration: duration,
          date: date ? new Date(date) : new Date(), // using the provided date or the current date
        });
        Exercise.save() // saving the new exercise to the database
          .then((exercise) => {
            res.json({
              _id: User._id,
              username: User.username,
              description: exercise.description,
              duration: exercise.duration,
              date: new Date(exercise.date).toDateString(), // formatting the date as a string
            });
          })
          .catch((err) => {
            res
              .status(500)
              .json({ error: "Error occurred while saving exercise" });
          });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: "Error occurred while retrieving user" });
    });
});

// Handling GET requests to retrieve a user's exercise log
app.get("/api/users/:_id/logs", (req, res) => {
  const id = req.params._id;
  const { from, to, limit } = req.query;

  // Finding the user with the specified ID
  user
    .findById(id)
    .then((User) => {
      if (!User) {
        res.send("No user with that ID in database");
        return;
      }

      let DateO = {};

      if (from) {
        DateO["$gte"] = new Date(from); // filtering exercises with dates greater than or equal to the provided from date
      }
      if (to) {
        DateO["$lte"] = new Date(to); // filtering exercises with dates less than or equal to the provided to date
      }
      let criterium = { userid: id };
      if (from || to) {
        criterium.date = DateO; // adding the date filter to the query
      }

      // Finding exercises for the user with the specified filters
      exercise
        .find(criterium)
        .limit(+limit ?? 500) // limiting the number of exercises to the provided limit or 500 by default
        .exec()
        .then((exercises) => {
          if (!exercises) {
            res.send("No exercises found for this user");
            return;
          }

          // Formatting the exercises as a log
          const userLog = exercises.map((exercise) => ({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString(),
          }));

          res.json({
            username: User.username,
            count: exercises.length,
            _id: User._id,
            log: userLog,
          });
        })
        .catch((err) => {
          res
            .status(500)
            .json({ error: "Error occurred while retrieving exercises" });
        });
    })
    .catch((err) => {
      res.status(500).json({ error: "Error occurred while retrieving user" });
    });
});

// Handling GET requests to retrieve all users
app.get("/api/users", (req, res) => {
  user
    .find()
    .then((users) => {
      res.json(users);
    })
    .catch((err) => {
      res
        .status(500)
        .json({ error: "Error occurred while retrieving user information" });
    });
});
