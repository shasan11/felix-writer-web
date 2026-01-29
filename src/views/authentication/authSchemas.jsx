import * as Yup from "yup";

export const signInSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string().min(6, "Min 6 characters").required("Password is required"),
});

export const signUpSchema = Yup.object({
  fullName: Yup.string().min(2, "Too short").required("Full name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string().min(6, "Min 6 characters").required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Confirm your password"),
});

export const forgotPasswordSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Email is required"),
});

export const resetPasswordSchema = Yup.object({
  password: Yup.string().min(6, "Min 6 characters").required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Confirm your password"),
});
