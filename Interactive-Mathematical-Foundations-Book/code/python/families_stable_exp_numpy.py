import numpy as np

# Scores ("logits") from a model. Softmax turns them into probabilities: exp(s_i) / sum_j exp(s_j).
logits = np.array([1000.0, 1001.0, 1002.0])

# e^1000 is far above the largest double (about 1.8e308), so NumPy returns inf, and inf / inf is nan.
with np.errstate(over="ignore", invalid="ignore"):
    naive = np.exp(logits) / np.exp(logits).sum()  # [nan nan nan]

# The probabilities do not change if every score is shifted by the same amount: e^(s - m) / sum e^(s_j - m) = e^s / sum e^(s_j).
# Shift by the largest score m, so the largest exponent is e^0 = 1 and nothing can overflow.
shifted = np.exp(logits - logits.max())
stable = shifted / shifted.sum()  # [0.09003057 0.24472847 0.66524096]

# The same idea for log(sum(exp(s))): m + log(sum(exp(s - m))).
log_sum_exp = logits.max() + np.log(shifted.sum())  # 1002.4076059644444

print(naive, stable, log_sum_exp)
