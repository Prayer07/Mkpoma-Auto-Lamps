import type { Request, Response } from "express"
import prisma from "../common/prisma.js"

// SEARCH SHOP GOODS
export const searchShopGoods = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || "").trim()

    if (!query) {
      return res.json([])
    }

    const goods = await prisma.shopProduct.findMany({
      where: {
        quantity: { gt: 0 },
        shop: { businessId: req.user.businessId! },
        name: { contains: query, mode: "insensitive" },
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
    console.error("Search warehouse goods error:", error)
    res.status(500).json({ error: "Failed to search warehouse products" })
  }
}

// GET RECEIPT
export const getReceipt = async (req: Request, res: Response) => {
  try {
    const saleId = Number(req.params.saleId)

    if (isNaN(saleId)) {
      return res.status(400).json({ error: "Invalid receipt ID" })
    }

    const sale = await prisma.sale.findFirst({
      where: {
        id: saleId,
        shop: {
          businessId: req.user.businessId!,
        },
      },
      include: {
        shop: {
          select: { name: true },
        },
        soldBy: {
          select: { fullName: true },
        },
        items: {
          include: {
            shopProduct: {
              select: { name: true },
            },
          },
        },
        customer: {
          include: {
            debts: {
              where: { isCleared: false },
            },
          },
        },
      },
    })

    if (!sale) {
      return res.status(404).json({ error: "Receipt not found" })
    }

    // ✅ Calculate total debt (not including this sale)
    const totalDebt =
      sale.customer?.debts.reduce((sum, d) => sum + d.balance, 0) || 0

    const amountPaid = sale.amountPaid ?? sale.total
    const balance = sale.balance ?? 0
    const previousDebt = Math.max(0, totalDebt - balance)

    res.json({
      id: sale.id,
      shop: sale.shop.name,
      soldBy: sale.soldBy.fullName,
      createdAt: sale.createdAt,
      customerName: sale.customerName,
      items: sale.items.map((i) => ({
        name: i.name || i.shopProduct.name,
        quantity: i.quantity,
        price: i.price,
        subtotal: i.quantity * i.price,
      })),
      total: sale.total,
      amountPaid,
      balance,
      previousDebt,
      totalDebt,
    })
  } catch (error) {
    console.error("Get receipt error:", error)
    res.status(500).json({ error: "Failed to fetch receipt" })
  }
}

// SEARCH CUSTOMERS
export const searchCustomers = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || "").trim()

    if (!query) {
      return res.json([])
    }

    const customers = await prisma.customer.findMany({
      where: {
        businessId: req.user.businessId!,
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        debts: {
          where: { isCleared: false },
        },
      },
      take: 10,
      orderBy: { fullName: "asc" },
    })

    res.json(
      customers.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        totalDebt: c.debts.reduce((sum, d) => sum + d.balance, 0),
      }))
    )
  } catch (error) {
    console.error("Search customers error:", error)
    res.status(500).json({ error: "Failed to search customers" })
  }
}

