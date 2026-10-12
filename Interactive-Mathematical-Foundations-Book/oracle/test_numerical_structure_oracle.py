import subprocess,sys,unittest
from pathlib import Path
from numerical_structure_oracle import sparse,tensor,rng,payload
ROOT=Path(__file__).resolve().parents[1]
class StructureTests(unittest.TestCase):
    def test_sparse_literals(self):
        s={'rows':3,'cols':3,'entries':'0,0,2;0,0,-2;1,2,3;2,2,0','vector':'1,2,3','threshold':'1e-6'};m=sparse(s)
        self.assertEqual(m['indptr'],[0,0,1,1]);self.assertEqual(m['result'],['0','9','0']);self.assertEqual(m['nnz'],1)
        self.assertEqual(sparse({**s,'entries':'0,0,1e-8'})['nearZero'],1)
        with self.assertRaises(ValueError):sparse({**s,'entries':'3,0,1'})
    def test_broadcast_literals(self):
        t={'left':'(2,3)','right':'(3,)','axis':'1','operation':'add','aStart':1,'bStart':10}
        m=tensor(t);self.assertEqual(m['values'],['11','13','15','14','16','18']);self.assertEqual(m['reduction']['values'],['39','48'])
        self.assertEqual(tensor({**t,'right':'(2,)'})['kind'],'incompatible')
        self.assertEqual(tensor({**t,'left':'(0,3)','right':'(1,3)','axis':'0'})['reduction']['values'],['0','0','0'])
    def test_rng_literals_and_suffix(self):
        values=rng(42,6);self.assertEqual([r['after'] for r in values],[1083814273,378494188,2479403867,955863294,1613448261,110225632])
        self.assertEqual([r['after'] for r in rng(values[1]['after'],4)],[r['after'] for r in values[2:]])
        self.assertEqual(rng(4294967295,1)[0]['after'],1012239698)
    def test_numpy_crosscheck(self):
        try:import numpy as np
        except ImportError:self.skipTest('NumPy unavailable; primary fixtures remain stdlib')
        for case in payload()['tensors']:
            s,e=case['input'],case['expected']
            if e['kind']!='valid':continue
            parse=lambda text:tuple(int(d) for d in text.strip('()').split(',') if d)
            ash,bsh=parse(s['left']),parse(s['right']);a=(np.arange(np.prod(ash,dtype=int))+s['aStart']).reshape(ash);b=(np.arange(np.prod(bsh,dtype=int))+s['bStart']).reshape(bsh)
            result=a+b if s['operation']=='add' else a*b
            self.assertEqual(list(result.shape),e['outShape']);self.assertEqual(list(map(str,result.flatten().tolist())),e['values'])
            if e['reduction']['kind']=='valid':
                r=result.sum(axis=None if s['axis']=='all' else int(s['axis']));self.assertEqual(list(r.shape),e['reduction']['shape']);self.assertEqual(list(map(str,r.reshape(-1).tolist())),e['reduction']['values'])
    def test_six_executed_references(self):
        for name in ['sparse_matrices.py','sparse_matrices_numpy.py','vectorized_computation.py','vectorized_computation_numpy.py','reproducibility_seeds.py','reproducibility_seeds_numpy.py']:
            with self.subTest(reference=name):subprocess.run([sys.executable,str(ROOT/'code/python'/name)],check=True,stdout=subprocess.DEVNULL)
if __name__=='__main__':unittest.main()
