const { Router } = require("express");
const validate = require("../middlewares/validate");
const groupController = require("../controllers/groupController");
const { idParams } = require("../validators/common");
const { groupBody } = require("../validators/groupSchemas");

const router = Router();

router.get("/", groupController.index);
router.post("/", validate({ body: groupBody }), groupController.create);
router.get("/:id", validate({ params: idParams }), groupController.show);
router.put("/:id", validate({ params: idParams, body: groupBody }), groupController.update);
router.delete("/:id", validate({ params: idParams }), groupController.remove);

module.exports = router;
