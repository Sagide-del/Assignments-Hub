"""Bounded mathematical parsing. Never eval/sympify untrusted source text."""
import ast
import json
import math
import re
from collections import Counter
import sympy as sp

class Unsupported(ValueError):
    pass

def expression(text):
    if not isinstance(text, str) or not 0 < len(text) <= 500:
        raise Unsupported('Expression is missing or too long')
    text = text.strip().replace('^', '**').replace('×', '*').replace('÷', '/')
    text = re.sub(r'(?<=\d)(?=[a-zA-Z(])', '*', text)
    text = re.sub(r'(?<=\))(?=[a-zA-Z(])', '*', text)
    if not re.fullmatch(r'[A-Za-z0-9+*/().,\s-]+', text):
        raise Unsupported('Unsupported expression characters')
    tree = ast.parse(text, mode='eval')
    if len(list(ast.walk(tree))) > 100:
        raise Unsupported('Expression is too complex')
    def node(n):
        if isinstance(n, ast.Constant) and type(n.value) in (int, float):
            if not math.isfinite(n.value) or abs(n.value) > 1000000:
                raise Unsupported('Number out of bounds')
            return sp.Rational(str(n.value))
        if isinstance(n, ast.Name):
            if n.id == 'pi': return sp.pi
            if re.fullmatch('[a-z]', n.id): return sp.Symbol(n.id, real=True)
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.UAdd, ast.USub)):
            v = node(n.operand)
            return v if isinstance(n.op, ast.UAdd) else -v
        if isinstance(n, ast.BinOp):
            a, b = node(n.left), node(n.right)
            if isinstance(n.op, ast.Add): return a + b
            if isinstance(n.op, ast.Sub): return a - b
            if isinstance(n.op, ast.Mult): return a * b
            if isinstance(n.op, ast.Div):
                if b == 0: raise Unsupported('Division by zero')
                return a / b
            if isinstance(n.op, ast.Pow) and b.is_number and abs(b) <= 20:
                if a == 0 and b <= 0: raise Unsupported('Undefined power')
                return a ** b
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'sqrt' and len(n.args) == 1 and not n.keywords:
            return sp.sqrt(node(n.args[0]))
        raise Unsupported('Unsupported mathematical syntax')
    result = node(tree.body)
    if result.has(sp.zoo, sp.nan, sp.oo, -sp.oo) or len(result.free_symbols) > 4:
        raise Unsupported('Undefined or overly complex expression')
    return result

def algebra(text):
    if text.count('=') == 1:
        left, right = text.split('=')
        difference = expression(left) - expression(right)
        symbols = list(difference.free_symbols)
        if len(symbols) != 1: raise Unsupported('Use one unknown per equation')
        x = symbols[0]
        polynomial = sp.Poly(difference, x)
        if polynomial.degree() > 3: raise Unsupported('Equation degree exceeds limit')
        roots = sp.solve(difference, x)
        if len(roots) != 1 or roots[0].free_symbols or roots[0].is_real is False:
            raise Unsupported('Only equations with one real solution are supported')
        answer = f'{x} = {roots[0]}'
        return {'correct_answer': answer, 'step_by_step_solution': [f'Bring both sides together: {difference} = 0.', f'Solve for {x}: {answer}.', f'Substitute {roots[0]} in the original equation to check equality.']}
    value = sp.simplify(expression(text))
    return {'correct_answer': str(value), 'step_by_step_solution': [f'Simplify {text}.', f'Combine like terms using exact arithmetic: {value}.']}

def matrix_value(text):
    tree = ast.parse(text, mode='eval')
    if not isinstance(tree.body, ast.List) or not 1 <= len(tree.body.elts) <= 4:
        raise Unsupported('Use a matrix with 1–4 rows')
    rows = []
    for row in tree.body.elts:
        if not isinstance(row, ast.List) or not 1 <= len(row.elts) <= 4:
            raise Unsupported('Use 1–4 columns')
        values = [expression(ast.unparse(v)) for v in row.elts]
        if any(v.free_symbols for v in values): raise Unsupported('Use numeric matrix entries')
        rows.append(values)
    if len({len(r) for r in rows}) != 1: raise Unsupported('Matrix rows must have equal length')
    return sp.Matrix(rows)

def matrix(text):
    match = re.fullmatch(r'\s*(det|inverse)\((\[.*\])\)\s*', text)
    operation, value = (match.group(1), match.group(2)) if match else ('det', text)
    m = matrix_value(value)
    if m.rows != m.cols: raise Unsupported('Use a square matrix')
    determinant = m.det()
    if operation == 'inverse':
        if determinant == 0: raise Unsupported('This matrix has no inverse')
        answer = str(m.inv().tolist())
    else: answer = str(determinant)
    return {'correct_answer': answer, 'step_by_step_solution': [f'Matrix dimensions: {m.rows} × {m.cols}.', f'Determinant = {determinant}.', f'{operation} result: {answer}.']}

