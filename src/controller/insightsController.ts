import { Request, Response } from 'express'
import prisma from '../../lib/prisma'
import { generateHealthInsights, extractPrescription, extractLabReport, generateSpendingInsights, generateLogbookInsights, analyzeLogbookHistory, HealthInsightInput, SpendingInsightInput, LogbookInsightInput, LogbookAuditInput, LogbookMonthlySummary } from '../services/aiService'

function ensureUser(req: Request, res: Response): any {
    const user = (req as any).user
    if (!user?.id) {
        res.status(401).json({ status: 401, message: 'Unauthorized' })
        return null
    }
    return user
}

export const getHealthInsights = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const profileId = req.query.profileId as string
    const days = Math.min(parseInt(req.query.days as string) || 30, 90)

    if (!profileId) {
        return res.status(400).json({ status: 400, message: 'profileId is required' })
    }

    const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } })
    const aiProvider = prefs?.aiProvider || ''
    const aiApiKey = prefs?.aiApiKey || ''

    if (!aiProvider || !aiApiKey) {
        return res.status(422).json({
            status: 422,
            message: 'AI provider not configured. Go to Settings and add your API key.'
        })
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    const [profile, vitals, medications, illnesses] = await Promise.all([
        prisma.profile.findFirst({
            where: { id: profileId, userId: user.id }
        }),
        prisma.vitalEntry.findMany({
            where: { profileId, recordedAt: { gte: since } },
            orderBy: { recordedAt: 'asc' }
        }),
        prisma.medication.findMany({
            where: { profileId },
            include: {
                logs: { where: { occurredAt: { gte: since } } }
            }
        }),
        prisma.illnessEntry.findMany({
            where: { profileId, recordedAt: { gte: since90 } },
            orderBy: { recordedAt: 'desc' }
        })
    ])

    if (!profile) {
        return res.status(404).json({ status: 404, message: 'Profile not found' })
    }

    const medicationsWithAdherence = medications.map(med => {
        const total = med.logs.length
        const taken = med.logs.filter(l => l.status === 'TAKEN').length
        const adherencePercent = total > 0 ? Math.round((taken / total) * 100) : 0
        return {
            name: med.name,
            dosage: med.dosage,
            inventoryQuantity: med.inventoryQuantity,
            lowStockThreshold: med.lowStockThreshold,
            adherencePercent,
            totalLogs: total,
            takenLogs: taken
        }
    })

    const data: HealthInsightInput = {
        profile: {
            displayName: profile.displayName,
            dateOfBirth: profile.dateOfBirth?.toISOString(),
            gender: profile.gender,
            bloodGroup: profile.bloodGroup,
            allergies: profile.allergies,
            chronicConditions: profile.chronicConditions
        },
        vitals: vitals.map(v => ({
            vitalType: v.vitalType,
            valueNumber: v.valueNumber,
            systolic: v.systolic,
            diastolic: v.diastolic,
            unit: v.unit,
            recordedAt: v.recordedAt.toISOString(),
            notes: v.notes
        })),
        medications: medicationsWithAdherence,
        illnesses: illnesses.map(i => ({
            diagnosis: i.diagnosis,
            severity: i.severity,
            status: i.status,
            symptoms: i.symptoms,
            recordedAt: i.recordedAt.toISOString()
        })),
        days
    }

    try {
        const insights = await generateHealthInsights(aiProvider, aiApiKey, data)
        return res.status(200).json({ status: 200, insights })
    } catch (error: any) {
        const message = error?.message || 'AI service error'
        const isKeyError = message.toLowerCase().includes('api key') ||
            message.toLowerCase().includes('authentication') ||
            message.toLowerCase().includes('unauthorized') ||
            message.toLowerCase().includes('invalid')
        return res.status(isKeyError ? 401 : 500).json({
            status: isKeyError ? 401 : 500,
            message: isKeyError ? 'Invalid API key. Check your AI settings.' : message
        })
    }
}

