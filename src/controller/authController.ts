
import { Prisma, Role } from '@prisma/client'
import prisma from '../../lib/prisma'
import jwt from 'jsonwebtoken'
import * as dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import { ExtendedRequest } from '../../extendedRequest'

dotenv.config()

const login = async(req: any, res: any) => {

    const input = req.body
    const { email, password } = input

    let user = await prisma.user.findFirst({
        where: {
            email
        }
    })

    if (user) {
        if (await bcrypt.compare(password, user.password || '')) {
            const userObj = { 
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
             }
            const accessToken = jwt.sign(userObj, process.env.ACCESS_TOKEN_SECRET || 'defaultSecret1234')
            res.json({
                status: 201,
                token: accessToken
            })
        } else {
            res.status(403).json({
                status: 403,
                message: 'User credentials does not match!'
            })
        }
    } else {
        res.status(400).json({
            status: 400,
            message: 'User does not exist!'
        })
    }
}

// a bcrypt configuration
const saltRounds = 10
const register = async (req: any, res: any) => {
    let hashedPassword = ''
    const input = { ...req.body }

    try {
        if (input.password != input.verifyPassword) {
            return res.status(400).json({
                status: 400,
                message: "Verify Password does not match"
            })
        } else {
            hashedPassword = await bcrypt.hash(input.password, saltRounds)
        }
    } catch (err: any) {
        res.status(400).json({
            status: 400,
            message: err.message
        })
    }
    delete input.verifyPassword
    input.password = hashedPassword
    // Force role to GUEST on registration
    input.role = Role.GUEST

    try {
        // create the user
        const user = await prisma.user.create({
            data: {
                ...input
            }
        })
        res.status(201).json({
            status: 201,
            message: "Registration successful!"
        })
    } catch (e: any) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            return res.status(409).json({
                status: 409,
                message: 'Account already exists for this email or phone.'
            })
        }

        console.log("error: ", e)
        res.status(500).json({
            status: 500,
            message: 'Registration failed. Please try again.'
        })
    }
}

const getProfile = async (req: ExtendedRequest, res: any) => {
    if (req.user) {
        res.status(201).json({
            status: 201,
            userInfo: req.user
        })
    } else {
        res.status(401).json({
            status: 401,
            message: "User does not exist!"
        })
    }
}

const listUsers = async (req: ExtendedRequest, res: any) => {
    if (!req.user || req.user.role !== Role.ADMIN) {
        return res.status(403).json({ status: 403, message: 'Admin access required' })
    }
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, fullName: true, email: true, phone: true, role: true, createdAt: true }
    })
    res.status(200).json({ status: 200, users })
}

const updateUserRole = async (req: ExtendedRequest, res: any) => {
    if (!req.user || req.user.role !== Role.ADMIN) {
        return res.status(403).json({ status: 403, message: 'Admin access required' })
    }
    const { id } = req.params
    const { role } = req.body || {}
    if (!id || !role || !Object.values(Role).includes(role)) {
        return res.status(400).json({ status: 400, message: 'Valid user id and role are required' })
    }
    if (req.user.id === id && role === Role.GUEST) {
        return res.status(400).json({ status: 400, message: 'Cannot downgrade self to guest' })
    }
    try {
        const updated = await prisma.user.update({
            where: { id },
            data: { role }
        })
        res.status(200).json({ status: 200, user: { id: updated.id, role: updated.role } })
    } catch (e: any) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return res.status(404).json({ status: 404, message: 'User not found' })
        }
        res.status(500).json({ status: 500, message: 'Unable to update role' })
    }
}
export {
    login,
    register,
    getProfile,
    listUsers,
    updateUserRole
}
