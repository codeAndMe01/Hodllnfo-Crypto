const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const path = require("path");
const app = express();

app.set("view engine", "ejs");
// Set the views directory
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
const port = 5050;

// Connect to MongoDB (replace 'mongodb://localhost:27017/yourDatabase' with your MongoDB connection string)
mongoose.connect("mongodb://localhost:27017/cryptoData");

// Define a MongoDB schema for storing crypto data
const cryptoSchema = new mongoose.Schema({
  name: String,
  last: Number,
  buy: Number,
  sell: Number,
  volume: Number,
  base_unit: String,
  crypto_code: String,
});

const CryptoModel = mongoose.model("Crypto", cryptoSchema);

const fetchAndUpdateData = async () => {
  try {
    const response = await axios.get("https://api.wazirx.com/api/v2/tickers");
    const extractedData = Object.keys(response.data)
      .map((symbol) => {
        const crypto = response.data[symbol];
        return {
          name: crypto.name,
          last: parseFloat(crypto.last),
          buy: parseFloat(crypto.buy),
          sell: parseFloat(crypto.sell),
          volume: parseFloat(crypto.volume),
          base_unit: crypto.base_unit,
        };
      })
      .slice(0, 10);

    // Fetch all existing records from the database
    const existingData = await CryptoModel.find();

    // console.log(existingData.length);
    if (existingData.length === 0) {
      for (const crypto of extractedData) {
        const newCrypto = new CryptoModel({
          crypto_code: crypto.name,
          name: crypto.name.replace("/", "-"),
          last: crypto.last,
          buy: crypto.buy,
          sell: crypto.sell,
          volume: crypto.volume,
          base_unit: crypto.base_unit,
        });

        await newCrypto.save();
      }
    }

    // Update each existing record with the latest data
    for (const existingCrypto of extractedData) {
      const newData = extractedData.find((item) => {
        return item.name === existingCrypto.name;
      });

      // console.log(newData);
      if (newData) {
        // console.log('is entering');
        const existingDocument = await CryptoModel.findOne({
          crypto_code: existingCrypto.name,
        });

        if (existingDocument) {
          // Update the fields of the existing document
          existingDocument.last = newData.last;
          existingDocument.buy = newData.buy;
          existingDocument.sell = newData.sell;
          existingDocument.volume = newData.volume;
          existingDocument.base_unit = newData.base_unit;

          // Save the updated document back to the database
          await existingDocument.save();
        }
      }
    }

    return existingData;
  } catch (error) {
    console.error(error);
  }
};

// Initial fetch and store

// Set up interval to fetch and store data every minute
setInterval(fetchAndUpdateData, 60000);

// Set up interval to fetch and store data every minute

// Initial fetch and store (optional, depending on your use case)

app.get("/hodelinfo/:name", async (req, res) => {
  let { name } = req.params;

  try {
    const data = await fetchAndUpdateData();
    const selectedData = await CryptoModel.findOne({ name });
    // console.log(selectedData);
    res.render("index", { selectedData, data });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// setInterval(fetchAndStoreData, 60000);

// Retrieve stored data from MongoDB and return to the frontend
app.get("/getStoredData/:name", async (req, res) => {
  let { name } = req.params;
  // console.log(req.params);
  try {
    // Retrieve stored data from MongoDB
    const storedData = await CryptoModel.findOne({ name });

    res.json(storedData);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/getAllStoredData", async (req, res) => {
  try {
    // Retrieve stored data from MongoDB
    const storedData = await CryptoModel.find();

    res.json(storedData);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
