import { Router } from "express"
import {
  searchShopGoods,
} from "../controllers/stocks.controller.js"
import { requireAuth } from "../middleware/auth.js"

const router = Router()

router.use(requireAuth)

router.get("/shop/search", searchShopGoods)

export default router