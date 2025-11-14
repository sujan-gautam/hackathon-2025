import React from "react";

export default function Login() {
  const login = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  return (
    <button 
      onClick={login} 
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      Login with Google
    </button>
  );
}
