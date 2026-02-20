import type { Request, Response } from "express"
import prisma from "../common/prisma.js"

// ✅ Helper to validate business ownership
async function validateShopOwnership(
  shopId: number,
  businessId: number
) {
  return await prisma.shop.findFirst({
    where: {
      id: shopId,
      businessId,
    },
  })
}

// CREATE WAREHOUSE
export const createShop = async (req: Request, res: Response) => {
  try {
    const { name, location } = req.body

    // ✅ Validation
    if (!name?.trim() || !location?.trim()) {
      return res.status(400).json({ error: "Name and location are required" })
    }

    const businessId = req.user.businessId!

    // ✅ Check for duplicate
    const exists = await prisma.shop.findFirst({
      where: {
        name: name.trim(),
        businessId,
      },
      select: { id: true },
    })

    if (exists) {
      return res.status(409).json({ error: "Shop already exists" })
    }

    const shop = await prisma.shop.create({
      data: {
        name: name.trim(),
        location: location.trim(),
        businessId,
      },
    })

    res.status(201).json(shop)
  } catch (error) {
    console.error("Create shop error:", error)
    res.status(500).json({ error: "Failed to create shop" })
  }
}

// GET WAREHOUSES
export const getShops = async (req: Request, res: Response) => {
  try {
    const shops = await prisma.shop.findMany({
      where: { businessId: req.user.businessId! },
      include: {
        goods: {
          orderBy: { dateAdded: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    res.json(shops)
  } catch (error) {
    console.error("Get shops error:", error)
    res.status(500).json({ error: "Failed to fetch shops" })
  }
}

// UPDATE WAREHOUSE
export const updateShop = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, location } = req.body

    // ✅ Validation
    if (!name?.trim() || !location?.trim()) {
      return res.status(400).json({ error: "Name and location are required" })
    }

    const shopId = Number(id)
    if (isNaN(shopId)) {
      return res.status(400).json({ error: "Invalid shop ID" })
    }

    // ✅ Check ownership
    const shop = await validateShopOwnership(
      shopId,
      req.user.businessId!
    )

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" })
    }

    // ✅ Check for duplicate name (excluding current shop)
    const duplicate = await prisma.shop.findFirst({
      where: {
        name: name.trim(),
        businessId: req.user.businessId!,
        NOT: { id: shopId },
      },
      select: { id: true },
    })

    if (duplicate) {
      return res.status(409).json({ error: "Shop name already exists" })
    }

    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: {
        name: name.trim(),
        location: location.trim(),
      },
      include: { goods: true },
    })

    res.json(updated)
  } catch (error) {
    console.error("Update shop error:", error)
    res.status(500).json({ error: "Failed to update shop" })
  }
}

// DELETE WAREHOUSE
export const deleteShop = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const shopId = Number(id)
    if (isNaN(shopId)) {
      return res.status(400).json({ error: "Invalid shop ID" })
    }

    // ✅ Check ownership
    const shop = await validateShopOwnership(
      shopId,
      req.user.businessId!
    )

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" })
    }

    // ✅ Check if shop has goods
    const goodsCount = await prisma.shopProduct.count({
      where: { shopId },
    })

    if (goodsCount > 0) {
      return res.status(400).json({
        error: `Cannot delete shop with ${goodsCount} item(s). Remove all goods first.`,
      })
    }

    await prisma.shop.delete({ where: { id: shopId } })

    res.json({ message: "Shop deleted successfully" })
  } catch (error) {
    console.error("Delete shop error:", error)
    res.status(500).json({ error: "Failed to delete shop" })
  }
}

// ADD GOODS
export const addGoods = async (req: Request, res: Response) => {
  try {
    const { name, quantity, costPrice, sellingPrice, shopId } = req.body

    // ✅ Validation
    if (!name?.trim()) {
      return res.status(400).json({ error: "Product name is required" })
    }

    if (!shopId || isNaN(Number(shopId))) {
      return res.status(400).json({ error: "Valid shop ID is required" })
    }

    if (quantity <= 0 || costPrice < 0 || sellingPrice < 0) {
      return res.status(400).json({ error: "Invalid quantity or prices" })
    }

    // ✅ Validate shop ownership
    const shop = await validateShopOwnership(
      Number(shopId),
      req.user.businessId!
    )

    if (!shop) {
      return res.status(404).json({ error: "Shop not found" })
    }

    // ✅ Check for duplicate product in same shop
    const exists = await prisma.shopProduct.findFirst({
      where: {
        name: name.trim(),
        shopId: shop.id,
      },
      select: { id: true },
    })

    if (exists) {
      return res.status(409).json({
        error: "Product already exists in this shop. Update quantity instead.",
      })
    }

    const product = await prisma.shopProduct.create({
      data: {
        name: name.trim(),
        quantity: Number(quantity),
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        shopId: shop.id,
      },
    })

    res.status(201).json(product)
  } catch (error) {
    console.error("Add goods error:", error)
    res.status(500).json({ error: "Failed to add goods" })
  }
}

// UPDATE GOODS
export const updateGoods = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, quantity, costPrice, sellingPrice } = req.body

    // ✅ Validation
    const goodsId = Number(id)
    if (isNaN(goodsId)) {
      return res.status(400).json({ error: "Invalid goods ID" })
    }

    if (!name?.trim()) {
      return res.status(400).json({ error: "Product name is required" })
    }

    if (quantity <= 0 || costPrice < 0 || sellingPrice < 0) {
      return res.status(400).json({ error: "Invalid quantity or prices" })
    }

    // ✅ Check ownership
    const goods = await prisma.shopProduct.findFirst({
      where: {
        id: goodsId,
        shop: { businessId: req.user.businessId! },
      },
    })

    if (!goods) {
      return res.status(404).json({ error: "Goods not found" })
    }

    // ✅ Check for duplicate name in same shop (excluding current item)
    const duplicate = await prisma.shopProduct.findFirst({
      where: {
        name: name.trim(),
        shopId: goods.shopId,
        NOT: { id: goodsId },
      },
      select: { id: true },
    })

    if (duplicate) {
      return res.status(409).json({ error: "Product name already exists in this shop" })
    }

    const updated = await prisma.shopProduct.update({
      where: { id: goodsId },
      data: {
        name: name.trim(),
        quantity: Number(quantity),
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
      },
    })

    res.json(updated)
  } catch (error) {
    console.error("Update goods error:", error)
    res.status(500).json({ error: "Failed to update goods" })
  }
}

// DELETE GOODS
export const deleteGoods = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const goodsId = Number(id)
    if (isNaN(goodsId)) {
      return res.status(400).json({ error: "Invalid goods ID" })
    }

    // ✅ Check ownership
    const goods = await prisma.shopProduct.findFirst({
      where: {
        id: goodsId,
        shop: { businessId: req.user.businessId! },
      },
    })

    if (!goods) {
      return res.status(404).json({ error: "Goods not found" })
    }

    await prisma.shopProduct.delete({ where: { id: goodsId } })

    res.json({ message: "Goods deleted successfully" })
  } catch (error) {
    console.error("Delete goods error:", error)
    res.status(500).json({ error: "Failed to delete goods" })
  }
}