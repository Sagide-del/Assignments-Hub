import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
class EngineTests(unittest.TestCase):
    def setUp(self):
        self.env=patch.dict(os.environ,{'MATH_ENGINE_TOKEN':'test-engine-secret'});self.env.start();self.client=TestClient(app);self.headers={'X-Math-Engine-Token':'test-engine-secret'}
    def tearDown(self):self.client.close();self.env.stop()
    def solve(self,kind,expression):return self.client.post('/solve',headers=self.headers,json={'question_type':kind,'expression':expression})
    def compare(self,kind,student,verified):return self.client.post('/equivalent',headers=self.headers,json={'question_type':kind,'student_answer':student,'verified_answer':verified})
    def test_algebra_and_equivalent_answers(self):
        r=self.solve('algebra','2x + 3 = 11');self.assertEqual(r.status_code,200);self.assertEqual(r.json()['correct_answer'],'x = 4');self.assertGreater(len(r.json()['step_by_step_solution']),1)
        for value in ['4','x=4','8/2','x-4=0']:self.assertTrue(self.compare('algebra',value,'x = 4').json()['correct'])
        self.assertFalse(self.compare('algebra','5','x = 4').json()['correct']);self.assertTrue(self.compare('algebra','(x+1)^2','x^2+2*x+1').json()['correct'])
    def test_balancing_and_ratio_equivalence(self):
        r=self.solve('chemical_equation','H2 + O2 -> H2O');self.assertEqual(r.status_code,200);self.assertEqual(r.json()['correct_answer'],'2H2 + O2 -> 2H2O')
        self.assertTrue(self.compare('chemical_equation','4H2 + 2O2 -> 4H2O',r.json()['correct_answer']).json()['correct']);self.assertFalse(self.compare('chemical_equation','H2 + O2 -> H2O',r.json()['correct_answer']).json()['correct'])
        self.assertEqual(self.solve('chemical_equation','Ca(OH)2 + HCl -> CaCl2 + H2O').json()['correct_answer'],'Ca(OH)2 + 2HCl -> CaCl2 + 2H2O')
    def test_matrices(self):
        self.assertEqual(self.solve('matrix','det([[1,2],[3,4]])').json()['correct_answer'],'-2')
        r=self.solve('matrix','inverse([[1,2],[3,4]])');self.assertEqual(r.status_code,200);self.assertTrue(self.compare('matrix','[[-2,1],[3/2,-1/2]]',r.json()['correct_answer']).json()['correct'])
        self.assertEqual(self.solve('matrix','inverse([[1,2],[2,4]])').status_code,422)
    def test_auth_and_unsupported_input(self):
        self.assertEqual(self.client.post('/solve',json={'question_type':'algebra','expression':'2+2'}).status_code,401)
        for text in ["__import__('os').system('id')",'x.__class__','open(1)','[x for x in range(10)]','9**(9**9)','x^2=4','1/0']:
            self.assertEqual(self.solve('algebra',text).status_code,422,text)
        self.assertEqual(self.solve('chemical_equation','H2 -> NaCl').status_code,422)
        self.assertEqual(self.solve('algebra','1'*501).status_code,422)
        self.assertFalse(self.compare('algebra',"__import__('os')",'4').json()['correct'])
if __name__=='__main__':unittest.main(failfast=True)
