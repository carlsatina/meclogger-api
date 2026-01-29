import prisma from '../../lib/prisma'
import { ExtendedRequest } from '../../extendedRequest'
import { Response } from 'express'

const ensureUser = (req: ExtendedRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ status: 401, message: 'Unauthorized' })
        return null
    }
    return req.user
}

const ensureUserRecord = async(req: ExtendedRequest, res: Response) => {
    const payload = ensureUser(req, res)
    if (!payload?.id) return null
    const exists = await prisma.user.findFirst({
        where: { id: payload.id },
        select: { id: true }
    })
    if (!exists) {
        res.status(401).json({ status: 401, message: 'User not found. Please sign in again.' })
        return null
    }
    return payload
}

const normalizeString = (value: unknown) => {
    if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed.length ? trimmed : null
    }
    if (typeof value === 'number') return String(value)
    return null
}

const normalizeAmount = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0
    if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
}

const parseDate = (value: unknown) => {
    if (!value) return new Date()
    const d = new Date(String(value))
    if (Number.isNaN(d.getTime())) return new Date()
    return d
}

const recalcRunningBalance = async(userId: string) => {
    const payments = await prisma.logbookPayment.findMany({
        where: { userId },
        orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }]
    })

    let running = 0
    const updates = payments.map(payment => {
        running += Number(payment.amount || 0)
        return prisma.logbookPayment.update({
            where: { id: payment.id },
            data: { runningBalance: running }
        })
    })

    if (updates.length) {
        await prisma.$transaction(updates)
    }
}

export const listLogbookPayments = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { startDate, endDate } = req.query || {}
    const where: any = { userId: user.id }
    if (startDate || endDate) {
        where.paymentDate = {}
        if (startDate) where.paymentDate.gte = new Date(String(startDate))
        if (endDate) where.paymentDate.lte = new Date(String(endDate))
    }

    const payments = await prisma.logbookPayment.findMany({
        where,
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }]
    })

    const normalize = (value: unknown) => String(value || '').trim().toLowerCase()

    const isExpense = (item: any) => {
        const main = normalize(item.mainCategory)
        const sub = normalize(item.subCategory)
        if (main === 'mama expense') return true
        if (main === 'misc' && sub === 'mama cash-out') return true
        if (main === 'rc expense') return true
        if (main === 'misc' && sub === 'rc cash-out') return true
        if (main === 'bank deposit') return true
        if (main.includes('expense')) return true
        if (sub.includes('cash-out')) return true
        if (sub.includes('refund')) return true
        if (sub.includes('repair')) return true
        if (sub.includes('labor')) return true
        if (sub.includes('permit')) return true
        return false
    }

    const isGroupA = (item: any) => {
        const main = normalize(item.mainCategory)
        const sub = normalize(item.subCategory)
        const mama = main === 'mama expense' || sub.startsWith('mama')
        const yellowFantasy = main === 'yellow fantasy'
        const parking = main === 'parking'
        return mama || yellowFantasy || parking
    }

    const isGroupB = (item: any) => {
        const main = normalize(item.mainCategory)
        const sub = normalize(item.subCategory)
        const rc = main === 'rc expense' || sub.startsWith('rc')
        const fuji = main === 'fuji' || main === 'fuji view'
        return rc || fuji
    }

    const sorted = [...payments].sort((a, b) => {
        const aDate = new Date(a.paymentDate || 0).getTime() || 0
        const bDate = new Date(b.paymentDate || 0).getTime() || 0
        if (aDate !== bDate) return aDate - bDate
        const aCreated = new Date(a.createdAt || 0).getTime() || 0
        const bCreated = new Date(b.createdAt || 0).getTime() || 0
        return aCreated - bCreated
    })

    let runningA = 0
    let runningB = 0
    const map = new Map<string, number>()

    sorted.forEach((item: any) => {
        const amount = Math.abs(Number(item.amount || 0))
        const delta = isExpense(item) ? -amount : amount
        if (isGroupA(item)) {
            runningA += delta
            map.set(item.id, runningA)
        } else if (isGroupB(item)) {
            runningB += delta
            map.set(item.id, runningB)
        }
    })

    const withBalances = payments.map((item: any) => ({
        ...item,
        runningBalance: map.get(item.id) ?? 0
    }))

    res.status(200).json({ status: 200, payments: withBalances })
}

