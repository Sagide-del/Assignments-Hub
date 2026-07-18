export type LoginType = 'student' | 'staff';

interface Props {
  loginType: LoginType;
  setLoginType: (type: LoginType) => void;
}

export function LoginTabs({ loginType, setLoginType }: Props) {
  return (
    <div className="flex border rounded-xl overflow-hidden mt-8">
      <button
        type="button"
        onClick={() => setLoginType('student')}
        className={`flex-1 py-3 font-medium transition ${
          loginType === 'student' ? 'bg-[#B5E61D]' : 'bg-white hover:bg-gray-50'
        }`}
      >
        Student
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