export const getSpendingInsights = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const days = Math.min(parseInt(req.query.days as string) || 30, 90)
    const now = new Date()
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000)

    const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } })
    const aiProvider = prefs?.aiProvider || ''
    const aiApiKey = prefs?.aiApiKey || ''

    if (!aiProvider || !aiApiKey) {
        return res.status(422).json({
            status: 422,
            message: 'AI provider not configured. Go to Settings and add your API key.'
        })
    }

    const [currentExpenses, previousExpenses, budgets, subscriptions, goals, categories] = await Promise.all([
        prisma.expense.findMany({
            where: { userId: user.id, expenseDate: { gte: currentStart, lte: now } },
            include: { category: true }
        }),
        prisma.expense.findMany({
            where: { userId: user.id, expenseDate: { gte: previousStart, lt: currentStart } },
            include: { category: true }
        }),
        prisma.budget.findMany({ where: { userId: user.id, active: true } }),
        prisma.subscription.findMany({ where: { userId: user.id, active: true } }),
        prisma.financialGoal.findMany({ where: { userId: user.id, completed: false } }),
        prisma.expenseCategory.findMany({ where: { userId: user.id } })
    ])

    const categoryMap = new Map(categories.map(c => [c.id, c.name]))
    const defaultCurrency = currentExpenses[0]?.currency || 'USD'

    const groupByCategory = (expenses: typeof currentExpenses) => {
        const map = new Map<string, { name: string; amount: number; count: number }>()
        for (const e of expenses) {
            const name = e.categoryId ? (categoryMap.get(e.categoryId) || 'Uncategorized') : 'Uncategorized'
            const existing = map.get(name) || { name, amount: 0, count: 0 }
            existing.amount = Math.round((existing.amount + e.amount) * 100) / 100
            existing.count += 1
            map.set(name, existing)
        }
        return [...map.values()].sort((a, b) => b.amount - a.amount)
    }

    const currentByCategory = groupByCategory(currentExpenses)
    const previousByCategory = groupByCategory(previousExpenses)
    const currentTotal = Math.round(currentExpenses.reduce((s, e) => s + e.amount, 0) * 100) / 100
    const previousTotal = Math.round(previousExpenses.reduce((s, e) => s + e.amount, 0) * 100) / 100

    const data: SpendingInsightInput = {
        currency: defaultCurrency,
        days,
        currentPeriod: { total: currentTotal, byCategory: currentByCategory },
        previousPeriod: { total: previousTotal, byCategory: previousByCategory.map(c => ({ name: c.name, amount: c.amount })) },
        budgets: budgets.map(b => ({
            name: b.name,
            amount: b.amount,
            spent: b.spent,
            currency: b.currency,
            alertThreshold: b.alertThreshold
        })),
        subscriptions: subscriptions.map(s => ({
            title: s.title,
            amount: s.amount,
            currency: s.currency,
            billingCycle: s.billingCycle
        })),
        goals: goals.map(g => ({
            title: g.title,
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            currency: g.currency,
            targetDate: g.targetDate?.toISOString() || null,
            percentComplete: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0
        }))
    }

    try {
        const insights = await generateSpendingInsights(aiProvider, aiApiKey, data)
        return res.status(200).json({ status: 200, insights })
    } catch (error: any) {
        const message = error?.message || 'AI service error'
        const isKeyError = message.toLowerCase().includes('api key') ||
            message.toLowerCase().includes('authentication') ||
            message.toLowerCase().includes('unauthorized') ||
            message.toLowerCase().includes('invalid')
        return res.status(isKeyError ? 401 : 500).json({
            status: isKeyError ? 401 : 500,
            message: isKeyError ? 'Invalid API key. Check your AI settings.' : message
        })
    }
}

export const extractPrescriptionHandler = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const { imageBase64, mimeType } = req.body || {}
    if (!imageBase64 || !mimeType) {
        return res.status(400).json({ status: 400, message: 'imageBase64 and mimeType are required' })
    }

    const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } })
    const aiProvider = prefs?.aiProvider || ''
    const aiApiKey = prefs?.aiApiKey || ''

    if (!aiProvider || !aiApiKey) {
        return res.status(422).json({
            status: 422,
            message: 'AI provider not configured. Go to Settings and add your API key.'
        })
    }

    try {
        const result = await extractPrescription(aiProvider, aiApiKey, imageBase64, mimeType)
        return res.status(200).json({ status: 200, extract: result })
    } catch (error: any) {
        const message = error?.message || 'AI service error'
        const isKeyError = message.toLowerCase().includes('api key') ||
            message.toLowerCase().includes('authentication') ||
            message.toLowerCase().includes('unauthorized') ||
            message.toLowerCase().includes('invalid')
        return res.status(isKeyError ? 401 : 500).json({
            status: isKeyError ? 401 : 500,
            message: isKeyError ? 'Invalid API key. Check your AI settings.' : message
        })
    }
}

