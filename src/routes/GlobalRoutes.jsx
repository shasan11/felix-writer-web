import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";


import SignIn from "../views/authentication/SignIn";
import SignUp from "../views/authentication/SignUp";
import ResetPassword from "../views/authentication/ResetPassword";
import ForgotPassword from "../views/authentication/ForgotPassword";

export default function GlobalRoutes() {
  return (
   
      <Routes>
        <Route path="/" element={<Navigate to="/auth/sign-in" replace />} />

        <Route path="/auth/sign-in" element={<SignIn />} />
        <Route path="/auth/sign-up" element={<SignUp />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password/:token" element={<ResetPassword />} />

        <Route path="*" element={<Navigate to="/auth/sign-in" replace />} />
      </Routes>
    
  );
}
