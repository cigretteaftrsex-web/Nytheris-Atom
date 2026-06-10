import React, { useState, useEffect } from "react";
import { Gamepad2, Sprout, Star, Trophy, Sparkles, Play, ShoppingCart, X, CheckCircle2, ChevronRight, History, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TohTohUnitedResponse, GoldenFarmResponse, DrawResponse } from "../types";
import ApiClient from "../utils/ApiClient";
const fetch = (url: string, options?: any) => ApiClient.request(url, options);

interface GamesScreenProps {
  tohtohData: TohTohUnitedResponse | null;
  goldenfarmData: GoldenFarmResponse | null;
  onRefreshAll: () => void;
  onDrawSuccess: (prizeName: string, livesLeft: number) => void;
  authToken: string;
  msisdn: string | null;
  userId: string | null;
  loading: boolean;
  onNavigateToTab?: (tab: "home" | "games" | "rewards" | "profile") => void;
}

export default function GamesScreen({
  tohtohData,
  goldenfarmData,
  onRefreshAll,
  onDrawSuccess,
  authToken,
  msisdn,
  userId,
  loading,
  onNavigateToTab
}: GamesScreenProps) {
  const [selectedGame, setSelectedGame] = useState<"tohtoh" | "goldenfarm" | null>(null);
  const [shooting, setShooting] = useState(false);
  const [shotTarget, setShotTarget] = useState<"left" | "center" | "right" | null>(null);
  const [drawResult, setDrawResult] = useState<DrawResponse["data"]["attribute"] | null>(null);
  const [winPopup, setWinPopup] = useState(false);
  const [error, setError] = useState("");
  const [drawingGoldenfarm, setDrawingGoldenfarm] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const [buyMessage, setBuyMessage] = useState("");

  const [showGoldenFarmBuyModal, setShowGoldenFarmBuyModal] = useState(false);
  const [buyingGoldenFarm, setBuyingGoldenFarm] = useState(false);
  const [goldenFarmBuyMessage, setGoldenFarmBuyMessage] = useState("");

  useEffect(() => {
    if (loading) {
      setError("");
    }
  }, [loading]);

  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const [tohtohCooldown, setTohtohCooldown] = useState(() => {
    const exp = sessionStorage.getItem("tohtoh_cooldown_expiry");
    if (exp) {
      const remaining = Math.ceil((parseInt(exp, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  const [gfCooldown, setGfCooldown] = useState(() => {
    const exp = sessionStorage.getItem("gf_cooldown_expiry");
    if (exp) {
      const remaining = Math.ceil((parseInt(exp, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const thExp = sessionStorage.getItem("tohtoh_cooldown_expiry");
      if (thExp) {
        const remaining = Math.ceil((parseInt(thExp, 10) - Date.now()) / 1000);
        setTohtohCooldown(remaining > 0 ? remaining : 0);
        if (remaining <= 0) sessionStorage.removeItem("tohtoh_cooldown_expiry");
      } else {
        setTohtohCooldown(0);
      }

      const gfExp = sessionStorage.getItem("gf_cooldown_expiry");
      if (gfExp) {
        const remaining = Math.ceil((parseInt(gfExp, 10) - Date.now()) / 1000);
        setGfCooldown(remaining > 0 ? remaining : 0);
        if (remaining <= 0) sessionStorage.removeItem("gf_cooldown_expiry");
      } else {
        setGfCooldown(0);
      }
    }, 500); 
    return () => clearInterval(interval);
  }, []);

  const startTohtohCooldown = () => {
    const exp = Date.now() + 15000;
    sessionStorage.setItem("tohtoh_cooldown_expiry", exp.toString());
    setTohtohCooldown(15);
  };

  const startGfCooldown = () => {
    const exp = Date.now() + 15000;
    sessionStorage.setItem("gf_cooldown_expiry", exp.toString());
    setGfCooldown(15);
  };

  const handleBuyPack = async (offerId: string) => {
    if (buyingPackId) return;
    setBuyingPackId(offerId);
    setBuyMessage("");
    try {
      const response = await fetch(`/api/atom/mytmapi/v1/my/tohtohunited/purchase-game-pack-life`, {
        method: "POST",
        body: { offerId } as any
      });
      const resData = await response.json().catch(() => null);
      if (response.ok && resData && resData.status === "success") {
        setBuyMessage(resData.data?.attribute?.title || resData.data?.attribute?.message || "အောင်မြင်စွာ ဝယ်ယူပြီးပါပြီ။");
        sessionStorage.setItem("tohtoh_just_bought", "true");
        onRefreshAll();
        setTimeout(() => {
          setBuyMessage("");
          setShowBuyModal(false);
        }, 2000);
      } else {
        setBuyMessage(`❌ ${resData?.message || "ဝယ်ယူမှု မအောင်မြင်ပါ။"}`);
      }
    } catch (err: any) {
      setBuyMessage(`❌ ဆာဗာနှင့်ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည်။`);
    } finally {
      setBuyingPackId(null);
    }
  };

  const handleGoldenFarmBuyLife = async () => {
    if (buyingGoldenFarm) return;
    setBuyingGoldenFarm(true);
    setGoldenFarmBuyMessage("");
    try {
      const response = await fetch(`/api/atom/mytmapi/v1/my/goldenfarm/purchase-life?msisdn=${msisdn}&userid=${userId}&v=4.14.1`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      const resData = await response.json().catch(() => null);
      if (response.ok && resData && resData.status === "success") {
        setGoldenFarmBuyMessage(resData.data?.attribute?.title || resData.data?.attribute?.message || "အောင်မြင်စွာ ဝယ်ယူပြီးပါပြီ။");
        sessionStorage.setItem("gf_just_bought", "true");
        onRefreshAll();
        setTimeout(() => {
          setGoldenFarmBuyMessage("");
          setShowGoldenFarmBuyModal(false);
        }, 2000);
      } else {
        setGoldenFarmBuyMessage(`❌ ${resData?.message || "ဝယ်ယူမှု မအောင်မြင်ပါ။"}`);
      }
    } catch (err: any) {
      setGoldenFarmBuyMessage(`❌ ဆာဗာနှင့်ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည်။`);
    } finally {
      setBuyingGoldenFarm(false);
    }
  };

  const playTohtohUnited = () => {
    setSelectedGame("tohtoh");
    setDrawResult(null);
    setWinPopup(false);
    setError("");
  };

  const playGoldenFarm = () => {
    setSelectedGame("goldenfarm");
    setDrawResult(null);
    setWinPopup(false);
    setError("");
  };

  const handleViewHistory = async () => {
    if (!selectedGame) return;
    setHistoryLoading(true);
    setShowHistory(true);
    setHistoryData([]);

    // Get range: roughly last 30 days
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - (86400 * 30);

    try {
      let endpoint = "";
      if (selectedGame === "tohtoh") {
        const customPath = localStorage.getItem("nythatom_tohtoh_history_path") || "mytmapi/v1/my/tohtohunited/history/win";
        endpoint = `/api/atom/${customPath}?msisdn=${msisdn}&userid=${userId}&v=4.14.1&firstID=${startTs}&lastID=${endTs}`;
      } else {
        const customPath = localStorage.getItem("nythatom_goldenfarm_history_path") || "mytmapi/v1/my/goldenfarm/history/instant";
        endpoint = `/api/atom/${customPath}?msisdn=${msisdn}&userid=${userId}&v=4.14.1&firstID=${startTs}&lastID=${endTs}`;
      }

      const response = await fetch(endpoint, {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data && data.status === "success") {
        setHistoryData(data.data?.attribute?.instantWin || []);
      } else {
        setHistoryData([]);
      }
    } catch(err) {
      console.warn("History fetch failed");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleGoldenFarmDraw = async () => {
    if (drawingGoldenfarm || gfCooldown > 0) return;
    setError("");
    setDrawResult(null);

    setDrawingGoldenfarm(true);
    
    // Process request immediately without timeout
    const customPath = localStorage.getItem("nythatom_goldenfarm_path") || "mytmapi/v1/my/goldenfarm/draw";
    const endpoint = `/api/atom/${customPath}`;

    let currentLives = 0;
    try {
      // Fetch fresh state before action
      const freshData = await ApiClient.getLiveState("goldenfarm");
      if (freshData?.status === "success") {
         currentLives = freshData?.data?.attribute?.couponBalance ?? 0;
         if (currentLives <= 0) {
            setError("ဂိမ်းကစားရန် လက်မှတ် မရှိတော့ပါ။");
            setDrawingGoldenfarm(false);
            return;
         }
      }

      let maxScore = 162;
      const levelData = goldenfarmData?.data?.attribute?.levelData;
      if (Array.isArray(levelData)) {
          const extractedScores = levelData.map((l: any) => l.score || 0);
          if (extractedScores.length > 0) {
              const highest = Math.max(...extractedScores);
              if (highest > 0) maxScore = highest;
          }
      }
      const response = await fetch(endpoint, {
        method: "POST",
        body: { score: maxScore } as any
      });

      const resData = await response.json().catch(() => null);
      if (response.ok && resData && (resData.status === "success" || resData.data?.attribute)) {
        const attr = resData.data?.attribute || resData.data || {};
        
        let finalPrizeName = attr.prizeName;
        if (!finalPrizeName && attr.message) {
            const match = attr.message.match(/ဖြစ်ပြီး\s+(.*?)\s+ကို/);
            if (match && match[1]) {
                finalPrizeName = match[1].trim();
            }
        }
        if (!finalPrizeName) finalPrizeName = attr.prizeAmountText || "ဆုလက်ဆောင် (Reward)";
        
        const newCouponBalance = attr.couponBalance !== undefined ? attr.couponBalance : Math.max(0, (currentLives ?? 0) - 1);
        
        sessionStorage.setItem("gf_just_played", "true");
        setDrawResult({
          title: attr.title || "ဂုဏ်ယူပါသည်!",
          message: attr.message || `သင် ရွှေလယ်တောဂိမ်းမှ ${finalPrizeName} ရရှိပါသည်`,
          prizeName: finalPrizeName,
          prizeAmountText: attr.prizeAmountText || "ရွှေလယ်တော ဆုလာဘ်",
          preCouponBalance: {
            totalCoupon: newCouponBalance,
            normalCoupon: newCouponBalance,
            specialCoupon: 0,
            isSpecialCampaignEnable: 0,
            specialCampaignLeftDays: null
          },
          isWin: 1,
          popupImageType: 1,
          totalAvailableTicketsForMegaOrMonthly: 0,
          grandTicket: 0
        });
        setWinPopup(true);
        onDrawSuccess(finalPrizeName, newCouponBalance);
      } else {
        const errorMsg: string = resData?.message || resData?.originalResponse?.message || `Status: ${response.status}`;
        const isTokenError = /invalid.*token|token.*invalid|unauthorized|expired/i.test(errorMsg);
        if (isTokenError) {
          setError(`🔐 Token သက်တမ်းကုန်သွားပါပြီ။ ထပ်မံ Login ဝင်ပေးပါ: ${errorMsg}`);
        } else {
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      setError(`စနစ်ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည်: ${err.message}`);
    } finally {
      setDrawingGoldenfarm(false);
      startGfCooldown();
    }
  };

  const handleShootBall = async (target: "left" | "center" | "right") => {
    if (shooting || tohtohCooldown > 0) return;
    setShooting(true);
    setShotTarget(target);
    setError("");

    // Process request immediately without timeout
    const customPath = localStorage.getItem("nythatom_tohtoh_path") || "mytmapi/v1/my/tohtohunited/draw";
    const endpoint = `/api/atom/${customPath}`;

    let currentLives = 0;
    try {
      // Fetch fresh state before action
      const freshData = await ApiClient.getLiveState("tohtoh");
      if (freshData?.status === "success") {
         currentLives = freshData?.data?.attribute?.couponBalance?.totalCoupon ?? 0;
         if (currentLives <= 0) {
            setError("ဂိမ်းကစားရန် လက်မှတ်(lives) မလောက်တော့ပါ။");
            setShooting(false);
            setShotTarget(null);
            return;
         }
      }

      let maxLevel = 3;
      if (tohtohData?.data?.attribute?.levelInfo) {
        const levels = Object.keys(tohtohData.data.attribute.levelInfo).map(Number).filter(n => !isNaN(n));
        if (levels.length > 0) {
            maxLevel = Math.max(...levels);
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: {
          isCompleted: 1,
          currentPlayLevel: maxLevel,
          chosenPrize: "Instant"
        } as any
      });

      const resData = await response.json().catch(() => null);
      if (response.ok && resData && resData.status === "success" && resData.data?.attribute) {
        const attr = resData.data.attribute;
        sessionStorage.setItem("tohtoh_just_played", "true");
        setDrawResult(attr);
        setWinPopup(true);
        onDrawSuccess(attr.prizeName, attr.preCouponBalance?.totalCoupon ?? Math.max(0, (currentLives ?? 0) - 1));
      } else {
        const errorMsg: string = resData?.message || resData?.originalResponse?.message || `Status ${response.status}`;
        const isTokenError = /invalid.*token|token.*invalid|unauthorized|expired/i.test(errorMsg);
        if (isTokenError) {
          setError(`🔐 Token သက်တမ်းကုန်သွားပါပြီ။ ထပ်မံ Login ဝင်ပေးပါ: ${errorMsg}`);
        } else {
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      setError(`စနစ်ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည်: ${err.message}`);
    } finally {
      setShooting(false);
      setShotTarget(null);
      startTohtohCooldown();
    }
  };

  const closeWinPopup = () => {
    setWinPopup(false);
    onRefreshAll();
  };

  const tohtohLives = tohtohData?.data?.attribute?.couponBalance?.totalCoupon ?? 0;
  const goldenfarmLives = goldenfarmData?.data?.attribute?.couponBalance ?? 0;

  return (
    <div className="space-y-3.5 p-3 max-w-md mx-auto relative z-10 animate-fade-in pb-16 overflow-y-auto scrollbar-none h-full">
      {/* Premium Header */}
      {!selectedGame && (
        <div className="flex items-center justify-between mt-1 mb-1">
          <button
            onClick={() => onNavigateToTab?.("home")}
            className="group flex items-center space-x-1.5 px-3 py-1.5 bg-[#151c2f] border border-white/5 hover:border-white/10 rounded-full transition-all duration-300 cursor-pointer shadow-md"
          >
            <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#00ff66]/20 transition-colors">
              <span className="text-slate-300 group-hover:text-[#00ff66] text-xs">←</span>
            </div>
            <span className="text-[10px] text-slate-300 group-hover:text-white font-medium font-sans tracking-wide">
              ပင်မစာမျက်နှာ
            </span>
          </button>
          <span className="text-[9px] text-[#00ff66]/80 font-mono font-bold tracking-widest uppercase border border-[#00ff66]/20 px-3 py-1 rounded-full bg-[#00ff66]/5">
            Game Center
          </span>
        </div>
      )}

      {/* Visual Header Banner */}
      <div className="text-center mt-2">
        <h1 className="text-lg font-black text-white flex items-center justify-center space-x-1.5 font-sans uppercase bg-gradient-to-r from-[#00ff66] to-emerald-400 bg-clip-text text-transparent">
          <Trophy className="w-5 h-5 text-[#00ff66] animate-pulse" />
          <span>Gamification Hub</span>
        </h1>
        <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
          အပတ်စဉ် ကံစမ်းမဲများနှင့် အထူးဆုလက်ဆောင် ဂိမ်းကစားကွင်း
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!selectedGame ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {/* TOH TOH UNITED CARD */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={playTohtohUnited}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0c142c] p-4.5 shadow-lg cursor-pointer group"
            >
              <div className="absolute right-0 top-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-green-500/10 rounded-2xl border border-green-500/20 text-green-400">
                    <Gamepad2 className="w-5 h-5 text-[#00ff66]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white font-sans">Toh Toh United</h3>
                    <p className="text-[10px] text-slate-400 font-sans leading-tight mt-0.5">Instant Prizes: Data, Cashback, Points</p>
                  </div>
                </div>
                <span className="bg-[#00ff66]/10 text-[#00ff66] text-[10px] px-2.5 py-1 rounded-full border border-[#00ff66]/20 font-black font-mono">
                  {tohtohLives} LIVES
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] border-t border-white/5 pt-3">
                <div className="text-slate-400 font-sans truncate pr-2 max-w-[220px]">
                  🏆 Samsung Watch နှင့် ရွှေဆုကြီးများ
                </div>
                <div className="text-[#00ff66] font-bold flex items-center gap-1">
                  ကစားမည် <Play className="w-2.5 h-2.5 ml-0.5 fill-[#00ff66]" />
                </div>
              </div>
            </motion.div>

            {/* GOLDEN FARM CARD */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              onClick={playGoldenFarm}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#14231b] p-4.5 shadow-lg cursor-pointer group"
            >
              <div className="absolute right-0 top-0 w-20 h-20 bg-[#00ff66]/5 rounded-full blur-2xl group-hover:bg-[#00ff66]/15 transition-all pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
                    <Sprout className="w-5 h-5 text-[#00ff66]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white font-sans">ရွှေလယ်တော (Golden Farm)</h3>
                    <p className="text-[10px] text-slate-400 font-sans leading-tight mt-0.5">Collect golden eggs to win points and data</p>
                  </div>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/20 font-black font-mono">
                  {goldenfarmLives} LIVES
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] border-t border-white/5 pt-3">
                <div className="text-emerald-400 font-sans truncate pr-2 max-w-[220px]">
                  🥚 ဉများစုသိမ်းပြီး Onnet SMS နှင့် ဆုငွေလဲလှယ်ပါ
                </div>
                <div className="text-emerald-400 font-bold flex items-center gap-1">
                  ကစားမည် <Play className="w-2.5 h-2.5 ml-0.5 fill-emerald-400" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : selectedGame === "tohtoh" ? (
          /* TOH TOH FOOTBALL SHOT MINI-GAME */
          <motion.div
            key="tohtoh"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="bg-white/5  border border-white/10 rounded-3xl p-4.5 shadow-xl relative space-y-3.5"
          >
            {/* Game header */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setSelectedGame(null)}
                className="text-[9px] uppercase bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full text-slate-300 font-black cursor-pointer transition"
              >
                ← Back
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleViewHistory}
                  className="bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-400 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition"
                  title="History"
                >
                  <History className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setShowBuyModal(true); setBuyMessage(""); }} 
                  className="bg-green-500/15 hover:bg-green-500/25 border border-green-500/40 text-green-400 px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition flex items-center space-x-1"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span className="font-sans">LIVES ဝယ်မည်</span>
                </button>
                <div className="text-right">
                  <span className="text-[11px] text-[#00ff66] font-black font-mono block leading-none py-1">
                    {tohtohLives} LIVES
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] text-center font-sans">
                {error}
              </div>
            )}

            {/* Interactive Football Field Goal Box */}
            <div className="bg-gradient-to-b from-[#0b3c1c] to-[#0c142c] border border-white/10 rounded-2xl overflow-hidden relative min-h-[190px] flex flex-col justify-between p-4 shadow-inner">
              {/* Goalie target box overlay */}
              <div className="border-[3px] border-slate-300 border-b-0 h-16 w-3/4 mx-auto relative rounded-t flex justify-around items-center">
                <div className="absolute inset-x-0 bottom-0 border-b border-dashed border-white/20" />

                {/* Left corner gate */}
                <button
                  disabled={shooting || tohtohCooldown > 0}
                  onClick={() => handleShootBall("left")}
                  className={`w-8 h-8 rounded-full border border-green-400 absolute left-2.5 -bottom-4 z-25 flex items-center justify-center transition shadow-md ${
                    shooting || tohtohCooldown > 0 ? "opacity-20 translate-y-2 cursor-not-allowed" : "bg-[#00ff66] text-slate-950 hover:scale-105 active:scale-95 cursor-pointer"
                  }`}
                >
                  🥅
                </button>

                {/* Center direct gate */}
                <button
                  disabled={shooting || tohtohCooldown > 0}
                  onClick={() => handleShootBall("center")}
                  className={`w-8 h-8 rounded-full border border-green-400 absolute left-1/2 -translate-x-1/2 -bottom-4 z-25 flex items-center justify-center transition shadow-md ${
                    shooting || tohtohCooldown > 0 ? "opacity-20 translate-y-2 cursor-not-allowed" : "bg-[#00ff66] text-slate-950 hover:scale-105 active:scale-95 cursor-pointer"
                  }`}
                >
                  🥅
                </button>

                {/* Right corner gate */}
                <button
                  disabled={shooting || tohtohCooldown > 0}
                  onClick={() => handleShootBall("right")}
                  className={`w-8 h-8 rounded-full border border-green-400 absolute right-2.5 -bottom-4 z-25 flex items-center justify-center transition shadow-md ${
                    shooting || tohtohCooldown > 0 ? "opacity-20 translate-y-2 cursor-not-allowed" : "bg-[#00ff66] text-slate-950 hover:scale-105 active:scale-95 cursor-pointer"
                  }`}
                >
                  🥅
                </button>
              </div>

              {/* Bot Goalie middle indicator */}
              <div className="h-8 text-center relative mt-4">
                <motion.div
                  animate={shooting ? { x: [0, -35, 35, 0] } : { x: [-25, 25, -25] }}
                  transition={shooting ? { duration: 0.7 } : { repeat: Infinity, duration: 1.8 }}
                  className="w-8 h-8 bg-red-650 rounded-full border border-red-500 mx-auto flex items-center justify-center text-[11px] relative z-10 shadow-md text-white"
                >
                  🧤
                </motion.div>
                <span className="text-[8px] text-slate-400 block mt-1.5 tracking-wider uppercase font-mono">
                  BOT GOALKEEPER
                </span>
              </div>

              {/* Soccer Ball at the kick circle */}
              <div className="flex justify-center mt-3">
                <motion.div
                  animate={
                    shooting
                      ? {
                          y: -95,
                          x: shotTarget === "left" ? -60 : shotTarget === "right" ? 60 : 0,
                          scale: 0.45,
                          rotate: 360,
                        }
                      : { y: 0, x: 0, scale: 1, rotate: 0 }
                  }
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="w-10 h-10 text-2xl flex items-center justify-center select-none"
                >
                  ⚽
                </motion.div>
              </div>
            </div>

            {/* Kick Instructions Prompt */}
            {tohtohCooldown > 0 ? (
              <p className="text-[12px] text-center text-[#ff3366] font-black font-mono animate-pulse">
                {tohtohCooldown} စက္ကန့် စောင့်ပြီးမှ ထပ်ကစားပါ
              </p>
            ) : (
              <p className="text-[10px] text-center text-slate-400 font-sans italic">
                ဂိုးတိုက်ရှိ အဝါရောင်ပစ်မှတ် စက်ဝိုင်းတစ်ခုကို နှိပ်ပြီး ဂိုးသွင်းယူပါ
              </p>
            )}
          </motion.div>
        ) : (
          /* GOLDEN FARM INTERACTIVE GAME CHICKEN SCREEN */
          <motion.div
            key="goldenfarm"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="bg-white/5  border border-white/10 rounded-3xl p-4.5 shadow-xl space-y-4"
          >
              <div className="flex justify-between items-center z-10 w-full">
                <button
                  onClick={() => setSelectedGame(null)}
                  className="text-[9px] uppercase bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full text-slate-300 font-black cursor-pointer transition"
                >
                  ← Back
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleViewHistory}
                    className="bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/40 text-indigo-400 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition"
                    title="History"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setShowGoldenFarmBuyModal(true); setGoldenFarmBuyMessage(""); }} 
                    className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition flex items-center space-x-1"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span className="font-sans">LIVES ဝယ်မည်</span>
                  </button>
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-400 font-black font-mono block leading-none py-1">
                      {goldenfarmLives} LIVES
                    </span>
                  </div>
                </div>
              </div>

            <div className="bg-[#14231b] border border-emerald-500/10 rounded-2xl p-4 text-center relative overflow-hidden">
              <div className="p-2.5 bg-emerald-500/10 rounded-full w-10 h-10 flex items-center justify-center mx-auto text-xl mb-1.5 animate-bounce">
                🐔
              </div>
              <h3 className="text-xs font-black text-white font-sans">ရွှေလယ်တောဂိမ်းအစီအစဉ်</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug font-sans">
                ဥများစုသိမ်းကာ ATOM ဖုန်းဘေလ် Cashback ဆုငွေများနှင့် SMS များကို အပတ်စဉ်လဲလှယ်ရယူပါဦး။
              </p>
            </div>

            {/* Level structures */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider font-sans">
                လယ်တော အဆင့်များ (Levels Data)
              </span>
              <div className="grid grid-cols-3 gap-2 font-sans">
                <div className="bg-slate-900/40 p-2 rounded-2xl text-center border border-white/5">
                  <span className="text-[8px] text-slate-500 block font-mono">Level 1</span>
                  <span className="text-[10px] font-bold text-slate-200">Eggs: 15</span>
                </div>
                <div className="bg-slate-900/40 p-2 rounded-2xl text-center border border-emerald-500/20">
                  <span className="text-[8px] text-[#00ff66] block font-mono">Level 2</span>
                  <span className="text-[10px] font-bold text-slate-200">Eggs: 30</span>
                </div>
                <div className="bg-slate-900/40 p-2 rounded-2xl text-center border border-white/5">
                  <span className="text-[8px] text-slate-500 block font-mono">Level 3</span>
                  <span className="text-[10px] font-bold text-slate-200">Eggs: 55</span>
                </div>
              </div>
            </div>

            <button
              disabled={drawingGoldenfarm || gfCooldown > 0}
              onClick={handleGoldenFarmDraw}
              className="w-full py-3.5 bg-[#00ff66] hover:brightness-110 disabled:brightness-75 disabled:cursor-not-allowed text-slate-950 font-black rounded-full text-[10px] tracking-wide transition active:scale-[0.99] cursor-pointer shadow-lg shadow-green-950/20"
            >
              {gfCooldown > 0 
                ? `စောင့်ပါ... ${gfCooldown} စက္ကန့်` 
                : drawingGoldenfarm 
                  ? "ဥများ ကောက်ယူနေပါသည်..." 
                  : "🥚 ယခုကစားပြီး ဥများ ကောက်ယူမည်"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WINNING DIALOG POPUP DISPLAY */}
      <AnimatePresence>
        {winPopup && drawResult && (
          <div className="fixed inset-0 bg-[#020617]/90  z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0b101d] border border-green-500/20 p-6 rounded-3xl w-full max-w-sm text-center relative shadow-3xl overflow-hidden"
            >
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="w-16 h-16 bg-green-500/10 border border-green-400/30 rounded-full mx-auto flex items-center justify-center mb-4 relative">
                <Sparkles className="w-8 h-8 text-green-400 animate-spin" />
              </div>

              <h2 className="text-xl font-black text-[#00ff66] tracking-wide font-sans animate-bounce uppercase">
                {drawResult.title}
              </h2>

              <p className="text-xs text-slate-300 mt-2 font-medium font-sans px-2 leading-relaxed">
                {drawResult.message}
              </p>

              <div className="my-5 p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-green-400 tracking-wider block font-sans">
                  ရရှိသော ဆုအမျိုးအစား
                </span>
                <span className="text-lg font-black text-white mt-1.5 block font-sans">
                  {drawResult.prizeName}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 border-t border-white/5 pt-3 mb-5 px-1 font-mono">
                <span>လက်ကျန် လှည့်ခွင့်:</span>
                <span className="text-green-400 font-bold">
                  {drawResult.preCouponBalance?.totalCoupon ?? tohtohLives} lives
                </span>
              </div>

              <button
                onClick={closeWinPopup}
                className="w-full py-3.5 bg-[#00ff66] hover:brightness-110 text-slate-950 font-black rounded-xl text-sm transition active:scale-[0.98] cursor-pointer shadow-lg shadow-green-500/10"
              >
                လက်ခံရယူမည် (CLAIM REWARD)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOH TOH PURCHASE MODAL */}
      <AnimatePresence>
        {showBuyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 ">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0b101d] border border-white/10 rounded-3xl w-full max-w-sm p-4 relative shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Gamepad2 className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white font-sans">Lives ဝယ်ယူရန်</h3>
                    <p className="text-[10px] text-slate-400">တို့တို့ဂိမ်း လှည့်ခွင့်များ ဝယ်ယူပါ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
                  disabled={buyingPackId !== null}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {buyMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-3 p-3 text-center rounded-xl text-xs font-bold leading-relaxed font-sans ${buyMessage.includes('❌') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}
                >
                  {buyMessage}
                </motion.div>
              )}

              {(() => {
                const isDoubleDay = tohtohData?.data?.attribute?.luckyChanceItems?.packPurchase?.some((p: any) => {
                  const ratio = p.price > 0 ? (p.chances / p.price) : 0;
                  return p.type === 'toh_toh_united_pack' && (
                    p.title?.toLowerCase().includes('2x') || 
                    p.title?.toLowerCase().includes('double') || 
                    ratio >= 0.02
                  );
                }) || false;

                return (
                  <div key="pack-container" className="flex-1 overflow-y-auto scrollbar-none space-y-2.5 pb-2">
                    {isDoubleDay && (
                      <div className="mb-3 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse flex-none" />
                        <p className="text-[10px] sm:text-xs text-amber-300 font-bold font-sans">
                          အထူးအစီအစဉ်။ <span className="text-white">ယခု ဝယ်ယူသမျှ ကစားခွင့် ၂ဆ ရရှိပါမည်။</span>
                        </p>
                      </div>
                    )}
                    {tohtohData?.data?.attribute?.luckyChanceItems?.packPurchase
                      ?.filter((pack: any) => pack.type === 'toh_toh_united_pack')
                      .map((pack: any, idx: number) => {
                      const displayPrice = pack.desc?.match(/[\d,]+/) ? pack.desc.match(/[\d,]+/)?.[0] + " KS" : `${pack.price} KS`;
                      const isDoublePack = pack.title?.toLowerCase().includes('2x') || pack.title?.toLowerCase().includes('double') || (pack.price > 0 && (pack.chances / pack.price) >= 0.02);
                      const finalChances = pack.chances;
                      
                      return (
                      <div
                        key={idx}
                        className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between relative overflow-hidden"
                      >
                        {isDoublePack && (
                          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none z-0">
                            <div className="absolute top-2 -right-4 bg-amber-500 text-slate-950 text-[8px] font-black uppercase tracking-wider py-0.5 px-6 rotate-45 shadow-lg">
                              x2 LIVES
                            </div>
                          </div>
                        )}
                        <div className="flex items-center space-x-3 min-w-0 pr-2 z-10">
                          <div className={`w-10 h-10 rounded-xl border ${isDoublePack ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]' : 'bg-slate-900 border-white/5'} flex items-center justify-center flex-none relative`}>
                            {pack.type === 'data' ? (
                              <span className="text-xs text-sky-400 font-bold font-mono">MB</span>
                            ) : (
                              <Gamepad2 className={`w-5 h-5 ${isDoublePack ? 'text-amber-400' : 'text-amber-400'}`} />
                            )}
                            <span className={`absolute -bottom-1.5 ${isDoublePack ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-green-500 text-slate-950'} text-[8px] font-black px-1.5 py-0.5 rounded-full border border-[#0b101d]`}>
                              +{finalChances}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-bold truncate font-sans tracking-wide ${isDoublePack ? 'text-amber-300' : 'text-white'}`}>{pack.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate font-sans">
                              {isDoublePack && finalChances > 1 ? (
                                <span className="line-through opacity-60 mr-1">{Math.floor(finalChances / 2)} Lives</span>
                              ) : null}
                              <span className={isDoublePack ? "text-amber-400 font-bold" : ""}>{finalChances} Lives</span> • {pack.desc}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBuyPack(pack.offerId)}
                          disabled={buyingPackId !== null}
                          className={`min-w-[80px] z-10 justify-center px-3.5 py-2 uppercase rounded-xl transition cursor-pointer flex-none flex items-center space-x-1 font-black font-sans text-[10px] ${isDoublePack ? 'bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950' : 'bg-white/10 hover:bg-green-500 text-green-400 hover:text-slate-950'}`}
                        >
                          {buyingPackId === pack.offerId ? (
                            "ဝယ်နေသည်..."
                          ) : (
                            <span>{displayPrice}</span>
                          )}
                        </button>
                      </div>
                    )})}
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GOLDEN FARM PURCHASE MODAL */}
      <AnimatePresence>
        {showGoldenFarmBuyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 ">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0b101d] border border-white/10 rounded-3xl w-full max-w-sm p-4 relative shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Sprout className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white font-sans">Lives ဝယ်ယူရန်</h3>
                    <p className="text-[10px] text-slate-400">ရွှေလယ်တောဂိမ်း အသက် ဝယ်ယူပါ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGoldenFarmBuyModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  disabled={buyingGoldenFarm}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {goldenFarmBuyMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-3 p-3 text-center rounded-xl text-xs font-bold leading-relaxed font-sans ${goldenFarmBuyMessage.includes('❌') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}
                >
                  {goldenFarmBuyMessage}
                </motion.div>
              )}

              <div className="flex-1 overflow-y-auto scrollbar-none space-y-2.5 pb-2">
                  <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 pr-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center flex-none relative">
                        <Sprout className="w-5 h-5 text-emerald-400" />
                        <span className="absolute -bottom-1.5 bg-emerald-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-[#0b101d]">
                          +1
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate font-sans tracking-wide">
                          {goldenfarmData?.data?.attribute?.purchaseLife?.regular?.title || "1 Lives"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate font-sans">
                          {goldenfarmData?.data?.attribute?.purchaseLife?.price || 99} Kyats
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleGoldenFarmBuyLife}
                      disabled={buyingGoldenFarm}
                      className="min-w-[80px] justify-center px-3.5 py-2 bg-white/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-[10px] font-black font-sans uppercase rounded-xl transition cursor-pointer flex-none flex items-center space-x-1"
                    >
                      {buyingGoldenFarm ? "ဝယ်နေသည်..." : <span>{goldenfarmData?.data?.attribute?.purchaseLife?.price || 99} KS</span>}
                    </button>
                  </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HISTORY MODAL */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 ">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#0b101d] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-4 relative shadow-2xl flex flex-col h-[70vh] sm:h-[80vh]"
            >
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <History className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white font-sans uppercase tracking-wide">
                      {selectedGame === "tohtoh" ? "TohToh History" : "Golden Farm History"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans">လတ်တလော ဆုမဲမှတ်တမ်းများ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-8 h-8 flex flex-col items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-none pb-4 space-y-2.5 px-1">
                {historyLoading ? (
                  <div className="flex flex-col flex-1 items-center justify-center space-y-3 h-full min-h-[200px]">
                    <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
                    <p className="text-[10px] text-slate-400 font-sans animate-pulse">မှတ်တမ်းများ ရှာဖွေနေပါသည်...</p>
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] opacity-70">
                    <History className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-xs text-slate-400 font-sans">မှတ်တမ်း မရှိသေးပါ။</p>
                  </div>
                ) : (
                  historyData.map((item, idx) => {
                    const title = item.title || item.title_my || item.title_en || "Cashback";
                    const dateStr = item.date || item.winTime || new Date((item.epoch || 0) * 1000).toLocaleString();
                    const isData = title.toLowerCase().includes("mb");
                    const isCashback = title.toLowerCase().includes("cashback");
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={item.id || idx}
                        className="bg-white/5 border border-white/5 hover:border-white/10 p-3.5 rounded-2xl flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center space-x-3.5 min-w-0">
                          <div className={`flex-none w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${
                            isData ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                            isCashback ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                          }`}>
                            {isData ? <span className="text-xs font-black font-mono">MB</span> :
                             isCashback ? <span className="text-xs font-black font-mono">KS</span> :
                             <Star className="w-4 h-4 fill-current" />}
                          </div>
                          <div className="min-w-0 pr-2">
                            <h4 className="text-xs font-bold text-white truncate font-sans tracking-wide">
                              {title}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-[9px] text-slate-400 font-mono tracking-tight">{dateStr}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-none w-6 h-6 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
