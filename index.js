const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const mg = require("nodemailer-mailgun-transport");
require("dotenv").config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const port = 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://accounting_service:3zq2u6aDn2YjtAcr@cluster0.ugczoqc.mongodb.net/?retryWrites=true&w=majority`;
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.twtll.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// function sendBookingEmail(booking) {
//     const { email, treatment, appointmentDate, slot } = booking;

//     const auth = {
//         auth: {
//           api_key: process.env.EMAIL_SEND_KEY,
//           domain: process.env.EMAIL_SEND_DOMAIN
//         }
//       }

//       const transporter = nodemailer.createTransport(mg(auth));

//     // let transporter = nodemailer.createTransport({
//     //     host: 'smtp.sendgrid.net',
//     //     port: 587,
//     //     auth: {
//     //         user: "apikey",
//     //         pass: process.env.SENDGRID_API_KEY
//     //     }
//     // });
//       console.log('sending email', email)
//     transporter.sendMail({
//         from: "jhankar.mahbub2@gmail.com", // verified sender email
//         to: email || 'jhankar.mahbub2@gmail.com', // recipient email
//         subject: `Your appointment for ${treatment} is confirmed`, // Subject line
//         text: "Hello world!", // plain text body
//         html: `
//         <h3>Your appointment is confirmed</h3>
//         <div>
//             <p>Your appointment for treatment: ${treatment}</p>
//             <p>Please visit us on ${appointmentDate} at ${slot}</p>
//             <p>Thanks from Doctors Portal.</p>
//         </div>

//         `, // html body
//     }, function (error, info) {
//         if (error) {
//             console.log('Email send error', error);
//         } else {
//             console.log('Email sent: ' + info);
//         }
//     });
// }

// function verifyJWT(req, res, next) {

//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//         return res.status(401).send('unauthorized access');
//     }

//     const token = authHeader.split(' ')[1];

//     jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
//         if (err) {
//             return res.status(403).send({ message: 'forbidden access' })
//         }
//         req.decoded = decoded;
//         next();
//     })

// }

async function run() {
  try {
    const serviceCollection = client
      .db("accounting_service")
      .collection("services");
    const ordersCollection = client
      .db("accounting_service")
      .collection("orders");
    const reviewCollection = client
      .db("accounting_service")
      .collection("review");
    const adminCollection = client.db("accounting_service").collection("admin");

    //get all services
    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });
    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    //get request for all orders

    //   app.get("/orders", async (req, res) => {
    //     const query = {};
    //     const cursor = ordersCollection.find(query);
    //     const orders = await cursor.toArray();
    //     res.send(orders);
    //   });

    app.get("/orders", async (req, res) => {
      const loggedUser = req.query.loggedUser;
      const query = { email: loggedUser };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/isAdmin", async (req, res) => {
      const loggedUser = req.query.loggedUser;

      console.log(loggedUser);
      const query = { email: loggedUser };
      const result = await adminCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    // app.get("/isAdmin", (req, res) => {
    //   const email = req.body.email;
    //   console.log(email);
    //   adminCollection.find({ email: email }).toArray((err, admin) => {
    //     res.send(admin.length > 0);
    //   });
    // });

    //Patch request for updating information

    //update API for OrderInfoCollection
    app.patch("/updateStatusForOrders/:id", async (req, res) => {
      const id = req.params.id;
      const newStatus = req.body.status;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: { status: newStatus },
      };

      const result = await ordersCollection.updateOne(
        filter,
        updateDoc,
        option
      );

      let finalRes;
      if (result.modifiedCount) {
        const query = {};
        const cursor = ordersCollection.find(query);
        const updatedResult = await cursor.toArray();
        finalRes = {
          data: updatedResult,
          success: true,
          message: "Data Successfully Updated",
        };
      } else {
        finalRes = {
          data: [],
          success: false,
          message: "Something Went wrong",
        };
      }
      res.send({ result: finalRes });
    });

    app.post("/addReview", (req, res) => {
      console.log(req.body);
      const review = req.body;

      reviewCollection.insertOne(review).then((result) => {
        res.send(result.acknowledged);
      });
    });

    app.post("/addAdmin", (req, res) => {
      const admin = req.body;
      console.log(admin);
      adminCollection.insertOne(admin).then((result) => {
        res.send(result.acknowledged);
      });
    });

    app.delete("/delete/:id", (req, res) => {
      serviceCollection
        .deleteOne({ _id: new ObjectId(req.params.id) })
        .then((result) => {
          res.send(result.deletedCount > 0);
        });
    });

    //create a post request for adding order

    app.post("/addOrder", (req, res) => {
      const orders = req.body;
      ordersCollection.insertOne(orders).then((result) => {
        res.send(result.acknowledged);
      });
    });

    // create a post request for service

    app.post("/addService", (req, res) => {
      const file = req.files.file;
      const name = req.body.name;
      const description = req.body.description;
      const price = req.body.price;
      const newImg = file.data;
      const encImg = newImg.toString("base64");

      var image = {
        contentType: file.mimetype,
        size: file.size,
        img: Buffer.from(encImg, "base64"),
      };
      console.log(image);
      serviceCollection
        .insertOne({ name, description, image, price })
        .then((result) => {
          res.send(result.acknowledged);
          // res.send(result.insertedCount > 0);
        });
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("doctors portal server is running");
});

app.listen(port, () => console.log(`Doctors portal running on ${port}`));