export const createLogbookPayment = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { date, mainCategory, subCategory, description, amount } = req.body || {}

    try {
        const payment = await prisma.logbookPayment.create({
            data: {
                userId: user.id,
                paymentDate: parseDate(date),
                mainCategory: normalizeString(mainCategory),
                subCategory: normalizeString(subCategory),
                description: normalizeString(description),
                amount: normalizeAmount(amount)
            }
        })

        await recalcRunningBalance(user.id)

        const refreshed = await prisma.logbookPayment.findFirst({
            where: { id: payment.id, userId: user.id }
        })

        res.status(201).json({ status: 201, payment: refreshed })
    } catch (err: any) {
        res.status(500).json({ status: 500, message: err?.message || 'Unable to save payment' })
    }
}

export const updateLogbookPayment = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { id } = req.params
    if (!id) return res.status(400).json({ status: 400, message: 'Payment id is required' })

    const existing = await prisma.logbookPayment.findFirst({
        where: { id, userId: user.id }
    })

    if (!existing) {
        return res.status(404).json({ status: 404, message: 'Payment not found' })
    }

    const { date, mainCategory, subCategory, description, amount } = req.body || {}

    try {
        await prisma.logbookPayment.update({
            where: { id },
            data: {
                paymentDate: date ? parseDate(date) : existing.paymentDate,
                mainCategory: typeof mainCategory === 'undefined' ? existing.mainCategory : normalizeString(mainCategory),
                subCategory: typeof subCategory === 'undefined' ? existing.subCategory : normalizeString(subCategory),
                description: typeof description === 'undefined' ? existing.description : normalizeString(description),
                amount: typeof amount === 'undefined' ? existing.amount : normalizeAmount(amount)
            }
        })

        await recalcRunningBalance(user.id)

        const refreshed = await prisma.logbookPayment.findFirst({
            where: { id, userId: user.id }
        })

        res.status(200).json({ status: 200, payment: refreshed })
    } catch (err: any) {
        res.status(500).json({ status: 500, message: err?.message || 'Unable to update payment' })
    }
}

export const deleteLogbookPayment = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { id } = req.params
    if (!id) return res.status(400).json({ status: 400, message: 'Payment id is required' })

    const existing = await prisma.logbookPayment.findFirst({
        where: { id, userId: user.id }
    })

    if (!existing) {
        return res.status(404).json({ status: 404, message: 'Payment not found' })
    }

    try {
        await prisma.logbookPayment.delete({ where: { id } })
        await recalcRunningBalance(user.id)
        res.status(200).json({ status: 200, message: 'Payment deleted' })
    } catch (err: any) {
        res.status(500).json({ status: 500, message: err?.message || 'Unable to delete payment' })
    }
}

export const createLogbookRenter = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const {
        firstName,
        lastName,
        contactNo,
        email,
        apartment,
        rentalAmount,
        transferDate,
        remarks,
        status
    } = req.body || {}

    try {
        const renter = await prisma.logbookRenter.create({
            data: {
                userId: user.id,
                firstName: normalizeString(firstName),
                lastName: normalizeString(lastName),
                contactNo: normalizeString(contactNo),
                email: normalizeString(email),
                apartment: normalizeString(apartment),
                rentalAmount: typeof rentalAmount === 'undefined' || rentalAmount === null
                    ? null
                    : normalizeAmount(rentalAmount),
                transferDate: transferDate ? parseDate(transferDate) : null,
                remarks: normalizeString(remarks),
                status: status ? String(status).toUpperCase() : undefined
            }
        })

        res.status(201).json({ status: 201, renter })
    } catch (err: any) {
        res.status(500).json({ status: 500, message: err?.message || 'Unable to save renter' })
    }
}

export const listLogbookRenters = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { status } = req.query || {}
    const where: any = { userId: user.id }
    if (status) {
        where.status = String(status).toUpperCase()
    }

    const renters = await prisma.logbookRenter.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }]
    })

    res.status(200).json({ status: 200, renters })
}

export const getLogbookRenter = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { id } = req.params
    if (!id) return res.status(400).json({ status: 400, message: 'Renter id is required' })

    const renter = await prisma.logbookRenter.findFirst({
        where: { id, userId: user.id }
    })

    if (!renter) {
        return res.status(404).json({ status: 404, message: 'Renter not found' })
    }

    res.status(200).json({ status: 200, renter })
}

