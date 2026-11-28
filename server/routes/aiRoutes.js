const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { protect, requireFounder } = require("../middleware/authMiddleware");

router.post("/navigate", aiController.navigate);
router.post("/draft-collection", protect, aiController.draftCollection);
router.post("/ask-ledger", protect, aiController.askLedger);
router.get("/collections/:id/insights", protect, aiController.collectionInsights);
router.get("/admin/fraud-radar", protect, requireFounder, aiController.fraudRadar);

module.exports = router;
