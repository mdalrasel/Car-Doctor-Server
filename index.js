const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())


// Replace the uri string with your connection string.

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9md8lgk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// middleware
const logger = async (req, res, next) => {
  console.log('called', req.host, req.originalUrl);
  next()
}

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log('value of token in middleware', token)
  if (!token) {
    return res.status(401).send({ message: 'not authorized' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthurized' })
    }
    console.log('value in the token ', decoded)
    req.user = decoded;
    next()
  })

}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carsDoctor').collection('services');
    const checkOutCollection = client.db('carsDoctor').collection('checkOut');

    // auth releted api
    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '12h' })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true })
    })


    app.get('/services', logger, async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const options = {
        projection: { service_id: 1, title: 1, price: 1, img: 1 }
      }
      const result = await serviceCollection.findOne(query, options)
      res.send(result)
    })


    app.get('/checkOut', logger, verifyToken, async (req, res) => {
      console.log(req.query.email)
      // console.log('token', req.cookies.token)
      console.log('user in the from valid token', req.user)

      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'Forbidden access' })
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await checkOutCollection.find().toArray();
      res.send(result)
    })

    app.post('/checkOut', async (req, res) => {
      const checkOut = req.body;
      console.log(checkOut);

      const result = await checkOutCollection.insertOne(checkOut)
      res.send(result)
    })


    app.patch('/checkOut/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedData = req.body;
      console.log(updatedData);
      const updateDoc = {
        $set: {
          status: updatedData.status
        },
      };
      const result = await checkOutCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.delete('/checkOut/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await checkOutCollection.deleteOne(query);
      res.send(result)

    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Doctor is Running')
})
app.listen(port, () => {
  console.log(`Car Doctor Server is Running on PORT  ${port}`)
})