export const updateLogbookRenter = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { id } = req.params
    if (!id) return res.status(400).json({ status: 400, message: 'Renter id is required' })

    const existing = await prisma.logbookRenter.findFirst({
        where: { id, userId: user.id }
    })

    if (!existing) {
        return res.status(404).json({ status: 404, message: 'Renter not found' })
    }

    const {
        firstName,
        lastName,
        contactNo,
        email,
        apartment,
        rentalAmount,
        transferDate,
        remarks,
        status
    } = req.body || {}

    try {
        const renter = await prisma.logbookRenter.update({
            where: { id },
            data: {
                firstName: typeof firstName === 'undefined' ? existing.firstName : normalizeString(firstName),
                lastName: typeof lastName === 'undefined' ? existing.lastName : normalizeString(lastName),
                contactNo: typeof contactNo === 'undefined' ? existing.contactNo : normalizeString(contactNo),
                email: typeof email === 'undefined' ? existing.email : normalizeString(email),
                apartment: typeof apartment === 'undefined' ? existing.apartment : normalizeString(apartment),
                rentalAmount: typeof rentalAmount === 'undefined' || rentalAmount === null
                    ? existing.rentalAmount
                    : normalizeAmount(rentalAmount),
                transferDate: typeof transferDate === 'undefined'
                    ? existing.transferDate
                    : (transferDate ? parseDate(transferDate) : null),
                remarks: typeof remarks === 'undefined' ? existing.remarks : normalizeString(remarks),
                status: typeof status === 'undefined'
                    ? existing.status
                    : String(status).toUpperCase()
            }
        })

        res.status(200).json({ status: 200, renter })
    } catch (err: any) {
        res.status(500).json({ status: 500, message: err?.message || 'Unable to update renter' })
    }
}

export const listLogbookSavings = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { startDate, endDate } = req.query || {}
    const where: any = { userId: user.id }
    if (startDate || endDate) {
        where.entryDate = {}
        if (startDate) where.entryDate.gte = new Date(String(startDate))
        if (endDate) where.entryDate.lte = new Date(String(endDate))
    }

    const savings = await prisma.logbookSaving.findMany({
        where,
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }]
    })

    res.status(200).json({ status: 200, savings })
}

export const createLogbookSaving = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { date, amount, source, notes, option } = req.body || {}

    try {
        const optionValue = normalizeString(option)
        const saving = await prisma.logbookSaving.create({
            data: {
                userId: user.id,
                entryDate: parseDate(date),
                amount: normalizeAmount(amount),
                option: optionValue ? optionValue.toUpperCase() : undefined,
                source: normalizeString(source),
                notes: normalizeString(notes)
            }
        })
        res.status(201).json({ status: 201, saving })
    } catch (err: any) {
        res.status(500).json({ status: 500, message: err?.message || 'Unable to save savings entry' })
    }
}

export const updateLogbookSaving = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { id } = req.params
    if (!id) return res.status(400).json({ status: 400, message: 'Savings id is required' })

    const existing = await prisma.logbookSaving.findFirst({
        where: { id, userId: user.id }
    })

    if (!existing) {
        return res.status(404).json({ status: 404, message: 'Savings entry not found' })
    }

    const { date, amount, source, notes, option } = req.body || {}

    try {
        const optionValue = normalizeString(option)
        const saving = await prisma.logbookSaving.update({
            where: { id },
            data: {
                entryDate: typeof date === 'undefined' ? existing.entryDate : parseDate(date),
                amount: typeof amount === 'undefined' ? existing.amount : normalizeAmount(amount),
                option: typeof option === 'undefined'
                    ? existing.option
                    : (optionValue ? optionValue.toUpperCase() : existing.option),
                source: typeof source === 'undefined' ? existing.source : normalizeString(source),
                notes: typeof notes === 'undefined' ? existing.notes : normalizeString(notes)
            }
        })
        res.status(200).json({ status: 200, saving })
    } catch (err: any) {
        res.status(500).json({ status: 500, message: err?.message || 'Unable to update savings entry' })
    }
}

export const listLogbookBorrowed = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { startDate, endDate } = req.query || {}
    const where: any = { userId: user.id }
    if (startDate || endDate) {
        where.entryDate = {}
        if (startDate) where.entryDate.gte = new Date(String(startDate))
        if (endDate) where.entryDate.lte = new Date(String(endDate))
    }

    const borrowed = await prisma.logbookBorrowed.findMany({
        where,
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }]
    })

    res.status(200).json({ status: 200, borrowed })
}

