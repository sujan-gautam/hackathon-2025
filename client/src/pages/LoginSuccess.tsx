import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export default function LoginSuccess() {
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const name = params.get("name");
    const email = params.get("email");
    const picture = params.get("picture");

    localStorage.setItem("token", token!);
    localStorage.setItem("user", JSON.stringify({ name, email, picture }));

    window.location.href = "/dashboard";
  }, []);

  return <div>Logging you in...</div>;
}