export const extractLabReportHandler = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const { imageBase64, mimeType } = req.body || {}
    if (!imageBase64 || !mimeType) {
        return res.status(400).json({ status: 400, message: 'imageBase64 and mimeType are required' })
    }

    const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } })
    const aiProvider = prefs?.aiProvider || ''
    const aiApiKey = prefs?.aiApiKey || ''

    if (!aiProvider || !aiApiKey) {
        return res.status(422).json({
            status: 422,
            message: 'AI provider not configured. Go to Settings and add your API key.'
        })
    }

    try {
        const result = await extractLabReport(aiProvider, aiApiKey, imageBase64, mimeType)
        return res.status(200).json({ status: 200, extract: result })
    } catch (error: any) {
        const message = error?.message || 'AI service error'
        const isKeyError = message.toLowerCase().includes('api key') ||
            message.toLowerCase().includes('authentication') ||
            message.toLowerCase().includes('unauthorized') ||
            message.toLowerCase().includes('invalid')
        return res.status(isKeyError ? 401 : 500).json({
            status: isKeyError ? 401 : 500,
            message: isKeyError ? 'Invalid API key. Check your AI settings.' : message
        })
    }
}

const normalize = (value: unknown) => String(value || '').trim().toLowerCase()

const isRental = (item: { subCategory?: string | null }) =>
    normalize(item.subCategory) === 'rental'

const isGroupA = (item: { mainCategory?: string | null; subCategory?: string | null }) => {
    const main = normalize(item.mainCategory)
    const sub = normalize(item.subCategory)
    return main === 'mama expense' || sub.startsWith('mama') || main === 'yellow fantasy' || main === 'parking'
}

const isGroupB = (item: { mainCategory?: string | null; subCategory?: string | null }) => {
    const main = normalize(item.mainCategory)
    const sub = normalize(item.subCategory)
    return main === 'rc expense' || sub.startsWith('rc') || main === 'fuji' || main === 'fuji view'
}

const isExpenseEntry = (item: { mainCategory?: string | null; subCategory?: string | null }) => {
    const main = normalize(item.mainCategory)
    const sub = normalize(item.subCategory)
    if (main === 'mama expense' || main === 'rc expense' || main === 'bank deposit') return true
    if (main.includes('expense')) return true
    if (sub.includes('cash-out') || sub.includes('refund') || sub.includes('repair') || sub.includes('labor') || sub.includes('permit')) return true
    return false
}

const handleAiError = (res: Response, error: unknown) => {
    const message = (error as any)?.message || 'AI service error'
    const isKeyError = message.toLowerCase().includes('api key') ||
        message.toLowerCase().includes('authentication') ||
        message.toLowerCase().includes('unauthorized') ||
        message.toLowerCase().includes('invalid')
    return res.status(isKeyError ? 401 : 500).json({
        status: isKeyError ? 401 : 500,
        message: isKeyError ? 'Invalid API key. Check your AI settings.' : message
    })
}

export const getLogbookInsights = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } })
    const aiProvider = prefs?.aiProvider || ''
    const aiApiKey = prefs?.aiApiKey || ''

    if (!aiProvider || !aiApiKey) {
        return res.status(422).json({ status: 422, message: 'AI provider not configured. Go to Settings and add your API key.' })
    }

    const fromParam = req.query.from as string | undefined
    const toParam = req.query.to as string | undefined

    const fromDate = fromParam ? new Date(fromParam + 'T00:00:00') : undefined
    const toDate = toParam ? new Date(toParam + 'T23:59:59') : undefined

    const dateFilter = (fromDate || toDate)
        ? { paymentDate: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
        : {}

    const payments = await prisma.logbookPayment.findMany({
        where: { userId: user.id, ...dateFilter },
        orderBy: [{ paymentDate: 'asc' }]
    })

    if (!payments.length) {
        return res.status(422).json({ status: 422, message: 'No payment data found for the selected date range.' })
    }

    const propertyCategories = [
        { name: 'Yellow Fantasy', matcher: (p: typeof payments[0]) => normalize(p.mainCategory) === 'yellow fantasy' },
        { name: 'Fuji View', matcher: (p: typeof payments[0]) => normalize(p.mainCategory) === 'fuji view' || normalize(p.mainCategory) === 'fuji' },
        { name: 'Parking', matcher: (p: typeof payments[0]) => normalize(p.mainCategory) === 'parking' },
    ]

    const properties = propertyCategories.map(({ name, matcher }) => {
        const items = payments.filter(matcher)
        const monthlyMap = new Map<string, { rent: number; expense: number; entries: number }>()

        items.forEach(p => {
            const d = new Date(p.paymentDate)
            const key = `${d.getFullYear()}-${d.getMonth()}`
            const slot = monthlyMap.get(key) || { rent: 0, expense: 0, entries: 0 }
            if (isRental(p)) slot.rent += Number(p.amount || 0)
            else slot.expense += Number(p.amount || 0)
            slot.entries += 1
            monthlyMap.set(key, slot)
        })

        const monthly = Array.from(monthlyMap.entries()).map(([key, v]) => {
            const [year, month] = key.split('-').map(Number)
            return { year, month: month + 1, ...v }
        }).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)

        const totalRent = items.filter(isRental).reduce((s, p) => s + Number(p.amount || 0), 0)
        const totalExpense = items.filter(p => !isRental(p)).reduce((s, p) => s + Number(p.amount || 0), 0)

        return { name, monthly, totalRent, totalExpense }
    }).filter(p => p.monthly.length > 0)

    const dates = payments.map(p => p.paymentDate.getTime())
    const from = new Date(Math.min(...dates)).toISOString().slice(0, 7)
    const to = new Date(Math.max(...dates)).toISOString().slice(0, 7)

    const data: LogbookInsightInput = { properties, dateRange: { from, to } }

    try {
        const insights = await generateLogbookInsights(aiProvider, aiApiKey, data)
        return res.status(200).json({ status: 200, insights })
    } catch (error) {
        return handleAiError(res, error)
    }
}

