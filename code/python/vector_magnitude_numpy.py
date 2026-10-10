import numpy as np

# The practical form: once the mechanism is clear, the library does the bookkeeping.
v = np.array([3.0, 2.0])

magnitude = np.linalg.norm(v)  # ‖v‖₂
angle = np.arctan2(v[1], v[0])  # radians, in (−π, π]

print(magnitude, angle)  # 3.605551275463989 0.5880026035475675
