import { Routes, Route, Navigate } from 'react-router-dom'

// auth
import Login from './pages/auth/Login.tsx'


// layout
import Layout from './components/Layout'

// dashboard
import Dashboard from './pages/dashboard/Dashboard'

// shop
import AddShop from './pages/shop/AddShop.tsx'
import AddGoods from './pages/shop/AddGoods'
import ViewShopStock from './pages/shop/ViewShopStock.tsx'
import ShopGoods from './pages/shop/ShopGoods .tsx'

// store
import AddStore from './pages/store/AddStore'
import TransferGoods from './pages/store/TransferGoods'
import ViewStoreStock from './pages/store/ViewStoreStock'
import TransferHistory from './pages/store/TransferHistory'

// pos
import PosEntry from './pages/pos/PosEntry'
// import AddPosProduct from './pages/pos/AddPosProduct'

// debtors
import DebtorsList from "./pages/debtors/DebtorsList"
import AddCustomer from "./pages/debtors/AddCustomer"
import AddDebt from "./pages/debtors/AddDebt"
import DebtDetails from "./pages/debtors/DebtDetails"

import { Toaster } from "sonner"
import ProtectedRoute from './components/ProtectedRoute'
import CreateClient from './pages/auth/CreateClient'
import Receipt from './pages/pos/Receipt'
import CreateExternalInvoice from './pages/invoice/CreateExternalInvoice'
import ExternalInvoice from './pages/invoice/ExternalInvoice'
import ViewInvoice from './pages/invoice/ViewInvoice'
import ViewStoreProducts from './pages/store/ViewStoreProducts'
import ViewClients from './pages/auth/ViewClient.tsx'
import ChangePassword from './pages/auth/ChangePassword.tsx'
import { useEffect } from 'react'
// import { initForegroundNotifications } from './lib/foreground.ts'
// import './lib/getFcmToken.ts'
// import { useAuth } from './context/AuthContext.tsx'
// import { areNotificationsEnabled, registerPush } from './lib/getFcmToken.ts'
import Sales from './pages/sales/Sales.tsx'
import { api } from './lib/api.ts'
import SalesPage from './pages/pos/SalesPage.tsx'
import Stocks from './pages/stocks/Stocks.tsx'
import PaymentHistory from './pages/debtors/PaymentHistory.tsx'


export default function App() {
  // const { user } = useAuth()

  useEffect(() => {
    const wakeServer = async () => {
      try {
        await api.get("/health")
      } catch (err) {
        console.error("Shit went sideways" + err)
      }
    }
    wakeServer()
  },[])

  return (
    <>
    <Toaster position="top-center" richColors />

    <Routes>
      {/* public */}
      <Route path="/login" element={<Login />} />

      {/* protected */}
      <Route element={<ProtectedRoute roles={["SUPERADMIN"]} />}>

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/update-credentials" element={<ChangePassword />} />

          <Route path="/create-cashier" element={<CreateClient />} />
          <Route path="/cashier" element={<ViewClients />} />

          {/* shop */}
          <Route path="/shop/add" element={<AddShop />} />
          <Route path="/shop/add-goods" element={<AddGoods />} />
          <Route path="/shop" element={<ViewShopStock />} />
          <Route path="/shop/:id/goods" element={<ShopGoods />} />

          {/* store */}
          <Route path="/store/add" element={<AddStore />} />
          <Route path="/store/transfer" element={<TransferGoods />} />
          <Route path="/store" element={<ViewStoreStock />} />
          <Route path="/store/:id" element={<ViewStoreProducts />} />
          <Route path="/transfer-history" element={<TransferHistory />} />

          {/* sales */}
          <Route path='sales' element={<Sales/>}/>

          {/* stocks */}
          <Route path='stocks' element={<Stocks/>}/>

          {/* debtors */}
          <Route path="/debtors" element={<DebtorsList />} />
          <Route path="/debtors/add" element={<AddCustomer />} />
          <Route path="/debtors/:customerId" element={<DebtDetails />} />
          <Route path="/debtors/add-debt/:customerId" element={<AddDebt />} />
          <Route path="/debtors/:customerId/payments" element={<PaymentHistory />} />
        </Route>
      </Route>
      
      <Route element={<Layout/>}>
        {/* pos */}
        <Route path="/pos" element={<PosEntry />} />
        <Route path="/receipt/:saleId" element={<Receipt />} />
        <Route path="/receipt" element={<SalesPage />} />

        {/* External Invoice */}
        <Route path="/create/external-invoice" element={<CreateExternalInvoice />} />
        <Route path="/external-invoice/:id" element={<ExternalInvoice />} />
        <Route path="/external-invoice" element={<ViewInvoice />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
    </>
  )
}
