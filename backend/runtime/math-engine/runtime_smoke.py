"""Build-time process/resource check; no HTTP client, credentials or AI required."""
import sys
import sympy
from main import run

def smoke():
    algebra=run({'action':'solve','question_type':'algebra','expression':'2*x+3=11'})
    chemistry=run({'action':'solve','question_type':'chemical_equation','expression':'H2 + O2 -> H2O'})
    equivalent=run({'action':'equivalent','question_type':'algebra','student_answer':'8/2','verified_answer':'x = 4'})
    if algebra['correct_answer']!='x = 4' or chemistry['correct_answer']!='2H2 + O2 -> 2H2O' or equivalent!={'correct':True}:
        raise RuntimeError('Math runtime calculation self-check failed')
    print(f'Math runtime self-check passed (Python {sys.version.split()[0]}, SymPy {sympy.__version__}).')
if __name__=='__main__':smoke()
