import math

# A displacement vector says "go 3 right and 2 up". It is not a place.
v = (3.0, 2.0)

# Drawn from the origin, the arrow ends at the point (3, 2) ...
tip_from_origin = (0.0 + v[0], 0.0 + v[1])

# ... drawn from another tail P = (1, -1), the SAME displacement ends at a different point Q = P + v.
P = (1.0, -1.0)
tip_from_other_tail = (P[0] + v[0], P[1] + v[1])  # (4.0, 1.0)

# The displacement is recovered from the two points as Q - P: it does not depend on where the arrow starts.
v_from_other_tail = (tip_from_other_tail[0] - P[0], tip_from_other_tail[1] - P[1])  # (3.0, 2.0)

magnitude = math.hypot(*v_from_other_tail)  # the length is a property of v, not of P

print(tip_from_origin, tip_from_other_tail, v_from_other_tail, magnitude)
