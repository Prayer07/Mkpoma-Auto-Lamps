import { useEffect, useState, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { api } from "../../lib/api"
import { Card } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

export default function PaymentHistory() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/debtors/${customerId}/payments`)
      setCustomer(res.data)
    } catch (err: any) {
      toast.error("Failed to load payment history")
      navigate("/debtors", { replace: true })
    } finally {
      setLoading(false)
    }
  }, [customerId, navigate])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#6f4e37]" />
      </div>
    )
  }

  if (!customer) return null

  const totalDebt = customer.debts.reduce(
    (sum: number, d: any) => sum + d.totalAmount,
    0
  )
  const totalPaid = customer.debts.reduce(
    (sum: number, d: any) => sum + d.amountPaid,
    0
  )
  const totalBalance = customer.debts.reduce(
    (sum: number, d: any) => sum + d.balance,
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-[#f5f1ec] border border-[#e5ddd5] rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-[#3e2f25]">
              Payment History: {customer.fullName}
            </h2>
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
            {customer.address && (
              <p className="text-xs text-muted-foreground">
                {customer.address}
              </p>
            )}
          </div>
        </div>

        <Button
          asChild
          className="bg-[#6f4e37] hover:bg-[#5c402d]"
          size="sm"
        >
          <Link to={`/debtors/${customer.id}`}>View Debts</Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border-[#e5ddd5]">
          <p className="text-xs text-muted-foreground mb-1">Total Debt</p>
          <p className="text-xl font-bold text-[#3e2f25]">
            ₦{totalDebt.toLocaleString()}
          </p>
        </Card>

        <Card className="p-4 border-[#e5ddd5]">
          <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
          <p className="text-xl font-bold text-green-600">
            ₦{totalPaid.toLocaleString()}
          </p>
        </Card>

        <Card className="p-4 border-[#e5ddd5]">
          <p className="text-xs text-muted-foreground mb-1">Balance</p>
          <p className="text-xl font-bold text-[#6f4e37]">
            ₦{totalBalance.toLocaleString()}
          </p>
        </Card>
      </div>

      {customer.debts.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No debts recorded yet</p>
        </Card>
      )}

      <div className="grid gap-4">
        {customer.debts.map((d: any) => (
          <Card
            key={d.id}
            className={`p-4 space-y-3 border-[#e5ddd5] ${
              d.isCleared ? "bg-green-50 border-green-200" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Debt #{d.id} - Created:{" "}
                {new Date(d.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              {d.isCleared && (
                <span className="inline-block text-[10px] px-2 py-1 rounded bg-green-600 text-white font-semibold">
                  CLEARED
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="font-medium">₦{d.totalAmount.toLocaleString()}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Paid</p>
                <p className="font-medium text-green-600">
                  ₦{d.amountPaid.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Balance</p>
                <p className="font-semibold text-[#6f4e37]">
                  ₦{d.balance.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-2">Payments</p>
              {d.payments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No payments recorded yet
                </p>
              ) : (
                <div className="space-y-2">
                  {d.payments.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between bg-[#faf7f3] border border-[#eee6de] rounded-md px-3 py-2 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-[#3e2f25]">
                          ₦{p.amount.toLocaleString()} - {p.type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.createdBy?.fullName
                          ? `Recorded by: ${p.createdBy.fullName}`
                          : "Recorded by: System"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
