"""Exact unsigned 32-bit LCG matching the frozen Book III seed contract."""
def lcg(seed):
    if type(seed) is not int or not 0 <= seed <= 0xffffffff:
        raise ValueError('Seed must be an unsigned 32-bit integer')
    state = seed
    while True:
        state = (1664525 * state + 1013904223) & 0xffffffff
        yield state / 4294967296
