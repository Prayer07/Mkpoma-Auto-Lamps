import { Router } from "express"
import { 
  addGoods, 
  createShop,
  deleteGoods,
  deleteShop,
  getShops,
  updateGoods,
  updateShop, 
} from "../controllers/shop.controller.js"
import { requireAuth } from "../middleware/auth.js"

const router = Router()

router.post("/", requireAuth, createShop)

router.get("/", requireAuth, getShops)

router.put("/:id", requireAuth, updateShop)

router.delete("/:id", requireAuth, deleteShop)

router.post("/goods", requireAuth, addGoods)

router.put("/goods/:id", requireAuth, updateGoods)

router.delete("/goods/:id", requireAuth, deleteGoods)

export default router