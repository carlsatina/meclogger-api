"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expenseController_1 = require("../controller/expenseController");
const makeExpenseRouter = (_dbClient, authenticateUser) => {
    const router = (0, express_1.Router)();
    // Expenses
    router.get('/', authenticateUser, expenseController_1.listExpenses);
    router.post('/', authenticateUser, expenseController_1.createExpense);
    // Categories
    router.get('/categories/list', authenticateUser, expenseController_1.listCategories);
    router.get('/categories', authenticateUser, expenseController_1.listCategories);
    router.post('/categories', authenticateUser, expenseController_1.createCategory);
    router.put('/categories/:id', authenticateUser, expenseController_1.updateCategory);
    router.delete('/categories/:id', authenticateUser, expenseController_1.deleteCategory);
    // Budgets
    router.get('/budgets', authenticateUser, expenseController_1.listBudgets);
    router.get('/budgets/summary', authenticateUser, expenseController_1.listBudgetSummary);
    router.post('/budgets', authenticateUser, expenseController_1.createBudget);
    router.put('/budgets/:id', authenticateUser, expenseController_1.updateBudget);
    router.delete('/budgets/:id', authenticateUser, expenseController_1.deleteBudget);
    // Financial Goals
    router.get('/goals', authenticateUser, expenseController_1.listFinancialGoals);
    router.post('/goals', authenticateUser, expenseController_1.createFinancialGoal);
    router.put('/goals/:id', authenticateUser, expenseController_1.updateFinancialGoal);
    router.delete('/goals/:id', authenticateUser, expenseController_1.deleteFinancialGoal);
    // Recurring Schedules
    router.get('/schedules', authenticateUser, expenseController_1.listExpenseSchedules);
    router.post('/schedules', authenticateUser, expenseController_1.createExpenseSchedule);
    router.put('/schedules/:id', authenticateUser, expenseController_1.updateExpenseSchedule);
    router.delete('/schedules/:id', authenticateUser, expenseController_1.deleteExpenseSchedule);
    router.post('/schedules/:id/pay', authenticateUser, expenseController_1.markExpenseSchedulePaid);
    // Subscriptions
    router.get('/subscriptions', authenticateUser, expenseController_1.listSubscriptions);
    router.post('/subscriptions', authenticateUser, expenseController_1.createSubscription);
    router.put('/subscriptions/:id', authenticateUser, expenseController_1.updateSubscription);
    router.delete('/subscriptions/:id', authenticateUser, expenseController_1.deleteSubscription);
    router.post('/subscriptions/:id/pay', authenticateUser, expenseController_1.markSubscriptionPaid);
    // Accounts
    router.get('/accounts/list', authenticateUser, expenseController_1.listAccounts);
    router.get('/accounts', authenticateUser, expenseController_1.listAccounts);
    router.post('/accounts', authenticateUser, expenseController_1.createAccount);
    router.put('/accounts/:id', authenticateUser, expenseController_1.updateAccount);
    router.delete('/accounts/:id', authenticateUser, expenseController_1.deleteAccount);
    // Currencies
    router.get('/currencies/list', authenticateUser, expenseController_1.listCurrencies);
    router.get('/currencies', authenticateUser, expenseController_1.listCurrencies);
    router.post('/currencies', authenticateUser, expenseController_1.createCurrency);
    router.put('/currencies/:id', authenticateUser, expenseController_1.updateCurrency);
    router.delete('/currencies/:id', authenticateUser, expenseController_1.deleteCurrency);
    // Expense detail routes placed after static paths to avoid collisions
    router.get('/:id', authenticateUser, expenseController_1.getExpense);
    router.put('/:id', authenticateUser, expenseController_1.updateExpense);
    router.delete('/:id', authenticateUser, expenseController_1.deleteExpense);
    return router;
};
exports.default = makeExpenseRouter;
