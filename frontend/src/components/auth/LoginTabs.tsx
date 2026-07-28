export type LoginType = 'student' | 'independent' | 'staff';

interface Props {
  loginType: LoginType;
  setLoginType: (type: LoginType) => void;
}

export function LoginTabs({ loginType, setLoginType }: Props) {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-xl border mt-8">
      <button
        type="button"
        onClick={() => setLoginType('student')}
        className={`flex-1 py-3 font-medium transition ${
          loginType === 'student' ? 'bg-[#B5E61D]' : 'bg-white hover:bg-gray-50'
        }`}
      >
        School Student
      </button>
      <button
        type="button"
        onClick={() => setLoginType('independent')}
        className={`px-2 py-3 text-sm font-medium transition ${
          loginType === 'independent' ? 'bg-[#B5E61D]' : 'bg-white hover:bg-gray-50'
        }`}
      >
        Individual
      </button>
      <button
        type="button"
        onClick={() => setLoginType('staff')}
        className={`flex-1 py-3 font-medium transition ${
          loginType === 'staff' ? 'bg-[#B5E61D]' : 'bg-white hover:bg-gray-50'
        }`}
      >
        Staff
      </button>
    </div>
  );
}
