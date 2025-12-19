"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profileController_1 = require("../controller/profileController");
const makeProfileRouter = (_dbClient, authenticateUser) => {
    const router = (0, express_1.Router)();
    router.get('/', authenticateUser, profileController_1.listProfiles);
    router.post('/', authenticateUser, profileController_1.createFamilyMember);
    return router;
};
exports.default = makeProfileRouter;
