const router = require("express").Router();
const { badRequest, notFound, conflict } = require("boom");
const upload = require("../libs/upload");
const {
  checkUser,
  checkSuperAdmin,
  checkCuratorOrUser,
  checkLKAdminOrSuperAdmin,
  checkLKAdminOrCuratorOrUserOrSuperUser,
} = require("../libs/jwt");
const Document = require("../controllers/DocumentController");
const boom = require("boom");

router.post(
  "/",
  checkCuratorOrUser,
  upload.single("file"),
  async (req, res) => {
    if (!req.file || !req.file.filename) throw badRequest("Отсутствует файл");
    return res.send({ file: req.file.filename });
  }
);

router.get(
  "/templates",
  checkLKAdminOrCuratorOrUserOrSuperUser,
  async (req, res, next) => {
    try {
      const { limit, page, regionId } = req.query;
      const result = await Document.getTemplates(limit, page, regionId);
      res.send(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post("/templates", checkLKAdminOrSuperAdmin, async (req, res, next) => {
  try {
    const { text, type, regionId } = req.body;
    const result = await Document.createTemplate(text, type, regionId);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.put("/templates/:id", checkLKAdminOrSuperAdmin, async (req, res, next) => {
  try {
    const { text, type, regionId } = req.body;
    const result = await Document.updateTemplate(req.params.id, type, text, regionId);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/templates/:id", checkLKAdminOrSuperAdmin, async (req, res, next) => {
  try {
    const result = await Document.deleteTemplate(req.params.id);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.post("/term_of_use/confirm", checkUser(), async (req, res, next) => {
  try {
    const result = await Document.confirmTermOfUse(req.subLogin);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.post("/term_of_use", checkSuperAdmin, async (req, res, next) => {
  try {
    const { fileName } = req.body;
    const result = await Document.createTermOfUse(fileName);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.get("/term_of_use", async (_req, res, next) => {
  try {
    const result = await Document.getTermOfUse();
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.get("/questions", async (req, res, next) => {
  try {
    const { category, regionId, isAllThemes } = req.query;
    const result = await Document.getQuestions(category, regionId, isAllThemes);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.post("/questions", checkLKAdminOrSuperAdmin, async (req, res, next) => {
  try {
    const { category, text, answer, regionId } = req.body;
    if (!category) {
      throw badRequest('Категории не определена!');
    }

    const result = await Document.createQuestion(
      category,
      text,
      answer,
      regionId,
      !!req.admin,
      !!req.superAdmin
    );
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.put("/questions/:id", checkLKAdminOrSuperAdmin, async (req, res, next) => {
  try {
    const question = await Document.getQuestionById(req.params.id);
    if (!question) {
      throw notFound('Такого вопроса не существует.')
    }
    if (!!req.admin && question.isCreatedBySuperAdmin) {
      throw conflict('Обычному администратору запрещено удалять вопросы созданные супер админом.')
    }

    const { category, text, answer, regionId } = req.body;
    const result = await Document.updateQuestion(
      req.params.id,
      category,
      text,
      answer,
      regionId
    );
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.get("/questions/:id", async (req, res, next) => {
  try {
    const result = await Document.getQuestionById(req.params.id);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/questions/:id", checkLKAdminOrSuperAdmin, async (req, res, next) => {
  try {
    const question = await Document.getQuestionById(req.params.id);
    if (!question) {
      throw notFound('Такого вопроса не существует.')
    }
    if (!!req.admin && question.isCreatedBySuperAdmin) {
      throw conflict('Обычному администратору запрещено удалять вопросы созданные супер админом.')
    }

    const result = await Document.deleteQuestion(req.params.id);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/questions/categories/:category",
  checkLKAdminOrSuperAdmin,
  async (req, res, next) => {
    try {
      const result = await Document.deleteQuestionCategory(req.params.category);
      res.send(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post("/documents", checkUser([]), (req, res, next) => {
  const session = req.headers["session"];
  if (!session) throw new boom("auth error", { statusCode: 421 });
  req.body.session = session;
  Document.register_doc(req.body, req.subLogin)
    .then((result) => res.send(result))
    .catch((err) => next(err));
});

router.post(
  "/documents/:id/attachment",
  checkUser([]),
  async (req, res, next) => {
    try {
      const session = req.headers["session"];
      if (!session) throw new boom("auth error", { statusCode: 421 });
      const { files, contr_UID } = req.body;
      const result = await Document.putAttachmentToDocument(
        req.subLogin,
        session,
        files,
        contr_UID
      );
      res.send(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post("/documents/installing", async (req, res, next) => {
  try {
    const { uri, session } = req.body;
    const result = await Document.getFIleByUri(uri, session);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.post("/documents/sign", checkUser(), async (req, res, next) => {
  try {
    const { sert_token, contr_UID, files } = req.body;
    const result = await Document.saveSign(
      req.subLogin,
      sert_token,
      contr_UID,
      files
    );
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/documents/send_to_saved_sign",
  checkUser(),
  async (req, res, next) => {
    try {
      const session = req.headers["session"];
      if (!session) throw new boom("auth error", { statusCode: 421 });
      const { contr_UID } = req.body;
      const result = await Document.signToSignSaveDocument(
        req.subLogin,
        session,
        contr_UID
      );
      res.send(result);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/documents/approving/prepare",
  checkUser(),
  async (req, res, next) => {
    try {
      const session = req.headers["session"];
      if (!session) throw new boom("auth error", { statusCode: 421 });
      const { contr_UID, sert_token } = req.body;
      const result = await Document.prepareApproveDocument(
        req.subLogin,
        session,
        sert_token,
        contr_UID
      );
      res.send(result);
    } catch (err) {
      next(err);
    }
  }
);

router.put("/documents/approving", checkUser(), async (req, res, next) => {
  try {
    const session = req.headers["session"];
    if (!session) throw new boom("auth error", { statusCode: 421 });
    const { contr_UID, sert_token, files, comment } = req.body;
    const result = await Document.approveDocument(
      req.subLogin,
      session,
      contr_UID,
      sert_token,
      files,
      comment
    );
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.get("/documents/attachment", checkUser([]), async (req, res, next) => {
  try {
    const { contr_UID } = req.query;
    const result = await Document.getAttachment(contr_UID);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.put("/documents/put_off", checkUser([]), async (req, res, next) => {
  try {
    const session = req.headers["session"];
    if (!session) throw new boom("auth error", { statusCode: 421 });
    const { contr_UID, putOff } = req.body;
    const result = await Document.putOff(req.subLogin, contr_UID, putOff);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.put("/documents/cancellation", checkUser([]), async (req, res, next) => {
  try {
    const session = req.headers["session"];
    if (!session) throw new boom("auth error", { statusCode: 421 });
    const { sert_token, contr_UID, files, comment } = req.body;
    const result = await Document.cancellation(
      req.subLogin,
      session,
      sert_token,
      contr_UID,
      files,
      comment
    );
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.put(
  "/documents/prepare_deviation",
  checkUser([]),
  async (req, res, next) => {
    try {
      const session = req.headers["session"];
      if (!session) throw new boom("auth error", { statusCode: 421 });
      const { sert_token, contr_UID } = req.body;
      const result = await Document.prepareDeviation(
        req.subLogin,
        session,
        sert_token,
        contr_UID
      );
      res.send(result);
    } catch (err) {
      next(err);
    }
  }
);

router.put("/documents/deviation", checkUser([]), async (req, res, next) => {
  try {
    const session = req.headers["session"];
    if (!session) throw new boom("auth error", { statusCode: 421 });
    const { sert_token, contr_UID, files, comment } = req.body;
    const result = await Document.deviation(
      req.subLogin,
      session,
      sert_token,
      contr_UID,
      files,
      comment
    );
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.get("/documents/sbis_types", async (_req, res, next) => {
  try {
    const result = await Document.sbisTypes;
    res.send({ result });
  } catch (err) {
    next(err);
  }
});

router.get("/documents/changes", checkUser([]), async (req, res, next) => {
  try {
    const session = req.headers["session"];
    if (!session) throw new boom("auth error", { statusCode: 421 });
    const result = await Document.changeList(req.subLogin, session);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.post("/signed_documents", checkUser([]), (req, res, next) => {
  const session = req.headers["session"];
  const { sert_token, contr_UID, files } = req.body;
  Document.signDocument(req.subLogin, session, sert_token, contr_UID, files)
    .then((result) => res.send(result))
    .catch((err) => next(err));
});

router.put("/documents/marker", checkUser([]), async (req, res, next) => {
  try {
    const { contr_UID, marker } = req.body;
    const result = await Document.putMarker(req.subLogin, contr_UID, marker);
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.get("/documents", checkUser([]), (req, res, next) => {
  const session = req.headers["session"];
  if (!session) throw new boom("auth error", { statusCode: 421 });
  req.query.session = session;
  const { sbisTypes = null } = req.query;
  Document.list(req.subLogin, req.query, sbisTypes)
    .then((result) => res.send(result))
    .catch((err) => next(err));
});

router.get("/documents/history", checkUser([]), async (req, res, next) => {
  try {
    const { contr_UID, doc_uid, state, subLoginId, cons_UID } = req.query;
    const result = await Document.getDocumentHistory(
      req.subLogin,
      contr_UID,
      doc_uid,
      state,
      subLoginId,
      cons_UID
    );
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.get("/documents/:id", checkUser(), async (req, res, next) => {
  try {
    const session = req.headers["session"];
    if (!session) throw new boom("auth error", { statusCode: 421 });
    const result = await Document.getDocument(
      req.subLogin,
      session,
      req.params.id
    );
    res.send(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/documents", checkUser([]), (req, res, next) => {
  const session = req.headers["session"];
  if (!session) throw new boom("auth error", { statusCode: 421 });
  req.query.session = session;
  Document.deleteDocument(req.query, req.subLogin)
    .then((result) => res.send(result))
    .catch((err) => next(err));
});

router.delete("/documents/remove", checkUser([]), (req, res, next) => {
  const session = req.headers["session"];
  if (!session) throw new boom("auth error", { statusCode: 421 });
  req.query.session = session;
  Document.removeDocument(req.subLogin, req.query)
    .then((result) => res.send(result))
    .catch((err) => next(err));
});

module.exports = router;
