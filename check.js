const { MongoClient } = require("mongodb");

// Replace with your MongoDB connection string
const uri =
  "mongodb+srv://Meena:Meena%4010@cluster-1.vbhkoy1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster-1"; // For local MongoDB
// const uri = "mongodb+srv://your-username:your-password@cluster0.mongodb.net"; // For MongoDB Atlas

async function checkConnection() {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log("✅ MongoDB connected successfully!");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  } finally {
    await client.close();
  }
}

// Run the function
checkConnection();
