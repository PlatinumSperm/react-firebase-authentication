import { useState } from "react";
import Navbar from "./component/Navbar";
import Hero from "./component/Hero";
import SignIn from "./component/SignIn";
import SignUp from "./component/SignUp";
import ResetPassword from "./component/ResetPassword";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";


export default function App() {
  const [mode, setMode] = useState("signin");

  // 🔹 Đăng nhập email
  const signInWithEmail = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Đăng nhập thành công! 🎉");
    } catch (err) {
      toast.error("Lỗi đăng nhập: " + err.message);
    }
  };

  // 🔹 Đăng ký
  const signUpWithEmail = async (email, password) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email: cred.user.email,
        createdAt: new Date(),
      });
      toast.success("Tạo tài khoản thành công!");
      setMode("signin");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        toast.warning("⚠️ Tài khoản đã tồn tại!");
      } else {
        toast.error("Lỗi đăng ký: " + err.message);
      }
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.info("📩 Đã gửi email đặt lại mật khẩu!");
      setMode("signin");
    } catch (err) {
      toast.error("Lỗi reset mật khẩu: " + err.message);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await setDoc(doc(db, "users", result.user.uid), {
        email: result.user.email,
        name: result.user.displayName,
        lastLogin: new Date(),
      });
      toast.success("Đăng nhập Google thành công! 🚀");
    } catch (err) {
      toast.error("Lỗi Google Sign In: " + err.message);
    }
  };

  return (
    <div>
      <Navbar />
      <Hero />

      {/* {mode === "signin" && (
        <SignIn
          setMode={setMode}
          signInWithEmail={signInWithEmail}
          signInWithGoogle={signInWithGoogle}
        />
      )}
      {mode === "signup" && (
        <SignUp setMode={setMode} signUpWithEmail={signUpWithEmail} />
      )}
      {mode === "reset" && (
        <ResetPassword setMode={setMode} resetPassword={resetPassword} />
      )} */}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
