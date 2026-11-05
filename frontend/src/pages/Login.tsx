import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { LoginCard } from "../components/auth/LoginCard";
import { AuthFrame } from "../components/auth/AuthFrame";
import type { LoginType } from "../components/auth/LoginTabs";
export default function Login() {
  const { schoolCode } = useParams<{ schoolCode?: string }>(),
    [params] = useSearchParams(),
    navigate = useNavigate();
  const fixedSchoolCode = schoolCode?.trim().toUpperCase();
  const account: LoginType = fixedSchoolCode
    ? "student"
    : params.get("account") === "staff"
      ? "staff"
      : params.get("account") === "independent"
        ? "independent"
        : "student";
  return (
    <AuthFrame account={account} mode="login" fixedSchoolCode={fixedSchoolCode}>
      <LoginCard
        key={`${account}:${fixedSchoolCode ?? ""}`}
        embedded
        loginType={account}
        setLoginType={(type) => navigate(`/login?account=${type}`)}
        fixedSchoolCode={fixedSchoolCode}
      />
    </AuthFrame>
  );
}
