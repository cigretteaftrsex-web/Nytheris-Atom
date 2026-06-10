import React, { useState, useEffect } from "react";
import { Star, Gift, Check, ArrowRight, Zap, Target, Search, Sparkles, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PointDashboardResponse } from "../types";

import ApiClient from "../utils/ApiClient";
const fetch = (url: string, options?: any) => ApiClient.request(url, options);

interface RewardsScreenProps {
  pointsData: PointDashboardResponse | null;
  onRefreshAll: () => void;
  onMinusPoints: (pts: number) => void;
  msisdn: string | null;
  userId: string | number | null;
  authToken: string;
  onNavigateToTab?: (tab: "home" | "games" | "rewards" | "profile") => void;
}

export default function RewardsScreen({
  pointsData,
  onRefreshAll,
  onMinusPoints,
  msisdn,
  userId,
  authToken,
  onNavigateToTab
}: RewardsScreenProps) {
  const [filter, setFilter] = useState<"DATA" | "SMS" | "VOICE" | "CASHBACK">("DATA");
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [allRewards, setAllRewards] = useState<any[]>([]);
  const [isLoadingTab, setIsLoadingTab] = useState(false);

  const getPoints = () => pointsData?.data?.attribute?.totalPoint ?? 1749;
  const getStarLabel = () => pointsData?.data?.attribute?.starStatusLabel ?? "Platinum STAR";
  const getEarned = () => (pointsData?.data?.attribute?.progressBar as any)?.earnedPoint ?? 42000;
  const getTotalReq = () => (pointsData?.data?.attribute?.progressBar as any)?.totalRequiredPoint ?? 120000;
  const progressPercent = Math.min(100, Math.max(10, (getEarned() / getTotalReq()) * 100));
  const getValidityDate = () => pointsData?.data?.attribute?.validityEndDateText ?? "23/Aug/2026";
  const getEligibilityText = () => (pointsData?.data?.attribute?.progressBar as any)?.nextTierEligibilityText ?? "၃လဆက်တိုက် ဖုန်းဘေလ်ဖြည့်ပြီး Titanium Star သို့ မြှင့်တင်လိုက်ပါ။";

  useEffect(() => {
    const fetchCatalog = async () => {
      if (allRewards.length > 0) return;

      setIsLoadingTab(true);

      const endpoints = [
        `/api/atom/mytmapi/v1/my/point-system/details?msisdn=${msisdn}&userid=${userId}&v=4.16.0`,
        `/api/atom/mytmapi/v2/my/point-system/details?msisdn=${msisdn}&userid=${userId}&v=4.16.0`
      ];

      try {
        let fetchedItems: any[] = [];
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              headers: { "Authorization": `Bearer ${authToken}` }
            });
            const resData = await response.json().catch(() => null);
            
            if (resData?.data?.attribute) {
              const attr = resData.data.attribute;
              
              if (attr.atomRewards) {
                  if (Array.isArray(attr.atomRewards)) {
                      fetchedItems = [...fetchedItems, ...attr.atomRewards];
                  } else {
                      Object.values(attr.atomRewards).forEach((val: any) => {
                          if (Array.isArray(val)) {
                              fetchedItems.push(...val);
                          }
                      });
                  }
              }

              if (attr.specialRewards) {
                  if (Array.isArray(attr.specialRewards)) {
                      fetchedItems = [...fetchedItems, ...attr.specialRewards];
                  } else {
                      Object.values(attr.specialRewards).forEach((val: any) => {
                          if (Array.isArray(val)) {
                              fetchedItems.push(...val);
                          }
                      });
                  }
              }
            }
            
            if (fetchedItems && fetchedItems.length > 0) break;
          } catch(err) {
            // continue trying endpoints
          }
        }

        if (fetchedItems && fetchedItems.length > 0) {
          setAllRewards(fetchedItems);
        }
      } finally {
        setIsLoadingTab(false);
      }
    };

    fetchCatalog();
  }, [msisdn, userId, authToken, allRewards.length]);

  const listRewards = () => {
    // 1. Fallback to dashboard preloaded list for DATA usually if allRewards is empty
    const itemsToFilter = allRewards.length > 0 ? allRewards : [
      ...(pointsData?.data?.attribute?.atomRewards || []),
      ...(pointsData?.data?.attribute?.specialRewards || [])
    ];

    return itemsToFilter.filter((item: any) => {
      const cat = (item.category || "").toUpperCase();
      const title = (item.title || "").toUpperCase();
      const catLower = (item.category || "").toLowerCase();
      
      if (filter === "DATA") return cat.includes("DATA") || catLower === "data";
      if (filter === "SMS") return cat.includes("SMS") || title.includes("SMS") || catLower === "sms";
      if (filter === "VOICE") return cat.includes("VOICE") || title.includes("VOICE") || catLower === "voice";
      if (filter === "CASHBACK") return cat.includes("MONEY") || cat.includes("CASHBACK") || title.includes("CASHBACK") || catLower === "money";
      return false;
    });
  };

  const handleRedeemClick = (reward: any) => {
    setSelectedReward(reward);
    setSuccessMsg("");
  };

  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleConfirmRedeem = async () => {
    if (!selectedReward) return;
    const currentPoints = getPoints();
    if (currentPoints < selectedReward.redeemPoint) {
      setSuccessMsg("❌ ပွိုင့်အမှတ် မလုံလောက်ပါ။");
      return;
    }

    setIsRedeeming(true);

    try {
      // Always perform a 'handshake' with the /dashboard API to get the latest state before sending a redemption request (Live Sync)
      const freshData = await ApiClient.getLiveState("points");
      const currentRemotePoints = freshData?.data?.attribute?.dashboardInfo?.pointsBalance ?? currentPoints;
      
      if (currentRemotePoints < selectedReward.redeemPoint) {
         setSuccessMsg("❌ ပွိုင့်အမှတ် မလုံလောက်ပါ။");
         setIsRedeeming(false);
         return;
      }

      let finalCategory = filter.toLowerCase();
      if (finalCategory === "cashback") finalCategory = "money";

      const response = await ApiClient.redeem(
        finalCategory,
        selectedReward.keyword,
        selectedReward.partner || "ATOM",
        selectedReward.type || "telco",
        selectedReward.title
      );

      const resData = await response.json().catch(() => null);

      if (response.ok && (!resData || resData.status === "success" || resData.code === "0" || resData.status === "SUCCESS")) {
        onMinusPoints(selectedReward.redeemPoint);
        setSuccessMsg(`🎉 "${selectedReward.title}" လဲလှယ်အသုံးပြုမှု အောင်မြင်ပါသည်!`);
        
        setTimeout(() => {
          setSelectedReward(null);
          setSuccessMsg("");
          onRefreshAll();
        }, 2000);
      } else {
        const errorMsg = resData?.message || resData?.data?.attribute?.message || resData?.data?.message;
        setSuccessMsg(`❌ ${errorMsg || "ပွိုင့်အမှတ်လဲလှယ်ရာ၌ အခက်အခဲရှိနေပါသည်။"}`);
      }

    } catch (err) {
       setSuccessMsg("❌ ကွန်ရက်ချိတ်ဆက်မှု မရရှိပါ။");
    } finally {
       setIsRedeeming(false);
    }
  };

  const closeDialog = () => {
    setSelectedReward(null);
    setSuccessMsg("");
  };

  return (
    <div className="space-y-4 p-3 max-w-md mx-auto relative z-10 w-full h-full pb-20 overflow-y-auto scrollbar-none">
      {/* Premium Header */}
      <div className="flex items-center justify-between mt-2 mb-1">
        <button
          onClick={() => onNavigateToTab?.("home")}
          className="group flex items-center space-x-1.5 px-3 py-1.5 bg-[#151c2f] border border-white/5 hover:border-white/10 rounded-full transition-all duration-300 cursor-pointer shadow-md"
        >
          <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
            <span className="text-slate-300 group-hover:text-amber-500 text-xs">←</span>
          </div>
          <span className="text-[10px] text-slate-300 group-hover:text-white font-medium font-sans tracking-wide">
            ပင်မစာမျက်နှာ
          </span>
        </button>
        <span className="text-[9px] text-amber-500/80 font-mono font-bold tracking-widest uppercase border border-amber-500/20 px-3 py-1 rounded-full bg-amber-500/5">
          Points Exchange
        </span>
      </div>

      {/* Ultra Premium Head Point Card */}
      <div className="bg-gradient-to-br from-[#10192e] to-[#0d1424] border border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-2xl p-4 relative">
        {/* Subtle glow effect behind star to avoid clipping flicker */}
        <div className="absolute top-4 left-4 w-12 h-12 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shadow-inner">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">
                {getStarLabel()}
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <h2 className="text-2xl font-black text-white font-mono leading-none tracking-tight">
                  {getPoints().toLocaleString()}
                </h2>
                <span className="text-[10px] text-slate-400 font-medium">pts</span>
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col justify-center bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="text-[8px] text-slate-400 uppercase tracking-widest block mb-0.5">Valid Till</span>
            <span className="text-[10px] text-slate-200 font-medium font-sans">
              {getValidityDate()}
            </span>
          </div>
        </div>

        {/* PROGRESS METERS - Ultra Premium */}
        <div className="mt-5 space-y-2 relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider flex items-center">
              <Zap className="w-3 h-3 mr-1 fill-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
              Tier Progress
            </span>
            <span className="font-mono text-[10px] text-slate-300 font-medium">
              <span className="text-white">{getEarned().toLocaleString()}</span> / {getTotalReq().toLocaleString()} Ks
            </span>
          </div>
          
          <div className="w-full bg-[#0a0f18] h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div
              style={{ width: `${progressPercent}%` }}
              className="bg-gradient-to-r from-emerald-500 to-[#00ff66] h-full rounded-full relative"
            >
              <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 -translate-x-full" />
            </div>
          </div>

          <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed font-sans max-w-[90%]">
            {getEligibilityText()}
          </p>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex bg-[#10192e]/80 p-1.5 rounded-[14px] border border-white/5 overflow-x-auto scrollbar-none gap-1 shadow-inner my-3">
        {["DATA", "SMS", "VOICE", "CASHBACK"].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab as any)}
            className={`flex-1 flex justify-center items-center px-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer font-sans ${
              filter === tab 
                ? "bg-gradient-to-br from-amber-500/20 to-orange-600/20 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)] border border-amber-500/20" 
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* REWARDS GRID - HIGHEST VISIBILITY WITH CONTROLLED VERTICAL BOUNDS */}
      {isLoadingTab ? (
        <div className="flex flex-col items-center justify-center p-10 h-[300px]">
          <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <span className="text-[10px] text-amber-500 mt-4 font-mono font-bold tracking-widest">LOADING REWARDS...</span>
        </div>
      ) : listRewards().length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 h-[300px] opacity-70">
          <Gift className="w-10 h-10 text-slate-500 mb-3" />
          <span className="text-xs text-slate-400 font-sans">ဤအမျိုးအစားအတွက် ဆုများ မရှိသေးပါ။</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[440px] pr-0.5 scrollbar-none mt-2">
          {listRewards().map((item, index) => (
            <motion.div
              key={`${item.keyword}-${index}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="bg-gradient-to-r from-[#10192e] to-[#0d1424] hover:from-[#151c2f] hover:to-[#0d1424] border border-white/5 hover:border-white/10 rounded-[1.25rem] p-3 flex items-center justify-between group relative overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgb(0,0,0,0.2)] mb-0.5"
            >
              {/* Subtle background glow effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff66]/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="flex items-center space-x-3.5 z-10 flex-1 min-w-0 pr-3">
                {/* Reward Icon badge */}
                <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 flex items-center justify-center border border-amber-500/20 flex-none shadow-inner">
                  {item.category?.toLowerCase() === "data" ? (
                    <BarChart2 className="w-5 h-5 text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                  ) : (
                    <span className="text-[10px] font-black font-mono text-amber-500 uppercase tracking-widest">{item.category || filter}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <h4 className="text-[11px] sm:text-[12px] font-bold text-white/90 font-sans leading-relaxed tracking-wide whitespace-normal break-words">
                    {item.title}
                  </h4>
                  <p className="text-[9px] text-slate-400/90 font-sans mt-0.5 leading-relaxed whitespace-normal break-words pr-1">
                    {item.desc || item.title}
                  </p>
                  <div className="mt-1.5 flex">
                    <span className="text-[8px] bg-white/5 text-slate-300 border border-white/10 font-mono px-1.5 py-0.5 rounded-md tracking-widest uppercase truncate max-w-full inline-block">
                      {item.partner || "ATOM"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Redeem Points button CTA */}
              <div className="flex flex-col items-end shrink-0 z-10 space-y-2 pl-2">
                <span className="text-[#00ff66] text-[12px] font-black font-mono drop-shadow-[0_0_8px_rgba(0,255,102,0.4)]">
                  {item.redeemPoint || item.price || item.point} Pts
                </span>
                <button
                  onClick={() => handleRedeemClick(item)}
                  className="text-[10px] bg-gradient-to-r from-[#00ff66] to-emerald-500 hover:brightness-110 text-slate-950 font-black px-3.5 py-1.5 rounded-lg transition-all duration-300 active:scale-[0.96] cursor-pointer font-sans tracking-widest shadow-[0_0_15px_rgba(0,255,102,0.25)] flex items-center justify-center whitespace-nowrap"
                >
                  လဲလှယ်မည်
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* CONFID REFORM DIALOG MODAL */}
      <AnimatePresence>
        {selectedReward && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={closeDialog}>
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b101d] border border-white/15 rounded-3xl p-6 max-w-sm w-full text-center relative shadow-2xl"
            >
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-amber-400" />
              </div>

              <h3 className="text-lg font-black text-white font-sans">
                ပွိုင့်အမှတ်လဲလှယ်ရန် သေချာပါသလား
              </h3>

              <div className="my-4 p-4.5 bg-slate-950/60 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold text-center block">
                  ဆုအမျိုးအစား
                </span>
                <span className="text-[13px] font-bold text-white font-sans block whitespace-normal break-words leading-relaxed mt-1">
                  {selectedReward.title}
                </span>
                <span className="text-xs text-amber-400 font-mono font-semibold block pt-1">
                  နုတ်ယူမည့်အမှတ်: -{selectedReward.redeemPoint} Points
                </span>
              </div>

              {successMsg && !successMsg.startsWith("❌") ? (
                <p className="text-xs font-semibold p-3.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 mb-6 font-sans">
                  {successMsg}
                </p>
              ) : successMsg && successMsg.startsWith("❌") ? (
                <p className="text-xs font-semibold p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 mb-6 font-sans">
                  {successMsg}
                </p>
              ) : (
                <div className="flex justify-between items-center text-xs text-slate-400 mb-6 px-1 font-mono">
                  <span>ကျန်ပွိုင့်:</span>
                  <span className="text-white font-bold">
                    {(getPoints() - selectedReward.redeemPoint).toLocaleString()} pts
                  </span>
                </div>
              )}

              {(!successMsg || successMsg.startsWith("❌")) && (
                <div className={`grid ${successMsg ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                  <button
                    onClick={closeDialog}
                    disabled={isRedeeming}
                    className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-bold text-slate-300 cursor-pointer disabled:opacity-50"
                  >
                    {successMsg ? "အိုကေ (Close)" : "မလုပ်တော့ပါ (Cancel)"}
                  </button>
                  {!successMsg && (
                    <button
                      onClick={handleConfirmRedeem}
                      disabled={isRedeeming}
                      className="py-3 bg-green-600 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs cursor-pointer font-sans disabled:opacity-50"
                    >
                      {isRedeeming ? "Processing..." : "လဲလှယ်ပိုင်ခွင့်ယူမည်"}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
