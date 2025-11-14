// src/pages/Onboarding.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Check, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { fetchAPI } from '@/services/api';

const Onboarding = () => {
  const [step, setStep] = useState(1);

  // Step 1: Brand Identity
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');

  // Step 2: Automation Settings
  const [goals, setGoals] = useState<string[]>([]);
  const [tone, setTone] = useState('');
  const [frequency, setFrequency] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const goalOptions = [
    "Newsletter", "Welcome Emails", "Product Updates",
    "Promo Campaigns", "Reminders", "Reactivation Emails",
    "Transactional Emails"
  ];

  const toneOptions = [
    "Friendly", "Professional", "Bold & Energetic", "Minimalist", "Humorous"
  ];

  const frequencyOptions = ["Daily", "Weekly", "Monthly", "Custom"];

  // ------------------------------
  // 🚀 Check onboarding status
  // ------------------------------
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please sign in to set up your automation.",
        variant: "destructive",
      });
      navigate('/signin');
      return;
    }

    const loadStatus = async () => {
      try {
        const status = await fetchAPI("onboarding/status", { method: "GET" });

        if (status.completed) {
          navigate("/dashboard");
          return;
        }

      } catch (err) {
        console.error("Status fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, [isAuthenticated, navigate, toast]);

  // ------------------------------
  // Toggle Goals
  // ------------------------------
  const toggleGoal = (item: string) =>
    setGoals(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );

  // ------------------------------
  // 🚀 Submit Onboarding Data
  // ------------------------------
  const completeOnboarding = async () => {
    try {
      await fetchAPI("onboarding/complete", {
        method: "POST",
        body: JSON.stringify({
          senderName,
          senderEmail,
          brandName,
          brandDescription,
          automationGoals: goals,
          emailTone: tone,
          emailFrequency: frequency,
        }),
      });

      toast({
        title: "Success!",
        description: "Your automation setup is complete.",
      });

      navigate("/dashboard");

    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  // ------------------------------
  // Loading Screen
  // ------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500">Preparing your workspace...</p>
      </div>
    );
  }

  // ------------------------------
  // MAIN UI
  // ------------------------------
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Email Automation Setup
          </CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            Let’s configure your automation settings for the hackathon.
          </p>

          <div className="flex justify-center items-center space-x-2 mt-4">
            <div className={`h-2.5 w-12 rounded-full ${step >= 1 ? "bg-blue-600" : "bg-gray-200"}`}></div>
            <div className={`h-2.5 w-12 rounded-full ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`}></div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* -----------------------------
               STEP 1 — BRAND IDENTITY
          ----------------------------- */}
          {step === 1 && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Brand Identity</h3>

                <div>
                  <label className="text-sm font-medium">Sender Name</label>
                  <Input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Ex: Sujan from LoopAI"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Sender Email</label>
                  <Input
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="yourname@company.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Brand / Project Name</label>
                  <Input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="MarketingAI, LoopAutomation, etc."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Brand Description</label>
                  <Textarea
                    value={brandDescription}
                    onChange={(e) => setBrandDescription(e.target.value)}
                    placeholder="Tell us what your brand does..."
                    className="min-h-[120px]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={
                    !senderName.trim() ||
                    !senderEmail.trim() ||
                    !brandName.trim() ||
                    !brandDescription.trim()
                  }
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* -----------------------------
               STEP 2 — AUTOMATION SETTINGS
          ----------------------------- */}
          {step === 2 && (
            <>
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Automation Preferences</h3>

                {/* Goals */}
                <div>
                  <p className="text-sm font-medium mb-2">Automation Goals</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {goalOptions.map((item) => (
                      <button
                        key={item}
                        onClick={() => toggleGoal(item)}
                        className={`p-3 rounded-lg text-left ${
                          goals.includes(item)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        <div className="flex justify-between">
                          {item}
                          {goals.includes(item) && <Check className="h-4 w-4" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <p className="text-sm font-medium mb-2">Email Tone</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {toneOptions.map((item) => (
                      <button
                        key={item}
                        onClick={() => setTone(item)}
                        className={`p-3 rounded-lg ${
                          tone === item
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <p className="text-sm font-medium mb-2">Send Frequency</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {frequencyOptions.map((item) => (
                      <button
                        key={item}
                        onClick={() => setFrequency(item)}
                        className={`p-3 rounded-lg ${
                          frequency === item
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={completeOnboarding}
                  disabled={
                    goals.length === 0 ||
                    !tone ||
                    !frequency
                  }
                >
                  Complete Setup
                </Button>
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
