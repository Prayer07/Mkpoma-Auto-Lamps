import type { Request, Response } from "express"
import prisma from "../common/prisma.js"

// SEARCH STORE GOODS
export const searchShopGoods = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || "").trim()

    const goods = await prisma.shopProduct.findMany({
      where: {
        quantity: { gt: 0 },
        shop: { businessId: req.user.businessId! },
        ...(query && {
          name: { contains: query, mode: "insensitive" },
        })
      },
      include: {
        shop: {
          select: { name: true },
        },
      },
      take: 20,
      orderBy: { name: "asc" },
    })

    res.json(
      goods.map((g) => ({
        shopProductId: g.id,
        name: g.name,
        shopName: g.shop.name,
        price: g.sellingPrice,
        quantity: g.quantity,
      }))
    )
  } catch (error) {
    console.error("Search goods error:", error)
    res.status(500).json({ error: "Failed to search products" })
  }
}