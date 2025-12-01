import AdminDashboard from "@/components/templates/AdminDashboard"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export const metadata = {
  title: "Administración | Sistema",
  description: "Panel de administración general del sistema",
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminDashboard />
    </ProtectedRoute>
  )
}
