// src/hooks/useOnboarding.ts
import { fetchAPI } from "@/services/api";

export const useOnboarding = () => {
  const getStatus = async () => {
    return await fetchAPI("onboarding/status", { method: "GET" });
  };

  const complete = async (payload: any) => {
    return await fetchAPI("onboarding/complete", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };

  return { getStatus, complete };
};
