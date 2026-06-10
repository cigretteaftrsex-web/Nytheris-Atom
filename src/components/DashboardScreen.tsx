import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Gamepad2,
  Sprout,
  User,
  History,
  LogOut,
  Gift,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Coins,
  Cpu,
  BookmarkCheck,
  ChevronLeft,
  Star,
  Settings,
  Check,
  ShoppingCart,
  X,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  LightweightBalanceResponse,
  PointDashboardResponse,
  TohTohUnitedResponse,
  GoldenFarmResponse
} from "../types";
import ApiClient from "../utils/ApiClient";
const fetch = (url: string, options?: any) => ApiClient.request(url, options);

interface DashboardScreenProps {
  balanceData: LightweightBalanceResponse | null;
  pointsData: PointDashboardResponse | null;
  tohtohData: TohTohUnitedResponse | null;
  goldenfarmData: GoldenFarmResponse | null;
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onNavigateToTab: (tab: "home" | "games" | "rewards" | "profile") => void;
  activeBg: string;
  authToken: string;
  onDrawSuccess: (prizeName: string, livesLeft: number) => void;
  msisdn: string | null;
  userId: number | null;
  userName?: string;
  userAvatar?: string;
}

export default function DashboardScreen({
  balanceData,
  pointsData,
  tohtohData,
  goldenfarmData,
  loading,
  onRefresh,
  onLogout,
  onNavigateToTab,
  activeBg,
  authToken,
  onDrawSuccess,
  msisdn,
  userId,
  userName,
  userAvatar
}: DashboardScreenProps) {
  const [gameActiveTab, setGameActiveTab] = useState<"tohtoh" | "goldenfarm">("tohtoh");
  
  // Custom states for interactive grid model
  const [activeDetailModal, setActiveDetailModal] = useState<"primary" | "data" | "voice" | "sms" | "cashback" | "points" | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeCarouselSlide, setActiveCarouselSlide] = useState(0);
  const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);

  useEffect(() => {
    if (isHoveringCarousel) return;

    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { clientWidth, scrollLeft } = carouselRef.current;
        const currentSlide = Math.round(scrollLeft / clientWidth);
        const nextSlide = (currentSlide + 1) % 3;
        
        carouselRef.current.scrollTo({
          left: nextSlide * clientWidth,
          behavior: "smooth"
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isHoveringCarousel]);

  // States for interactive instant Toh Toh play directly in Dashboard
  const [drawingTohtoh, setDrawingTohtoh] = useState(false);
  const [tohtohReward, setTohtohReward] = useState<any>(null);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [tohtohError, setTohtohError] = useState("");

  // States for Golden farm interactive play directly in Dashboard
  const [drawingGoldenfarm, setDrawingGoldenfarm] = useState(false);
  const [goldenfarmError, setGoldenfarmError] = useState("");
  const [goldenfarmReward, setGoldenfarmReward] = useState<any>(null);
  const [showGoldenfarmRewardPopup, setShowGoldenfarmRewardPopup] = useState(false);

  // Global cooldown exactly like GamesScreen
  const [tohtohCooldown, setTohtohCooldown] = useState(() => {
    const expStr = sessionStorage.getItem("tohtoh_cooldown_expiry");
    if (expStr) {
      const remaining = Math.ceil((parseInt(expStr, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  const [gfCooldown, setGfCooldown] = useState(() => {
    const expStr = sessionStorage.getItem("gf_cooldown_expiry");
    if (expStr) {
      const remaining = Math.ceil((parseInt(expStr, 10) - Date.now()) / 1000);
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
    }, 500); // Check half-second to be snappy
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

  // States for Toh Toh Purchase
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const [buyMessage, setBuyMessage] = useState("");

  // States for Golden Farm Purchase
  const [showGoldenFarmBuyModal, setShowGoldenFarmBuyModal] = useState(false);
  const [buyingGoldenFarm, setBuyingGoldenFarm] = useState(false);
  const [goldenFarmBuyMessage, setGoldenFarmBuyMessage] = useState("");

  // States for Daily Points Reward
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [dailyRewardMsg, setDailyRewardMsg] = useState("");
  const [dailyResponsePopupTitle, setDailyResponsePopupTitle] = useState("DAILY POINTS CLAIMED");
  const [dailyResponsePopup, setDailyResponsePopup] = useState(false);

  const [boughtLivesModalActive, setBoughtLivesModalActive] = useState(false);

  // States for Daily Games Lives Popup
  const [showDailyPopup, setShowDailyPopup] = useState(false);
  const [dailyBonusData, setDailyBonusData] = useState<{tt: number, gf: number, msg?: string}>({tt: 0, gf: 0});

  useEffect(() => {
    if (!tohtohData && !goldenfarmData) return;
    const today = new Date().toLocaleDateString('en-GB'); // Just a clean date string
    const bonusKey = `nyth_daily_bonus_lives_${userId}_${today}`;

    if (sessionStorage.getItem(bonusKey)) return;

    let ttLives = 0;
    let gfLives = 0;
    let show = false;
    let apiMsg = "";

    const ttAttr = tohtohData?.data?.attribute as any;
    if (ttAttr?.isDailyBonusPopup === 1 || ttAttr?.isDailyBonusPopup === true) {
      show = true;
      ttLives = ttAttr?.dailyBonusCoupon ?? ttAttr?.dailyBonusAmount ?? 1;
      if (ttAttr?.popupMessage) apiMsg = ttAttr.popupMessage;
    }

    const gfAttr = goldenfarmData?.data?.attribute as any;
    if (gfAttr?.isDailyBonusPopup === 1 || gfAttr?.isDailyBonusPopup === true || gfAttr?.isDailyPopup === 1) {
      show = true;
      gfLives = gfAttr?.dailyBonusCoupon ?? gfAttr?.dailyTickets ?? gfAttr?.dailyBonusAmount ?? gfAttr?.awardedLives ?? 1;
      if (!apiMsg && gfAttr?.popupMessage) apiMsg = gfAttr.popupMessage;
    }

    // Force show if user has totalCoupon, just for debug if the API doesn't set isDailyBonusPopup properly but user gets the tickets? No, trust the api flag `isDailyBonusPopup=1` as per user instruction.

    if (show) {
      setDailyBonusData({ tt: ttLives, gf: gfLives, msg: apiMsg });
      setShowDailyPopup(true);
      sessionStorage.setItem(bonusKey, "true");
    }
  }, [tohtohData, goldenfarmData, userId]);

  useEffect(() => {
    if (tohtohData) {
      if (sessionStorage.getItem("tohtoh_just_bought")) {
         sessionStorage.removeItem("tohtoh_just_bought"); 
      }
      if (sessionStorage.getItem("tohtoh_just_played")) {
         sessionStorage.removeItem("tohtoh_just_played");
      }
    }
  }, [tohtohData]);

  useEffect(() => {
    if (goldenfarmData) {
      if (sessionStorage.getItem("gf_just_bought")) {
         sessionStorage.removeItem("gf_just_bought"); 
      }
      if (sessionStorage.getItem("gf_just_played")) {
         sessionStorage.removeItem("gf_just_played");
      }
    }
  }, [goldenfarmData]);

  // States for Game History
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [gameHistoryLoading, setGameHistoryLoading] = useState(false);
  const [gameHistoryData, setGameHistoryData] = useState<any[]>([]);
  const [gameHistoryTab, setGameHistoryTab] = useState<"tohtoh" | "goldenfarm">("tohtoh");

  const handleFetchGameHistory = async (tab: "tohtoh" | "goldenfarm") => {
    setGameHistoryTab(tab);
    setGameHistoryLoading(true);
    setGameHistoryData([]);
    
    // Get range: roughly last 30 days
    const endTs = Math.floor(Date.now() / 1000);
    const startTs = endTs - (86400 * 30);

    try {
      let endpoint = "";
      if (tab === "tohtoh") {
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
        setGameHistoryData(data.data?.attribute?.instantWin || []);
      } else {
        setGameHistoryData([]);
      }
    } catch(err) {
      console.warn("History fetch failed");
    } finally {
      setGameHistoryLoading(false);
    }
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
        onRefresh();
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
        onRefresh();
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
  
  const [hasClaimedDaily, setHasClaimedDaily] = useState<boolean>(true); // Default to true, only unlock if api says so
  const [claimListId, setClaimListId] = useState<number | null>(null);
  const [claimPointValue, setClaimPointValue] = useState<number>(30);
  const [fetchingClaimList, setFetchingClaimList] = useState(false);

  const checkClaimList = useCallback(async () => {
    if (!msisdn || !userId || !authToken) return;
    setFetchingClaimList(true);
    try {
      const response = await fetch(`/api/atom/mytmapi/v2/my/point-system/claim-list?msisdn=${msisdn}&userid=${userId}&v=4.14.1&_t=${Date.now()}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      const resData = await response.json();
      if (response.ok && resData?.status === "success" && resData?.data?.attribute?.items) {
        const items = resData.data.attribute.items;
        // Directly finding available box from API using standard property flags
        const claimableItem = items.find((item: any) => {
          // Check standard API boolean/integer flags for "already claimed"
          if (item.is_claim === 1 || item.is_claim === true) return false;
          if (item.claimed === 1 || item.claimed === true) return false;
          if (item.is_claimed === 1 || item.is_claimed === true) return false;
          if (item.status === "CLAIMED" || item.status === 2) return false;
          
          // Safely check label strings without falsely matching "unclaimed" or "not claimed"
          const labelLow = String(item.label || "").trim().toLowerCase();
          if (labelLow === "claimed") return false;
          if (labelLow.includes("ရယူပြီး")) return false; // exactly means "already claimed" in mm
          
          // It is claimable if the API explicitly sets enable to true OR status to AVAILABLE
          const isEnabled = item.enable === 1 || item.enable === true;
          const isAvailable = item.status === "AVAILABLE" || item.status === 1 || item.claim_status === 1 || item.today === 1 || item.today === true;
          
          return isEnabled || isAvailable;
        });
        
        if (claimableItem) {
          const itemIdentifier = claimableItem.id ?? claimableItem.day ?? claimableItem.sequence ?? 0;
          setClaimListId(itemIdentifier);
          setClaimPointValue(claimableItem.point || parseInt(claimableItem.reward_amount) || 30);
          setHasClaimedDaily(false);
        } else {
          setHasClaimedDaily(true);
        }
      } else {
        // If API fails to return proper success structure, log it
        console.warn("Claim list API did not return success:", resData);
      }
    } catch (e) {
      console.warn("Failed to fetch claim list:", e);
    } finally {
      setFetchingClaimList(false);
    }
  }, [msisdn, userId, authToken]);

  useEffect(() => {
    checkClaimList();
  }, [checkClaimList]);

  // Sync claim status whenever main pointsData refreshes
  useEffect(() => {
    if (pointsData) {
      checkClaimList();
    }
  }, [pointsData, checkClaimList]);

  // Smart refetching on visibility change or midnight crossing
  useEffect(() => {
    // Determine Myanmar Midnight correctly (UTC+6:30)
    const now = new Date();
    // Get current time in ms
    const currentMs = now.getTime();
    // Create Date from UTC + 6:30 roughly for MMT
    const mmtOffsetMs = (6 * 60 + 30) * 60 * 1000;
    const currentMmtMs = currentMs + mmtOffsetMs;
    const mmtDate = new Date(currentMmtMs);
    
    // Find next midnight in MMT
    const nextMidnightMmt = new Date(mmtDate);
    nextMidnightMmt.setUTCHours(24, 0, 0, 0); 
    
    const msUntilMidnight = nextMidnightMmt.getTime() - currentMmtMs;
    const midnightTimer = setTimeout(() => {
      checkClaimList();
    }, Math.max(msUntilMidnight + 5000, 5000)); // at least 5s delay

    const handleVisChange = () => {
       if (document.visibilityState === 'visible') {
           checkClaimList();
       }
    };
    document.addEventListener("visibilitychange", handleVisChange);
    
    return () => {
      clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", handleVisChange);
    };
  }, [checkClaimList]);

  // Format phone number to hide middle digits
  const formatMsisdn = (numStr?: string) => {
    if (!numStr) return "+959*****7933";
    const cleaned = numStr.replace(/\D/g, "");
    if (cleaned.length >= 10) {
      return `+${cleaned.slice(0, 3)}*****${cleaned.slice(-4)}`;
    }
    return `+${cleaned}`;
  };

  const getStarLabel = () => {
    return pointsData?.data?.attribute?.starStatusLabel || "Platinum STAR";
  };

  const getPointsCount = () => {
    return pointsData?.data?.attribute?.totalPoint ?? 0;
  };

  const getValidityDate = () => {
    return pointsData?.data?.attribute?.validityEndDateText || "23/Aug/2026";
  };

  // Instant handshaking for Toh Toh games on dashboard as requested by user
  const handleInstantTohTohDraw = async () => {
    if (drawingTohtoh || tohtohCooldown > 0) return;
    setTohtohError("");
    setTohtohReward(null);

    setDrawingTohtoh(true);

    let currentLives = tohtohData?.data?.attribute?.couponBalance?.totalCoupon ?? 0;

    const endpoint = `/api/atom/mytmapi/v1/my/tohtohunited/draw`;

    try {
      // Fetch fresh state before action
      const freshData = await ApiClient.getLiveState("tohtoh");
      if (freshData?.status === "success") {
         currentLives = freshData?.data?.attribute?.couponBalance?.totalCoupon ?? 0;
         if (currentLives <= 0) {
            setTohtohError("ဂိမ်းကစားရန် လက်မှတ်(lives) မလောက်တော့ပါ။");
            setDrawingTohtoh(false);
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
        setTohtohReward(attr);
        setShowRewardPopup(true);
        onDrawSuccess(attr.prizeName, attr.preCouponBalance?.totalCoupon ?? Math.max(0, currentLives - 1));
      } else {
        const errorMsg = resData?.message || resData?.originalResponse?.message || `Status: ${response.status}`;
        setTohtohError(errorMsg);
      }
    } catch (err) {
      setTohtohError("စနစ်ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည်။");
    } finally {
      setDrawingTohtoh(false);
      startTohtohCooldown();
    }
  };

  // Instant handshaking for Golden Farm games on dashboard as requested by user
  const handleInstantGoldenFarmDraw = async () => {
    if (drawingGoldenfarm || gfCooldown > 0) return;
    setGoldenfarmError("");
    setGoldenfarmReward(null);

    setDrawingGoldenfarm(true);

    let currentLives = goldenfarmData?.data?.attribute?.couponBalance ?? 0;

    const endpoint = `/api/atom/mytmapi/v1/my/goldenfarm/draw`;

    try {
      // Fetch fresh state before action
      const freshData = await ApiClient.getLiveState("goldenfarm");
      if (freshData?.status === "success") {
         currentLives = freshData?.data?.attribute?.couponBalance ?? 0;
         if (currentLives <= 0) {
            setGoldenfarmError("ဂိမ်းကစားရန် လက်မှတ် မရှိတော့ပါ။");
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

        const newCouponBalance = attr.couponBalance !== undefined ? attr.couponBalance : Math.max(0, currentLives - 1);
        
        sessionStorage.setItem("gf_just_played", "true");
        setGoldenfarmReward({
          prizeName: finalPrizeName,
          prizeAmountText: attr.prizeAmountText || "ဆုလာဘ်"
        });
        setShowGoldenfarmRewardPopup(true);
        onDrawSuccess(finalPrizeName, newCouponBalance);
      } else {
        const errorMsg = resData?.message || resData?.originalResponse?.message || `Status: ${response.status}`;
        setGoldenfarmError(errorMsg);
      }
    } catch (err) {
      setGoldenfarmError("စနစ်ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည်။");
    } finally {
      setDrawingGoldenfarm(false);
      startGfCooldown();
    }
  };

  // Claim Daily point API click handler
  const handleClaimDailyPoint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (claimingDaily) return;
    
    if (hasClaimedDaily) {
      setDailyResponsePopupTitle("အသိပေးချက်");
      setDailyRewardMsg(`နေ့စဉ်ဆုအမှတ် ရယူပြီးဖြစ်ပါပြီ! မနက်ဖြန်မှ ထပ်မံရယူနိုင်ပါတယ်။`);
      setDailyResponsePopup(true);
      return;
    }

    if (typeof claimListId !== "number") {
      setDailyResponsePopupTitle("အသိပေးချက်");
      setDailyRewardMsg("ချက်ချင်းဆုယူရန် မရှိသေးပါ။ ခဏအကြာမှ ပြန်စမ်းကြည့်ပါ။");
      setDailyResponsePopup(true);
      return;
    }

    setClaimingDaily(true);
    setDailyRewardMsg("");
    setDailyResponsePopupTitle("အောင်မြင်ပါသည်!");

    const endpoint = `/api/atom/mytmapi/v1/my/point-system/claim?msisdn=${msisdn}&userid=${userId}&v=4.14.1`; 

    try {
      const reqBody: any = {};
      if (claimListId !== 0) {
         reqBody.id = claimListId;
      }
      
      const response = await fetch(`/api/atom/mytmapi/v1/my/point-system/claim`, {
        method: "POST",
        body: Object.keys(reqBody).length > 0 ? reqBody : ({} as any)
      });
      const resJson = await response.json().catch(() => null);
      if (response.ok && (!resJson || resJson.status === "success")) {
        const title = resJson?.data?.attribute?.title || "အောင်မြင်ပါသည်!";
        const message = resJson?.data?.attribute?.message || "တောင်းဆိုထားသော ပွိုင့်များကို လက်ကျန်ငွေတွင် ထည့်သွင်းပြီးပါပြီ";
        setDailyResponsePopupTitle(title);
        setDailyRewardMsg(message);
        setDailyResponsePopup(true);
        setHasClaimedDaily(true);
        checkClaimList(); // Refresh the claim list securely from the api
        onRefresh();
      } else {
        setDailyResponsePopupTitle("အသိပေးချက် (Error)");
        // Try to accurately display the failing API message
        let errMsg = "ဆုယူရာတွင် အဆင်မပြေဖြစ်သွားပါသည်။ နောက်တစ်ကြိမ် ပြန်လည်ကြိုးစားကြည့်ပါ။";
        if (resJson) {
           errMsg = resJson.message || resJson.errors?.message?.message || resJson.errors?.message || resJson.errors || errMsg;
        }
        setDailyRewardMsg(String(errMsg));
        setDailyResponsePopup(true);
        // Sometimes the API fails because it was physically claimed, but our state didn't update.
        // We will trigger a resync to fix the giftbox.
        checkClaimList(); 
      }
    } catch (err) {
      setDailyResponsePopupTitle("အသိပေးချက်");
      setDailyRewardMsg("ကွန်ရက်ချိတ်ဆက်မှု မရရှိပါ။");
      setDailyResponsePopup(true);
    } finally {
      setClaimingDaily(false);
    }
  };

  // Skeleton Loader elements
  if (loading && !balanceData) {
    return (
      <div className="space-y-6 p-4 max-w-md mx-auto relative z-10 animate-pulse">
        {/* User Card Skeleton */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-slate-800 rounded-full" />
            <div className="space-y-2">
              <div className="h-4 w-28 bg-slate-800 rounded" />
              <div className="h-3 w-32 bg-slate-800 rounded" />
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="w-8 h-8 bg-slate-800 rounded-lg" />
            <div className="w-8 h-8 bg-slate-800 rounded-lg" />
          </div>
        </div>

        {/* 2x2 Grid Skeletons */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/5 h-28 rounded-2xl p-4 flex flex-col justify-between" />
          <div className="bg-white/5 border border-white/5 h-28 rounded-2xl p-4 flex flex-col justify-between" />
          <div className="bg-white/5 border border-white/5 h-28 rounded-2xl p-4 flex flex-col justify-between" />
          <div className="bg-white/5 border border-white/5 h-28 rounded-2xl p-4 flex flex-col justify-between" />
        </div>

        {/* Game Area Skeleton */}
        <div className="bg-white/5 border border-white/5 h-44 rounded-3xl p-6 space-y-4" />
      </div>
    );
  }

  // Raw attributes parsed safely
  const ettRemaining = balanceData?.data?.attribute?.packsPieData?.ett?.remaining;
  const mainCashback = balanceData?.data?.attribute?.mainBalance?.cashBackAmount;

  let cashbackBonusAmount = 4987;
  if (balanceData) {
    if (ettRemaining !== undefined && ettRemaining > 0) {
      cashbackBonusAmount = ettRemaining;
    } else if (mainCashback !== undefined) {
      cashbackBonusAmount = mainCashback;
    } else {
      cashbackBonusAmount = 0;
    }
  }

  const primaryMainBalance = balanceData?.data?.attribute?.mainBalance?.value ?? 0;
  const currentDataRemaining = balanceData?.data?.attribute?.packsPieData?.data?.remaining ?? 0;
  const currentVoiceRemaining = balanceData?.data?.attribute?.packsPieData?.voice?.remaining ?? 0;
  const currentSmsRemaining = balanceData?.data?.attribute?.packsPieData?.sms?.remaining ?? 0;

  const tohtohCouponsCount = tohtohData?.data?.attribute?.couponBalance?.totalCoupon ?? 0;
  const goldenfarmCouponsCount = goldenfarmData?.data?.attribute?.couponBalance ?? 0;

  // Retrieve packsLists for detailed subcard views
  const cashbackPacks = balanceData?.data?.attribute?.packsPieData?.ett?.packsList || [];
  const dataPacks = balanceData?.data?.attribute?.packsPieData?.data?.packsList || [];
  const voicePacks = balanceData?.data?.attribute?.packsPieData?.voice?.packsList || [];
  const smsPacks = balanceData?.data?.attribute?.packsPieData?.sms?.packsList || [];

  return (
    <div className="space-y-3 p-3 max-w-md mx-auto relative z-10 pb-12">
      {/* Top action row */}
      <div className="flex justify-between items-center bg-[#0d1527]/50  py-2 px-3.5 rounded-xl border border-white/5">
        <div className="flex items-center space-x-2">
          {/* Pulsing indicator */}
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff66] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff66]"></span>
          </span>
          <span className="font-sans text-[9px] tracking-wider uppercase font-semibold text-emerald-400">
            NYTH ATOM SYSTEM LIVE
          </span>
        </div>
        <button
          onClick={() => {
            setTohtohError("");
            setGoldenfarmError("");
            setBuyMessage("");
            setGoldenFarmBuyMessage("");
            checkClaimList();
            onRefresh();
          }}
          disabled={loading}
          className="py-1 px-3 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-full flex items-center space-x-1 transition active:scale-95 text-[9px] font-bold cursor-pointer"
        >
          <RefreshCw className={`w-2 h-2 mr-1 ${loading ? "animate-spin text-emerald-400" : "text-slate-300"}`} />
          <span>အပ်ဒိတ်လုပ်ပါ</span>
        </button>
      </div>

      {/* User Info glass panel card */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/5  border border-white/10 rounded-2xl p-3 shadow-lg relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative flex-none">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00ff66] to-emerald-500 rounded-full blur-[3px] pointer-events-none opacity-50 animate-pulse" />
              <img
                src={userAvatar || "/nyth_logo.png"}
                alt="user avatar cartoon"
                referrerPolicy="no-referrer"
                className="w-10.5 h-10.5 rounded-full border-2 border-[#00ff66]/60 bg-slate-950 p-0.5 relative z-10"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-black text-white font-sans tracking-tight truncate max-w-[120px] block">
                  {userName || tohtohData?.data?.attribute?.profileInfo?.name || "TMJp_1U1Zq"}
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1 py-0.2 rounded text-[7px] uppercase font-mono tracking-wider font-extrabold select-none">
                  Active
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-wider">
                {formatMsisdn(balanceData?.data?.attribute?.msisdn)}
              </p>
            </div>
          </div>

          {/* Clean actions block aligning exactly with the screenshot */}
          <div className="flex items-center space-x-1.5 flex-none">
            {/* Game History button */}
            <button
              onClick={() => {
                setShowGameHistory(true);
                handleFetchGameHistory("tohtoh");
              }}
              className="w-8 h-8 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/15 flex items-center justify-center text-indigo-400 hover:text-indigo-300 transition active:scale-95 cursor-pointer shadow-md shadow-indigo-950/20"
              title="Game History"
            >
              <History className="w-3.5 h-3.5" />
            </button>

            {/* Points Exchange button */}
            <button
              onClick={() => onNavigateToTab("rewards")}
              className="w-8 h-8 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/15 flex items-center justify-center text-amber-400 hover:text-amber-300 transition active:scale-95 cursor-pointer shadow-md shadow-amber-950/20"
              title="Points Exchange"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="w-8 h-8 rounded-full bg-red-950/30 border border-red-500/10 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-900/30 transition active:scale-95 cursor-pointer"
              title="Logout session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* COMPACT 2X2 PREMIUM SQUARE GRID (လေးထောင့်ပုံစံ အကန့်လေးကန့်) */}
      <div className="grid grid-cols-2 gap-2.5 animate-fade-in">
        
        {/* ROOM 1: PRIMARY BALANCE (ပင်မဖုန်းဘေလ်) */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setActiveDetailModal("primary")}
          className="bg-[#10192e]/55  border border-emerald-500/10 hover:border-emerald-500/25 rounded-xl p-2.5 shadow-lg flex flex-col justify-between min-h-[96px] relative overflow-hidden transition-all duration-300 cursor-pointer text-center items-center"
        >
          <div className="flex justify-center items-center w-full">
            <span className="text-[9.5px] text-emerald-400 font-bold tracking-wider flex items-center space-x-1.5 font-sans justify-center uppercase">
              <span className="w-1 h-1 rounded-full bg-emerald-450 animate-pulse" />
              <span>BALANCE</span>
            </span>
          </div>

          <div className="my-0.5 text-center w-full">
            <div className="text-[18px] font-black text-white font-sans tracking-tight justify-center flex items-baseline leading-none">
              {primaryMainBalance.toLocaleString()} <span className="text-[10px] text-emerald-400 font-bold uppercase ml-0.5">Ks</span>
            </div>
            <p className="text-[8px] text-slate-400 mt-1 font-sans uppercase tracking-widest text-center">Main Balance</p>
          </div>

          <div className="text-[8px] border-t border-white/5 pt-1.5 w-full text-center flex justify-center items-center font-sans font-bold tracking-wider uppercase text-[#00ff66]">
            Quick View
          </div>
        </motion.div>

        {/* ROOM 2: SWIPEABLE CAROUSEL (DATA, VOICE, SMS) ညာဘက် အကန့် */}
        <motion.div
           whileHover={{ scale: 1.01 }}
           onMouseEnter={() => setIsHoveringCarousel(true)}
           onMouseLeave={() => setIsHoveringCarousel(false)}
           onTouchStart={() => setIsHoveringCarousel(true)}
           onTouchEnd={() => setIsHoveringCarousel(false)}
           className="bg-[#10192e]/55 border border-sky-500/10 hover:border-sky-500/25 rounded-xl shadow-lg relative flex flex-col justify-between min-h-[96px] overflow-hidden group transition-all duration-300"
        >
          <div 
            ref={carouselRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const slide = Math.round(el.scrollLeft / el.clientWidth);
              if (slide !== activeCarouselSlide) {
                setActiveCarouselSlide(slide);
              }
            }}
            className="flex overflow-x-auto w-full h-full snap-x snap-mandatory scrollbar-none relative pb-1"
          >
            
            {/* DATA CARD */}
            <div 
              onClick={() => setActiveDetailModal("data")}
              className="w-full shrink-0 snap-always snap-center p-2.5 flex flex-col justify-between cursor-pointer text-center items-center"
            >
              <div className="flex justify-center items-center w-full relative">
                <span className="text-[9.5px] text-[#38bdf8] font-bold tracking-wider flex items-center space-x-1 font-sans justify-center uppercase">
                  <span>DATA</span>
                </span>
                <span className="text-[6.5px] bg-sky-500/20 px-1 py-0.2 rounded text-sky-350 font-mono font-extrabold select-none absolute right-0">MB</span>
              </div>

              <div className="my-0.5 text-center w-full">
                <div className="text-[18px] font-black text-[#38bdf8] font-sans tracking-tight justify-center flex items-baseline leading-none">
                  {currentDataRemaining.toLocaleString()} <span className="text-[10px] text-[#38bdf8] font-bold uppercase ml-0.5">MB</span>
                </div>
                <p className="text-[8px] text-slate-400 mt-1 font-sans uppercase tracking-widest text-center">Remaining Data</p>
              </div>

              <div className="text-[8px] border-t border-white/5 pt-1.5 w-full text-center flex justify-center items-center font-sans font-bold tracking-wider uppercase text-sky-400">
                {dataPacks.length} Packs Remaining
              </div>
            </div>

            {/* VOICE CARD */}
            <div 
              onClick={() => setActiveDetailModal("voice")}
              className="w-full shrink-0 snap-always snap-center p-2.5 flex flex-col justify-between cursor-pointer text-center items-center"
            >
              <div className="flex justify-center items-center w-full relative">
                <span className="text-[9.5px] text-indigo-400 font-bold tracking-wider flex items-center space-x-1 font-sans justify-center uppercase">
                  <span>VOICE</span>
                </span>
                <span className="text-[6.5px] bg-indigo-500/20 px-1 py-0.2 rounded text-indigo-300 font-mono font-extrabold select-none absolute right-0">MIN</span>
              </div>

              <div className="my-0.5 text-center w-full">
                <div className="text-[18px] font-black text-indigo-400 font-sans tracking-tight justify-center flex items-baseline leading-none">
                  {currentVoiceRemaining.toLocaleString()} <span className="text-[10px] text-indigo-400 font-bold uppercase ml-0.5">MIN</span>
                </div>
                <p className="text-[8px] text-slate-400 mt-1 font-sans uppercase tracking-widest text-center">Remaining Voice</p>
              </div>

              <div className="text-[8px] border-t border-white/5 pt-1.5 w-full text-center flex justify-center items-center font-sans font-bold tracking-wider uppercase text-indigo-400">
                {voicePacks.length} Packs Remaining
              </div>
            </div>

            {/* SMS CARD */}
            <div 
              onClick={() => setActiveDetailModal("sms")}
              className="w-full shrink-0 snap-always snap-center p-2.5 flex flex-col justify-between cursor-pointer text-center items-center"
            >
              <div className="flex justify-center items-center w-full relative">
                <span className="text-[9.5px] text-purple-400 font-bold tracking-wider flex items-center space-x-1 font-sans justify-center uppercase">
                  <span>SMS</span>
                </span>
                <span className="text-[6.5px] bg-purple-500/20 px-1 py-0.2 rounded text-purple-300 font-mono font-extrabold select-none absolute right-0">SMS</span>
              </div>

              <div className="my-0.5 text-center w-full">
                <div className="text-[18px] font-black text-purple-400 font-sans tracking-tight justify-center flex items-baseline leading-none">
                  {currentSmsRemaining.toLocaleString()} <span className="text-[10px] text-purple-400 font-bold uppercase ml-0.5">SMS</span>
                </div>
                <p className="text-[8px] text-slate-400 mt-1 font-sans uppercase tracking-widest text-center">Remaining SMS</p>
              </div>

              <div className="text-[8px] border-t border-white/5 pt-1.5 w-full text-center flex justify-center items-center font-sans font-bold tracking-wider uppercase text-purple-400">
                {smsPacks.length} Packs Remaining
              </div>
            </div>
            
          </div>
          
          {/* Scroll indicators */}
          <div className="absolute bottom-1 w-full flex justify-center space-x-1.5 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
             <div className={`w-1 h-1 rounded-full transition-colors ${activeCarouselSlide === 0 ? 'bg-sky-400' : 'bg-slate-500'}`}></div>
             <div className={`w-1 h-1 rounded-full transition-colors ${activeCarouselSlide === 1 ? 'bg-indigo-400' : 'bg-slate-500'}`}></div>
             <div className={`w-1 h-1 rounded-full transition-colors ${activeCarouselSlide === 2 ? 'bg-purple-400' : 'bg-slate-500'}`}></div>
          </div>
        </motion.div>

        {/* ROOM 3: CASHBACK & BONUS (ဆုကြေးလက်ကျန်) */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setActiveDetailModal("cashback")}
          className="bg-[#10192e]/55  border border-emerald-500/10 hover:border-emerald-500/25 rounded-xl p-2.5 shadow-lg flex flex-col justify-between min-h-[96px] relative overflow-hidden transition-all duration-300 cursor-pointer text-center items-center"
        >
          <div className="flex justify-center items-center w-full relative">
            <span className="text-[9.5px] text-[#00ff66] font-bold tracking-wider flex items-center space-x-1 font-sans justify-center uppercase">
              <span>CASHBACK</span>
            </span>
            <span className="text-[6.5px] bg-emerald-500/20 px-1 py-0.2 rounded text-[#00ff66] font-mono font-extrabold select-none absolute right-0">Gift</span>
          </div>

          <div className="my-0.5 text-center w-full">
            <div className="text-[18px] font-black text-white font-sans tracking-tight justify-center flex items-baseline leading-none">
              {cashbackBonusAmount.toLocaleString()} <span className="text-[10px] text-[#00ff66] font-bold uppercase ml-0.5">Ks</span>
            </div>
            <p className="text-[8px] text-slate-400 mt-1 font-sans uppercase tracking-widest text-center">Cashback Bonus</p>
          </div>

          <div className="text-[8px] border-t border-white/5 pt-1.5 w-full text-center flex justify-center items-center font-sans font-bold tracking-wider uppercase text-emerald-400">
            {cashbackPacks.length} Rewards Active
          </div>
        </motion.div>

        {/* ROOM 4: STAR POINTS & DAILY GIFT CLAIM (ကြယ်ပွင့်အမှတ်နှင့် နေ့စဉ် Gift Box ယူရန်) */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setActiveDetailModal("points")}
          className="bg-[#10192e]/55  border border-amber-500/10 hover:border-amber-500/25 rounded-xl p-2.5 shadow-lg flex flex-col justify-between min-h-[96px] relative overflow-hidden transition-all duration-300 cursor-pointer text-center items-center"
        >
          <div className="flex justify-center items-center w-full relative">
            <span className="text-[9.5px] text-amber-500 font-bold tracking-wider flex items-center space-x-1.5 font-sans justify-center uppercase">
              <span>POINTS</span>
            </span>
            
            <div className="absolute right-0">
              <button
                onClick={handleClaimDailyPoint}
                disabled={claimingDaily}
                className={`w-6 h-6 rounded-full ${
                  hasClaimedDaily 
                    ? "bg-amber-400/20 border border-amber-400/30 text-amber-500 hover:bg-amber-400/30 font-bold"
                    : "bg-gradient-to-tr from-amber-500/15 to-orange-500/15 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 hover:border-amber-400/50"
                } flex items-center justify-center transition-all duration-300 relative shadow-inner overflow-hidden hover:scale-105 active:scale-90 cursor-pointer ${
                  claimingDaily ? "animate-bounce" : ""
                }`}
                title={hasClaimedDaily ? "ယူပြီးပါပြီ" : "နေ့စဉ်ပွိုင့် ယူရန်"}
              >
                {!hasClaimedDaily && <span className="absolute inset-0 bg-amber-500/5 animate-pulse" />}
                {hasClaimedDaily ? (
                  <Check className="w-3.5 h-3.5 text-amber-500 font-black stroke-[3]" />
                ) : (
                  <Gift className="w-2.8 h-2.8 text-amber-400" />
                )}
              </button>
            </div>
          </div>

          <div className="my-0.5 text-center w-full">
            <div className="text-[18px] font-black text-amber-500 font-sans tracking-tight justify-center flex items-baseline leading-none">
              {getPointsCount().toLocaleString()} <span className="text-[8px] text-amber-500 font-semibold font-mono tracking-wider ml-0.5">Pts</span>
            </div>
            <p className="text-[8px] text-slate-400 mt-1 font-sans uppercase tracking-widest text-center truncate">Points Balance</p>
          </div>

          <div className="text-[8px] border-t border-white/5 pt-1.5 w-full text-center flex justify-center items-center font-sans font-bold tracking-wider uppercase text-amber-500 truncate px-1">
            {getStarLabel()}
          </div>
        </motion.div>
      </div>

      {/* EXTREMELY POLISHED GAME SELECTOR HUB (တို့တို့ကစားမယ် / ရွှေလယ်တောကစားမယ်) */}
      <div className="bg-[#10192e]/45  rounded-[2rem] p-5 border border-white/10 space-y-4 shadow-lg">
        {/* Tab Switcher Headers */}
        <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-slate-950/60 rounded-full border border-white/5">
          <button
            onClick={() => setGameActiveTab("tohtoh")}
            className={`py-2.5 rounded-full text-[10px] font-black tracking-wide transition-all duration-200 cursor-pointer flex items-center justify-center space-x-1.5 ${
              gameActiveTab === "tohtoh"
                ? "bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/20 font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>တို့တို့ကစားမယ်</span>
          </button>

          <button
            onClick={() => setGameActiveTab("goldenfarm")}
            className={`py-2.5 rounded-full text-[10px] font-black tracking-wide transition-all duration-200 cursor-pointer flex items-center justify-center space-x-1.5 ${
              gameActiveTab === "goldenfarm"
                ? "bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/20 font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>ရွှေလယ်တော</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="bg-slate-950/45 border border-white/5 p-4 rounded-[1.75rem] relative overflow-hidden space-y-4">
          <AnimatePresence mode="wait">
            {gameActiveTab === "tohtoh" ? (
              <motion.div
                key="tohtoh"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#00ff66]/10 border border-[#00ff66]/15 flex items-center justify-center">
                      <Gamepad2 className="w-5 h-5 text-[#00ff66]" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white font-sans flex items-center justify-between w-full">
                        <span>Toh Toh United</span>
                      </div>
                      <button 
                        onClick={() => { setShowBuyModal(true); setBuyMessage(""); }} 
                        className="mt-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/40 text-green-400 px-2 py-0.5 rounded-lg text-[9px] font-black cursor-pointer transition flex items-center space-x-1"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span className="font-sans">LIVES ဝယ်မည်</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-[#00ff66] font-mono">{tohtohCouponsCount} Lives</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 font-sans font-medium">လက်ကျန်ကစားခွင့်</div>
                  </div>
                </div>

                {fetchingStatusIndicator()}

                {/* Show dynamic error banner only when an actual error exists */}
                {tohtohError && (
                  <div className="bg-[#241217] border border-red-500/20 py-2.5 px-3.5 rounded-xl text-center text-[10px] font-sans text-red-300 font-medium leading-relaxed">
                    {tohtohError}
                  </div>
                )}

                <button
                  onClick={handleInstantTohTohDraw}
                  disabled={drawingTohtoh || tohtohCooldown > 0}
                  className="w-full py-3.5 bg-[#00ff66] hover:brightness-110 disabled:brightness-75 disabled:cursor-not-allowed text-slate-950 font-black rounded-full text-xs tracking-wider transition active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/10"
                >
                  {tohtohCooldown > 0 ? (
                    <span>စောင့်ပါ... {tohtohCooldown} စက္ကန့်</span>
                  ) : drawingTohtoh ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>စောင့်ဆိုင်းနေသည်...</span>
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="w-4 h-4 text-slate-950 fill-slate-950" />
                      <span>ကစားမည်</span>
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="goldenfarm"
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#00ff66]/10 border border-[#00ff66]/15 flex items-center justify-center">
                      <Sprout className="w-5 h-5 text-[#00ff66]" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white font-sans flex items-center justify-between w-full">
                        <span>ရွှေလယ်တောဂိမ်း</span>
                      </div>
                      <button 
                        onClick={() => { setShowGoldenFarmBuyModal(true); setGoldenFarmBuyMessage(""); }} 
                        className="mt-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/40 text-green-400 px-2 py-0.5 rounded-lg text-[9px] font-black cursor-pointer transition flex items-center space-x-1"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span className="font-sans">LIVES ဝယ်မည်</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-[#00ff66] font-mono">{goldenfarmCouponsCount} Lives</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 font-sans font-medium">လက်ကျန်ကစားခွင့်</div>
                  </div>
                </div>

                {drawingGoldenfarm && (
                  <div className="flex justify-center space-x-1 py-1.5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-200" />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-300" />
                  </div>
                )}

                {/* Show dynamic error banner only when an actual error exists */}
                {goldenfarmError && (
                  <div className="bg-[#241217] border border-red-500/20 py-2.5 px-3.5 rounded-xl text-center text-[10px] font-sans text-red-300 font-medium leading-relaxed">
                    {goldenfarmError}
                  </div>
                )}

                <button
                  onClick={handleInstantGoldenFarmDraw}
                  disabled={drawingGoldenfarm || gfCooldown > 0}
                  className="w-full py-3.5 bg-[#00ff66] hover:brightness-110 disabled:brightness-75 disabled:cursor-not-allowed text-slate-950 font-black rounded-full text-xs tracking-wider transition active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/10"
                >
                  {gfCooldown > 0 ? (
                    <span>စောင့်ပါ... {gfCooldown} စက္ကန့်</span>
                  ) : drawingGoldenfarm ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>ဆုယူနေသည်...</span>
                    </>
                  ) : (
                    <>
                      <Sprout className="w-4 h-4 text-slate-950" />
                      <span>ကစားမည်</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* BOTTOM SHEET DETAILED MODALS FOR THE 4 TILES (ဘူတာရုံ အသေးစိတ် စာမျက်နှာငယ်များ) */}
      <AnimatePresence>
        {activeDetailModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 ">
            {/* Modal dismiss barrier */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setActiveDetailModal(null)} />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-[#0b0e1a] border-t border-white/10 rounded-t-[2.5rem] w-full max-w-md p-6 relative z-10 shadow-2xl max-h-[80vh] overflow-y-auto scrollbar-none"
            >
              {/* Top Drag Notch Handle */}
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-5" />

              {/* MODAL ROOM 1: PRIMARY DETAILS */}
              {activeDetailModal === "primary" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-black text-emerald-400 flex items-center space-x-2 font-sans">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      <span>Main Balance Details</span>
                    </h4>
                    <button onClick={() => setActiveDetailModal(null)} className="text-xs text-slate-400 p-2 hover:text-white uppercase font-bold tracking-wider font-sans">
                      ပိတ်ရန်
                    </button>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center py-6 text-center">
                    <span className="text-3xl font-black text-white font-sans">
                      {primaryMainBalance.toLocaleString()} Ks
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1 font-sans">လက်ကျန်ဖုန်းဘေလ်</span>
                    <span className="mt-3 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-medium">
                      Status: Active
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed font-sans mt-3 text-center">
                    သင်၏ပင်မဖုန်းဘေလ်လက်ကျန်ငွေအား ဝန်ဆောင်မှုအမျိုးမျိုး ဝယ်ယူရန်နှင့် ဖုန်းခေါ်ဆိုရန် အသုံးပြုနိုင်သည်။
                  </p>
                </div>
              )}

              {/* MODAL ROOM 2: ACTIVE DATA PACKS DETAILS */}
              {activeDetailModal === "data" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-black text-sky-400 flex items-center space-x-2 font-sans">
                      <BookmarkCheck className="w-5 h-5 text-sky-400" />
                      <span className="text-sky-400">Active Data Packages</span>
                    </h4>
                    <button onClick={() => setActiveDetailModal(null)} className="text-xs text-slate-400 p-2 hover:text-white uppercase font-bold tracking-wider font-sans">
                      ပိတ်ရန်
                    </button>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center">
                    <span className="text-3xl font-black text-white font-sans">
                      {currentDataRemaining.toLocaleString()} MB
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">အင်တာနက်ကျန်ရှိမှု စုစုပေါင်း</span>
                  </div>

                  {dataPacks.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider mb-1">
                        Active Packages ({dataPacks.length})
                      </div>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
                        {dataPacks.map((pack, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white/[0.03] hover:bg-white/[0.05] p-3 rounded-xl border border-white/5 text-xs transition">
                            <div className="max-w-[70%]">
                              <div className="font-bold text-slate-200 truncate">{pack.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{pack.expireAtV2 || `${pack.expireAt} မတိုင်မီ အထိ`}</div>
                            </div>
                            <div className="font-mono font-bold text-sky-400 text-xs">
                              +{pack.remainingAmount.toLocaleString()} {pack.unit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-6 text-center">
                      ဝယ်ယူထားသော ဒေတာပက်ကေ့ချ်များ မရှိသေးပါ။
                    </div>
                  )}
                </div>
              )}

              {/* MODAL: ACTIVE VOICE PACKS DETAILS */}
              {activeDetailModal === "voice" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-black text-indigo-400 flex items-center space-x-2 font-sans">
                      <BookmarkCheck className="w-5 h-5 text-indigo-400" />
                      <span className="text-indigo-400">Active Voice Packages</span>
                    </h4>
                    <button onClick={() => setActiveDetailModal(null)} className="text-xs text-slate-400 p-2 hover:text-white uppercase font-bold tracking-wider font-sans">
                      ပိတ်ရန်
                    </button>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center">
                    <span className="text-3xl font-black text-white font-sans">
                      {currentVoiceRemaining.toLocaleString()} MIN
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">ဖုန်းခေါ်ဆိုရန်ကျန်ရှိမှု စုစုပေါင်း</span>
                  </div>

                  {voicePacks.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">
                        Active Packages ({voicePacks.length})
                      </div>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
                        {voicePacks.map((pack, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white/[0.03] hover:bg-white/[0.05] p-3 rounded-xl border border-white/5 text-xs transition">
                            <div className="max-w-[70%]">
                              <div className="font-bold text-slate-200 truncate">{pack.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{pack.expireAtV2 || `${pack.expireAt} မတိုင်မီ အထိ`}</div>
                            </div>
                            <div className="font-mono font-bold text-indigo-400 text-xs">
                              +{pack.remainingAmount?.toLocaleString() || pack.totalAmount?.toLocaleString()} {pack.unit || 'Min'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-6 text-center">
                      ဝယ်ယူထားသော ဖုန်းပြောဆိုခွင့် ပက်ကေ့ချ်များ မရှိသေးပါ။
                    </div>
                  )}
                </div>
              )}

              {/* MODAL: ACTIVE SMS PACKS DETAILS */}
              {activeDetailModal === "sms" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-black text-purple-400 flex items-center space-x-2 font-sans">
                      <BookmarkCheck className="w-5 h-5 text-purple-400" />
                      <span className="text-purple-400">Active SMS Packages</span>
                    </h4>
                    <button onClick={() => setActiveDetailModal(null)} className="text-xs text-slate-400 p-2 hover:text-white uppercase font-bold tracking-wider font-sans">
                      ပိတ်ရန်
                    </button>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center">
                    <span className="text-3xl font-black text-white font-sans">
                      {currentSmsRemaining.toLocaleString()} SMS
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">SMS ပေးပို့ရန်ကျန်ရှိမှု စုစုပေါင်း</span>
                  </div>

                  {smsPacks.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">
                        Active Packages ({smsPacks.length})
                      </div>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
                        {smsPacks.map((pack, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white/[0.03] hover:bg-white/[0.05] p-3 rounded-xl border border-white/5 text-xs transition">
                            <div className="max-w-[70%]">
                              <div className="font-bold text-slate-200 truncate">{pack.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{pack.expireAtV2 || `${pack.expireAt} မတိုင်မီ အထိ`}</div>
                            </div>
                            <div className="font-mono font-bold text-purple-400 text-xs">
                              +{pack.remainingAmount?.toLocaleString() || pack.totalAmount?.toLocaleString()} {pack.unit || 'SMS'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-6 text-center">
                      ဝယ်ယူထားသော SMS ပက်ကေ့ချ်များ မရှိသေးပါ။
                    </div>
                  )}
                </div>
              )}

              {/* MODAL ROOM 3: ACTIVE CASHBACK PACKS */}
              {activeDetailModal === "cashback" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-black text-[#00ff66] flex items-center space-x-2">
                      <Gift className="w-5 h-5 text-[#00ff66]" />
                      <span>Cashback Details</span>
                    </h4>
                    <button onClick={() => setActiveDetailModal(null)} className="text-xs text-slate-400 p-2 hover:text-white uppercase font-bold tracking-wider font-sans">
                      ပိတ်ရန်
                    </button>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center">
                    <span className="text-3xl font-black text-white font-sans">
                      {cashbackBonusAmount.toLocaleString()} Ks
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">ဆုကြေးငွေလက်ကျန် စုစုပေါင်း</span>
                  </div>

                  {cashbackPacks.length > 0 ? (
                    <div className="space-y-2 mt-2">
                      <div className="text-[10px] text-[#00ff66] font-bold uppercase tracking-wider mb-1">
                        Cashback Breakdown ({cashbackPacks.length})
                      </div>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
                        {cashbackPacks.map((pack, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white/[0.03] hover:bg-white/[0.05] p-3 rounded-xl border border-white/5 text-xs transition">
                            <div className="max-w-[70%]">
                              <div className="font-bold text-slate-200 truncate">{pack.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{pack.expireAtV2 || `${pack.expireAt} မတိုင်မီ အထိ`}</div>
                            </div>
                            <div className="font-mono font-bold text-[#00ff66] text-xs">
                              +{pack.remainingAmount.toLocaleString()} {pack.unit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic py-6 text-center font-sans">
                      တက်ကြွသော ဆုကြေးလက်ကျန် မရှိသေးပါ။
                    </div>
                  )}
                </div>
              )}

              {/* MODAL ROOM 4: STAR RULES & TIERS */}
              {activeDetailModal === "points" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-black text-amber-500 flex items-center space-x-2 font-sans">
                      <Star className="w-5 h-5 text-amber-400" />
                      <span>Points Info</span>
                    </h4>
                    <button onClick={() => setActiveDetailModal(null)} className="text-xs text-slate-400 p-2 hover:text-white uppercase font-bold tracking-wider font-sans">
                      ပိတ်ရန်
                    </button>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center flex flex-col items-center">
                    <span className="text-3xl font-black text-white font-sans">
                      {getPointsCount()?.toLocaleString()} Pts
                    </span>
                    <span className="text-[11px] text-amber-400 mt-1 uppercase font-bold tracking-wider font-sans">
                      {getStarLabel()}
                    </span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>အမှတ်သက်တမ်းကုန်ဆုံးရက်</span>
                      <span className="text-amber-400 font-bold">{getValidityDate()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>လက်ရှိအဆင့်</span>
                      <span className="text-white font-bold">{getStarLabel()}</span>
                    </div>
                  </div>

                  <p className="text-[11.5px] text-slate-400 mt-2 leading-relaxed font-sans">
                    လက်ဆောင်ပုံးလေးပုံစံအားနှိပ်၍ နေ့စဉ်အမှတ်များ ရယူနိုင်သည်။ အမှတ်များကိုဖုန်းဘေလ်၊ အင်တာနက်ဗောက်ချာများဖြင့် လဲလှယ်နိုင်သည်။
                  </p>

                  <button
                    onClick={() => {
                      setActiveDetailModal(null);
                      onNavigateToTab("rewards");
                    }}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-450 text-slate-950 font-black rounded-xl text-xs tracking-wider uppercase font-sans shadow-[0_0_15px_rgba(245,158,11,0.2)] transition active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-2 mt-4"
                  >
                    <Coins className="w-4 h-4 text-slate-950" />
                    <span>Go to Points Exchange (လဲလှယ်ရန် သွားမည်)</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP 1: CONGRATULATORY OVERLAY UPON TOH TOH SPIN/DRAW WINNINGS */}
      <AnimatePresence>
        {showRewardPopup && tohtohReward && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 ">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="bg-[#0b101d] border border-[#00ff66]/20 p-6 rounded-[2rem] w-full max-w-sm text-center relative overflow-hidden shadow-[0_0_25px_rgba(0,255,102,0.1)]"
            >
              <div className="w-16 h-16 bg-[#00ff66]/10 border border-[#00ff66]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gamepad2 className="w-8 h-8 text-[#00ff66] animate-pulse" />
              </div>

              <h3 className="text-xl font-black text-white font-sans tracking-wide">
                CONGRATULATIONS! 🎉
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-sans">
                တို့တို့ဂိမ်းမှ အောင်မြင်စွာ ကံစမ်းဆု ရရှိပါပြီ။
              </p>

              <div className="my-5 p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                <div className="text-[10px] text-[#00ff66] tracking-widest font-bold uppercase mb-1 font-sans">
                  CHOSEN PRIZE (ရရှိသောဆုတံဆိပ်)
                </div>
                <div className="text-2xl font-black text-white font-sans mt-2">
                  {tohtohReward.prizeName}
                </div>
                {tohtohReward.prizeAmountText && (
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                     {tohtohReward.prizeAmountText}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 mb-5 leading-relaxed font-sans px-1">
                ဆုလက်ဆောင်သည် သင်၏ ဖုန်းကတ်အကောင့်သို့ တိုက်ရိုက်ထည့်သွင်းပေးပြီးဖြစ်ပြီး၊ ပင်မစာမျက်နှာရှိ လက်ကျန်ငွေများတွင် ထင်ဟပ်ဖော်ပြထားပါသည်။
              </p>

              <button
                onClick={() => {
                  setShowRewardPopup(false);
                  onRefresh(); // trigger general sync up
                }}
                className="w-full py-3.5 bg-[#00ff66] hover:brightness-110 text-slate-950 font-black rounded-xl text-[13px] transition cursor-pointer font-sans"
              >
                ပိတ်ရန်
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP 1.5: CONGRATULATORY OVERLAY UPON GOLDEN FARM DRAW WINNINGS */}
      <AnimatePresence>
        {showGoldenfarmRewardPopup && goldenfarmReward && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 ">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="bg-gradient-to-br from-[#1a130b] via-[#241a0e] to-[#0a0703] border border-amber-500/30 p-6 rounded-3xl w-full max-w-sm text-center relative overflow-hidden shadow-[0_0_25px_rgba(245,158,11,0.15)]"
            >
              {/* Success gold neon flare */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sprout className="w-8 h-8 text-amber-400 animate-bounce" />
              </div>

              <h3 className="text-xl font-black text-amber-400 font-sans uppercase tracking-wider">
                Harvest Gold! 🌾🎉
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                ရွှေလယ်တောဂိမ်းမှ အောင်မြင်စွာ ကံစမ်းဆု ရရှိပါပြီ။
              </p>

              <div className="my-5 p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-[10px] text-amber-400 tracking-wider font-bold mb-1">
                  CHOSEN PRIZE (ရရှိသောဆုတံဆိပ်)
                </div>
                <div className="text-xl font-extrabold text-white">
                  {goldenfarmReward.prizeName}
                </div>
                {goldenfarmReward.prizeAmountText && (
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                     {goldenfarmReward.prizeAmountText}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">
                ဆုလက်ဆောင်သည် သင်၏ ဖုန်းကတ်အကောင့်သို့ တိုက်ရိုက်ထည့်သွင်းပေးပြီးဖြစ်ပြီး၊ ပင်မစာမျက်နှာရှိ လက်ကျန်ငွေများတွင် ထင်ဟပ်ဖော်ပြထားပါသည်။
              </p>

              <button
                onClick={() => {
                  setShowGoldenfarmRewardPopup(false);
                  onRefresh(); // trigger general sync up
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs uppercase tracking-widest transition"
              >
                ပိတ်ရန်
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOH TOH PURCHASE MODAL */}
      <AnimatePresence>
        {showBuyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 ">
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
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
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
                  const finalChances = pack.chances; // API gives exact chances, no need to double it
                  
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 ">
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

      {/* POPUP 2: DAILY POINT RESPONSIVENESS */}
      <AnimatePresence>
        {dailyResponsePopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 ">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0b101d] border border-amber-500/20 p-6 rounded-3xl w-full max-w-sm text-center relative shadow-2xl"
            >
              <div className="w-14 h-14 bg-amber-500/5 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-amber-500 fill-transparent stroke-[1.5]" />
              </div>

              <h4 className="text-[15px] font-black text-white uppercase tracking-wider mb-4 font-sans">
                {dailyResponsePopupTitle}
              </h4>
              
              <div className="bg-slate-900/50 rounded-2xl border border-white/5 py-3.5 mb-5 mx-1">
                <p className="text-[13px] text-slate-300 font-sans">
                  {dailyRewardMsg}
                </p>
              </div>

              <button
                onClick={() => setDailyResponsePopup(false)}
                className="w-full py-3.5 bg-amber-500 hover:brightness-110 text-slate-950 text-sm font-black rounded-xl transition cursor-pointer font-sans"
              >
                သိပါပြီ
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* GAME HISTORY MODAL */}
      <AnimatePresence>
        {showGameHistory && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 ">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-[#0b101d] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-4 relative shadow-2xl flex flex-col h-[75vh]"
            >
              <div className="flex flex-col mb-4">
                <div className="flex justify-between items-center px-2 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                      <History className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white font-sans uppercase tracking-wide">
                        Game History
                      </h3>
                      <p className="text-[10px] text-slate-400 font-sans">မီနီဂိမ်း ဆုမဲမှတ်တမ်းများ</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowGameHistory(false)}
                    className="w-8 h-8 flex flex-col items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Tabs */}
                <div className="flex p-1 bg-white/5 rounded-xl border border-white/5 mx-2">
                  <button
                    onClick={() => handleFetchGameHistory("tohtoh")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${gameHistoryTab === "tohtoh" ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-400 hover:text-white'}`}
                  >
                    တို့တို့ ဂိမ်း
                  </button>
                  <button
                    onClick={() => handleFetchGameHistory("goldenfarm")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${gameHistoryTab === "goldenfarm" ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}
                  >
                    ရွှေလယ်တော
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-none pb-4 space-y-2.5 px-2">
                {gameHistoryLoading ? (
                  <div className="flex flex-col flex-1 items-center justify-center space-y-3 h-full min-h-[200px]">
                    <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
                    <p className="text-[10px] text-slate-400 font-sans animate-pulse">မှတ်တမ်းများ ရှာဖွေနေပါသည်...</p>
                  </div>
                ) : gameHistoryData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] opacity-70">
                    <History className="w-8 h-8 text-slate-600 mb-3" />
                    <p className="text-xs text-slate-400 font-sans">မှတ်တမ်း မရှိသေးပါ။</p>
                  </div>
                ) : (
                  gameHistoryData.map((item, idx) => {
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
      {/* DAILY GAMES LIVES POPUP */}
      <AnimatePresence>
        {showDailyPopup && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0a0f1d] border border-emerald-500/30 p-5 rounded-[2rem] w-full max-w-sm text-center relative shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden"
            >
               <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00ff66] to-transparent opacity-50" />
               <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500/20 to-[#00ff66]/10 border border-[#00ff66]/20 rounded-full flex items-center justify-center mb-4 shadow-inner">
                 <Gift className="w-8 h-8 text-[#00ff66]" />
               </div>
               
               <h2 className="text-lg font-black text-white font-sans mb-2 drop-shadow-md">
                 နေ့စဉ် အခမဲ့ ကစားခွင့် ရရှိပါသည်
               </h2>
               
               {dailyBonusData.msg ? (
                 <p className="text-sm text-slate-300 font-sans mb-5 leading-relaxed bg-[#00ff66]/10 p-3 rounded-xl border border-[#00ff66]/20 shadow-inner">
                   {dailyBonusData.msg}
                 </p>
               ) : (
                  <div className="mb-6">
                    <div className="flex flex-col space-y-3 mt-4 text-left">
                      {(dailyBonusData.tt > 0 || (tohtohData?.data?.attribute as any)?.isDailyBonusPopup === 1) && (
                        <div className="flex items-center justify-between bg-black/40 border border-[#00ff66]/20 p-3.5 rounded-xl shadow-inner">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                              <Gamepad2 className="w-5 h-5 text-[#00ff66]" />
                            </div>
                            <span className="text-[13px] font-bold text-white tracking-wide">Toh Toh United</span>
                          </div>
                          <span className="text-xl font-black text-[#00ff66] font-mono">+{dailyBonusData.tt || 1}</span>
                        </div>
                      )}
                      {(dailyBonusData.gf > 0 || (goldenfarmData?.data?.attribute as any)?.isDailyBonusPopup === 1) && (
                        <div className="flex items-center justify-between bg-black/40 border border-[#00ff66]/20 p-3.5 rounded-xl shadow-inner">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                              <Sprout className="w-5 h-5 text-[#00ff66]" />
                            </div>
                            <span className="text-[13px] font-bold text-white tracking-wide">Golden Farm</span>
                          </div>
                          <span className="text-xl font-black text-[#00ff66] font-mono">+{dailyBonusData.gf || 1}</span>
                        </div>
                      )}
                    </div>
                  </div>
               )}

               <button
                 onClick={() => setShowDailyPopup(false)}
                 className="w-full py-3.5 bg-gradient-to-r from-[#00ff66] to-emerald-500 hover:brightness-110 text-slate-950 font-black rounded-2xl text-xs tracking-wider uppercase transition-all duration-300 active:scale-[0.97] shadow-lg shadow-emerald-500/20"
               >
                 လက်ခံရယူမည်
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  function fetchingStatusIndicator() {
    if (drawingTohtoh) {
      return (
        <div className="flex justify-center space-x-1.5 py-2">
          <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-bounce delay-100" />
          <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-bounce delay-200" />
          <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-bounce delay-300" />
        </div>
      );
    }
    return null;
  }
}