export const createLogbookBorrowed = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { date, amount, counterparty, dueDate, status, notes, option } = req.body || {}

    try {
        const statusValue = normalizeString(status)
        const optionValue = normalizeString(option)
        const borrowed = await prisma.logbookBorrowed.create({
            data: {
                userId: user.id,
                entryDate: parseDate(date),
                amount: normalizeAmount(amount),
                option: optionValue ? optionValue.toUpperCase() : undefined,
                counterparty: normalizeString(counterparty),
                dueDate: dueDate ? parseDate(dueDate) : null,
                status: statusValue ? statusValue.toUpperCase() : undefined,
                notes: normalizeString(notes)
            }
        })
        res.status(201).json({ status: 201, borrowed })
    } catch (err: any) {
        res.status(500).json({ status: 500, message: err?.message || 'Unable to save borrowed entry' })
    }
}

export const updateLogbookBorrowed = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { id } = req.params
    if (!id) return res.status(400).json({ status: 400, message: 'Borrowed id is required' })

    const existing = await prisma.logbookBorrowed.findFirst({
        where: { id, userId: user.id }
    })

    if (!existing) {
        return res.status(404).json({ status: 404, message: 'Borrowed entry not found' })
    }

    const { date, amount, counterparty, dueDate, status, notes, option } = req.body || {}

    try {
        const statusValue = normalizeString(status)
        const optionValue = normalizeString(option)
        const borrowed = await prisma.logbookBorrowed.update({
            where: { id },
            data: {
                entryDate: typeof date === 'undefined' ? existing.entryDate : parseDate(date),
                amount: typeof amount === 'undefined' ? existing.amount : normalizeAmount(amount),
                option: typeof option === 'undefined'
                    ? existing.option
                    : (optionValue ? optionValue.toUpperCase() : existing.option),
                counterparty: typeof counterparty === 'undefined' ? existing.counterparty : normalizeString(counterparty),
                dueDate: typeof dueDate === 'undefined' ? existing.dueDate : (dueDate ? parseDate(dueDate) : null),
                status: typeof status === 'undefined'
                    ? existing.status
                    : (statusValue ? statusValue.toUpperCase() : existing.status),
                notes: typeof notes === 'undefined' ? existing.notes : normalizeString(notes)
            }
        })
        res.status(200).json({ status: 200, borrowed })
    } catch (err: any) {
        res.status(500).json({ status: 500, message: err?.message || 'Unable to update borrowed entry' })
    }
}

export const importLogbookPayments = async(req: ExtendedRequest, res: Response) => {
    const user = await ensureUserRecord(req, res)
    if (!user) return

    const { payments } = req.body || {}
    if (!Array.isArray(payments) || payments.length === 0) {
        return res.status(400).json({ status: 400, message: 'Payments payload is required' })
    }

    const parseImportAmount = (value: unknown) => {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? { amount: value, valid: true } : { amount: 0, valid: false }
        }
        if (typeof value === 'string') {
            const cleaned = value.replace(/[^0-9.-]/g, '')
            if (!cleaned.length) return { amount: 0, valid: false }
            const parsed = Number(cleaned)
            return Number.isFinite(parsed) ? { amount: parsed, valid: true } : { amount: 0, valid: false }
        }
        return { amount: 0, valid: false }
    }

    const data = []
    let skipped = 0

    for (const item of payments) {
        const { amount, valid } = parseImportAmount(item?.amount)
        if (!valid) {
            skipped += 1
            continue
        }
        data.push({
            userId: user.id,
            paymentDate: parseDate(item?.date),
            mainCategory: normalizeString(item?.mainCategory),
            subCategory: normalizeString(item?.subCategory),
            description: normalizeString(item?.description),
            amount
        })
    }

    if (!data.length) {
        return res.status(400).json({ status: 400, message: 'No valid payment rows to import' })
    }

    try {
        const result = await prisma.logbookPayment.createMany({ data })
        await recalcRunningBalance(user.id)
        res.status(201).json({
            status: 201,
            created: result.count,
            skipped
        })
    } catch (err: any) {
        res.status(500).json({ status: 500, message: err?.message || 'Unable to import payments' })
    }
}