ELEMENTS = set('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split())
def formula(text):
    if len(text)>80 or not re.fullmatch(r'[A-Za-z0-9()]+',text): raise Unsupported('Unsupported chemical formula')
    tokens = re.findall(r'[A-Z][a-z]?|\d+|[()]',text)
    if ''.join(tokens)!=text: raise Unsupported('Invalid chemical formula')
    stack=[Counter()]; i=0
    while i<len(tokens):
        t=tokens[i]
        if t=='(':
            if len(stack)>=5: raise Unsupported('Formula nesting limit')
            stack.append(Counter());i+=1;continue
        if t==')':
            if len(stack)<2 or not stack[-1]: raise Unsupported('Invalid group')
            group=stack.pop();i+=1;count=int(tokens[i]) if i<len(tokens) and tokens[i].isdigit() else 1
            if i<len(tokens) and tokens[i].isdigit():i+=1
            if not 1<=count<=100:raise Unsupported('Atom count limit')
            stack[-1].update({k:v*count for k,v in group.items()});continue
        if t not in ELEMENTS:raise Unsupported('Unknown element')
        i+=1;count=int(tokens[i]) if i<len(tokens) and tokens[i].isdigit() else 1
        if i<len(tokens) and tokens[i].isdigit():i+=1
        if not 1<=count<=100:raise Unsupported('Atom count limit')
        stack[-1][t]+=count
    if len(stack)!=1 or not stack[0]:raise Unsupported('Unclosed group')
    return stack[0]

def reaction(text):
    if len(text)>500 or text.count('->')!=1:raise Unsupported('Use reactants -> products')
    left,right=text.split('->');parts=[]
    for side in (left,right):
        row=[]
        for item in side.split('+'):
            m=re.fullmatch(r'\s*(\d+)?\s*([A-Za-z0-9()]+)\s*',item)
            if not m:raise Unsupported('Invalid reaction')
            coeff=int(m[1] or 1)
            if not 1<=coeff<=10000:raise Unsupported('Coefficient limit')
            row.append((m[2],coeff,formula(m[2])))
        if len(row)>6 or len(set(v[0] for v in row))!=len(row):raise Unsupported('Too many or duplicate species')
        parts.append(row)
    return parts

def chemical(text):
    left,right=reaction(text);species=left+right;elements=sorted(set().union(*(c.keys() for _,_,c in species)))
    conservation=sp.Matrix([[c.get(e,0)*(1 if i<len(left) else -1) for i,(_,_,c) in enumerate(species)] for e in elements])
    basis=conservation.nullspace()
    if len(basis)!=1:raise Unsupported('Reaction is impossible or underdetermined')
    v=basis[0];scale=sp.ilcm(*[x.q for x in v]);numbers=[int(x*scale) for x in v]
    if all(x<0 for x in numbers):numbers=[-x for x in numbers]
    if any(x<=0 or x>10000 for x in numbers):raise Unsupported('No positive bounded balance')
    gcd=math.gcd(*numbers);numbers=[n//gcd for n in numbers]
    terms=[('' if n==1 else str(n))+s[0] for n,s in zip(numbers,species)]
    answer=' + '.join(terms[:len(left)])+' -> '+' + '.join(terms[len(left):])
    return {'correct_answer':answer,'step_by_step_solution':[f'Count each element: {", ".join(elements)}.','Solve the atom-conservation equations with positive whole-number coefficients.',f'Reduce to the smallest whole-number ratio: {answer}.']}

def equivalent(kind,student,verified):
    if kind=='chemical_equation':
        def normalized(text):
            sides=reaction(text);g=math.gcd(*(n for side in sides for _,n,_ in side));return tuple(tuple(sorted((s,n//g) for s,n,_ in side)) for side in sides)
        return normalized(student)==normalized(verified)
    if kind=='matrix' and verified.strip().startswith('['):return matrix_value(student)==matrix_value(verified)
    def answer(text):
        if '=' in text:
            solved=algebra(text)['correct_answer'];return expression(solved.split('=',1)[1])
        return expression(text)
    return sp.simplify(answer(student)-answer(verified))==0

def dispatch(payload):
    if payload['action']=='solve':return {'algebra':algebra,'matrix':matrix,'chemical_equation':chemical}[payload['question_type']](payload['expression'])
    try:correct=equivalent(payload['question_type'],payload['student_answer'],payload['verified_answer'])
    except (Unsupported, SyntaxError, ValueError, TypeError, sp.PolynomialError):correct=False
    return {'correct':bool(correct)}
