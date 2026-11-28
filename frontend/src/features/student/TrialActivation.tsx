import { getLandingSource } from "../../utils/landing-source";
import { trackAcquisition } from "../../utils/acquisition";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  ArrowLeft,
} from "lucide-react";
import { apiErrorMessage } from "../../api/axios";
import {
  independentStudentsApi,
  type IntasendPayment,
} from "../../api/independent-students.api";
import { authApi } from "../../api/auth.api";
import { useAuthStore } from "../../store/auth.store";
type Interval = "MONTHLY" | "ANNUAL";
export function TrialActivationPage() {
  const location = useLocation();
  const registrationPhone =
    typeof location.state?.payerPhone === "string"
      ? location.state.payerPhone
      : "";
  const userId = useAuthStore((s) => s.user?.id),
    refreshToken = useAuthStore((s) => s.refreshToken),
    setSession = useAuthStore((s) => s.setSession),
    navigate = useNavigate(),
    client = useQueryClient();
  const [interval, setInterval] = useState<Interval>("MONTHLY"),
    [phone, setPhone] = useState(registrationPhone),
    [error, setError] = useState<string | null>(null),
    [accessMessage, setAccessMessage] = useState(""),
    [now, setNow] = useState(Date.now()),
    [refreshing, setRefreshing] = useState(false);
  const key = useRef(crypto.randomUUID()),
    refreshingRef = useRef(false),
    alive = useRef(true),
    handled = useRef("");
  const { data: paymentInfo } = useQuery({
    queryKey: ["independent-public-payment-info"],
    queryFn: independentStudentsApi.getPublicPaymentInfo,
  });
  useEffect(() => {
    trackAcquisition("activation_opened");
  }, []);
  const capabilities = useQuery({
    queryKey: ["individual-intasend-capabilities"],
    queryFn: independentStudentsApi.getIntasendCapabilities,
  });
  const queryKey = ["individual-intasend-payment", userId];
  const payment = useQuery({
    queryKey,
    queryFn: independentStudentsApi.getIntasendPayment,
    refetchInterval: (q) =>
      q.state.data &&
      ["PENDING", "PROCESSING", "AWAITING_VERIFICATION"].includes(
        q.state.data.status,
      )
        ? 4000
        : false,
    enabled: !!userId,
  });
  const p = payment.data,
    waiting = !!p && ["PENDING", "PROCESSING"].includes(p.status),
    uncertain = !!p && p.status === "AWAITING_VERIFICATION",
    confirmed = p?.status === "CONFIRMED",
    locked = waiting || (uncertain && new Date(p!.expiresAt).getTime() > now);
  useEffect(() => {
    alive.current = true;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);
  const refreshAccess = async () => {
    if (refreshingRef.current) return;
    if (!refreshToken) {
      setAccessMessage(
        "Payment confirmed. Sign in again to open your full workspace.",
      );
      return;
    }
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      const pair = await authApi.refresh(refreshToken);
      if (!alive.current) return;
      setSession(pair);
      if (!pair.user.isIndependentTrial)
        navigate("/student", { replace: true });
      else
        setAccessMessage(
          "Payment is confirmed. Refresh access again in a moment.",
        );
    } catch {
      if (alive.current)
        setAccessMessage(
          "Payment is confirmed. Refresh access again, or sign in again. Do not pay again.",
        );
    } finally {
      refreshingRef.current = false;
      if (alive.current) setRefreshing(false);
    }
  };
  useEffect(() => {
    if (p?.status === "CONFIRMED" && handled.current !== p.reference) {
      handled.current = p.reference;
      trackAcquisition("payment_confirmed");
      void refreshAccess();
    }
  }, [p?.status, p?.reference]);
  const stk = useMutation({
    mutationFn: () =>
      independentStudentsApi.startIntasendPayment({
        landing_source: getLandingSource(),
        interval,
        phone,
        idempotencyKey: key.current,
      }),
    onSuccess: (data: IntasendPayment) => {
      client.setQueryData(queryKey, data);
      setError(null);
      if (["FAILED", "CANCELLED"].includes(data.status))
        key.current = crypto.randomUUID();
    },
    onError: (e) => {
      setError(
        apiErrorMessage(
          e,
          "The request could not be confirmed. Check payment status before retrying.",
        ),
      );
      void payment.refetch();
    },
  });
  useEffect(() => {
    if (p && ["PENDING", "PROCESSING", "CONFIRMED"].includes(p.status))
      setInterval(p.interval);
  }, [p?.reference, p?.status]);
  const amount =
    interval === "ANNUAL"
      ? paymentInfo?.annualAmountKES
      : paymentInfo?.monthlyAmountKES;
  const pay = () => {
    setError(null);
    if (
      p &&
      ["FAILED", "CANCELLED", "AWAITING_VERIFICATION"].includes(p.status)
    )
      key.current = crypto.randomUUID();
    trackAcquisition("payment_attempt");
    stk.mutate();
  };
  return (
    <div className="mx-auto w-full max-w-xl pb-8 pt-2 sm:pt-5">
      <button
        type="button"
        onClick={() => navigate("/student")}
        className="mb-6 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={14} />
        Workspace
      </button>
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Subscription
        </h1>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck size={14} />
          Secure payment
        </span>
      </header>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(16,24,32,0.025)]">
        <div className="border-b border-slate-100 bg-[#f4f7f1] px-5 py-6 sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {confirmed ? "Amount paid" : "Amount due"}
              </p>
              <p className="mt-2 flex items-baseline gap-2 text-[#183a2c]">
                <span className="text-sm font-medium">KES</span>
                <span className="text-4xl font-semibold tracking-tight">
                  {amount?.toLocaleString() ?? "…"}
                </span>
              </p>
            </div>
            <span className="rounded-md border border-[#dbe5d3] bg-white/70 px-2.5 py-1 text-xs font-medium text-[#536b40]">
              Individual
            </span>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e1e8db] pt-4">
            <span className="text-xs font-medium text-slate-600">
              Access period
            </span>
            <div
              role="group"
              aria-label="Subscription period"
              className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
            >
              {(["MONTHLY", "ANNUAL"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={locked || stk.isPending || confirmed}
                  aria-pressed={interval === option}
                  onClick={() => {
                    setInterval(option);
                    key.current = crypto.randomUUID();
                  }}
                  className={`min-h-9 rounded-md px-3 text-xs font-semibold transition disabled:opacity-60 ${interval === option ? "bg-[#203e30] text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  {option === "ANNUAL" ? "12 months" : "1 month"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5 p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Smartphone size={18} className="text-emerald-700" />
              Pay with M-Pesa
            </h2>
            <span className="text-[11px] text-slate-400">
              Processed by IntaSend
            </span>
          </div>
          <label className="block text-sm font-medium">
            Payer’s M-Pesa number
            <input
              aria-label="Payer M-Pesa number"
              inputMode="tel"
              autoComplete="tel"
              type="tel"
              maxLength={30}
              disabled={locked || stk.isPending || confirmed}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                key.current = crypto.randomUUID();
              }}
              placeholder="0712 345 678"
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-200 px-3 text-base outline-none focus:border-[#6b864c] focus:ring-2 focus:ring-[#6b864c]/10 disabled:bg-slate-50"
            />
            <span className="mt-2 block text-xs font-normal text-slate-500">
              Your number or a parent’s. Enter the PIN only on the phone.
            </span>
          </label>
          {capabilities.data?.configured === false && (
            <p
              role="status"
              className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
            >
              M-Pesa payments are not available yet. Please contact Assignment
              Hub support.
            </p>
          )}
          {(error || payment.error || capabilities.error) && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >
              {error ??
                apiErrorMessage(
                  payment.error ?? capabilities.error,
                  "Payment status could not be checked. Retry the status check before paying again.",
                )}
            </p>
          )}
          {p && (
            <div
              role="status"
              className={`space-y-3 rounded-xl border p-4 ${confirmed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {confirmed ? (
                  <CheckCircle2 size={19} className="text-emerald-700" />
                ) : waiting ? (
                  <LoaderCircle
                    size={19}
                    className="animate-spin text-blue-600"
                  />
                ) : (
                  <Smartphone size={19} />
                )}{" "}
                {confirmed
                  ? "Payment confirmed"
                  : waiting
                    ? "Waiting for M-Pesa confirmation"
                    : uncertain
                      ? "Check your M-Pesa payment"
                      : p.status === "CANCELLED"
                        ? "Payment cancelled"
                        : "Payment not completed"}
              </div>
              <p className="text-sm leading-6">
                {waiting
                  ? `Check ${p.phone} for the KES ${p.amountKES.toLocaleString()} prompt. Enter the PIN on that phone and wait here for confirmation.`
                  : confirmed
                    ? "Your payment has been received. Do not pay again."
                    : (p.failureReason ?? "You can try again.")}
              </p>
              <p className="break-all text-xs text-slate-500">
                {p.interval === "ANNUAL" ? "Annual" : "Monthly"} · KES{" "}
                {p.amountKES.toLocaleString()} · Reference: {p.reference}
              </p>
              <button
                className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold underline"
                disabled={payment.isFetching}
                onClick={() => void payment.refetch()}
              >
                <RefreshCw size={14} />
                Check payment status
              </button>
              {confirmed && (
                <button
                  className="ml-4 min-h-10 text-xs font-semibold underline"
                  disabled={refreshing}
                  onClick={() => void refreshAccess()}
                >
                  {refreshing ? "Opening workspace…" : "Refresh access"}
                </button>
              )}
            </div>
          )}
          {accessMessage && (
            <p role="status" className="text-sm leading-6 text-emerald-800">
              {accessMessage}{" "}
              <a className="underline" href="/login">
                Sign in
              </a>
            </p>
          )}
          {!confirmed && (
            <button
              type="button"
              onClick={pay}
              disabled={
                stk.isPending ||
                locked ||
                !phone.trim() ||
                !amount ||
                !capabilities.data?.configured ||
                !!payment.error ||
                payment.isLoading
              }
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#203e30] px-4 text-sm font-semibold text-white transition hover:bg-[#2c513e] disabled:opacity-40"
            >
              {stk.isPending ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Sending prompt…
                </>
              ) : locked ? (
                "Payment confirmation pending"
              ) : uncertain ? (
                "I checked M-Pesa — send a new prompt"
              ) : p?.status === "FAILED" || p?.status === "CANCELLED" ? (
                "Try M-Pesa again"
              ) : (
                `Send M-Pesa prompt · KES ${amount?.toLocaleString() ?? "…"}`
              )}
            </button>
          )}
          <p className="flex items-start gap-2 text-xs leading-6 text-slate-500">
            <ShieldCheck size={17} className="mt-0.5 shrink-0" />
            One-time payment for the selected access period. We never auto-charge your M-Pesa; renew manually when access ends.
          </p>
        </div>
      </section>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Access activates after confirmation.</span>
        <a
          href={`https://wa.me/254748519923?text=${encodeURIComponent(p ? `Payment support. Reference: ${p.reference}` : "I need help with my subscription payment.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 font-medium hover:text-[#203e30]"
        >
          <MessageCircle size={14} />
          Payment support
        </a>
      </div>
    </div>
  );
}