export const getAllSales = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || "").trim()

    const sales = await prisma.sale.findMany({
      where: {
        shop: {
          businessId: req.user.businessId!,
        },
        ...(query && {
          OR: [
            {
              customerName: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              customer: {
                fullName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          ],
        }),
      },
      include: {
        shop: { select: { name: true } },
        soldBy: { select: { fullName: true } },
        customer: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    res.json(sales)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sales" })
  }
}


export const sellGoods = async (req: Request, res: Response) => {
  const businessId = req.user.businessId
  if (!businessId) {
    return res.status(400).json({ error: "User has no business" })
  }

  const httpError = (status: number, message: string) => {
    const err: any = new Error(message)
    err.status = status
    return err
  }

  const toInt = (value: any, field: string) => {
    const num = Number(value)
    if (!Number.isFinite(num) || !Number.isInteger(num)) {
      throw httpError(400, `${field} must be a whole number`)
    }
    return num
  }

  try {
    const isCartPayload =
      req.body?.shopId != null ||
      Array.isArray(req.body?.shopItems) ||
      Array.isArray(req.body?.warehouseItems) ||
      Array.isArray(req.body?.outsideItems)

    // --------------------
    // Legacy single-item payload support
    // --------------------
    if (!isCartPayload) {
      const {
        shopProductId,
        quantity,
        price,
        customerId,
        customerName,
        paymentStatus,
      } = req.body

      const shopProductIdNum = toInt(shopProductId, "shopProductId")
      const qty = toInt(quantity, "quantity")
      const unitPrice = toInt(price, "price")

      if (qty <= 0 || unitPrice <= 0) {
        return res.status(400).json({ error: "Invalid sale data" })
      }

      if (paymentStatus === "credit" && !customerId) {
        return res
          .status(400)
          .json({ error: "Customer ID required for credit sales" })
      }

      const shopProduct = await prisma.shopProduct.findFirst({
        where: {
          id: shopProductIdNum,
          shop: { businessId },
        },
        include: {
          shop: {
            select: { id: true },
          },
        },
      })

      if (!shopProduct) {
        return res.status(404).json({ error: "Product not found" })
      }

      if (qty > shopProduct.quantity) {
        return res.status(400).json({
          error: "Not enough stock",
          available: shopProduct.quantity,
        })
      }

      const total = qty * unitPrice
      const amountPaid = paymentStatus === "credit" ? 0 : total
      const balance = total - amountPaid

      const { sale, updatedProduct } = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            shopId: shopProduct.shop.id,
            soldById: req.user.id,
            customerId: customerId || null,
            customerName: customerName?.trim() || null,
            total,
            amountPaid,
            balance,
          },
        })

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            shopProductId: shopProduct.id,
            name: shopProduct.name,
            quantity: qty,
            price: unitPrice,
          },
        })

        if (customerId && paymentStatus === "credit") {
          const customer = await tx.customer.findFirst({
            where: { id: Number(customerId), businessId },
            select: { id: true },
          })

          if (!customer) {
            throw httpError(404, "Customer not found")
          }

          const existingDebt = await tx.debt.findFirst({
            where: {
              customerId: customer.id,
              businessId,
              isCleared: false,
            },
          })

          if (existingDebt) {
            await tx.debt.update({
              where: { id: existingDebt.id },
              data: {
                totalAmount: { increment: balance },
                balance: { increment: balance },
              },
            })
          } else {
            await tx.debt.create({
              data: {
                customerId: customer.id,
                businessId,
                totalAmount: balance,
                balance,
                amountPaid: 0,
              },
            })
          }
        }

        const updatedProduct = await tx.shopProduct.update({
          where: { id: shopProduct.id },
          data: { quantity: { decrement: qty } },
          select: { id: true, name: true, quantity: true },
        })

        return { sale, updatedProduct }
      })

      return res.status(201).json({
        saleId: sale.id,
        total,
        paid: amountPaid,
        balance,
      })
    }

    // --------------------
    // Cart payload
    // --------------------
    const shopId = toInt(req.body.shopId, "shopId")
    if (shopId <= 0) {
      throw httpError(400, "Invalid shopId")
    }

    const shopItems = Array.isArray(req.body.shopItems) ? req.body.shopItems : []
    const warehouseItems = Array.isArray(req.body.warehouseItems)
      ? req.body.warehouseItems
      : []
    const outsideItems = Array.isArray(req.body.outsideItems)
      ? req.body.outsideItems
      : []

    if (
      shopItems.length === 0 &&
      warehouseItems.length === 0 &&
      outsideItems.length === 0
    ) {
      throw httpError(400, "No items to sell")
    }

    const shopExists = await prisma.shop.findFirst({
      where: { id: shopId, businessId },
      select: { id: true },
    })

    if (!shopExists) {
      throw httpError(404, "Shop not found")
    }

    const normalizedShopItems = shopItems.map((item: any, index: number) => {
      const shopProductId = toInt(
        item?.shopProductId,
        `Shop item ${index + 1}: shopProductId`
      )
      const qty = toInt(item?.quantity, `Shop item ${index + 1}: quantity`)
      const price = toInt(item?.price, `Shop item ${index + 1}: price`)

      if (qty <= 0 || price <= 0) {
        throw httpError(400, `Shop item ${index + 1}: Invalid quantity or price`)
      }

      return { shopProductId, quantity: qty, price }
    })

    const normalizedOutsideItems = outsideItems.map((item: any, index: number) => {
      const name = String(item?.name ?? "").trim()
      if (!name) {
        throw httpError(400, `Outside item ${index + 1}: Name is required`)
      }

      const qty = toInt(item?.quantity, `Outside item ${index + 1}: quantity`)
      const price = toInt(item?.price, `Outside item ${index + 1}: price`)

      if (qty <= 0 || price <= 0) {
        throw httpError(
          400,
          `Outside item ${index + 1}: Invalid quantity or price`
        )
      }

      return { name, quantity: qty, price }
    })

    const total = [
      ...normalizedShopItems.map((i: any) => i.quantity * i.price),
      ...normalizedOutsideItems.map((i: any) => i.quantity * i.price),
    ].reduce((sum, v) => sum + v, 0)

    const paidInput = req.body.amountPaid
    const amountPaid =
      paidInput === undefined || paidInput === null || paidInput === ""
        ? total
        : toInt(paidInput, "amountPaid")

    if (amountPaid < 0) {
      throw httpError(400, "amountPaid cannot be negative")
    }

    if (amountPaid > total) {
      throw httpError(400, "amountPaid cannot exceed total")
    }

    const balance = total - amountPaid

    const customerIdRaw = req.body.customerId
    const customerId = customerIdRaw ? toInt(customerIdRaw, "customerId") : null
    const customerName = String(req.body.customerName ?? "").trim() || null

    if (balance > 0 && !customerId) {
      throw httpError(400, "Customer required for part payment")
    }

    const { sale, updatedShopProducts } = await prisma.$transaction(
      async (tx) => {
        if (customerId) {
          const customer = await tx.customer.findFirst({
            where: { id: customerId, businessId },
            select: { id: true },
          })

          if (!customer) {
            throw httpError(404, "Customer not found")
          }
        }

        const sale = await tx.sale.create({
          data: {
            shopId,
            soldById: req.user.id,
            customerId: customerId || null,
            customerName,
            total,
            amountPaid,
            balance,
          },
        })

        let miscShopProductId: number | null = null

        if (normalizedOutsideItems.length > 0) {
          const misc = await tx.shopProduct.upsert({
            where: {
              name_shopId: {
                name: "__POS_MISC__",
                shopId,
              },
            },
            update: {},
            create: {
              name: "__POS_MISC__",
              quantity: 0,
              price: 0,
              sellingPrice: 0,
              costPrice: 0,
              shopId,
              businessId,
            },
            select: { id: true },
          })

          miscShopProductId = misc.id
        }

        const updatedShopProducts: Array<{
          id: number
          name: string
          quantity: number
        }> = []

        for (const item of normalizedShopItems) {
          const product = await tx.shopProduct.findFirst({
            where: {
              id: item.shopProductId,
              shop: { businessId },
            },
            select: { id: true, name: true, quantity: true },
          })

          if (!product) {
            throw httpError(404, "Product not found")
          }

          if (product.quantity < item.quantity) {
            throw httpError(400, `Insufficient stock for ${product.name}`)
          }

          const updated = await tx.shopProduct.update({
            where: { id: product.id },
            data: { quantity: { decrement: item.quantity } },
            select: { id: true, name: true, quantity: true },
          })

          updatedShopProducts.push(updated)

          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              shopProductId: product.id,
              name: product.name,
              quantity: item.quantity,
              price: item.price,
            },
          })
        }

        for (const item of normalizedOutsideItems) {
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              shopProductId: miscShopProductId!,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            },
          })
        }

        if (balance > 0) {
          const existingDebt = await tx.debt.findFirst({
            where: {
              customerId: customerId!,
              businessId,
              isCleared: false,
            },
          })

          if (existingDebt) {
            await tx.debt.update({
              where: { id: existingDebt.id },
              data: {
                totalAmount: { increment: balance },
                balance: { increment: balance },
              },
            })
          } else {
            await tx.debt.create({
              data: {
                customerId: customerId!,
                businessId,
                totalAmount: balance,
                balance,
                amountPaid: 0,
              },
            })
          }
        }

        return { sale, updatedShopProducts }
      }
    )

    return res.status(201).json({
      message: "Sale completed",
      saleId: sale.id,
      total,
      paid: amountPaid,
      balance,
    })
  } catch (err: any) {
    console.error("Sell goods error:", err)
    return res.status(Number(err?.status) || 500).json({
      error: err?.message || "Failed to complete sale",
    })
  }
}