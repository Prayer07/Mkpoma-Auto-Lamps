import type { Request, Response } from "express"
import prisma from "../common/prisma.js"

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const businessId = req.user.businessId

    if (!businessId) {
      return res.status(400).json({ error: "No business attached to user" })
    }

    const [
      shops,
      shopProducts,
      stores,
      storeProducts,
      debtors,
      debtSummary,
      todaySales,
    ] = await prisma.$transaction([
      prisma.shop.count({
        where: { businessId },
      }),

      prisma.shopProduct.count({
        where: {
          shop: { businessId },
        },
      }),

      prisma.shop.count({
        where: { businessId },
      }),
      
      prisma.shopProduct.count({
        where: {
          shop: { businessId },
        },
      }),

      prisma.customer.count({
        where: {
          businessId,
          debts: {
            some: { isCleared: false },
          },
        },
      }),

      prisma.debt.aggregate({
        where: {
          businessId,
          isCleared: false,
        },
        _sum: {
          balance: true,
        },
      }),

      prisma.sale.aggregate({
        where: {
          shop: { businessId },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _sum: {
          total: true,
        },
      }),
    ])

    res.json({
      shops,
      shopProducts,
      stores,
      storeProducts,
      debtors,
      outstandingDebt: debtSummary._sum.balance || 0,
      todaySales: todaySales._sum.total || 0,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to load dashboard stats" })
  }
}