import { useEffect, useMemo, useState } from "react"
import { api } from "../../lib/api"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Card } from "../../components/ui/card"
import { toast } from "sonner"
import { Loader2, Package, Plus, Receipt, Trash2, User, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import { Link } from "react-router-dom"

type ShopOption = {
  id: number
  name: string
}

type ShopSearchResult = {
  shopProductId: number
  name: string
  shopName: string
  price: number
  quantity: number
}

type CartShopItem = {
  shopProductId: number
  name: string
  shopName: string
  available: number
  quantity: string
  price: string
}

type OutsideItem = {
  name: string
  price: string
  quantity: string
}

export default function PosSuperAdmin() {
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [selling, setSelling] = useState(false)

  // Sale shop (for receipt + misc item FK)
  const [shops, setShops] = useState<ShopOption[]>([])
  const [shopsLoading, setShopsLoading] = useState(false)
  const [shopId, setShopId] = useState("")

  // Customer
  const [customerQuery, setCustomerQuery] = useState("")
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [customerName, setCustomerName] = useState("")

  // Create customer dialog
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [newCustomerFullName, setNewCustomerFullName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [newCustomerAddress, setNewCustomerAddress] = useState("")

  // Shop goods search
  const [shopQuery, setShopQuery] = useState("")
  const [shopGoods, setShopGoods] = useState<ShopSearchResult[]>([])
  const [shopLoading, setShopLoading] = useState(false)

  // Cart
  const [shopCart, setShopCart] = useState<CartShopItem[]>([])
  const [outsideItems, setOutsideItems] = useState<OutsideItem[]>([])

  // Payment
  const [amountPaid, setAmountPaid] = useState("")

  useEffect(() => {
    const loadShops = async () => {
      try {
        setShopsLoading(true)
        const res = await api.get("/shop")
        const data: ShopOption[] = (res.data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
        }))
        setShops(data)
      } catch {
        toast.error("Failed to load shops")
      } finally {
        setShopsLoading(false)
      }
    }

    loadShops()
  }, [])

  // Search customers with debounce
  useEffect(() => {
    if (!customerQuery) {
      setCustomers([])
      return
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await api.get("/pos/customers/search", {
          params: { q: customerQuery },
        })
        setCustomers(res.data)
      } catch {
        toast.error("Failed to search customers")
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [customerQuery])

  // Search shop goods with debounce
  useEffect(() => {
    if (!shopQuery) {
      setShopGoods([])
      return
    }

    const timeout = setTimeout(async () => {
      try {
        setShopLoading(true)
        const res = await api.get("/pos/search", {
          params: { q: shopQuery },
        })
        setShopGoods(res.data)
      } catch {
        toast.error("Failed to search shop goods")
      } finally {
        setShopLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [shopQuery])

  const total = useMemo(() => {
    const shopTotal = shopCart.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0
      const price = Number(item.price) || 0
      return sum + qty * price
    }, 0)

    const outsideTotal = outsideItems.reduce((sum, item) => {
      if (!item.name.trim()) return sum
      const qty = Number(item.quantity) || 0
      const price = Number(item.price) || 0
      return sum + qty * price
    }, 0)

    return shopTotal + outsideTotal
  }, [shopCart, outsideItems])

  const paid = useMemo(() => {
    if (amountPaid.trim() === "") return total
    const n = Number(amountPaid)
    return Number.isFinite(n) ? n : 0
  }, [amountPaid, total])

  const balance = useMemo(() => {
    const b = total - paid
    return b > 0 ? b : 0
  }, [paid, total])

  const addShopToCart = (g: ShopSearchResult) => {
    setShopCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.shopProductId === g.shopProductId
      )

      if (existingIndex === -1) {
        return [
          ...prev,
          {
            shopProductId: g.shopProductId,
            name: g.name,
            shopName: g.shopName,
            available: g.quantity,
            quantity: "1",
            price: String(g.price),
          },
        ]
      }

      const updated = [...prev]
      const currentQty = Number(updated[existingIndex].quantity) || 0
      const nextQty = currentQty + 1

      if (nextQty > updated[existingIndex].available) {
        toast.error(`Only ${updated[existingIndex].available} units available`)
        return prev
      }

      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: String(nextQty),
      }
      return updated
    })
  }

  const updateShopCart = (
    index: number,
    key: keyof CartShopItem,
    value: any
  ) => {
    const updated = [...shopCart]
    updated[index] = { ...updated[index], [key]: value }
    setShopCart(updated)
  }

  const updateOutsideItem = (
    index: number,
    key: keyof OutsideItem,
    value: any
  ) => {
    const updated = [...outsideItems]
    updated[index] = { ...updated[index], [key]: value }
    setOutsideItems(updated)
  }

  const addOutsideItem = () => {
    setOutsideItems([...outsideItems, { name: "", price: "", quantity: "1" }])
  }

  const removeOutsideItem = (index: number) => {
    setOutsideItems(outsideItems.filter((_, i) => i !== index))
  }

  const createCustomer = async () => {
    if (creatingCustomer) return

    const fullName = newCustomerFullName.trim()
    const phone = newCustomerPhone.trim()
    const address = newCustomerAddress.trim()

    if (!fullName || !phone) {
      toast.error("Full name and phone are required")
      return
    }

    try {
      setCreatingCustomer(true)
      const res = await api.post("/debtors/customer", {
        fullName,
        phone,
        address: address || undefined,
      })

      const created = res.data
      setSelectedCustomer({ ...created, totalDebt: 0 })
      setCustomerName(created.fullName)
      setCreateCustomerOpen(false)
      setNewCustomerFullName("")
      setNewCustomerPhone("")
      setNewCustomerAddress("")
      toast.success("Customer created")
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to create customer"
      toast.error(msg)
    } finally {
      setCreatingCustomer(false)
    }
  }

  const completeSale = async () => {
    if (selling) return

    if (!shopId) {
      toast.error("Select a shop for this sale")
      return
    }

    const shopItems = shopCart.map((item) => ({
      shopProductId: item.shopProductId,
      quantity: Number(item.quantity),
      price: Number(item.price),
      available: item.available,
    }))

    const outsideItemsPayload = outsideItems
      .filter((i) => i.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity),
        price: Number(item.price),
      }))

    if (
      shopItems.length === 0 &&
      outsideItemsPayload.length === 0
    ) {
      toast.error("Add at least one item")
      return
    }

    for (const item of shopItems) {
      if (!item.quantity || item.quantity <= 0) {
        toast.error("Shop item quantity must be greater than 0")
        return
      }
      if (!item.price || item.price <= 0) {
        toast.error("Shop item price must be greater than 0")
        return
      }
      if (item.quantity > item.available) {
        toast.error("One of the shop items exceeds available stock")
        return
      }
    }

    for (const item of outsideItemsPayload) {
      if (!item.quantity || item.quantity <= 0) {
        toast.error("Outside item quantity must be greater than 0")
        return
      }
      if (!item.price || item.price <= 0) {
        toast.error("Outside item price must be greater than 0")
        return
      }
    }

    const paidNumber = amountPaid.trim() === "" ? total : Number(amountPaid)
    if (!Number.isFinite(paidNumber) || paidNumber < 0) {
      toast.error("Enter a valid amount paid")
      return
    }
    if (paidNumber > total) {
      toast.error("Amount paid cannot exceed total")
      return
    }

    const computedBalance = total - paidNumber

    if (computedBalance > 0 && !selectedCustomer) {
      toast.error("Select or create a customer for part payment")
      setCreateCustomerOpen(true)
      return
    }

    const finalCustomerName =
      customerName.trim() || selectedCustomer?.fullName || null

    try {
      setSelling(true)

      const payload: any = {
        shopId: Number(shopId),
        shopItems: shopItems.map(({ available, ...rest }) => rest),
        outsideItems: outsideItemsPayload,
        customerId: selectedCustomer?.id || null,
        customerName: finalCustomerName,
      }

      if (amountPaid.trim() !== "") {
        payload.amountPaid = paidNumber
      }

      const res = await api.post("/pos/sell", payload)

      toast.success("Sale completed")
      setReceiptId(String(res.data.saleId))

      // Keep shopId selected; reset cart and payment/customer inputs.
      setShopCart([])
      setOutsideItems([])
      setShopQuery("")
      setShopGoods([])
      setAmountPaid("")
      setSelectedCustomer(null)
      setCustomers([])
      setCustomerQuery("")
      setCustomerName("")
    } catch (err: any) {
      const msg = err.response?.data?.error || "Sale failed"
      toast.error(msg)
    } finally {
      setSelling(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Receipt className="w-8 h-8 text-[#6f4e37]" />
        <div>
          <h1 className="text-2xl font-bold">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">Superadmin cart</p>
        </div>
      </div>

      {/* Shop selection */}
      <Card className="p-4 space-y-2">
        <label className="text-sm font-medium">Sale Shop</label>
        <p className="text-sm text-muted-foreground">
          <Link style={{textDecoration: "underline"}} to={"/receipt"}>Get Receipts</Link>
        </p>
        {shopsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading shops...
          </div>
        ) : (
          <select
            className="w-full border rounded px-3 py-2 disabled:opacity-50 bg-white"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            disabled={selling}
          >
            <option value="">Select shop</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {shops.length === 0 && !shopsLoading && (
          <p className="text-xs text-amber-700">
            No shop found. Create a shop first.
          </p>
        )}
      </Card>

      {/* Customer Section */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="w-4 h-4" />
            <span>Customer</span>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCreateCustomerOpen(true)}
            disabled={selling}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Customer
          </Button>
        </div>

        {/* Manual Customer Name Input */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Customer Name (Optional)
          </label>
          <Input
            placeholder="Enter customer name..."
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={!!selectedCustomer || selling}
          />
        </div>

        {/* Search Registered Customer */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            Search Registered Customer (name/phone)
          </label>
          <Input
            placeholder="Search..."
            value={customerQuery}
            onChange={(e) => setCustomerQuery(e.target.value)}
            disabled={!!selectedCustomer || selling}
          />
        </div>

        {/* Customer Search Results */}
        {customers.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {customers.map((c) => (
              <Card
                key={c.id}
                className="p-3 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => {
                  setSelectedCustomer(c)
                  setCustomerName(c.fullName)
                  setCustomerQuery("")
                  setCustomers([])
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{c.fullName}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  {c.totalDebt > 0 && (
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                      Owes NGN{c.totalDebt.toLocaleString()}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Selected Customer */}
      {selectedCustomer && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  Selected: {selectedCustomer.fullName}
                </p>
                {selectedCustomer.phone && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCustomer.phone}
                  </p>
                )}
                {selectedCustomer.totalDebt > 0 && (
                  <p className="text-xs font-semibold text-red-600">
                    Outstanding Debt: NGN
                    {selectedCustomer.totalDebt.toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={selling}
                onClick={() => {
                  setSelectedCustomer(null)
                  setCustomerName("")
                  setCustomerQuery("")
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Shop Goods Search */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Package className="w-4 h-4" />
          <span>Add Shop Goods</span>
        </div>

        <Input
          placeholder="Search shop goods by name..."
          value={shopQuery}
          onChange={(e) => setShopQuery(e.target.value)}
          disabled={selling}
        />

        {shopLoading && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Searching shop goods...
          </p>
        )}

        {shopGoods.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {shopGoods.map((g) => (
              <Card
                key={g.shopProductId}
                className="p-3 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => {
                  addShopToCart(g)
                  setShopQuery("")
                  setShopGoods([])
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.shopName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#6f4e37]">
                      NGN{g.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {g.quantity}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      {shopCart.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Shop Cart</p>
            {shopCart.map((item, index) => (
              <Card
                key={item.shopProductId}
                className="p-3 bg-gray-50 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.shopName} • Stock: {item.available}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={selling}
                    onClick={() =>
                      setShopCart(shopCart.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Qty</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={item.available}
                      value={item.quantity}
                      onChange={(e) =>
                        updateShopCart(index, "quantity", e.target.value)
                      }
                      disabled={selling}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Unit Price</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={item.price}
                      onChange={(e) =>
                        updateShopCart(index, "price", e.target.value)
                      }
                      disabled={selling}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Outside goods */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Outside Goods (Optional)</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addOutsideItem}
            disabled={selling}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Outside Item
          </Button>
        </div>

        {outsideItems.length === 0 && (
          <p className="text-sm text-muted-foreground">No outside goods added.</p>
        )}

      {outsideItems.map((item, index) => (
          <Card key={index} className="p-3 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Outside Item {index + 1}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeOutsideItem(index)}
                disabled={selling}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Item name"
                value={item.name}
                onChange={(e) =>
                  updateOutsideItem(index, "name", e.target.value)
                }
                disabled={selling}
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Price"
                value={item.price}
                onChange={(e) =>
                  updateOutsideItem(index, "price", e.target.value)
                }
                disabled={selling}
              />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) =>
                  updateOutsideItem(index, "quantity", e.target.value)
                }
                disabled={selling}
              />
            </div>
          </Card>
        ))}
      </Card>

      {/* Payment + Total */}
      <Card className="p-4 space-y-4 border-2 border-[#6f4e37]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Total (NGN)</label>
            <div className="bg-muted p-3 rounded-lg font-bold">
              NGN{total.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Amount Paid (NGN)</label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Leave empty for full payment"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              disabled={selling}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Balance (NGN)</label>
            <div
              className={
                balance > 0
                  ? "bg-red-50 border border-red-200 p-3 rounded-lg font-bold text-red-700"
                  : "bg-green-50 border border-green-200 p-3 rounded-lg font-bold text-green-700"
              }
            >
              NGN{balance.toLocaleString()}
            </div>
          </div>
        </div>

        {balance > 0 && (
          <p className="text-xs text-red-700">
            Part payment detected. A registered customer is required so the
            balance can be added to their debt.
          </p>
        )}

        <Button
          type="button"
          className="w-full bg-[#6f4e37] hover:bg-[#5c402d] h-12 text-lg font-semibold"
          onClick={completeSale}
          disabled={selling || shops.length === 0}
        >
          {selling ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "COMPLETE SALE"
          )}
        </Button>
      </Card>

      {receiptId && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Sale Completed!</span>
            </div>

            <a
              href={`/receipt/${receiptId}`}
              className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
            >
              View Receipt -&gt;
            </a>
          </div>
        </Card>
      )}

      {/* Create customer dialog */}
      <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
        <DialogContent className="bg-[#f5f1ec] border-[#e5ddd5]">
          <DialogHeader>
            <DialogTitle className="text-[#3e2f25]">New Customer</DialogTitle>
            <DialogDescription>
              Register a customer so you can record debts for part payments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Full Name</label>
              <Input
                value={newCustomerFullName}
                onChange={(e) => setNewCustomerFullName(e.target.value)}
                placeholder="Customer full name"
                disabled={creatingCustomer}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Phone</label>
              <Input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
                placeholder="Phone number"
                disabled={creatingCustomer}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Address (Optional)</label>
              <Input
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                placeholder="Address"
                disabled={creatingCustomer}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateCustomerOpen(false)}
              disabled={creatingCustomer}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={createCustomer}
              className="bg-[#6f4e37] hover:bg-[#5c402d]"
              disabled={creatingCustomer}
            >
              {creatingCustomer ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Customer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}