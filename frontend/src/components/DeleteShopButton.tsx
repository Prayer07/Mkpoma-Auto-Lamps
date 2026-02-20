import { useState } from "react"
import { api } from "../lib/api"
import { toast } from "sonner"
import { Button } from "./ui/button"
import { Loader2, Trash2 } from "lucide-react"

interface Props {
  shopId: number
  onDeleted: () => void
}

export default function DeleteShopButton({
  shopId,
  onDeleted,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this shop?")) return

    try {
      setIsDeleting(true)
      await api.delete(`/shop/${shopId}`)
      toast.success("Shop deleted successfully")
      onDeleted()
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || "Failed to delete shop"
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="destructive"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </>
      )}
    </Button>
  )
}