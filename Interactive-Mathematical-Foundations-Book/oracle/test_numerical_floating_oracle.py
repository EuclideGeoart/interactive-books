import math
from fractions import Fraction as F
import struct
import subprocess
import sys
import unittest
from pathlib import Path
from numerical_floating_oracle import encode,decode,payload
ROOT=Path(__file__).resolve().parents[1]
class FloatingOracleTests(unittest.TestCase):
    def test_literals(self):
        self.assertEqual(encode(F(1),'fp16'),0x3c00)
        self.assertEqual(encode(F(1),'bf16'),0x3f80)
        self.assertEqual(encode(F(1,10),'binary64'),0x3fb999999999999a)
        self.assertEqual(encode(F(2049,2048),'fp16'),0x3c00)
        self.assertEqual(encode(F(2051,2048),'fp16'),0x3c02)
        self.assertEqual(encode(F(1,2**25),'fp16'),0)
        self.assertEqual(encode(F(3,2**25),'fp16'),2)
        self.assertEqual(encode(F(65520),'fp16'),0x7c00)
        self.assertEqual(encode(F(0),'fp16',True),0x8000)
    def test_struct_crosscheck(self):
        for fmt,pack,unpack in [('binary64','d','Q'),('binary32','f','I'),('fp16','e','H')]:
            for value in [0.,.1,.2,1.,1.5,-3.5,100.]:
                self.assertEqual(encode(F.from_float(value),fmt),struct.unpack('>'+unpack,struct.pack('>'+pack,value))[0])
    def test_direct_double_rounding_counterexample(self):
        self.assertEqual(encode(F('1.000488281250000000000000000001'),'fp16'),0x3c01)
        self.assertEqual(encode(F.from_float(float('1.000488281250000000000000000001')),'fp16'),0x3c00)
    def test_decimal_references(self):
        values=payload()['radicals'];self.assertEqual(values[0]['reference'],'1')
        self.assertAlmostEqual(float(values[3]['reference']),4.9999999875e-5,places=19)
    def test_executed_references(self):
        names=['floating_point_representation.py','floating_point_representation_numpy.py','rounding_representation_error.py','rounding_representation_error_numpy.py','error_conditioning.py','error_conditioning_numpy.py','catastrophic_cancellation.py','catastrophic_cancellation_numpy.py']
        for name in names:
            with self.subTest(reference=name):subprocess.run([sys.executable,str(ROOT/'code/python'/name)],check=True,stdout=subprocess.DEVNULL)
if __name__=='__main__':unittest.main()
