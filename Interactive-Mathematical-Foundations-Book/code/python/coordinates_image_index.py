import numpy as np

H, W = 4, 5
img = np.arange(H * W).reshape(H, W)  # img[row, col]: row 0 is the TOP row, the cell number counts left to right, then down


def to_row_col(x, y, height=H):
    """Lattice point (x, y) of the math plane (y grows UP) -> array indices (row, col) (row grows DOWN)."""
    return height - 1 - y, x


x, y = 2, 0  # the bottom row of the picture
row, col = to_row_col(x, y)  # (3, 2): the last row of the array
pixel = img[row, col]  # 17
flat_index = row * W + col  # 17: the same cell in the flattened array
same_flat = img.ravel()[flat_index] == pixel  # True
back_to_y = H - 1 - row  # 0: the formula undoes itself, so the round trip returns y

# The math view of the same data: flip the rows once, then img_math[y, x] is the pixel at the point (x, y).
img_math = np.flipud(img)
same_pixel = img_math[y, x] == img[row, col]  # True

# Two classic slips.
try:
    img[H - y, x]  # off by one: row H does not exist
except IndexError:
    off_by_one_fails = True
swapped = img[x, y]  # 10: in range, no error, and a DIFFERENT pixel (row 2, column 0). A silent bug.

print(row, col, pixel, flat_index, swapped)
