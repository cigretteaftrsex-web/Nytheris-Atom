import React, { useState, useEffect, useRef } from "react";
import { User, ShieldCheck, ArrowRight, Loader2, RefreshCw, KeyRound, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ApiClient from "../utils/ApiClient";

interface LoginScreenProps {
  onLoginSuccess: (token: string, msisdn: string, userId: number, refreshToken?: string, name?: string) => void;
  onCancel?: () => void;
}

export default function LoginScreen({ onLoginSuccess, onCancel }: LoginScreenProps) {
  const [msisdn, setMsisdn] = useState("");
  const [userName, setUserName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugText, setDebugText] = useState("");
  
  // Safe refs to avoid any stale closure bugs when resolving promises
  const safeTokenRef = useRef<string>("");
  const safeMsisdnRef = useRef<string>("");
  const safeNameRef = useRef<string>("");
  
  const isVerifyingRef = useRef(false);
  const loginSucceededRef = useRef(false);

  // Sync state to refs for robust auto-verification
  useEffect(() => { safeMsisdnRef.current = msisdn; }, [msisdn]);
  useEffect(() => { safeNameRef.current = userName; }, [userName]);

  const [resendTimer, setResendTimer] = useState(0);
  const [otpArray, setOtpArray] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any;
    if (step === "otp" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  useEffect(() => {
    if (step === "otp" && inputRefs.current[0]) {
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    }
  }, [step]);

  // Core verification worker (guaranteed to be called only once per valid OTP entry)
  const submitVerificationCode = async (codeStr: string) => {
    if (isVerifyingRef.current || loginSucceededRef.current) return;
    const finalCode = codeStr.replace(/\D/g, "");
    if (finalCode.length !== 6) return;

    isVerifyingRef.current = true;
    setLoading(true);
    setError("");

    const clean = safeMsisdnRef.current.replace(/\D/g, "");
    const finalCleanPhone = getCleanPhone(clean);
    const apiToken = safeTokenRef.current;
    
    // 🔥 ARTIFICIAL DELAY: 1200ms
    // If Android auto-fills the OTP instantly from SMS, ATOM's infrastructure often hasn't 
    // synced the OTP token across their databases yet. We introduced this delay to guarantee 
    // we bypass "Invalid OTP or Expired" replica lag on quick pastes.
    await new Promise(r => setTimeout(r, 1200));

    const endpoint = `/api/atom/mytmapi/v1/my/local-auth/verify-otp`;

    try {
      const response = await ApiClient.request(
        endpoint,
        {
          method: "POST",
          body: {
            msisdn: finalCleanPhone,
            code: apiToken,
            otp: finalCode,
          } as any,
        },
        "-1",
        true
      );

      const responseText = await response.text();
      console.log(`[Verify OTP] Status: ${response.status}`, responseText);
      let resData: any = null;
      try { resData = JSON.parse(responseText); } catch (e) {}

      if (response.ok && resData?.status === "success" && resData?.data?.attribute) {
        loginSucceededRef.current = true;
        const payload = resData.data.attribute;
        onLoginSuccess(payload.token, payload.msisdn, payload.user_id, payload.refresh_token, safeNameRef.current);
      } else {
        if (!loginSucceededRef.current) {
          let errorMsg = "Otp မှားယွင်းနေပါသည်။";
          if (resData?.message) errorMsg = `${resData.message}`;
          else if (resData?.data?.message) errorMsg = `${resData.data.message}`;
          
          setError(errorMsg);
          setDebugText(`[Verify Fail] Res: ${responseText}`);
          setOtpArray(["", "", "", "", "", ""]);
          setOtp("");
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      }
    } catch (err: any) {
      console.error("[Verify OTP] Network Error", err);
      if (!loginSucceededRef.current) {
        setError("ကွန်ရက်ချိတ်ဆက်မှု မရရှိပါ။");
        setDebugText(`[Network Error] ${err.message}`);
        setOtpArray(["", "", "", "", "", ""]);
        setOtp("");
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } finally {
      isVerifyingRef.current = false;
      setLoading(false);
    }
  };

  // Safe manual verify wrapper for submit handlers
  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    submitVerificationCode(otp);
  };

  // WebOTP API Detection
  useEffect(() => {
    if (step === "otp" && "OTPCredential" in window) {
      const abortController = new AbortController();
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: abortController.signal
      } as any).then((content: any) => {
        if (content && content.code) {
          const rawCode = String(content.code || "");
          const digitMatch = rawCode.match(/\b\d{6}\b/) || rawCode.match(/\d{6}/);
          const pastedData = digitMatch ? digitMatch[0] : rawCode.replace(/\D/g, "").slice(0, 6);
          if (pastedData && pastedData.length === 6) {
            setOtpArray(pastedData.split(""));
            setOtp(pastedData);
            submitVerificationCode(pastedData);
          }
        }
      }).catch(err => {
        if (err.name !== 'AbortError' && !err.message?.includes('otp-credentials')) {
          console.warn("WebOTP Warn:", err);
        }
      });
      return () => { abortController.abort(); };
    }
  }, [step]);

  const updateOtpState = (newArr: string[]) => {
    setOtpArray(newArr);
    const joined = newArr.join("");
    setOtp(joined);
    if (joined.length === 6) {
      submitVerificationCode(joined);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value.replace(/\D/g, "");
    
    // Auto-fill or fast typing catching
    if (value.length > 1) {
      const chars = value.split("").slice(0, 6);
      const newOtp = [...otpArray];
      let idx = 0;
      for (let i = index; i < 6 && idx < chars.length; i++) {
        newOtp[i] = chars[idx];
        idx++;
      }
      updateOtpState(newOtp);
      const focusIndex = Math.min(index + value.length, 5);
      setTimeout(() => inputRefs.current[focusIndex]?.focus(), 10);
      return;
    }

    const newOtp = [...otpArray];
    if (value) {
      newOtp[index] = value.slice(-1);
      updateOtpState(newOtp);
      if (index < 5) setTimeout(() => inputRefs.current[index + 1]?.focus(), 10);
    } else {
      newOtp[index] = "";
      updateOtpState(newOtp);
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !otpArray[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otpArray];
      newOtp[index - 1] = "";
      updateOtpState(newOtp);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      const newOtp = [...otpArray];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      updateOtpState(newOtp);
      const focusIndex = Math.min(pastedData.length, 5);
      setTimeout(() => inputRefs.current[focusIndex]?.focus(), 10);
    }
  };

  const getCleanPhone = (phone: string) => {
    let clean = phone.replace(/\D/g, "");
    if (clean.startsWith("959")) return clean;
    if (clean.startsWith("95") && clean.length > 10) return clean;
    if (clean.startsWith("09")) return "959" + clean.slice(2);
    if (clean.startsWith("9") && clean.length === 10) return "95" + clean;
    return "95" + clean;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setDebugText("");

    if (!userName.trim()) {
      setError("အမည် ထည့်သွင်းပေးပါ။");
      return;
    }

    const clean = getCleanPhone(msisdn);
    if (!clean || clean.length < 9 || clean.length > 13) {
      setError("ဖုန်းနံပါတ် မှားယွင်းနေပါသည်");
      return;
    }

    setLoading(true);
    try {
      const response = await ApiClient.login(msisdn);

      const responseText = await response.text();
      console.log(`[Send OTP] Status: ${response.status}`, responseText);
      let resData: any = null;
      try { resData = JSON.parse(responseText); } catch (e) {}

      if (response.ok && resData?.status === "success" && resData?.data?.attribute?.code) {
        safeTokenRef.current = resData.data.attribute.code;
        setStep("otp");
        setOtpArray(["", "", "", "", "", ""]);
        setOtp("");
        setResendTimer(60);
      } else {
        setError("ဖုန်းနံပါတ် မှားယွင်းနေပါသည်။");
        setDebugText(`[Send OTP Fail] ${response.status} Res: ${responseText}`);
      }
    } catch (err: any) {
      console.error("[Send OTP] Network Error", err);
      setError("ဖုန်းနံပါတ် မှားယွင်းနေပါသည်။");
      setDebugText(`[Network Error] ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 relative z-10 font-sans selection:bg-[#00ff66]/30 text-slate-200">
      {onCancel && (
        <button
          onClick={onCancel}
          className="absolute top-4 left-4 z-50 p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-full transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[360px] bg-[#0d1424]/80 backdrop-blur-3xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2rem] p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#00ff66]/50 to-transparent" />

        <div className="mb-7 text-center relative z-10">
          <div className="w-14 h-14 mx-auto bg-gradient-to-br from-emerald-500/10 to-[#00ff66]/10 border border-[#00ff66]/20 rounded-2xl flex items-center justify-center mb-4 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-[0_0_20px_rgba(0,255,102,0.1)]">
            <Fingerprint className="w-7 h-7 text-[#00ff66]" />
          </div>
          <h1 className="text-2xl font-black text-white font-display tracking-widest uppercase shadow-black drop-shadow-md">Nyth Atom</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-1.5 font-bold font-mono">
            {step === "phone" ? "Authorization" : "Secure Verification"}
          </p>
        </div>

        <AnimatePresence mode="popLayout">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, mb: 0 }}
              animate={{ opacity: 1, height: "auto", mb: 20 }}
              exit={{ opacity: 0, height: 0, mb: 0 }}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] text-center font-sans tracking-wide font-medium flex items-center justify-center"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/80 mr-2 flex-none" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === "phone" ? (
            <motion.form key="phone" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleSendOtp} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 font-sans">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-500 group-focus-within:text-[#00ff66] transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Display Name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-[#050914]/50 border border-white/5 group-focus-within:border-[#00ff66]/40 rounded-xl py-3 pl-10 pr-4 text-[13px] font-semibold text-white placeholder:text-slate-600 focus:outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 font-sans">Phone Number</label>
                <div className="relative flex items-center bg-[#050914]/50 border border-white/5 rounded-xl focus-within:border-[#00ff66]/40 transition-all shadow-inner group">
                  <div className="pl-3.5 pr-2.5 py-3 flex items-center border-r border-white/5 group-focus-within:border-[#00ff66]/20 transition-colors">
                    <span className="text-[13px] font-black text-slate-400 group-focus-within:text-[#00ff66] font-mono transition-colors">+95</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="09 7XX XXX XXX"
                    value={msisdn}
                    onChange={(e) => setMsisdn(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-transparent py-3 pl-3 pr-4 text-[14px] font-bold tracking-[0.15em] text-white placeholder:text-slate-600 placeholder:tracking-normal focus:outline-none font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00ff66] hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl text-[11px] tracking-[0.15em] uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] outline-none disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,102,0.15)] flex justify-center items-center mt-6"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-950" /> : "Continue via ATOM"}
              </button>
            </motion.form>
          ) : (
            <motion.form key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleManualVerify} className="space-y-5">
              
              <div className="flex justify-center items-center space-x-1.5 mb-6 text-[11px] font-medium text-slate-400 bg-white/5 border border-white/5 py-1.5 px-3 rounded-full mx-auto w-fit">
                <span>Sent to <span className="font-mono text-white tracking-widest">+95 {msisdn}</span></span>
                <button type="button" onClick={() => setStep("phone")} className="text-[#00ff66] hover:text-white transition-colors ml-1 font-bold uppercase tracking-wider text-[9px] cursor-pointer">
                  Edit
                </button>
              </div>

              <div className="pt-2 pb-2">
                <div className="flex justify-between items-center gap-2" onPaste={handlePaste}>
                  {otpArray.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      name={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                      value={digit}
                      disabled={loading}
                      onChange={(e) => handleOtpChange(e, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      className="w-full aspect-[4/5] max-w-[42px] bg-[#050914]/50 border border-white/10 rounded-xl text-center text-xl font-black text-white focus:bg-[#00ff66]/10 focus:border-[#00ff66]/60 focus:ring-1 focus:ring-[#00ff66]/30 transition-all font-mono outline-none shadow-inner p-0 caret-[#00ff66] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-[#00ff66] hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl text-[11px] tracking-[0.15em] uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,102,0.15)] flex justify-center items-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
              </button>

              <div className="flex justify-center items-center mt-5">
                {resendTimer > 0 ? (
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center flex items-center justify-center gap-1.5">
                    Resend in <span className="text-[#00ff66] font-mono">{resendTimer}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSendOtp()}
                    className="text-[10px] text-[#00ff66] hover:text-white transition-colors flex items-center gap-1.5 mx-auto font-bold uppercase tracking-widest cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend Code</span>
                  </button>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
