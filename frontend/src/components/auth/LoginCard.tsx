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
}


interface FormState {
  schoolCode: string;
  email: string;
  independentIdentifier: string;
  password: string;
  admissionNumber: string;
}



export function LoginCard({
  loginType,
  setLoginType,
}: Props) {


  const navigate = useNavigate();


  const [form, setForm] = useState<FormState>({
    schoolCode: '',
    email: '',
    independentIdentifier: '',
    password: '',
    admissionNumber: '',
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
          ? await loginStudent(form.schoolCode, form.admissionNumber)
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
            ? 'Invalid school code or admission number'
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
        Welcome Back
      </h2>


      <p
        className="
          text-center
          text-gray-500
          mt-3
        "
      >
        Sign in to your account
      </p>



      {/* LOGIN TYPE TABS */}

      <div className="mt-8">

        <LoginTabs
          loginType={loginType}
          setLoginType={setLoginType}
        />

      </div>




      {/* FORM */}

      <form
        onSubmit={submitLogin}
        className="mt-8 space-y-5"
      >



        {loginType !== 'independent' ? (
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

          <input
            name="admissionNumber"
            placeholder="Admission Number"
            value={form.admissionNumber}
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

        {loginType === 'independent' ? 'New individual learner?' : 'Learning independently?'}
        <Link
          to="/register"
          className="ml-1 font-semibold text-[#6F9300] hover:underline"
        >
          Create an account
        </Link>

      </p>


    </div>

  );

}
