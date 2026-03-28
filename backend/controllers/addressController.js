const Address = require("../models/Address");

/* ================= LIST ADDRESS ================= */

exports.list = async (req, res) => {

  const data = await Address.findOne({
    user: req.user.id
  });

  res.json(data ? data.items : []);

};

/* ================= ADD ADDRESS ================= */

exports.add = async (req, res) => {
  try {

    const { fullName, phone, address, city } = req.body;

    let userAddress = await Address.findOne({
      user: req.user.id
    });

    if (!userAddress) {

      userAddress = new Address({
        user: req.user.id,
        items: []
      });

    }

    const isFirst = userAddress.items.length === 0;

    userAddress.items.push({
      fullName,
      phone,
      address,
      city,
      isDefault: isFirst
    });

    await userAddress.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= SET DEFAULT ================= */

exports.setDefault = async (req, res) => {

  const { id } = req.params;

  const data = await Address.findOne({
    user: req.user.id
  });

  data.items.forEach(a => {
    a.isDefault = a._id.toString() === id;
  });

  await data.save();

  res.json({ success: true });

};

/* ================= DELETE ================= */

exports.delete = async (req, res) => {

  const { id } = req.params;

  await Address.updateOne(
    { user: req.user.id },
    { $pull: { items: { _id: id } } }
  );

  res.json({ success: true });

};