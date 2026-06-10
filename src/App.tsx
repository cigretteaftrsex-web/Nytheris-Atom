import React, { useState, useEffect, useCallback } from "react";
import { LayoutGrid, Gamepad2, Gift, User, Palette, Sparkles, RefreshCw, X, BellRing } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LoginScreen from "./components/LoginScreen";
import DashboardScreen from "./components/DashboardScreen";
import GamesScreen from "./components/GamesScreen";
import RewardsScreen from "./components/RewardsScreen";
import ProfileScreen from "./components/ProfileScreen";
import {
  LightweightBalanceResponse,
  PointDashboardResponse,
  TohTohUnitedResponse,
  GoldenFarmResponse
} from "./types";
import ApiClient from "./utils/ApiClient";

export default function App() {
  // Token state & user attributes
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem("nythatom_token"));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem("nythatom_refresh_token"));
  const [msisdn, setMsisdn] = useState<string | null>(() => localStorage.getItem("nythatom_msisdn"));
  const [userName, setUserName] = useState<string>(() => localStorage.getItem("nythatom_username") || "");
  const [userAvatar, setUserAvatar] = useState<string>(() => localStorage.getItem("nythatom_avatar") || "/nyth_logo.png");
  const [userId, setUserId] = useState<number | null>(() => {
    const cached = localStorage.getItem("nythatom_userid");
    return cached ? parseInt(cached, 10) : null;
  });

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"home" | "games" | "rewards" | "profile">("home");

  // Dynamic API cached results
  const [balanceData, setBalanceData] = useState<LightweightBalanceResponse | null>(() => {
    const cached = localStorage.getItem("nythatom_cached_balance");
    return cached ? JSON.parse(cached) : null;
  });
  const [pointsData, setPointsData] = useState<PointDashboardResponse | null>(() => {
    const cached = localStorage.getItem("nythatom_cached_points");
    return cached ? JSON.parse(cached) : null;
  });
  const [tohtohData, setTohtohData] = useState<TohTohUnitedResponse | null>(() => {
    const cached = localStorage.getItem("nythatom_cached_tohtoh");
    return cached ? JSON.parse(cached) : null;
  });
  const [goldenfarmData, setGoldenfarmData] = useState<GoldenFarmResponse | null>(() => {
    const cached = localStorage.getItem("nythatom_cached_goldenfarm");
    return cached ? JSON.parse(cached) : null;
  });

  const [loading, setLoading] = useState(false);
  const [errorHeader, setErrorHeader] = useState("");

  // Theme configuration state
  const [activeBg, setActiveBg] = useState<string>(() => {
    return localStorage.getItem("nythatom_theme_bg") || "/nyth_bg.png";
  });

  // Handle setting background
  const handleSelectBg = (bg: string) => {
    setActiveBg(bg);
    localStorage.setItem("nythatom_theme_bg", bg);
  };

  const [accounts, setAccounts] = useState<any[]>(() => {
    const data = localStorage.getItem("nythatom_accounts");
    return data ? JSON.parse(data) : [];
  });

  const saveAccounts = (newAccounts: any[]) => {
    localStorage.setItem("nythatom_accounts", JSON.stringify(newAccounts));
    setAccounts(newAccounts);
  };

  const [showAddAccount, setShowAddAccount] = useState(false);

  const [showGlobalNotif, setShowGlobalNotif] = useState(() => {
    return !sessionStorage.getItem("nythatom_welcomed_v1");
  });

  const bgmRef = React.useRef<HTMLAudioElement>(null);

  const handleDismissNotif = () => {
    setShowGlobalNotif(false);
    sessionStorage.setItem("nythatom_welcomed_v1", "true");
    
    // Play local MP3 directly on user click (100% works in Median.co/Mobile WebViews)
    if (bgmRef.current) {
      bgmRef.current.play().catch(e => console.log("BGM Play Error:", e));
    }
  };

  const handleUpdateProfile = (name: string, avatar: string) => {
    setUserName(name);
    setUserAvatar(avatar);
    localStorage.setItem("nythatom_username", name);
    localStorage.setItem("nythatom_avatar", avatar);
    
    if (msisdn) {
      const newAccounts = accounts.map(a => {
        if (a.msisdn === msisdn) {
          return { ...a, userName: name, userAvatar: avatar };
        }
        return a;
      });
      saveAccounts(newAccounts);
    }
  };

  // Try to silently refresh the access_token using the stored refresh_token
  // Returns the new access_token string on success, or null on failure
  const attemptTokenRefresh = useCallback(async (): Promise<string | null> => {
    const storedRefresh = localStorage.getItem("nythatom_refresh_token");
    if (!storedRefresh) return null;
    try {
      const res = await ApiClient.request(
        "/api/atom/mytmapi/v1/my/local-auth/refresh-token",
        {
          method: "POST",
          body: { refresh_token: storedRefresh } as any,
        },
        userId?.toString() ?? "-1",
        true
      );
      const data = await res.json().catch(() => null);
      if (data?.status === "success" && data?.data?.attribute?.token) {
        const attr = data.data.attribute;
        // Persist the new tokens
        localStorage.setItem("nythatom_token", attr.token);
        if (attr.refresh_token) {
          localStorage.setItem("nythatom_refresh_token", attr.refresh_token);
          setRefreshToken(attr.refresh_token);
        }
        setAuthToken(attr.token);
        return attr.token;
      }
    } catch {
      // network error
    }
    return null;
  }, []);

  // Perform full concurrent data refresh across all API modules
  const refreshAllData = useCallback(async () => {
    if (!authToken || !msisdn || !userId) return;
    setLoading(true);
    setErrorHeader("");

    const basePrefix = "/api/atom";
    const commonParams = `msisdn=${msisdn}&userid=${userId}&v=4.14.1`;

    const balancePath = "mytmapi/v1/my/lightweight-balance";
    const pointsPath = "mytmapi/v1/my/point-system/dashboard";
    const tohtohCouponPath = "mytmapi/v1/my/tohtohunited/get-coupon-balance";
    const goldenfarmCouponPath = "mytmapi/v1/my/goldenfarm/get-coupon-balance";

    try {
      // Execute the 4 self-care api calls sequentially to avoid WAF rate-limiting / ECONNRESET
      const balRes = await ApiClient.request(`${basePrefix}/${balancePath}`)
        .then(r => r.json().catch(() => ({ status: "error" })));

      const ptsRes = await ApiClient.request(`${basePrefix}/${pointsPath}`)
        .then(r => r.json().catch(() => ({ status: "error" })));

      const tohtohRes = await ApiClient.request(`${basePrefix}/${tohtohCouponPath}`)
        .then(r => r.json().catch(() => ({ status: "error" })));

      const farmRes = await ApiClient.request(`${basePrefix}/${goldenfarmCouponPath}`)
        .then(r => r.json().catch(() => ({ status: "error" })));

      if (balRes.status === "success") {
        setBalanceData(balRes);
        localStorage.setItem("nythatom_cached_balance", JSON.stringify(balRes));
      }
      if (ptsRes.status === "success") {
        setPointsData(ptsRes);
        localStorage.setItem("nythatom_cached_points", JSON.stringify(ptsRes));
      }
      if (tohtohRes.status === "success") {
        setTohtohData(tohtohRes);
        localStorage.setItem("nythatom_cached_tohtoh", JSON.stringify(tohtohRes));
      }
      if (farmRes.status === "success") {
        setGoldenfarmData(farmRes);
        localStorage.setItem("nythatom_cached_goldenfarm", JSON.stringify(farmRes));
      }

      const allResponses = [balRes, ptsRes, tohtohRes, farmRes];
      const firstError = allResponses.find(r => r.status === "error");
      if (firstError) {
        const errMsg: string = firstError.message || "ကွန်ရက် ချိတ်ဆက်မှု အဆင်မပြေပါ သို့မဟုတ် ATOM ဆာဗာမှ ပိတ်ဆို့ထားပါသည် (WAF Blocked or Network Timeout)";
        setErrorHeader(`အမှား: ${errMsg}`);
        const isTokenError = /invalid.*token|token.*invalid|unauthorized|expired/i.test(errMsg);
        if (isTokenError) {
          const newToken = await attemptTokenRefresh();
          if (newToken) {
            setErrorHeader("Token ကိုပြန်လည်ချိတ်ဆက်ပြီးပါပြီ");
            setTimeout(() => setErrorHeader(""), 3000);
          } else {
            setErrorHeader(`Token သက်တမ်းကုန်ဆုံးပါပြီ။ ပြန်လည်ဝင်ရောက်ပေးပါ။`);
            setTimeout(() => {
              handleLogout();
            }, 3000);
          }
        }
      }
    } catch (err) {
      console.error("[REFRESH ERROR]", err);
      setErrorHeader("အချက်အလက်ရယူရာတွင် ခေတ္တပြတ်တောက်မှုရှိနေပါသည်။");
    } finally {
      setLoading(false);
    }
  }, [authToken, msisdn, userId, attemptTokenRefresh]);

  useEffect(() => {
    if (authToken && msisdn && userId) {
      refreshAllData();
    }
  }, [authToken, msisdn, userId, refreshAllData]);

  useEffect(() => {
    const handleTokenRefreshed = (e: any) => {
      if (e.detail) {
        setAuthToken(e.detail);
      }
    };
    const handleAuthFailed = () => {
      handleLogout();
      setErrorHeader("Token သက်တမ်းကုန်ဆုံးပါပြီ။ ပြန်လည်ဝင်ရောက်ပေးပါ။");
    };
    window.addEventListener("atom-token-refreshed", handleTokenRefreshed);
    window.addEventListener("atom-auth-failed", handleAuthFailed);
    return () => {
       window.removeEventListener("atom-token-refreshed", handleTokenRefreshed);
       window.removeEventListener("atom-auth-failed", handleAuthFailed);
    }
  }, []);

  const handleLoginSuccess = (token: string, phone: string, uid: number, rfToken?: string, name?: string) => {
    localStorage.setItem("nythatom_token", token);
    localStorage.setItem("nythatom_msisdn", phone);
    localStorage.setItem("nythatom_userid", uid.toString());
    
    // Manage multi-accounts
    const accList = [...accounts];
    const existingIdx = accList.findIndex((a) => a.msisdn === phone);
    
    let defaultAvatar = "/nyth_logo.png";
    let defaultName = name || "";

    if (existingIdx >= 0) {
      defaultAvatar = accList[existingIdx].userAvatar || defaultAvatar;
      defaultName = name || accList[existingIdx].userName || defaultName;
      accList[existingIdx] = {
        token, msisdn: phone, userId: uid, refresh_token: rfToken || "", userName: defaultName, userAvatar: defaultAvatar
      };
    } else {
      accList.push({
        token, msisdn: phone, userId: uid, refresh_token: rfToken || "", userName: defaultName, userAvatar: defaultAvatar
      });
    }
    saveAccounts(accList);

    if (defaultName) {
      localStorage.setItem("nythatom_username", defaultName);
      setUserName(defaultName);
    }
    localStorage.setItem("nythatom_avatar", defaultAvatar);
    setUserAvatar(defaultAvatar);

    if (rfToken) {
      localStorage.setItem("nythatom_refresh_token", rfToken);
      setRefreshToken(rfToken);
    }

    setAuthToken(token);
    setMsisdn(phone);
    setUserId(uid);
    setShowAddAccount(false);
    setActiveTab("home");
  };

  const handleSwitchAccount = (phone: string) => {
    const acc = accounts.find((a: any) => a.msisdn === phone);
    if (acc) {
      localStorage.setItem("nythatom_token", acc.token);
      localStorage.setItem("nythatom_msisdn", acc.msisdn);
      localStorage.setItem("nythatom_userid", acc.userId.toString());
      localStorage.setItem("nythatom_username", acc.userName);
      localStorage.setItem("nythatom_avatar", acc.userAvatar);
      localStorage.setItem("nythatom_refresh_token", acc.refresh_token);

      setAuthToken(acc.token);
      setMsisdn(acc.msisdn);
      setUserId(acc.userId);
      setUserName(acc.userName);
      setUserAvatar(acc.userAvatar);
      setRefreshToken(acc.refresh_token);
      
      setActiveTab("home");
      
      // Clear data to trigger fresh load
      setBalanceData(null);
      setPointsData(null);
      setTohtohData(null);
      setGoldenfarmData(null);
    }
  };

  const handleLogout = (phoneToRemove?: string | React.MouseEvent) => {
    if (typeof phoneToRemove !== "string") {
      // Global logout (button clicked without specific msisdn)
      localStorage.removeItem("nythatom_token");
      localStorage.removeItem("nythatom_refresh_token");
      localStorage.removeItem("nythatom_msisdn");
      localStorage.removeItem("nythatom_userid");
      localStorage.removeItem("nythatom_username");
      localStorage.removeItem("nythatom_avatar");

      setAuthToken(null);
      setRefreshToken(null);
      setMsisdn(null);
      setUserId(null);
      setUserName("");
      setBalanceData(null);
      setPointsData(null);
      setTohtohData(null);
      setGoldenfarmData(null);
      return;
    }

    const phone = phoneToRemove;
    if (!phone) return;
    
    let newAccounts = accounts.filter(a => a.msisdn !== phone);
    saveAccounts(newAccounts);
    
    if (phone === msisdn) {
      if (newAccounts.length > 0) {
        handleSwitchAccount(newAccounts[0].msisdn);
        return;
      }
      
      // Hard logout if active account was removed and no other accounts exist
      localStorage.removeItem("nythatom_token");
      localStorage.removeItem("nythatom_refresh_token");
      localStorage.removeItem("nythatom_msisdn");
      localStorage.removeItem("nythatom_userid");
      localStorage.removeItem("nythatom_username");
      localStorage.removeItem("nythatom_avatar");

      setAuthToken(null);
      setRefreshToken(null);
      setMsisdn(null);
      setUserId(null);
      setUserName("");
      setBalanceData(null);
      setPointsData(null);
      setTohtohData(null);
      setGoldenfarmData(null);
    }
  };

  const handleDrawSuccess = (prizeName: string, livesLeft: number) => {
    if (tohtohData) {
      setTohtohData({
        ...tohtohData,
        data: {
          ...tohtohData.data,
          attribute: { ...tohtohData.data.attribute, couponBalance: { ...tohtohData.data.attribute.couponBalance, totalCoupon: livesLeft } }
        }
      });
    }
  };

  const handleMinusPoints = (pts: number) => {
    if (pointsData) {
      setPointsData({
        ...pointsData,
        data: { ...pointsData.data, attribute: { ...pointsData.data.attribute, totalPoint: Math.max(0, pointsData.data.attribute.totalPoint - pts) } }
      });
    }
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#0a0f1d] text-slate-100 font-sans selection:bg-[#00ff66]/30 relative flex flex-col">
      {/* BACKGROUND RENDERING */}
      {activeBg === "chroma" && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-br from-[#0c0f1d] via-[#101428] to-[#0a0f1d]" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-b from-[#1c0a12] via-[#0f0714] to-[#0a0f1d]" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[url('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80')] bg-cover bg-center opacity-[0.14] mix-blend-color-dodge filter grayscale select-none" style={{ transform: "scaleX(-1)" }} />
          <div className="absolute left-1/2 inset-y-0 w-[2px] bg-gradient-to-b from-amber-500/20 via-white/20 to-green-500/20 shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
        </div>
      )}

      {activeBg === "abyss" && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#0a0f1d]" />
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-slate-800/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/5 rounded-full blur-[160px]" />
        </div>
      )}

      {activeBg === "matrix" && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#090e18]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/5 rounded-full blur-[180px]" />
        </div>
      )}

      {activeBg !== "chroma" && activeBg !== "abyss" && activeBg !== "matrix" && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[#0a0f1d]" />
          <div className="absolute inset-0 bg-cover bg-center opacity-60 blend-normal" style={{ backgroundImage: `url(${activeBg})` }} />
        </div>
      )}

      {(!authToken || showAddAccount) ? (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onCancel={authToken ? () => setShowAddAccount(false) : undefined} 
        />
      ) : (
        <div className="flex flex-col h-screen max-h-screen overflow-hidden w-full max-w-md mx-auto">
          <header className="sticky top-0 z-40 bg-[#0a0f1d]/90  border-b border-white/5 pt-3.5 pb-3 px-4 shadow-xl flex-none">
            <div className="w-full flex items-center justify-between h-7">
              {/* Left branding layout matching the screenshot exactly */}
              <div className="flex items-center space-x-2">
                <span className="text-[15px] font-black font-sans tracking-tight text-[#00ff66]">
                  Nyth Atom
                </span>
                <span className="bg-slate-900 border border-slate-800 text-slate-400 text-[8px] px-1.5 py-0.5 rounded uppercase font-mono tracking-wider font-extrabold shadow-sm select-none">
                  SERVER
                </span>
              </div>

              {/* Right actions */}
              <div className="flex items-center space-x-1.5 relative z-10">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all duration-250 cursor-pointer ${activeTab === 'profile' ? 'border border-[#00ff66]/25 bg-[#00ff66]/10' : ''}`}
                >
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                </button>
              </div>
            </div>

            {errorHeader && (
              <div className="max-w-md mx-auto mt-2 text-[10px] text-center text-red-400 font-sans tracking-wide leading-relaxed animate-pulse">
                ⚠️ မှားယွင်းနေပါသည်။ {errorHeader}
              </div>
            )}
          </header>

          <main className="flex-1 w-full overflow-y-auto scrollbar-none pb-2 relative z-10 px-0.5">
            <AnimatePresence mode="wait">
              {activeTab === "home" && (
                <motion.div key="home-tab" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                  <DashboardScreen
                    balanceData={balanceData}
                    pointsData={pointsData}
                    tohtohData={tohtohData}
                    goldenfarmData={goldenfarmData}
                    loading={loading}
                    onRefresh={refreshAllData}
                    onLogout={handleLogout}
                    onNavigateToTab={setActiveTab}
                    activeBg={activeBg}
                    authToken={authToken || ""}
                    onDrawSuccess={handleDrawSuccess}
                    msisdn={msisdn}
                    userId={userId}
                    userName={userName}
                    userAvatar={userAvatar}
                  />
                </motion.div>
              )}

              {activeTab === "games" && (
                <motion.div key="games-tab" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                  <GamesScreen
                    tohtohData={tohtohData}
                    goldenfarmData={goldenfarmData}
                    onRefreshAll={refreshAllData}
                    onDrawSuccess={handleDrawSuccess}
                    authToken={authToken}
                    msisdn={msisdn}
                    userId={userId?.toString() || null}
                    loading={loading}
                    onNavigateToTab={setActiveTab}
                  />
                </motion.div>
              )}

              {activeTab === "rewards" && (
                <motion.div key="rewards-tab" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                  <RewardsScreen
                    pointsData={pointsData}
                    onRefreshAll={refreshAllData}
                    onMinusPoints={handleMinusPoints}
                    msisdn={msisdn}
                    userId={userId}
                    authToken={authToken}
                    onNavigateToTab={setActiveTab}
                  />
                </motion.div>
              )}

              {activeTab === "profile" && (
                <motion.div key="profile-tab" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                  <ProfileScreen
                    balanceData={balanceData}
                    onLogout={handleLogout}
                    activeBg={activeBg}
                    onSelectBg={handleSelectBg}
                    onNavigateToTab={setActiveTab}
                    userName={userName}
                    userAvatar={userAvatar}
                    onUpdateProfile={handleUpdateProfile}
                    accounts={accounts}
                    activeMsisdn={msisdn}
                    onSwitchAccount={handleSwitchAccount}
                    onAddAccount={() => setShowAddAccount(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      )}

      {/* ULTRA PREMIUM GLOBAL NOTIFICATION DIALOG */}
      <AnimatePresence>
        {authToken && showGlobalNotif && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#0a0f1d] border border-[#00ff66]/30 p-2 rounded-[2rem] w-full max-w-sm text-center relative shadow-[0_0_50px_rgba(0,255,102,0.15)] overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00ff66] to-transparent opacity-50 z-20" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00ff66]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <button 
                onClick={handleDismissNotif} 
                className="absolute right-4 top-4 text-slate-200 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full p-2 transition z-30 cursor-pointer border border-white/20 shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative w-full aspect-[4/3] rounded-[1.5rem] overflow-hidden mb-3 bg-[#0a0f1d] group flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#00ff66]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-20 pointer-events-none" />
                
                {/* Vignette Overlay for smooth edges */}
                <div className="absolute inset-0 z-20 pointer-events-none" 
                     style={{ background: 'radial-gradient(ellipse at center, transparent 40%, #0a0f1d 95%)' }}
                />

                <img 
                  src="/dialog_image.png" 
                  alt="Special Notification" 
                  className="w-full h-full object-cover relative z-10 opacity-70 scale-[1.02] group-hover:scale-100 transition-transform duration-700 ease-out flex-none"
                  style={{
                    maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://images.unsplash.com/photo-1518558997970-4ddd2638848c?q=80&w=800&auto=format&fit=crop"; // Fallback aesthetic background
                  }}
                />
                
                {/* Top and bottom subtle gradients for additional blend */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1d] via-transparent to-[#0a0f1d] opacity-50 pointer-events-none z-20"></div>
              </div>

              <div className="px-2 pb-2 relative z-30 w-full">
                <button
                  onClick={handleDismissNotif}
                  className="w-full py-3.5 bg-gradient-to-r from-[#00ff66] to-emerald-400 hover:from-emerald-400 hover:to-[#00ff66] text-emerald-950 font-black rounded-2xl text-xs tracking-[0.2em] uppercase transition-all duration-500 active:scale-[0.97] cursor-pointer shadow-[0_0_20px_rgba(0,255,102,0.25)] ring-1 ring-emerald-300/50"
                >
                  အိုကေ (OK)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BACKGROUND MUSIC (Works in Mobile WebViews) */}
      <audio ref={bgmRef} src="/bgm.mp3" loop preload="auto" playsInline className="hidden" />
    </div>
  );
}
