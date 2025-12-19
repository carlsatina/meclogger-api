import { RequestHandler, Router } from 'express'
import { PrismaClient } from '@prisma/client'
import {
    listExpenses,
    getExpense,
    createExpense,
    updateExpense,
    deleteExpense,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    listBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    listBudgetSummary,
    listFinancialGoals,
    createFinancialGoal,
    updateFinancialGoal,
    deleteFinancialGoal,
    listExpenseSchedules,
    createExpenseSchedule,
    updateExpenseSchedule,
    deleteExpenseSchedule,
    markExpenseSchedulePaid,
    listSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    markSubscriptionPaid,
    listAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    listCurrencies,
    createCurrency,
    updateCurrency,
    deleteCurrency
} from '../controller/expenseController'

const makeExpenseRouter = (
    _dbClient: PrismaClient,
    authenticateUser: RequestHandler
): Router => {
    const router = Router()

    // Expenses
    router.get('/', authenticateUser, listExpenses)
    router.post('/', authenticateUser, createExpense)

    // Categories
    router.get('/categories/list', authenticateUser, listCategories)
    router.get('/categories', authenticateUser, listCategories)
    router.post('/categories', authenticateUser, createCategory)
    router.put('/categories/:id', authenticateUser, updateCategory)
    router.delete('/categories/:id', authenticateUser, deleteCategory)

    // Budgets
    router.get('/budgets', authenticateUser, listBudgets)
    router.get('/budgets/summary', authenticateUser, listBudgetSummary)
    router.post('/budgets', authenticateUser, createBudget)
    router.put('/budgets/:id', authenticateUser, updateBudget)
    router.delete('/budgets/:id', authenticateUser, deleteBudget)

    // Financial Goals
    router.get('/goals', authenticateUser, listFinancialGoals)
    router.post('/goals', authenticateUser, createFinancialGoal)
    router.put('/goals/:id', authenticateUser, updateFinancialGoal)
    router.delete('/goals/:id', authenticateUser, deleteFinancialGoal)

    // Recurring Schedules
    router.get('/schedules', authenticateUser, listExpenseSchedules)
    router.post('/schedules', authenticateUser, createExpenseSchedule)
    router.put('/schedules/:id', authenticateUser, updateExpenseSchedule)
    router.delete('/schedules/:id', authenticateUser, deleteExpenseSchedule)
    router.post('/schedules/:id/pay', authenticateUser, markExpenseSchedulePaid)

    // Subscriptions
    router.get('/subscriptions', authenticateUser, listSubscriptions)
    router.post('/subscriptions', authenticateUser, createSubscription)
    router.put('/subscriptions/:id', authenticateUser, updateSubscription)
    router.delete('/subscriptions/:id', authenticateUser, deleteSubscription)
    router.post('/subscriptions/:id/pay', authenticateUser, markSubscriptionPaid)

    // Accounts
    router.get('/accounts/list', authenticateUser, listAccounts)
    router.get('/accounts', authenticateUser, listAccounts)
    router.post('/accounts', authenticateUser, createAccount)
    router.put('/accounts/:id', authenticateUser, updateAccount)
    router.delete('/accounts/:id', authenticateUser, deleteAccount)

    // Currencies
    router.get('/currencies/list', authenticateUser, listCurrencies)
    router.get('/currencies', authenticateUser, listCurrencies)
    router.post('/currencies', authenticateUser, createCurrency)
    router.put('/currencies/:id', authenticateUser, updateCurrency)
    router.delete('/currencies/:id', authenticateUser, deleteCurrency)

    // Expense detail routes placed after static paths to avoid collisions
    router.get('/:id', authenticateUser, getExpense)
    router.put('/:id', authenticateUser, updateExpense)
    router.delete('/:id', authenticateUser, deleteExpense)

    return router
}

export default makeExpenseRouter
