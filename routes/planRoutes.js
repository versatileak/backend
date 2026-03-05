const express = require("express");

const router = express.Router();

// GET Plans
router.get("/plans", (req, res) => {
  res.json({
    status: "success",
    plans: [
      {
        id: "free",
        name: "Free Plan",
        price: 0,
        features: [
          "5 Niches Access",
          "Basic AI Script",
          "Limited Access"
        ]
      },
      {
        id: "pro",
        name: "Pro Plan",
        price: 999,
        features: [
          "Unlimited Niches",
          "AI Script Generator",
          "Premium Support"
        ]
      }
    ]
  });
});

module.exports = router;