import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAccount } from './account';

/**
 * Munib Plus (Saj, 14 Nov 2026): £4.99 a month, £29.99 a year, £59.99 lifetime, sold through Apple
 * in-app purchase and managed with RevenueCat (react-native-purchases).
 *
 * RevenueCat setup (dashboard): an entitlement called "plus" with three App Store products
 * (munib_plus_monthly, munib_plus_yearly, munib_plus_lifetime) in the "default" offering.
 * The app's RevenueCat Apple key goes in EXPO_PUBLIC_REVENUECAT_IOS_KEY (a public key, made to ship in apps).
 * Purchases are tied to the Munib account id, so Plus follows the person across phones; nothing else is sent.
 *
 * What Plus unlocks: unlimited Ask (lifetime: 20 a day, checked by the "ask" function), Listen offline,
 * every bedtime story after the first three. The Quran, prayer tools and anything someone in distress needs are always free.
 */

export const ENTITLEMENT = 'plus';
const KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
/** Bedtime stories free to everyone; the rest need Plus. */
export const FREE_STORIES = 3;

export type PlanId = 'monthly' | 'yearly' | 'lifetime';
/** trialDays: the free introductory offer Apple has on this plan (set in App Store Connect), if any. */
export type Plan = { id: PlanId; price: string; perMonth?: string; trialDays?: number; pkg: unknown };

/** Days in a free introductory offer (RevenueCat's introPrice), or undefined when there's no free trial. */
function freeTrialDays(intro: any): number | undefined {
  if (!intro || intro.price !== 0) return undefined;
  const per: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };
  const d = (per[String(intro.periodUnit).toUpperCase()] ?? 0) * (intro.periodNumberOfUnits ?? 1);
  return d > 0 ? d : undefined;
}

type PlusState = {
  /** Purchases work here (an iPhone with the key set). */
  available: boolean;
  ready: boolean;
  active: boolean;
  /** Plus features open: a member, or Plus isn't on sale here yet (nothing gets locked before people can buy it). */
  unlocked: boolean;
  lifetime: boolean;
  plans: Plan[];
  buy: (id: PlanId) => Promise<'done' | 'cancelled' | 'failed'>;
  restore: () => Promise<boolean>;
};

const Ctx = createContext<PlusState>({
  available: false,
  ready: true,
  active: false,
  unlocked: true,
  lifetime: false,
  plans: [],
  buy: async () => 'failed',
  restore: async () => false,
});
export const usePlus = () => useContext(Ctx);

// Loaded lazily so the web app (which can't sell through Apple) never touches the native module.
type RC = typeof import('react-native-purchases').default;
let rc: RC | null = null;
const supported = Platform.OS === 'ios' && !!KEY;

function readInfo(info: any) {
  const ent = info?.entitlements?.active?.[ENTITLEMENT];
  return { active: !!ent, lifetime: !!ent && !ent.expirationDate };
}

export function PlusProvider({ children }: { children: ReactNode }) {
  const acct = useAccount();
  const [ready, setReady] = useState(!supported);
  const [state, setState] = useState({ active: false, lifetime: false });
  const [plans, setPlans] = useState<Plan[]>([]);

  // Start RevenueCat once.
  useEffect(() => {
    if (!supported) return;
    let gone = false;
    (async () => {
      try {
        rc = (await import('react-native-purchases')).default;
        rc.configure({ apiKey: KEY, appUserID: acct.userId ?? undefined });
        rc.addCustomerInfoUpdateListener((info) => !gone && setState(readInfo(info)));
        const info = await rc.getCustomerInfo();
        if (!gone) setState(readInfo(info));
        const offerings = await rc.getOfferings();
        const pkgs = offerings.current?.availablePackages ?? [];
        const pick = (id: PlanId) => pkgs.find((p) => p.product.identifier.includes(id) || p.packageType.toLowerCase().includes(id === 'yearly' ? 'annual' : id));
        const out: Plan[] = [];
        for (const id of ['yearly', 'monthly', 'lifetime'] as PlanId[]) {
          const p = pick(id);
          if (!p) continue;
          out.push({ id, price: p.product.priceString, perMonth: id === 'yearly' ? p.product.pricePerMonthString ?? undefined : undefined, trialDays: freeTrialDays((p.product as any).introPrice), pkg: p });
        }
        if (!gone) setPlans(out);
      } catch {
        // No store or no network: Munib simply carries on without Plus.
      } finally {
        if (!gone) setReady(true);
      }
    })();
    return () => {
      gone = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep purchases tied to the signed-in account (so they follow the person to a new phone).
  useEffect(() => {
    if (!rc || !ready) return;
    (async () => {
      try {
        if (acct.userId) setState(readInfo((await rc!.logIn(acct.userId)).customerInfo));
        else if (!(await rc!.isAnonymous())) setState(readInfo(await rc!.logOut()));
      } catch {}
    })();
  }, [acct.userId, ready]);

  const buy = useCallback(
    async (id: PlanId) => {
      const plan = plans.find((p) => p.id === id);
      if (!rc || !plan) return 'failed' as const;
      try {
        const r = await rc.purchasePackage(plan.pkg as any);
        setState(readInfo(r.customerInfo));
        return 'done' as const;
      } catch (e: any) {
        return e?.userCancelled ? ('cancelled' as const) : ('failed' as const);
      }
    },
    [plans],
  );

  const restore = useCallback(async () => {
    if (!rc) return false;
    try {
      const s = readInfo(await rc.restorePurchases());
      setState(s);
      return s.active;
    } catch {
      return false;
    }
  }, []);

  const available = supported && plans.length > 0;
  return <Ctx.Provider value={{ available, ready, ...state, unlocked: state.active || !available, plans, buy, restore }}>{children}</Ctx.Provider>;
}
