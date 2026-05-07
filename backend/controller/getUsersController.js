const db = require("../db");



const getUsers = async (req, res) => {
  try {
    const [result] = await db.execute("SELECT * FROM users");
    res.json({ success: true, results: result });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
};
 