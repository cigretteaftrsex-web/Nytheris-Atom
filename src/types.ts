/**
 * Types and Interfaces for Nyth ATOM Core Modules
 */

export interface AppSettings {
  isMaintenance: number;
  isUpdateAvailable: number;
  forcedUpdate: number;
  isBanned: boolean;
  updateInterval: number;
  tpayFeature: number;
  tpayPostpaidFeature: number;
  showSimRegistration: number;
  simRegistration: number;
  simRegistrationV2: number;
  autoShakeNwinSec: number;
  dynamicNotificationEnable: number;
  isZawgyiView: number;
  notificationExpiration: number;
  notificationRemoveIds: string[];
  isflexiFeatureEnable: number;
  appUpdatePopUpHeading: string;
  appUpdatePopUpDesc: string;
  appOnboardEnable: number;
  gameHistoryCacheClear: number;
  gameHistoryCacheClearV2: number;
  gameHistoryDataOrder: number;
  specialOfferOfTheMonth: number;
  balanceCacheTimeout: number;
  shareDataCacheClear: number;
  shareDataCacheClearV2: number;
  shareDataOrder: number;
  isPackSortFilterEnabled: number;
  isFnfFeatureEnable: number;
  goldenFarmCacheClear: number;
  goldenFarmCacheClearV2: number;
  goldenFarmDataOrder: number;
  goldenFarmThemeType: number;
  redirectTo4X: number;
  bikeRushCacheClear: number;
  bikeRushCacheClearV2: number;
  bikeRushDataOrder: number;
  buyAgainDashBoardCardEnable: number;
  inAppPageShareEnable: number;
  eplYathaFeatureEnable: number;
}

export interface OTPAttribute {
  msisdn: string;
  code: string;
  expire_within: number;
}

export interface OTPResponse {
  status: string;
  data: {
    type: string;
    responseLanguage: string;
    appSettings: AppSettings | null;
    attribute: OTPAttribute;
  };
}

export interface TokenAttribute {
  token: string;
  refresh_token: string;
  access_token_expire_at: number;
  refresh_token_expire_at: number;
  access_token_expire_in: number;
  refresh_token_expire_in: number;
  user_id: number;
  msisdn: string;
  referralPopup: number;
  isSpecialOfferEligible: number;
  isSignUp: number;
  tokenType: string;
  deleted_user: number;
}

export interface VerifyOTPResponse {
  status: string;
  data: {
    type: string;
    responseLanguage: string;
    appSettings: AppSettings;
    attribute: TokenAttribute;
  };
}

// Lightweight Balance interfaces
export interface PackItem {
  accountType: number;
  title: string;
  expireAt: string;
  expireAtV2: string;
  remainingAmount: number;
  totalAmount?: number;
  unit: string;
  convertRemainingAmount?: number;
  remainingUnit?: string;
  isPackLow?: boolean;
  buyAgain?: number;
  isAutoRenewable?: number;
  unsubscribeOfferID?: string | null;
  isTransferAble?: number;
  isShalSubooExpired?: number;
}

export interface BalanceTypeSection {
  isShalSubooExpired?: number;
  count: number;
  remaining: number;
  remainingStr?: string;
  total: number;
  unit: string;
  packsList: PackItem[];
  convertRemaining?: number;
  convertRemainingStr?: string;
  remainingUnit?: string;
}

export interface MainBalance {
  value: number;
  currency: string;
  isBalanceLow: boolean;
  isKyoThone: boolean;
  kyoThoneAmount: number;
  cashBackAmount: number;
  shareValueAmount: number;
  availableTotalBalance: number;
  generatedAt: number;
}

export interface BalanceWidget {
  widgetFeatureStatus: number;
  manualRefreshIntervalInSeconds: number;
  autoRefreshIntervalInSeconds: number;
  updated: string;
  msisdn: string;
  balance: {
    amount: number;
    unit: string;
  };
  data: {
    amount: number;
    unit: string;
  };
  voice: {
    amount: number;
    unit: string;
  };
}

export interface LightweightBalanceResponse {
  status: string;
  data: {
    type: string;
    responseLanguage: string;
    appSettings: AppSettings;
    attribute: {
      msisdn: string;
      payType: string;
      packsPieData: {
        data: BalanceTypeSection;
        voice: BalanceTypeSection;
        sms: BalanceTypeSection;
        ett: BalanceTypeSection; // Cashback/Other bonus points
      };
      mainBalance: MainBalance;
      inactivePacks: Array<{
        accountType: number;
        title: string;
        expireAt: string;
        expireAtV2: string;
        remainingAmount: number;
        unit: string;
      }>;
      balanceWidget: BalanceWidget;
      oldBalanceCall: number;
    };
  };
}

// Point System interfaces
export interface StarReward {
  keyword: string;
  title: string;
  desc: string;
  image: string | null;
  logo: string | null;
  type: string;
  category: string;
  partner: string;
  redeemPoint: number;
}

export interface SpecialReward {
  keyword: string;
  title: string;
  desc: string;
  image: {
    "2x": string;
    "3x": string;
  } | null;
  logo: {
    "2x": string;
    "3x": string;
  } | null;
  type: string;
  category: string;
  partner: string;
  redeemPoint: number;
}

export interface PointDashboardResponse {
  status: string;
  data: {
    type: string;
    responseLanguage: string;
    appSettings: AppSettings;
    attribute: {
      starStatus: string;
      starStatusLabel: string;
      starStatusRank: number;
      validityEndDate: number;
      validityEndDateText: string;
      totalPoint: number;
      mostExpiry: {
        point: number;
        date: string;
      };
      progressBar: {
        totalRequiredPoint: number;
        earnedPoint: number;
        nextTierEligibilityText: string;
      };
      atomRewards: StarReward[];
      specialRewards: SpecialReward[];
      buyPackLink?: string;
    };
  };
}

export interface CouponBalance {
  totalCoupon: number;
  normalCoupon: number;
  specialCoupon: number;
  isSpecialCampaignEnable: number;
  specialCampaignLeftDays: number | null;
}

export interface TohTohUnitedResponse {
  status: string;
  data: {
    type: string;
    responseLanguage: string;
    attribute: {
      couponBalance: CouponBalance;
      isDailyBonusPopup: number;
      infoText: string[];
      boosterLife: {
        title: string;
        desc: string;
        price: number;
        enable: number;
      };
      levelInfo: {
        [key: string]: {
          title: string;
          price?: number;
        };
      };
      termsConditions: string;
      luckyChanceItems: {
        packPurchase: Array<{
          title: string;
          desc: string;
          type: string;
          offerId: string;
          chances: number;
          price: number;
        }>;
      };
      profileInfo: {
        name: string;
        jersey: {
          image: { "2x": string; "3x": string };
          shopCode: string;
        };
      };
    };
  };
}

export interface GoldenFarmResponse {
  status: string;
  data: {
    type: string;
    responseLanguage: string;
    attribute: {
      couponBalance: number;
      weeklyTickets: number;
      purchasedTickets: number;
      campaignStatus: {
        termsConditions: string;
      };
      purchaseLife: {
        regular: { title: string; sortDesc: string; desc: string };
        sorry: { title: string; sortDesc: string; desc: string };
        price: number;
      };
      levelData: Array<{
        level: number;
        duration: number;
        eggs: number;
        eggSpeed: number;
        score: number;
      }>;
    };
  };
}

export interface DrawResponse {
  status: string;
  data: {
    type: string;
    attribute: {
      isWin: number;
      title: string;
      message: string;
      prizeName: string;
      popupImageType: number;
      preCouponBalance: {
        totalCoupon: number;
      };
    };
  };
}