export const getLogbookAudit = async (req: Request, res: Response) => {
    const user = ensureUser(req, res)
    if (!user) return

    const group = (req.query.group as string) || 'A'
    const fromParam = req.query.from as string | undefined
    const toParam = req.query.to as string | undefined

    const fromDate = fromParam ? new Date(fromParam + 'T00:00:00') : undefined
    const toDate = toParam ? new Date(toParam + 'T23:59:59') : undefined

    const prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } })
    const aiProvider = prefs?.aiProvider || ''
    const aiApiKey = prefs?.aiApiKey || ''

    if (!aiProvider || !aiApiKey) {
        return res.status(422).json({ status: 422, message: 'AI provider not configured. Go to Settings and add your API key.' })
    }

    const dateFilter = (fromDate || toDate)
        ? { paymentDate: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
        : {}

    const allPayments = await prisma.logbookPayment.findMany({
        where: { userId: user.id, ...dateFilter },
        orderBy: [{ paymentDate: 'asc' }]
    })

    const filtered = allPayments.filter(group === 'B' ? isGroupB : isGroupA)

    if (!filtered.length) {
        return res.status(422).json({ status: 422, message: 'No entries found for this group in the selected date range.' })
    }

    const groupLabel = group === 'B' ? 'RC / Fuji View' : 'Mama / Yellow Fantasy / Parking'

    // Build monthly summaries and quality stats
    const monthlyMap = new Map<string, LogbookMonthlySummary>()
    let totalIncome = 0
    let totalExpenses = 0
    let missingDescription = 0
    let missingSubCategory = 0

    for (const p of filtered) {
        const d = new Date(p.paymentDate)
        const year = d.getFullYear()
        const month = d.getMonth() + 1
        const key = `${year}-${String(month).padStart(2, '0')}`
        const slot = monthlyMap.get(key) || { year, month, income: 0, expenses: 0, netFlow: 0, entryCount: 0, categories: {} }
        const amount = Number(p.amount || 0)
        const cat = p.mainCategory || 'Unknown'
        if (isExpenseEntry(p)) {
            slot.expenses += amount
            totalExpenses += amount
        } else {
            slot.income += amount
            totalIncome += amount
        }
        slot.entryCount += 1
        slot.categories[cat] = (slot.categories[cat] || 0) + amount
        monthlyMap.set(key, slot)
        if (!p.description) missingDescription++
        if (!p.subCategory) missingSubCategory++
    }

    const monthlySummary = Array.from(monthlyMap.values())
        .map(s => ({ ...s, netFlow: s.income - s.expenses }))
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)

    const sortedFiltered = [...filtered].sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime())

    const data: LogbookAuditInput = {
        group: groupLabel,
        entries: sortedFiltered.map(p => ({
            date: p.paymentDate.toISOString().slice(0, 10),
            mainCategory: p.mainCategory || '',
            subCategory: p.subCategory || '',
            amount: Number(p.amount || 0),
            description: p.description
        })),
        monthlySummary,
        totalIncome,
        totalExpenses,
        netBalance: totalIncome - totalExpenses,
        dateRange: {
            from: sortedFiltered[0].paymentDate.toISOString().slice(0, 10),
            to: sortedFiltered[sortedFiltered.length - 1].paymentDate.toISOString().slice(0, 10)
        },
        dataQuality: {
            missingDescription,
            missingSubCategory,
            totalEntries: filtered.length
        }
    }

    try {
        const audit = await analyzeLogbookHistory(aiProvider, aiApiKey, data)
        return res.status(200).json({ status: 200, audit })
    } catch (error) {
        return handleAiError(res, error)
    }
}
