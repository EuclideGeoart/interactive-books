import math

# A 2D vector is stored as two components. Here: v = (3, 2).
x = 3.0
y = 2.0

# Pythagoras: the hypotenuse of the right triangle with legs |x| and |y|.
magnitude = math.sqrt(x * x + y * y)  # ‖v‖ = √(x² + y²)

# atan2 knows the quadrant of (x, y); atan(y / x) does not.
angle = math.atan2(y, x)  # radians, in (−π, π]

print(magnitude, angle)  # 3.605551275463989 0.5880026035475675
