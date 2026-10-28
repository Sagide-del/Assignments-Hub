import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { apiErrorMessage } from "../../api/axios";
import {
  independentStudentsApi,
  type TumaPayment,
} from "../../api/independent-students.api";
import { authApi } from "../../api/auth.api";
import { useAuthStore } from "../../store/auth.store";
type Interval = "MONTHLY" | "ANNUAL";
export function TrialActivationPage() {
  const userId = useAuthStore((s) => s.user?.id),
    refreshToken = useAuthStore((s) => s.refreshToken),
    setSession = useAuthStore((s) => s.setSession),
    navigate = useNavigate(),
    client = useQueryClient();
  const [interval, setInterval] = useState<Interval>("MONTHLY"),
    [phone, setPhone] = useState(""),
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
  const capabilities = useQuery({
    queryKey: ["individual-stk-capabilities"],
    queryFn: independentStudentsApi.getStkCapabilities,
  });
  const queryKey = ["individual-stk-payment", userId];
  const payment = useQuery({
    queryKey,
    queryFn: independentStudentsApi.getStkPayment,
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
      void refreshAccess();
    }
  }, [p?.status, p?.reference]);
  const stk = useMutation({
    mutationFn: () =>
      independentStudentsApi.startStkPayment({
        interval,
        phone,
        idempotencyKey: key.current,
      }),
    onSuccess: (data: TumaPayment) => {
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
    stk.mutate();
  };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#657d12]">
          Independent learner subscription
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#101820]">
          Unlock your full learning workspace
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Choose a plan and pay from a learner’s or parent’s M-Pesa number.
          Access activates after payment confirmation.
        </p>
      </header>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b p-5 sm:px-7">
          <Smartphone className="text-emerald-700" size={24} />
          <div>
            <h2 className="font-semibold">M-Pesa STK Push</h2>
            <p className="mt-1 text-xs text-slate-500">
              Powered by Tuma · payment completed on your phone
            </p>
          </div>
        </div>
        <div className="space-y-5 p-5 sm:p-7">
          <div className="grid grid-cols-2 gap-3">
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
                className={`min-h-20 rounded-xl border p-4 text-left disabled:opacity-60 ${interval === option ? "border-[#8cb500] bg-[#faffeb]" : "border-slate-200"}`}
              >
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {option === "ANNUAL" ? "Annual" : "Monthly"}
                </span>
                <span className="mt-1 block font-semibold">
                  KES{" "}
                  {(option === "ANNUAL"
                    ? paymentInfo?.annualAmountKES
                    : paymentInfo?.monthlyAmountKES
                  )?.toLocaleString() ?? "…"}
                </span>
              </button>
            ))}
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
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 disabled:bg-slate-50"
            />
            <span className="mt-2 block text-xs font-normal text-slate-500">
              You can use a parent’s number. Enter the M-Pesa PIN only in the
              prompt on that phone.
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
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#101820] px-5 text-sm font-bold text-white disabled:opacity-40"
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
            <ShieldCheck size={17} className="mt-1 shrink-0" />
            Each payment purchases one subscription period. This does not enable
            automatic M-Pesa deductions.
          </p>
        </div>
      </section>
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <MessageCircle size={16} />
        If you were charged but access is pending, contact support with your
        M-Pesa receipt and payment reference.
      </p>
    </div>
  );
}
