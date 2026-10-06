const { Router } = require("express");
const validate = require("../middlewares/validate");
const userController = require("../controllers/userController");
const {
  updateProfileBody,
  changePasswordBody,
  deleteAccountBody,
} = require("../validators/authSchemas");

const router = Router();

router.get("/me", userController.me);
router.put("/me", validate({ body: updateProfileBody }), userController.updateMe);
router.put("/me/password", validate({ body: changePasswordBody }), userController.changePassword);
router.delete("/me", validate({ body: deleteAccountBody }), userController.deleteMe);

module.exports = router;
