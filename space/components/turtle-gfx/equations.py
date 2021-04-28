import sympy
from sympy.algebras.quaternion import Quaternion

cr, sr = sympy.symbols('cr sr')
cp, sp = sympy.symbols('cp sp')
cy, sy = sympy.symbols('cy sy')
x, y, z = sympy.symbols('x y z')

q_x = Quaternion(cp, sp, 0, 0)
q_y = Quaternion(cy, 0, sy, 0)
q_z = Quaternion(cr, 0, 0, sr)

q_z * q_y * q_x

from sympy.matrices import Matrix

My = Matrix([[cy, 0, sy], [0, 1, 0], [sy, 0, cy]])
Mr = Matrix([[1, 0, 0], [0, cr, -sr], [0, sr, cr]])
Mp = Matrix([[cp, -sp, 0], [sp, cp, 0], [0, 0, 1]])

X = Matrix(3, 1, [1, 0, 0])

print("Yaw-Pitch-Roll to direction vector:")
print(Mr * Mp * My * X)
