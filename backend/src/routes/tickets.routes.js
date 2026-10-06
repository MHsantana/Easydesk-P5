const { Router } = require("express");
const validate = require("../middlewares/validate");
const ticketController = require("../controllers/ticketController");
const { idParams } = require("../validators/common");
const {
  createTicketBody,
  updateTicketBody,
  updateStatusBody,
  listTicketsQuery,
  commentParams,
  createCommentBody,
} = require("../validators/ticketSchemas");

const router = Router();

// Chamados
router.get("/", validate({ query: listTicketsQuery }), ticketController.index);
router.post("/", validate({ body: createTicketBody }), ticketController.create);
router.get("/:id", validate({ params: idParams }), ticketController.show);
router.put("/:id", validate({ params: idParams, body: updateTicketBody }), ticketController.update);
router.patch(
  "/:id/status",
  validate({ params: idParams, body: updateStatusBody }),
  ticketController.changeStatus,
);
router.delete("/:id", validate({ params: idParams }), ticketController.remove);

// Comentários de um chamado
router.get("/:id/comments", validate({ params: idParams }), ticketController.listComments);
router.post(
  "/:id/comments",
  validate({ params: idParams, body: createCommentBody }),
  ticketController.addComment,
);
router.delete(
  "/:id/comments/:commentId",
  validate({ params: commentParams }),
  ticketController.removeComment,
);

module.exports = router;
