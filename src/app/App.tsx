import { createBrowserRouter, RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { AppProvider } from "./lib/store";
import DashboardLayout from "./components/DashboardLayout";
import { PublicSubmissionForm } from "./components/PublicSubmissionForm";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { ForgotPassword } from "./components/ForgotPassword";
import { AuthGuard } from "./components/AuthGuard";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/",
    element: (
      <AuthGuard>
        <DashboardLayout />
      </AuthGuard>
    ),
  },
  {
    path: "/public/submit",
    element: <PublicSubmissionForm />,
  },
  {
    path: "*",
    element: (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
          <p className="text-gray-600 mb-4">Page not found</p>
          <a href="/" className="text-blue-600 hover:underline">
            Go back home
          </a>
        </div>
      </div>
    ),
  },
]);

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
        }}
      />
    </AppProvider>
  );
}
