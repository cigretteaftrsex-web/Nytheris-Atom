import React, { useState, useRef } from "react";
import { User, Paintbrush, LogOut, Edit2, Check, Upload } from "lucide-react";
import { motion } from "motion/react";
import { LightweightBalanceResponse } from "../types";

interface ProfileScreenProps {
  balanceData: LightweightBalanceResponse | null;
  onLogout: (phoneToRemove?: string) => void;
  activeBg: string;
  onSelectBg: (bg: string) => void;
  onNavigateToTab?: (tab: "home" | "games" | "rewards" | "profile") => void;
  userName?: string;
  userAvatar?: string;
  onUpdateProfile?: (name: string, avatar: string) => void;
  accounts?: any[];
  activeMsisdn?: string | null;
  onSwitchAccount?: (msisdn: string) => void;
  onAddAccount?: () => void;
}

const AVATAR_LIST = [
  "/nyth_logo.png",
  "https://img.icons8.com/color/96/cyberpunk.png",
  "https://img.icons8.com/color/96/brave.png",
  "https://img.icons8.com/color/96/ninja-head.png",
  "https://img.icons8.com/color/96/futurama-bender.png",
  "https://img.icons8.com/color/96/avatar.png"
];

export default function ProfileScreen({
  balanceData,
  onLogout,
  activeBg,
  onSelectBg,
  onNavigateToTab,
  userName = "User",
  userAvatar = AVATAR_LIST[0],
  onUpdateProfile,
  accounts = [],
  activeMsisdn,
  onSwitchAccount,
  onAddAccount
}: ProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editAvatar, setEditAvatar] = useState(userAvatar);

  const accountType = balanceData?.data?.attribute?.payType || "prepaid";
  const userMsisdn = balanceData?.data?.attribute?.msisdn || "959757197933";

  const backgroundsList = [
    { id: "chroma", name: "Chroma Split (Anime Dual-Split)", glow: "from-red-500 to-rose-600" },
    { id: "abyss", name: "Midnight Abyss (Solid Minimal)", glow: "from-slate-900 to-slate-800" },
    { id: "matrix", name: "Techno Grid (Neon Green Edge)", glow: "from-green-500 to-emerald-600" },
    { id: "/nyth_bg.png", name: "Nyth Built-in Image", glow: "from-blue-500 to-cyan-600" }
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert("ကျေးဇူးပြု၍ ပုံဖိုင်ကိုသာ ရွေးချယ်ပါ။ (Please select an image file)");
    }
  };

  return (
    <div className="space-y-3 p-3 max-w-md mx-auto relative z-10 animate-fade-in">
      {/* Visual head */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigateToTab?.("home")}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/5 text-[10px] transition cursor-pointer font-bold font-sans"
          >
            <span>← ပင်မစာမျက်နှာသို့ (Home)</span>
          </button>
          <span className="text-[9px] text-rose-450 font-mono font-bold tracking-widest uppercase">
            Profile Settings
          </span>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-black text-white flex items-center justify-center space-x-1 font-sans bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
            <User className="w-4.5 h-4.5 mr-1 text-rose-400" />
            <span>Profile Info</span>
          </h1>
          <p className="text-[10px] text-slate-450 mt-0.5">
            Account details, background theme and logout settings
          </p>
        </div>
      </div>

      {/* Avatar and Name Section */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-md space-y-3">
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex justify-center space-x-2 mb-2 flex-wrap gap-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 rounded-full p-0.5 border border-slate-700 bg-slate-900 border-dashed flex items-center justify-center hover:border-green-400 transition-all cursor-pointer relative"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Upload className="w-4 h-4 text-slate-400" />
              </button>
              {AVATAR_LIST.map((av) => (
                <button
                  key={av}
                  onClick={() => setEditAvatar(av)}
                  className={`w-11 h-11 rounded-full p-0.5 border transition-all cursor-pointer ${
                    editAvatar === av ? "border-green-400 bg-green-500/10 scale-105" : "border-slate-800 bg-slate-900 border-white/5 hover:border-slate-605"
                  }`}
                >
                  <img src={av} alt="avatar" className="w-full h-full rounded-full object-cover" />
                </button>
              ))}
            </div>
            
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-slate-900/40 border border-slate-700/60 rounded-lg py-1.5 px-3 text-center text-xs font-bold text-white focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
            />
            
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => {
                  setEditName(userName);
                  setEditAvatar(userAvatar);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 bg-white/5 rounded-lg text-[10px] font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateProfile?.(editName, editAvatar);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-650 text-white rounded-lg text-[10px] font-bold"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <img src={userAvatar} alt="user profile" className="w-16 h-16 rounded-full border border-rose-500/30 bg-slate-900 p-0.5 shadow-md" />
            <h2 className="text-sm font-bold text-white mt-2">{userName}</h2>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-1 flex items-center space-x-1 px-2.5 py-1 bg-slate-850 hover:bg-slate-800 rounded-md text-[10px] font-bold text-slate-300 transition"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Profile</span>
            </button>
          </div>
        )}
      </div>

      {/* MANAGE ACCOUNTS (MULTI-ACCOUNT) */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-md space-y-3 relative">
        <div className="flex items-center space-x-1.5">
          <User className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            အကောင့်စီမံရန် (Manage Accounts)
          </span>
        </div>
        
        <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
          {accounts.map(acc => {
            const isActive = acc.msisdn === activeMsisdn;
            return (
              <div 
                key={acc.msisdn} 
                className={`flex items-center justify-between p-2 rounded-xl border text-[11px] transition duration-200 ${
                  isActive 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-white" 
                    : "bg-slate-950/40 border-white/5 text-slate-300 hover:bg-slate-900/60"
                }`}
              >
                <div 
                  className="flex items-center space-x-2 flex-1 cursor-pointer"
                  onClick={() => !isActive && onSwitchAccount && onSwitchAccount(acc.msisdn)}
                >
                  <img src={acc.userAvatar || AVATAR_LIST[0]} className="w-5 h-5 rounded-full border border-white/10" alt="avatar" />
                  <div className="flex flex-col">
                    <span className="font-semibold">{acc.userName || "User"} {isActive && <span className="text-[9px] text-emerald-400 font-bold ml-1">(Active)</span>}</span>
                    <span className="text-[9px] text-slate-500 font-mono tracking-wider">{acc.msisdn}</span>
                  </div>
                </div>
                
                {/* Remove Account Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`${acc.msisdn} ကို ဖယ်ရှားမလား?`)) {
                      onLogout(acc.msisdn);
                    }
                  }}
                  className="p-1 hover:bg-white/10 rounded-md transition text-slate-500 hover:text-red-400"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
        
        <button
          onClick={onAddAccount}
          className="w-full flex items-center justify-center p-2 rounded-xl border border-white/10 border-dashed bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-[10px] uppercase transition cursor-pointer"
        >
          <span>+ Add Account (အကောင့်အသစ်ထည့်ရန်)</span>
        </button>
      </div>

      {/* THEME BACKGROUND SELECTOR */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-md space-y-3 relative">
        <div className="flex items-center space-x-1.5">
          <Paintbrush className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            ဝေါပေပါ ချိန်ညှိရန် (Theme Wallpaper)
          </span>
        </div>

        <div className="space-y-1.5">
          {backgroundsList.map((bg) => (
            <button
              key={bg.id}
              onClick={() => onSelectBg(bg.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-[11px] transition duration-200 group cursor-pointer ${
                activeBg === bg.id
                  ? "bg-white/10 border-green-500/40 text-white"
                  : "bg-slate-950/40 border-white/5 text-slate-300 hover:bg-slate-900/60"
              }`}
            >
              <span className="font-semibold">{bg.name}</span>
              <div
                className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${bg.glow} flex items-center justify-center p-0.5`}
              >
                {activeBg === bg.id && <span className="w-1 h-1 bg-white rounded-full" />}
              </div>
            </button>
          ))}

          {/* Custom background upload */}
          <label
             className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-[11px] transition duration-200 group cursor-pointer ${
              activeBg !== "chroma" && activeBg !== "abyss" && activeBg !== "matrix" && activeBg !== "/nyth_bg.png"
                 ? "bg-white/10 border-blue-500/40 text-white"
                 : "bg-slate-950/40 border-white/5 text-slate-300 hover:bg-slate-900/60"
             }`}
           >
             <span className="font-semibold flex items-center gap-1.5"><Upload className="w-3.5 h-3.5 text-blue-400" /> Custom Image Upload (ပုံထည့်သွင်းရန်)</span>
             <input
               type="file"
               className="hidden"
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file && file.type.startsWith("image/")) {
                   const reader = new FileReader();
                   reader.onloadend = () => {
                     onSelectBg(reader.result as string);
                   };
                   reader.readAsDataURL(file);
                 } else if (file) {
                   alert("ကျေးဇူးပြု၍ ပုံဖိုင်ကိုသာ ရွေးချယ်ပါ။ (Please select an image file)");
                 }
               }}
             />
             <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center p-0.5">
               {activeBg !== "chroma" && activeBg !== "abyss" && activeBg !== "matrix" && activeBg !== "/nyth_bg.png" && <span className="w-1 h-1 bg-white rounded-full" />}
             </div>
           </label>
        </div>
        <p className="text-[9px] text-slate-500 block text-center font-sans">
          ဝေါပေပါပြောင်းလဲမှုသည် dashboard နှင့် exchange views များတွင် သက်ရောက်ပါမည်။
        </p>
      </div>

      {/* Game Rules removed as requested */}

      {/* LOGOUT BLOCK */}
      <button
        onClick={() => onLogout()}
        className="w-full py-2.5 bg-red-950/20 hover:bg-red-500/15 border border-red-500/20 text-red-300 font-bold rounded-xl text-[10px] uppercase tracking-wider transition duration-300 active:scale-[0.99] cursor-pointer flex items-center justify-center space-x-1.5"
      >
        <LogOut className="w-3.5 h-3.5 text-red-400" />
        <span>အကောင့်ထဲမှ ထွက်ခွာမည် (Logout)</span>
      </button>
    </div>
  );
}
