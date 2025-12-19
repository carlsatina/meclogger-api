"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCurrency = exports.updateCurrency = exports.createCurrency = exports.listCurrencies = exports.deleteAccount = exports.updateAccount = exports.createAccount = exports.listAccounts = exports.markSubscriptionPaid = exports.deleteSubscription = exports.updateSubscription = exports.createSubscription = exports.listSubscriptions = exports.markExpenseSchedulePaid = exports.deleteExpenseSchedule = exports.updateExpenseSchedule = exports.createExpenseSchedule = exports.listExpenseSchedules = exports.deleteFinancialGoal = exports.updateFinancialGoal = exports.createFinancialGoal = exports.listFinancialGoals = exports.deleteBudget = exports.updateBudget = exports.createBudget = exports.listBudgets = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.listCategories = exports.listBudgetSummary = exports.deleteExpense = exports.updateExpense = exports.createExpense = exports.getExpense = exports.listExpenses = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const client_1 = require("@prisma/client");
const ensureUser = (req, res) => {
    if (!req.user) {
        res.status(401).json({ status: 401, message: 'Unauthorized' });
        return null;
    }
    return req.user;
};
const normalizeExpenseFrequency = (value) => {
    const valid = Object.values(client_1.ExpenseFrequency);
    if (typeof value === 'string') {
        const normalized = value.toUpperCase().replace(/[\s-]+/g, '_');
        if (valid.includes(normalized))
            return normalized;
    }
    return client_1.ExpenseFrequency.ONE_TIME;
};
const normalizePaymentMethod = (value) => {
    const valid = Object.values(client_1.PaymentMethod);
    if (typeof value === 'string') {
        const normalized = value.toUpperCase().replace(/[\s-]+/g, '_');
        if (valid.includes(normalized))
            return normalized;
    }
    return client_1.PaymentMethod.CASH;
};
const addInterval = (date, freq) => {
    const d = new Date(date);
    switch (freq) {
        case client_1.ExpenseFrequency.WEEKLY:
            d.setDate(d.getDate() + 7);
            return d;
        case client_1.ExpenseFrequency.YEARLY:
            d.setFullYear(d.getFullYear() + 1);
            return d;
        case client_1.ExpenseFrequency.MONTHLY:
        default:
            d.setMonth(d.getMonth() + 1);
            return d;
    }
};
const parseStringArray = (value) => {
    if (typeof value === 'undefined')
        return null;
    if (Array.isArray(value))
        return value.map(v => String(v).trim()).filter(Boolean);
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed.length)
            return [];
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed))
                return parsed.map(v => String(v).trim()).filter(Boolean);
        }
        catch (_a) {
            // ignore
        }
        return trimmed.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [];
};
const resolveCategory = (userId, categoryId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!categoryId)
        return null;
    return prisma_1.default.expenseCategory.findFirst({
        where: { id: categoryId, userId }
    });
});
// Expense CRUD
const listExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { categoryId, startDate, endDate, isRecurring } = req.query || {};
    const where = { userId: user.id };
    if (categoryId)
        where.categoryId = String(categoryId);
    if (typeof isRecurring !== 'undefined') {
        where.isRecurring = String(isRecurring) === 'true';
    }
    if (startDate || endDate) {
        where.expenseDate = {};
        if (startDate)
            where.expenseDate.gte = new Date(String(startDate));
        if (endDate)
            where.expenseDate.lte = new Date(String(endDate));
    }
    const expenses = yield prisma_1.default.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' }
    });
    res.status(200).json({ status: 200, expenses });
});
exports.listExpenses = listExpenses;
const getExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'Expense id is required' });
    const expense = yield prisma_1.default.expense.findFirst({
        where: { id, userId: user.id }
    });
    if (!expense)
        return res.status(404).json({ status: 404, message: 'Expense not found' });
    res.status(200).json({ status: 200, expense });
});
exports.getExpense = getExpense;
const createExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { title, description, amount, currency, expenseDate, categoryId, budgetId, subcategory, tags, paymentMethod, paymentAccount, vendor, location, receiptUrl, notes, isRecurring, frequency, recurringUntil } = req.body || {};
    const parsedAmount = Number(amount);
    if (!title || Number.isNaN(parsedAmount)) {
        return res.status(400).json({ status: 400, message: 'title and amount are required' });
    }
    if (budgetId) {
        const budget = yield prisma_1.default.budget.findFirst({ where: { id: budgetId, userId: user.id } });
        if (!budget)
            return res.status(404).json({ status: 404, message: 'Budget not found' });
        const expenseDateObj = expenseDate ? new Date(expenseDate) : new Date();
        if (budget.startDate > expenseDateObj || budget.endDate < expenseDateObj) {
            return res.status(400).json({ status: 400, message: 'Expense date is outside the selected budget window' });
        }
    }
    const category = categoryId ? yield resolveCategory(user.id, categoryId) : null;
    if (categoryId && !category) {
        return res.status(404).json({ status: 404, message: 'Category not found for current user' });
    }
    const expenseDateObj = expenseDate ? new Date(expenseDate) : new Date();
    const expense = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const created = yield tx.expense.create({
            data: {
                userId: user.id,
                title,
                description: description || null,
                amount: parsedAmount,
                currency: currency || 'USD',
                expenseDate: expenseDateObj,
                categoryId: (category === null || category === void 0 ? void 0 : category.id) || null,
                subcategory: subcategory || null,
                tags: (_a = parseStringArray(tags)) !== null && _a !== void 0 ? _a : [],
                paymentMethod: normalizePaymentMethod(paymentMethod),
                paymentAccount: paymentAccount || null,
                vendor: vendor || null,
                location: location || null,
                receiptUrl: receiptUrl || null,
                notes: notes || null,
                budgetId: budgetId || null,
                isRecurring: Boolean(isRecurring),
                frequency: normalizeExpenseFrequency(frequency),
                recurringUntil: recurringUntil ? new Date(recurringUntil) : null
            }
        });
        const budgets = yield resolveBudgetsForExpense(user.id, expenseDateObj, created.categoryId, budgetId || undefined);
        if (budgets.length) {
            const updates = budgets.map(b => tx.budget.update({
                where: { id: b.id },
                data: { spent: (b.spent || 0) + parsedAmount }
            }));
            yield Promise.all(updates);
        }
        return created;
    }));
    res.status(201).json({ status: 201, expense });
});
exports.createExpense = createExpense;
const updateExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'Expense id is required' });
    const existing = yield prisma_1.default.expense.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Expense not found' });
    const { title, description, amount, currency, expenseDate, categoryId, subcategory, tags, paymentMethod, paymentAccount, vendor, location, receiptUrl, notes, budgetId, isRecurring, frequency, recurringUntil } = req.body || {};
    if (categoryId) {
        const category = yield resolveCategory(user.id, categoryId);
        if (!category)
            return res.status(404).json({ status: 404, message: 'Category not found for current user' });
    }
    if (budgetId) {
        const budget = yield prisma_1.default.budget.findFirst({ where: { id: budgetId, userId: user.id } });
        if (!budget)
            return res.status(404).json({ status: 404, message: 'Budget not found' });
    }
    const data = {
        title: title !== null && title !== void 0 ? title : existing.title,
        description: description !== null && description !== void 0 ? description : existing.description,
        amount: amount !== undefined ? Number(amount) : existing.amount,
        currency: currency || existing.currency,
        expenseDate: expenseDate ? new Date(expenseDate) : existing.expenseDate,
        categoryId: categoryId !== undefined ? categoryId || null : existing.categoryId,
        budgetId: budgetId !== undefined ? budgetId || null : existing.budgetId,
        subcategory: subcategory !== null && subcategory !== void 0 ? subcategory : existing.subcategory,
        paymentMethod: paymentMethod ? normalizePaymentMethod(paymentMethod) : existing.paymentMethod,
        paymentAccount: paymentAccount !== null && paymentAccount !== void 0 ? paymentAccount : existing.paymentAccount,
        vendor: vendor !== null && vendor !== void 0 ? vendor : existing.vendor,
        location: location !== null && location !== void 0 ? location : existing.location,
        receiptUrl: receiptUrl !== null && receiptUrl !== void 0 ? receiptUrl : existing.receiptUrl,
        notes: notes !== null && notes !== void 0 ? notes : existing.notes,
        isRecurring: typeof isRecurring === 'undefined' ? existing.isRecurring : Boolean(isRecurring),
        frequency: frequency ? normalizeExpenseFrequency(frequency) : existing.frequency,
        recurringUntil: recurringUntil ? new Date(recurringUntil) : existing.recurringUntil
    };
    const parsedTags = parseStringArray(tags);
    if (parsedTags !== null)
        data.tags = parsedTags;
    const expense = yield prisma_1.default.expense.update({ where: { id }, data });
    res.status(200).json({ status: 200, expense });
});
exports.updateExpense = updateExpense;
const deleteExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'Expense id is required' });
    const existing = yield prisma_1.default.expense.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Expense not found' });
    // Roll back budget spent when an expense is removed
    const amount = Number(existing.amount || 0);
    if (amount > 0) {
        yield decrementBudgetSpent(user.id, amount, existing.expenseDate, existing.categoryId);
    }
    yield prisma_1.default.expense.delete({ where: { id } });
    res.status(200).json({ status: 200, message: 'Expense deleted' });
});
exports.deleteExpense = deleteExpense;
const listBudgetSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const budgets = yield prisma_1.default.budget.findMany({
        where: { userId: user.id },
        orderBy: { startDate: 'desc' }
    });
    const summaries = yield Promise.all(budgets.map((budget) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const spentAgg = yield prisma_1.default.expense.aggregate({
            where: Object.assign({ userId: user.id, expenseDate: {
                    gte: budget.startDate,
                    lte: budget.endDate
                } }, (budget.categoryId ? { categoryId: budget.categoryId } : {})),
            _sum: { amount: true }
        });
        const computedSpent = spentAgg._sum.amount || 0;
        return Object.assign(Object.assign({}, budget), { spent: (_a = budget.spent) !== null && _a !== void 0 ? _a : computedSpent, remaining: budget.amount - ((_b = budget.spent) !== null && _b !== void 0 ? _b : computedSpent) });
    })));
    res.status(200).json({ status: 200, budgets: summaries });
});
exports.listBudgetSummary = listBudgetSummary;
// Category CRUD
const listCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const categories = yield prisma_1.default.expenseCategory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ status: 200, categories });
});
exports.listCategories = listCategories;
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { name, color, icon, isDefault } = req.body || {};
    if (!name)
        return res.status(400).json({ status: 400, message: 'name is required' });
    const category = yield prisma_1.default.expenseCategory.create({
        data: {
            userId: user.id,
            name,
            color: color || null,
            icon: icon || null,
            isDefault: Boolean(isDefault)
        }
    });
    res.status(201).json({ status: 201, category });
});
exports.createCategory = createCategory;
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    const { name, color, icon, isDefault } = req.body || {};
    if (!id)
        return res.status(400).json({ status: 400, message: 'category id is required' });
    const existing = yield prisma_1.default.expenseCategory.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Category not found' });
    const category = yield prisma_1.default.expenseCategory.update({
        where: { id },
        data: {
            name: name !== null && name !== void 0 ? name : existing.name,
            color: color !== null && color !== void 0 ? color : existing.color,
            icon: icon !== null && icon !== void 0 ? icon : existing.icon,
            isDefault: typeof isDefault === 'undefined' ? existing.isDefault : Boolean(isDefault)
        }
    });
    res.status(200).json({ status: 200, category });
});
exports.updateCategory = updateCategory;
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'category id is required' });
    const existing = yield prisma_1.default.expenseCategory.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Category not found' });
    yield prisma_1.default.expenseCategory.delete({ where: { id } });
    res.status(200).json({ status: 200, message: 'Category deleted' });
});
exports.deleteCategory = deleteCategory;
// Budget CRUD
const listBudgets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const budgets = yield prisma_1.default.budget.findMany({
        where: { userId: user.id },
        orderBy: { startDate: 'desc' }
    });
    res.status(200).json({ status: 200, budgets });
});
exports.listBudgets = listBudgets;
const createBudget = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { name, amount, currency, startDate, endDate, categoryId, alertThreshold, alertEnabled, active } = req.body || {};
    const parsedAmount = Number(amount);
    if (!name || Number.isNaN(parsedAmount) || !startDate || !endDate) {
        return res.status(400).json({ status: 400, message: 'name, amount, startDate and endDate are required' });
    }
    if (categoryId) {
        const category = yield resolveCategory(user.id, categoryId);
        if (!category)
            return res.status(404).json({ status: 404, message: 'Category not found for current user' });
    }
    const budget = yield prisma_1.default.budget.create({
        data: {
            userId: user.id,
            name,
            amount: parsedAmount,
            currency: currency || 'USD',
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            categoryId: categoryId || null,
            alertThreshold: alertThreshold !== undefined ? Number(alertThreshold) : null,
            alertEnabled: typeof alertEnabled === 'undefined' ? true : Boolean(alertEnabled),
            active: typeof active === 'undefined' ? true : Boolean(active)
        }
    });
    res.status(201).json({ status: 201, budget });
});
exports.createBudget = createBudget;
const updateBudget = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'budget id is required' });
    const existing = yield prisma_1.default.budget.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Budget not found' });
    const { name, amount, currency, startDate, endDate, categoryId, alertThreshold, alertEnabled, active } = req.body || {};
    if (categoryId) {
        const category = yield resolveCategory(user.id, categoryId);
        if (!category)
            return res.status(404).json({ status: 404, message: 'Category not found for current user' });
    }
    const budget = yield prisma_1.default.budget.update({
        where: { id },
        data: {
            name: name !== null && name !== void 0 ? name : existing.name,
            amount: amount !== undefined ? Number(amount) : existing.amount,
            currency: currency || existing.currency,
            startDate: startDate ? new Date(startDate) : existing.startDate,
            endDate: endDate ? new Date(endDate) : existing.endDate,
            categoryId: categoryId !== undefined ? categoryId || null : existing.categoryId,
            alertThreshold: alertThreshold !== undefined ? Number(alertThreshold) : existing.alertThreshold,
            alertEnabled: typeof alertEnabled === 'undefined' ? existing.alertEnabled : Boolean(alertEnabled),
            active: typeof active === 'undefined' ? existing.active : Boolean(active)
        }
    });
    res.status(200).json({ status: 200, budget });
});
exports.updateBudget = updateBudget;
const deleteBudget = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'budget id is required' });
    const existing = yield prisma_1.default.budget.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Budget not found' });
    yield prisma_1.default.budget.delete({ where: { id } });
    res.status(200).json({ status: 200, message: 'Budget deleted' });
});
exports.deleteBudget = deleteBudget;
// Financial goals CRUD
const listFinancialGoals = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const goals = yield prisma_1.default.financialGoal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ status: 200, goals });
});
exports.listFinancialGoals = listFinancialGoals;
const createFinancialGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { title, description, targetAmount, currentAmount, currency, targetDate, color, icon } = req.body || {};
    const parsedTarget = Number(targetAmount);
    if (!title || Number.isNaN(parsedTarget)) {
        return res.status(400).json({ status: 400, message: 'title and targetAmount are required' });
    }
    const goal = yield prisma_1.default.financialGoal.create({
        data: {
            userId: user.id,
            title,
            description: description || null,
            targetAmount: parsedTarget,
            currentAmount: currentAmount !== undefined ? Number(currentAmount) : 0,
            currency: currency || 'USD',
            targetDate: targetDate ? new Date(targetDate) : null,
            color: color || null,
            icon: icon || null
        }
    });
    res.status(201).json({ status: 201, goal });
});
exports.createFinancialGoal = createFinancialGoal;
const updateFinancialGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'goal id is required' });
    const existing = yield prisma_1.default.financialGoal.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Goal not found' });
    const { title, description, targetAmount, currentAmount, currency, targetDate, color, icon, completed } = req.body || {};
    const goal = yield prisma_1.default.financialGoal.update({
        where: { id },
        data: {
            title: title !== null && title !== void 0 ? title : existing.title,
            description: description !== null && description !== void 0 ? description : existing.description,
            targetAmount: targetAmount !== undefined ? Number(targetAmount) : existing.targetAmount,
            currentAmount: currentAmount !== undefined ? Number(currentAmount) : existing.currentAmount,
            currency: currency || existing.currency,
            targetDate: targetDate ? new Date(targetDate) : existing.targetDate,
            color: color !== null && color !== void 0 ? color : existing.color,
            icon: icon !== null && icon !== void 0 ? icon : existing.icon,
            completed: typeof completed === 'undefined' ? existing.completed : Boolean(completed),
            completedAt: typeof completed === 'undefined'
                ? existing.completedAt
                : Boolean(completed)
                    ? existing.completedAt || new Date()
                    : null
        }
    });
    res.status(200).json({ status: 200, goal });
});
exports.updateFinancialGoal = updateFinancialGoal;
const deleteFinancialGoal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'goal id is required' });
    const existing = yield prisma_1.default.financialGoal.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Goal not found' });
    yield prisma_1.default.financialGoal.delete({ where: { id } });
    res.status(200).json({ status: 200, message: 'Goal deleted' });
});
exports.deleteFinancialGoal = deleteFinancialGoal;
// Recurring schedules
const listExpenseSchedules = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const schedules = yield prisma_1.default.expenseSchedule.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ status: 200, schedules });
});
exports.listExpenseSchedules = listExpenseSchedules;
const createExpenseSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { title, amount, currency, startDate, endDate, expenseId, frequency, nextRunAt, lastRunAt, active } = req.body || {};
    const parsedAmount = Number(amount);
    if (!title || Number.isNaN(parsedAmount) || !startDate) {
        return res.status(400).json({ status: 400, message: 'title, amount, startDate are required' });
    }
    if (expenseId) {
        const expense = yield prisma_1.default.expense.findFirst({ where: { id: expenseId, userId: user.id } });
        if (!expense)
            return res.status(404).json({ status: 404, message: 'Linked expense not found' });
    }
    const schedule = yield prisma_1.default.expenseSchedule.create({
        data: {
            userId: user.id,
            expenseId: expenseId || null,
            title,
            amount: parsedAmount,
            currency: currency || 'USD',
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            frequency: normalizeExpenseFrequency(frequency || client_1.ExpenseFrequency.MONTHLY),
            nextRunAt: nextRunAt ? new Date(nextRunAt) : null,
            lastRunAt: lastRunAt ? new Date(lastRunAt) : null,
            active: typeof active === 'undefined' ? true : Boolean(active)
        }
    });
    res.status(201).json({ status: 201, schedule });
});
exports.createExpenseSchedule = createExpenseSchedule;
const updateExpenseSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'schedule id is required' });
    const existing = yield prisma_1.default.expenseSchedule.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Schedule not found' });
    const { title, amount, currency, startDate, endDate, expenseId, frequency, nextRunAt, lastRunAt, active } = req.body || {};
    if (expenseId) {
        const expense = yield prisma_1.default.expense.findFirst({ where: { id: expenseId, userId: user.id } });
        if (!expense)
            return res.status(404).json({ status: 404, message: 'Linked expense not found' });
    }
    const schedule = yield prisma_1.default.expenseSchedule.update({
        where: { id },
        data: {
            title: title !== null && title !== void 0 ? title : existing.title,
            amount: amount !== undefined ? Number(amount) : existing.amount,
            currency: currency || existing.currency,
            startDate: startDate ? new Date(startDate) : existing.startDate,
            endDate: endDate ? new Date(endDate) : existing.endDate,
            expenseId: expenseId !== undefined ? expenseId || null : existing.expenseId,
            frequency: frequency ? normalizeExpenseFrequency(frequency) : existing.frequency,
            nextRunAt: nextRunAt ? new Date(nextRunAt) : existing.nextRunAt,
            lastRunAt: lastRunAt ? new Date(lastRunAt) : existing.lastRunAt,
            active: typeof active === 'undefined' ? existing.active : Boolean(active)
        }
    });
    res.status(200).json({ status: 200, schedule });
});
exports.updateExpenseSchedule = updateExpenseSchedule;
const deleteExpenseSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'schedule id is required' });
    const existing = yield prisma_1.default.expenseSchedule.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Schedule not found' });
    yield prisma_1.default.expenseSchedule.delete({ where: { id } });
    res.status(200).json({ status: 200, message: 'Schedule deleted' });
});
exports.deleteExpenseSchedule = deleteExpenseSchedule;
const markExpenseSchedulePaid = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'schedule id is required' });
    const schedule = yield prisma_1.default.expenseSchedule.findFirst({ where: { id, userId: user.id } });
    if (!schedule)
        return res.status(404).json({ status: 404, message: 'Schedule not found' });
    const expenseDate = schedule.nextRunAt || schedule.startDate || new Date();
    const freq = schedule.frequency || client_1.ExpenseFrequency.ONE_TIME;
    const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const expense = yield tx.expense.create({
            data: {
                userId: user.id,
                title: schedule.title,
                amount: schedule.amount,
                currency: schedule.currency,
                expenseDate,
                categoryId: null,
                paymentMethod: client_1.PaymentMethod.CASH,
                isRecurring: freq !== client_1.ExpenseFrequency.ONE_TIME,
                frequency: freq,
                notes: 'Scheduled expense paid'
            }
        });
        // Update matching budgets within the transaction
        const budgets = yield tx.budget.findMany({
            where: {
                userId: user.id,
                active: true,
                startDate: { lte: expenseDate },
                endDate: { gte: expenseDate },
                OR: [
                    { categoryId: undefined },
                    { categoryId: null }
                ]
            }
        });
        if (budgets.length) {
            yield Promise.all(budgets.map(b => tx.budget.update({
                where: { id: b.id },
                data: { spent: (b.spent || 0) + schedule.amount }
            })));
        }
        yield tx.expenseSchedule.delete({ where: { id: schedule.id } });
        let nextSchedule = null;
        if (freq !== client_1.ExpenseFrequency.ONE_TIME) {
            const next = addInterval(expenseDate, freq);
            nextSchedule = yield tx.expenseSchedule.create({
                data: {
                    userId: user.id,
                    title: schedule.title,
                    amount: schedule.amount,
                    currency: schedule.currency,
                    startDate: next,
                    endDate: schedule.endDate,
                    expenseId: null,
                    frequency: freq,
                    nextRunAt: next,
                    lastRunAt: expenseDate,
                    active: schedule.active
                }
            });
        }
        return { expense, schedule: nextSchedule };
    }));
    res.status(201).json({ status: 201, expense: result.expense, schedule: result.schedule });
});
exports.markExpenseSchedulePaid = markExpenseSchedulePaid;
// Subscriptions
const listSubscriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const subscriptions = yield prisma_1.default.subscription.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ status: 200, subscriptions });
});
exports.listSubscriptions = listSubscriptions;
const createSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { title, description, amount, currency, billingCycle, nextBillingDate, lastBilledAt, categoryId, vendor, paymentMethod, paymentAccount, active, autoPay, cancelAt, notes } = req.body || {};
    const parsedAmount = Number(amount);
    if (!title || Number.isNaN(parsedAmount)) {
        return res.status(400).json({ status: 400, message: 'title and amount are required' });
    }
    if (categoryId) {
        const category = yield resolveCategory(user.id, categoryId);
        if (!category)
            return res.status(404).json({ status: 404, message: 'Category not found for current user' });
    }
    const subscription = yield prisma_1.default.subscription.create({
        data: {
            userId: user.id,
            title,
            description: description || null,
            amount: parsedAmount,
            currency: currency || 'USD',
            billingCycle: normalizeExpenseFrequency(billingCycle || client_1.ExpenseFrequency.MONTHLY),
            nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : null,
            lastBilledAt: lastBilledAt ? new Date(lastBilledAt) : null,
            categoryId: categoryId || null,
            vendor: vendor || null,
            paymentMethod: normalizePaymentMethod(paymentMethod),
            paymentAccount: paymentAccount || null,
            active: typeof active === 'undefined' ? true : Boolean(active),
            autoPay: typeof autoPay === 'undefined' ? false : Boolean(autoPay),
            cancelAt: cancelAt ? new Date(cancelAt) : null,
            notes: notes || null
        }
    });
    res.status(201).json({ status: 201, subscription });
});
exports.createSubscription = createSubscription;
const updateSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'subscription id is required' });
    const existing = yield prisma_1.default.subscription.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Subscription not found' });
    const { title, description, amount, currency, billingCycle, nextBillingDate, lastBilledAt, categoryId, vendor, paymentMethod, paymentAccount, active, autoPay, cancelAt, notes } = req.body || {};
    if (categoryId) {
        const category = yield resolveCategory(user.id, categoryId);
        if (!category)
            return res.status(404).json({ status: 404, message: 'Category not found for current user' });
    }
    const subscription = yield prisma_1.default.subscription.update({
        where: { id },
        data: {
            title: title !== null && title !== void 0 ? title : existing.title,
            description: description !== null && description !== void 0 ? description : existing.description,
            amount: amount !== undefined ? Number(amount) : existing.amount,
            currency: currency || existing.currency,
            billingCycle: billingCycle ? normalizeExpenseFrequency(billingCycle) : existing.billingCycle,
            nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : existing.nextBillingDate,
            lastBilledAt: lastBilledAt ? new Date(lastBilledAt) : existing.lastBilledAt,
            categoryId: categoryId !== undefined ? categoryId || null : existing.categoryId,
            vendor: vendor !== null && vendor !== void 0 ? vendor : existing.vendor,
            paymentMethod: paymentMethod ? normalizePaymentMethod(paymentMethod) : existing.paymentMethod,
            paymentAccount: paymentAccount !== null && paymentAccount !== void 0 ? paymentAccount : existing.paymentAccount,
            active: typeof active === 'undefined' ? existing.active : Boolean(active),
            autoPay: typeof autoPay === 'undefined' ? existing.autoPay : Boolean(autoPay),
            cancelAt: cancelAt ? new Date(cancelAt) : existing.cancelAt,
            notes: notes !== null && notes !== void 0 ? notes : existing.notes
        }
    });
    res.status(200).json({ status: 200, subscription });
});
exports.updateSubscription = updateSubscription;
const deleteSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'subscription id is required' });
    const existing = yield prisma_1.default.subscription.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Subscription not found' });
    yield prisma_1.default.subscription.delete({ where: { id } });
    res.status(200).json({ status: 200, message: 'Subscription deleted' });
});
exports.deleteSubscription = deleteSubscription;
const markSubscriptionPaid = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'subscription id is required' });
    const subscription = yield prisma_1.default.subscription.findFirst({ where: { id, userId: user.id } });
    if (!subscription)
        return res.status(404).json({ status: 404, message: 'Subscription not found' });
    const expenseDate = subscription.nextBillingDate || new Date();
    const freq = subscription.billingCycle || client_1.ExpenseFrequency.MONTHLY;
    const nextBilling = addInterval(expenseDate, freq);
    const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const expense = yield tx.expense.create({
            data: {
                userId: user.id,
                title: subscription.title,
                amount: subscription.amount,
                currency: subscription.currency,
                expenseDate,
                categoryId: subscription.categoryId || null,
                paymentMethod: subscription.paymentMethod || client_1.PaymentMethod.CASH,
                isRecurring: true,
                frequency: freq,
                notes: `Subscription paid`
            }
        });
        const budgets = yield resolveBudgetsForExpense(user.id, expenseDate, subscription.categoryId);
        if (budgets.length) {
            const updates = budgets.map(b => tx.budget.update({
                where: { id: b.id },
                data: { spent: (b.spent || 0) + subscription.amount }
            }));
            yield Promise.all(updates);
        }
        yield tx.subscription.delete({ where: { id: subscription.id } });
        const newSub = yield tx.subscription.create({
            data: {
                userId: user.id,
                title: subscription.title,
                description: subscription.description || null,
                amount: subscription.amount,
                currency: subscription.currency,
                billingCycle: freq,
                nextBillingDate: nextBilling,
                lastBilledAt: expenseDate,
                categoryId: subscription.categoryId || null,
                vendor: subscription.vendor || null,
                paymentMethod: subscription.paymentMethod,
                paymentAccount: subscription.paymentAccount || null,
                active: subscription.active,
                autoPay: subscription.autoPay,
                cancelAt: subscription.cancelAt || null,
                notes: subscription.notes || null
            }
        });
        return { expense, subscription: newSub };
    }));
    res.status(201).json({ status: 201, expense: result.expense, subscription: result.subscription });
});
exports.markSubscriptionPaid = markSubscriptionPaid;
// Accounts
const listAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const accounts = yield prisma_1.default.account.findMany({
        where: { userId: user.id, archived: false },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ status: 200, accounts });
});
exports.listAccounts = listAccounts;
const createAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { name, institution, type, currency, balance, isDefault, notes } = req.body || {};
    if (!name)
        return res.status(400).json({ status: 400, message: 'Account name is required' });
    const account = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        if (isDefault) {
            yield tx.account.updateMany({
                where: { userId: user.id, isDefault: true },
                data: { isDefault: false }
            });
        }
        return tx.account.create({
            data: {
                userId: user.id,
                name,
                institution: institution || null,
                type: type || null,
                currency: currency || 'PHP',
                balance: balance !== undefined ? Number(balance) : 0,
                isDefault: Boolean(isDefault),
                notes: notes || null
            }
        });
    }));
    res.status(201).json({ status: 201, account });
});
exports.createAccount = createAccount;
const updateAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'account id is required' });
    const existing = yield prisma_1.default.account.findFirst({ where: { id, userId: user.id, archived: false } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Account not found' });
    const { name, institution, type, currency, balance, isDefault, notes, archived } = req.body || {};
    const account = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        if (typeof isDefault !== 'undefined' && isDefault) {
            yield tx.account.updateMany({
                where: { userId: user.id, isDefault: true },
                data: { isDefault: false }
            });
        }
        return tx.account.update({
            where: { id },
            data: {
                name: name !== null && name !== void 0 ? name : existing.name,
                institution: institution !== null && institution !== void 0 ? institution : existing.institution,
                type: type !== null && type !== void 0 ? type : existing.type,
                currency: currency || existing.currency,
                balance: balance !== undefined ? Number(balance) : existing.balance,
                isDefault: typeof isDefault === 'undefined' ? existing.isDefault : Boolean(isDefault),
                notes: notes !== null && notes !== void 0 ? notes : existing.notes,
                archived: typeof archived === 'undefined' ? existing.archived : Boolean(archived)
            }
        });
    }));
    res.status(200).json({ status: 200, account });
});
exports.updateAccount = updateAccount;
const deleteAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'account id is required' });
    const existing = yield prisma_1.default.account.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Account not found' });
    yield prisma_1.default.account.delete({ where: { id } });
    res.status(200).json({ status: 200, message: 'Account deleted' });
});
exports.deleteAccount = deleteAccount;
// Currencies
const listCurrencies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const currencies = yield prisma_1.default.userCurrency.findMany({
        where: { userId: user.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });
    res.status(200).json({ status: 200, currencies });
});
exports.listCurrencies = listCurrencies;
const createCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { code, name, symbol, isDefault } = req.body || {};
    if (!code)
        return res.status(400).json({ status: 400, message: 'Currency code is required' });
    const normalizedCode = String(code).toUpperCase();
    const currency = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        if (isDefault) {
            yield tx.userCurrency.updateMany({
                where: { userId: user.id, isDefault: true },
                data: { isDefault: false }
            });
            yield tx.userPreference.updateMany({
                where: { userId: user.id },
                data: { currency: normalizedCode }
            });
        }
        return tx.userCurrency.create({
            data: {
                userId: user.id,
                code: normalizedCode,
                name: name || null,
                symbol: symbol || null,
                isDefault: Boolean(isDefault)
            }
        });
    }));
    res.status(201).json({ status: 201, currency });
});
exports.createCurrency = createCurrency;
const updateCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'currency id is required' });
    const existing = yield prisma_1.default.userCurrency.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Currency not found' });
    const { code, name, symbol, isDefault } = req.body || {};
    const normalizedCode = code ? String(code).toUpperCase() : existing.code;
    const currency = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        if (typeof isDefault !== 'undefined' && isDefault) {
            yield tx.userCurrency.updateMany({
                where: { userId: user.id, isDefault: true },
                data: { isDefault: false }
            });
            yield tx.userPreference.updateMany({
                where: { userId: user.id },
                data: { currency: normalizedCode }
            });
        }
        return tx.userCurrency.update({
            where: { id },
            data: {
                code: normalizedCode,
                name: name !== null && name !== void 0 ? name : existing.name,
                symbol: symbol !== null && symbol !== void 0 ? symbol : existing.symbol,
                isDefault: typeof isDefault === 'undefined' ? existing.isDefault : Boolean(isDefault)
            }
        });
    }));
    res.status(200).json({ status: 200, currency });
});
exports.updateCurrency = updateCurrency;
const deleteCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = ensureUser(req, res);
    if (!user)
        return;
    const { id } = req.params;
    if (!id)
        return res.status(400).json({ status: 400, message: 'currency id is required' });
    const existing = yield prisma_1.default.userCurrency.findFirst({ where: { id, userId: user.id } });
    if (!existing)
        return res.status(404).json({ status: 404, message: 'Currency not found' });
    yield prisma_1.default.userCurrency.delete({ where: { id } });
    res.status(200).json({ status: 200, message: 'Currency deleted' });
});
exports.deleteCurrency = deleteCurrency;
const resolveBudgetsForExpense = (userId, expenseDate, categoryId, budgetId) => __awaiter(void 0, void 0, void 0, function* () {
    if (budgetId) {
        const budget = yield prisma_1.default.budget.findFirst({ where: { id: budgetId, userId, active: true } });
        if (!budget)
            return [];
        if (budget.startDate > expenseDate || budget.endDate < expenseDate)
            return [];
        return [budget];
    }
    return prisma_1.default.budget.findMany({
        where: {
            userId,
            active: true,
            startDate: { lte: expenseDate },
            endDate: { gte: expenseDate },
            OR: [
                { categoryId: categoryId || undefined },
                { categoryId: null }
            ]
        }
    });
});
function incrementBudgetSpent(userId, amount, expenseDate, categoryId) {
    return prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
        const budgets = yield tx.budget.findMany({
            where: {
                userId,
                active: true,
                startDate: { lte: expenseDate },
                endDate: { gte: expenseDate },
                OR: [
                    { categoryId: categoryId || undefined },
                    { categoryId: null }
                ]
            }
        });
        if (!budgets.length)
            return;
        const updates = budgets.map(budget => tx.budget.update({
            where: { id: budget.id },
            data: { spent: (budget.spent || 0) + amount }
        }));
        yield Promise.all(updates);
    }));
}
function decrementBudgetSpent(userId, amount, expenseDate, categoryId) {
    return prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
        const budgets = yield tx.budget.findMany({
            where: {
                userId,
                active: true,
                startDate: { lte: expenseDate },
                endDate: { gte: expenseDate },
                OR: [
                    { categoryId: categoryId || undefined },
                    { categoryId: null }
                ]
            }
        });
        if (!budgets.length)
            return;
        const updates = budgets.map(budget => tx.budget.update({
            where: { id: budget.id },
            data: { spent: Math.max(0, (budget.spent || 0) - amount) }
        }));
        yield Promise.all(updates);
    }));
}
