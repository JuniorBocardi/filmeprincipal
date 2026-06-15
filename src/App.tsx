import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { UploadProvider } from "./contexts/UploadContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Watch from "./pages/Watch";
import Pedidos from "./pages/Pedidos";

export default function App() {
  return (
    <AuthProvider>
      <UploadProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/pedidos" element={<Pedidos />} />
          </Routes>
        </BrowserRouter>
      </UploadProvider>
    </AuthProvider>
  );
}
