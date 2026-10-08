import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginTabs, type LoginType } from './LoginTabs';
import {
  loginStudent,
  loginStaff,
  loginIndependent,
  dashboardPathForRole,
} from '../../services/authService';
import { apiErrorMessage } from '../../api/axios';
import { Logo } from '../ui/Logo';


interface Props {
  loginType: LoginType;
  setLoginType: (type: LoginType) => void;
  fixedSchoolCode?: string;
}


interface FormState {
  schoolCode: string;
  email: string;
  independentIdentifier: string;
  password: string;
  admissionNumber: string;
  studentPin: string;
}



export function LoginCard({
  loginType,
  setLoginType,
  fixedSchoolCode,
}: Props) {


  const navigate = useNavigate();


  const [form, setForm] = useState<FormState>({
    schoolCode: fixedSchoolCode ?? '',
    email: '',
    independentIdentifier: '',
    password: '',
    admissionNumber: '',
    studentPin: '',
  });


  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);



  function handleChange(e: ChangeEvent<HTMLInputElement>) {

    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

  }




  async function submitLogin(e: FormEvent) {

    e.preventDefault();

    setError(null);
    setLoading(true);


    try {

      const user =
        loginType === 'student'
          ? await loginStudent(
              fixedSchoolCode ?? form.schoolCode,
              form.admissionNumber,
              form.studentPin || undefined,
            )
          : loginType === 'independent'
            ? await loginIndependent(form.independentIdentifier, form.password)
            : await loginStaff(form.schoolCode, form.email, form.password);


      navigate(
        dashboardPathForRole(user.role),
        {
          replace: true,
        }
      );


    } catch (err) {

      setError(
        apiErrorMessage(
          err,
          loginType === 'student'
            ? 'Invalid school code, admission number, or learner PIN'
            : loginType === 'independent'
              ? 'Invalid Student ID or password'
              : 'Invalid email or password'
        )
      );


    } finally {

      setLoading(false);

    }

  }




  return (

    <div className="w-full">


      {/* ASSIGNMENT HUB LOGIN LOGO */}

      <div className="mb-8 flex w-full justify-center">
        <Logo src="/logo.png" name="Assignment Hub" size="wordmark" />
      </div>



      {/* TITLE */}

      <h2
        className="
          text-3xl
          font-bold
          text-center
          text-gray-900
        "
      >
        {fixedSchoolCode ? 'Student Sign In' : 'Welcome Back'}
      </h2>


      <p
        className="
          text-center
          text-gray-500
          mt-3
        "
      >
        {fixedSchoolCode ? 'Enter your admission details to continue' : 'Sign in to your account'}
      </p>



      {/* LOGIN TYPE TABS */}

      {!fixedSchoolCode ? (
        <div className="mt-8">
          <LoginTabs loginType={loginType} setLoginType={setLoginType} />
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3">
          <SchoolIcon />
          <span className="text-sm font-semibold tracking-wide text-[#101820]">{fixedSchoolCode}</span>
        </div>
      )}




      {/* FORM */}

      <form
        onSubmit={submitLogin}
        className="mt-8 space-y-5"
      >



        {loginType !== 'independent' && !fixedSchoolCode ? (
          <input
            name="schoolCode"
            placeholder="School Code"
            value={form.schoolCode}
            onChange={handleChange}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            className="
              w-full
              border
              border-gray-200
              rounded-xl
              px-5
              py-4
              outline-none
              focus:border-[#B5E61D]
            "
          />
        ) : null}




        {loginType === 'student' ? (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Admission number</span>
              <input
                name="admissionNumber"
                placeholder="Enter your admission number"
                value={form.admissionNumber}
                onChange={handleChange}
                required
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                className="w-full rounded-xl border border-gray-200 px-5 py-4 text-base outline-none transition focus:border-[#B5E61D] focus:ring-4 focus:ring-[#B5E61D]/15"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Learner PIN</span>
              <input
                type="password"
                name="studentPin"
                placeholder="Enter your PIN"
                value={form.studentPin}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    studentPin: event.target.value.replace(/\D/g, '').slice(0, 8),
                  }))
                }
                required={Boolean(fixedSchoolCode)}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-200 px-5 py-4 text-base tracking-[0.25em] outline-none transition focus:border-[#B5E61D] focus:ring-4 focus:ring-[#B5E61D]/15"
              />
              {!fixedSchoolCode ? (
                <span className="mt-2 block text-xs text-slate-500">
                  Leave blank only if your school has not issued learner PINs yet.
                </span>
              ) : null}
            </label>
          </>

        ) : (

          <>

            {loginType === 'independent' ? (
              <input
                name="independentIdentifier"
                placeholder="Student ID or Email"
                value={form.independentIdentifier}
                onChange={handleChange}
                required
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                className="
                  w-full
                  border
                  border-gray-200
                  rounded-xl
                  px-5
                  py-4
                  outline-none
                  focus:border-[#B5E61D]
                "
              />
            ) : (
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="email"
                inputMode="email"
                className="
                  w-full
                  border
                  border-gray-200
                  rounded-xl
                  px-5
                  py-4
                  outline-none
                  focus:border-[#B5E61D]
                "
              />
            )}



            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="current-password"
              className="
                w-full
                border
                border-gray-200
                rounded-xl
                px-5
                py-4
                outline-none
                focus:border-[#B5E61D]
              "
            />


          </>

        )}




        {error && (

          <p className="text-sm text-red-600">
            {error}
          </p>

        )}





        <button
          type="submit"
          disabled={loading}
          className="
            w-full
            bg-[#B5E61D]
            text-black
            font-semibold
            py-4
            rounded-xl
            hover:opacity-90
            transition
            disabled:opacity-60
          "
        >

          {loading ? 'Signing in…' : 'Sign In'}

        </button>



      </form>





      {/* FOOTER MESSAGE */}

      <p
        className="
          text-center
          text-sm
          text-gray-500
          mt-8
        "
      >

        {fixedSchoolCode ? (
          <Link to="/login" className="font-semibold text-[#536D00] hover:underline">
            Use another school or account type
          </Link>
        ) : (
          <>
            {loginType === 'independent' ? 'New individual learner?' : 'Learning independently?'}
            <Link to="/register" className="ml-1 font-semibold text-[#6F9300] hover:underline">
              Create an account
            </Link>
          </>
        )}

      </p>


    </div>

  );

}

function SchoolIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#536D00]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 10 9-6 9 6-9 6-9-6Z" strokeLinejoin="round" />
      <path d="M7 13.3V18c2.8 2 7.2 2 10 0v-4.7" strokeLinecap="round" />
    </svg>
  );
}
