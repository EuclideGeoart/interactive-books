export interface Exercise { readonly prompt:string; readonly choices:readonly {label:string;correct:boolean;feedback:string}[] }
export const EXERCISES: Record<string,readonly Exercise[]> = {
  "III-01": [
    {
      "prompt": "Which quantity is learned in this affine example?",
      "choices": [
        {
          "label": "Weight and bias",
          "correct": true,
          "feedback": "Training adjusts these parameters using observed targets."
        },
        {
          "label": "The sample IDs",
          "correct": false,
          "feedback": "IDs preserve observation identity; changing an ID learns no predictor."
        },
        {
          "label": "The definition of MSE",
          "correct": false,
          "feedback": "The objective is chosen before fitting, rather than discovered by this update."
        }
      ]
    },
    {
      "prompt": "At w = 0.5, b = 0, what is the prediction for a new x = 1.5?",
      "choices": [
        {
          "label": "1.5",
          "correct": false,
          "feedback": "The input is multiplied by the weight before adding the bias."
        },
        {
          "label": "0.75",
          "correct": true,
          "feedback": "0.5 × 1.5 + 0 = 0.75. Prediction does not require a target."
        },
        {
          "label": "Undefined without a target",
          "correct": false,
          "feedback": "A target is needed to measure prediction error, not to produce a prediction."
        }
      ]
    },
    {
      "prompt": "The new query has no observed target. What can we calculate?",
      "choices": [
        {
          "label": "A prediction, but no observed residual",
          "correct": true,
          "feedback": "Inference applies the learned mapping; observed error requires an observed target."
        },
        {
          "label": "A zero residual",
          "correct": false,
          "feedback": "Missing is not zero. Substituting zero invents a measurement."
        },
        {
          "label": "A gradient from its unknown target",
          "correct": false,
          "feedback": "The supervised gradient compares predictions with observed targets."
        }
      ]
    },
    {
      "prompt": "Which observations influence the batch weight update?",
      "choices": [
        {
          "label": "Only the selected row",
          "correct": false,
          "feedback": "Selection highlights a row; this optimizer still uses the whole batch."
        },
        {
          "label": "Only rows with positive residuals",
          "correct": false,
          "feedback": "Signed contributions can reinforce or cancel; negative residuals are not discarded."
        },
        {
          "label": "All rows, weighted by their x values",
          "correct": true,
          "feedback": "dw = (2/n)Σ residual × x includes every observed row."
        }
      ]
    },
    {
      "prompt": "After one canonical update, which pair is used for inference?",
      "choices": [
        {
          "label": "w = 1.02, b = 0.16",
          "correct": true,
          "feedback": "Training returns changed parameters; inference uses those values without another update."
        },
        {
          "label": "w = 0.5, b = 0 forever",
          "correct": false,
          "feedback": "The old parameters are preserved in history, but they are not the latest state."
        },
        {
          "label": "x = 1.02, y = 0.16",
          "correct": false,
          "feedback": "These numbers are parameters, not a newly fabricated observation."
        }
      ]
    }
  ],
  "III-02": [
    {
      "prompt": "For four samples and two features, what is X’s shape?",
      "choices": [
        {
          "label": "2 × 4",
          "correct": false,
          "feedback": "That transposes the batch convention: each sample occupies one row."
        },
        {
          "label": "4 × 2",
          "correct": true,
          "feedback": "Four sample rows, two feature columns; a compatible weight column is 2 × 1."
        },
        {
          "label": "4 × 1",
          "correct": false,
          "feedback": "4 × 1 is the scalar-target column, not a two-feature batch."
        }
      ]
    },
    {
      "prompt": "What does X₂₁ mean in this chapter’s one-based notation?",
      "choices": [
        {
          "label": "Feature 1 of sample 2",
          "correct": true,
          "feedback": "The first index selects a sample row; the second selects a feature column."
        },
        {
          "label": "Sample 1’s target",
          "correct": false,
          "feedback": "Targets are stored separately in y."
        },
        {
          "label": "Weight 2",
          "correct": false,
          "feedback": "X contains observed features, not trainable coefficients."
        }
      ]
    },
    {
      "prompt": "A practice-task count is entered as 2.5. What should happen?",
      "choices": [
        {
          "label": "Round silently to 3",
          "correct": false,
          "feedback": "Rounding changes the observation without permission and hides the schema error."
        },
        {
          "label": "Accept because binary64 stores it",
          "correct": false,
          "feedback": "Representable numbers can still violate an integer semantic type."
        },
        {
          "label": "Reject with the previous valid value retained",
          "correct": true,
          "feedback": "A count is an integer. Numeric representability is not sufficient validity."
        }
      ]
    },
    {
      "prompt": "In this sheet’s “No observed target” mode, all active samples are unlabelled. How is y represented?",
      "choices": [
        {
          "label": "As absent, with a reason",
          "correct": true,
          "feedback": "Missing targets are not invented. An unsupervised goal must be specified."
        },
        {
          "label": "As zero for each sample",
          "correct": false,
          "feedback": "Zero is a real observed quantity and would change the learning problem."
        },
        {
          "label": "As an empty string meaning category zero",
          "correct": false,
          "feedback": "An empty string is neither an observed label nor a missing-value policy here."
        }
      ]
    },
    {
      "prompt": "Does adding sleep-time hours mean the target now has three columns?",
      "choices": [
        {
          "label": "Yes, one target per feature",
          "correct": false,
          "feedback": "The number of input features does not determine the number of outputs."
        },
        {
          "label": "No, a scalar target still has shape n × 1",
          "correct": true,
          "feedback": "Input dimensionality d and output dimensionality are separate choices."
        },
        {
          "label": "No, the target must be transposed to 1 × n",
          "correct": false,
          "feedback": "Targets remain a column under this contract; no transpose is needed."
        }
      ]
    }
  ],
  "III-03": [
    {
      "prompt": "Labels 0 and 1 denote two email categories. What is the task?",
      "choices": [
        {
          "label": "Regression because storage is numeric",
          "correct": false,
          "feedback": "Numeric codes do not turn categories into measured amounts."
        },
        {
          "label": "Classification because the targets are category identifiers",
          "correct": true,
          "feedback": "Semantics decide: the goal predicts a category from observed labels."
        },
        {
          "label": "Unsupervised because there are only two labels",
          "correct": false,
          "feedback": "The labels supply supervision regardless of how many categories exist."
        }
      ]
    },
    {
      "prompt": "A target is a measured proportion that may be 0.4. What is the task?",
      "choices": [
        {
          "label": "Regression",
          "correct": true,
          "feedback": "A measured proportion is a numeric amount, even when bounded by 0 and 1."
        },
        {
          "label": "Binary classification",
          "correct": false,
          "feedback": "Intermediate measured values are not category identifiers."
        },
        {
          "label": "Unsupervised clustering",
          "correct": false,
          "feedback": "The supplied targets and prediction goal make this supervised."
        }
      ]
    },
    {
      "prompt": "A dataset has labels, but the chosen goal groups rows using only features. Which description applies?",
      "choices": [
        {
          "label": "Every use of that file is supervised",
          "correct": false,
          "feedback": "Supervision describes information used by the goal, not every column in the file."
        },
        {
          "label": "Unsupervised exploration for this goal",
          "correct": true,
          "feedback": "This grouping goal deliberately ignores the recorded labels."
        },
        {
          "label": "Regression because grouping has a count",
          "correct": false,
          "feedback": "Counting groups does not make the predicted object a measured target."
        }
      ]
    },
    {
      "prompt": "What is missing from a purely unsupervised grouping dataset?",
      "choices": [
        {
          "label": "All numerical features",
          "correct": false,
          "feedback": "Unsupervised methods still use features, often numeric ones."
        },
        {
          "label": "Sample identity",
          "correct": false,
          "feedback": "Rows still need identity and provenance."
        },
        {
          "label": "An observed target used to grade each prediction",
          "correct": true,
          "feedback": "The goal explores structure without a supplied supervised target column."
        }
      ]
    },
    {
      "prompt": "Can the values [0, 1, 0] alone determine the learning task?",
      "choices": [
        {
          "label": "Yes, always binary classification",
          "correct": false,
          "feedback": "Those values could also be measured quantities; codes alone do not settle semantics."
        },
        {
          "label": "No, we need target meaning and the intended goal",
          "correct": true,
          "feedback": "Ask what the numbers denote and whether the goal uses them as targets."
        },
        {
          "label": "Yes, always regression",
          "correct": false,
          "feedback": "They could be category identifiers; arithmetic storage is not an instruction to regress."
        }
      ]
    }
  ],
  "III-04": [
    {
      "prompt": "What is the test set’s role after model choices are made?",
      "choices": [
        {
          "label": "Choose every learning rate repeatedly",
          "correct": false,
          "feedback": "Repeated selection makes the set part of model development."
        },
        {
          "label": "Fit preprocessing on its labels",
          "correct": false,
          "feedback": "Reading held-out labels contaminates evaluation."
        },
        {
          "label": "Evaluate the chosen procedure without using it for tuning",
          "correct": true,
          "feedback": "An untouched test set evaluates the procedure selected using training and validation."
        }
      ]
    },
    {
      "prompt": "Two rows are repeated measurements of the same entity. How should a group split handle them?",
      "choices": [
        {
          "label": "Keep their group together",
          "correct": true,
          "feedback": "Group membership is the independent unit in this experiment."
        },
        {
          "label": "Split by row ID to guarantee independence",
          "correct": false,
          "feedback": "Different IDs do not make correlated measurements independent."
        },
        {
          "label": "Duplicate them in all partitions",
          "correct": false,
          "feedback": "Copies across partitions leak the entity’s information."
        }
      ]
    },
    {
      "prompt": "For seed 42, train x = [1, 3] and held-out x = 11. Which centering mean is honest?",
      "choices": [
        {
          "label": "5, from all three values",
          "correct": false,
          "feedback": "That reads the validation input before the evaluation procedure is fixed."
        },
        {
          "label": "2, from training only",
          "correct": true,
          "feedback": "(1 + 3)/2 = 2; freeze that training statistic for held-out transformations."
        },
        {
          "label": "11, from the held-out value",
          "correct": false,
          "feedback": "Using the held-out row to fit centering contaminates its evaluation."
        }
      ]
    },
    {
      "prompt": "In the centering example, leakage changes validation MSE from 0 to 9. Is it acceptable?",
      "choices": [
        {
          "label": "Yes, because it makes the score worse",
          "correct": false,
          "feedback": "Validity depends on information flow, not whether the number improved."
        },
        {
          "label": "No, held-out information was still used to fit preprocessing",
          "correct": true,
          "feedback": "Feature leakage invalidates the evaluation even when it harms performance."
        },
        {
          "label": "Yes, because no target was read",
          "correct": false,
          "feedback": "Held-out features can leak too; target leakage is not the only form."
        }
      ]
    },
    {
      "prompt": "The training partition becomes empty. What is its mean baseline?",
      "choices": [
        {
          "label": "Zero",
          "correct": false,
          "feedback": "The mean of no observations has no denominator; zero invents a baseline."
        },
        {
          "label": "The mean of validation labels",
          "correct": false,
          "feedback": "That would use held-out labels as training information."
        },
        {
          "label": "Undefined, with a visible reason",
          "correct": true,
          "feedback": "An empty training set cannot fit a mean predictor."
        }
      ]
    }
  ],
  "III-05": [
    {
      "prompt": "Which pair separates parameters from a hyperparameter in this loop?",
      "choices": [
        {
          "label": "w and b are parameters; η is a chosen hyperparameter",
          "correct": true,
          "feedback": "The update adjusts w and b; the user chooses the step-size rule."
        },
        {
          "label": "η is learned; x and y are parameters",
          "correct": false,
          "feedback": "Observed x/y are data; this loop does not optimize η."
        },
        {
          "label": "MSE is a parameter; IDs are hyperparameters",
          "correct": false,
          "feedback": "MSE is a derived objective value, and IDs preserve row identity."
        }
      ]
    },
    {
      "prompt": "The canonical squared errors sum to 20.5 over five rows. What is this loss?",
      "choices": [
        {
          "label": "20.5",
          "correct": false,
          "feedback": "That is a sum. This chapter uses the mean."
        },
        {
          "label": "2.05",
          "correct": false,
          "feedback": "That adds a one-half factor which this loss definition excludes."
        },
        {
          "label": "4.1",
          "correct": true,
          "feedback": "MSE = 20.5 / 5 = 4.1."
        }
      ]
    },
    {
      "prompt": "With dw = −5.2, db = −1.6 and η = 0.1, what are the next w and b?",
      "choices": [
        {
          "label": "−0.02 and −0.16",
          "correct": false,
          "feedback": "Those add the gradients rather than subtracting them."
        },
        {
          "label": "1.02 and 0.16",
          "correct": true,
          "feedback": "0.5 − 0.1(−5.2) = 1.02 and 0 − 0.1(−1.6) = 0.16, both from the old state."
        },
        {
          "label": "1.02 and a recomputed new-state bias gradient",
          "correct": false,
          "feedback": "This full-batch update uses both old-state partial derivatives simultaneously."
        }
      ]
    },
    {
      "prompt": "Does an allowed η = 1 guarantee a lower MSE?",
      "choices": [
        {
          "label": "Yes, because it is positive",
          "correct": false,
          "feedback": "A local descent direction does not certify a large finite step."
        },
        {
          "label": "No, a step can overshoot",
          "correct": true,
          "feedback": "The one-sample example raises loss from 1 to 81."
        },
        {
          "label": "Yes, because immutable history stabilizes gradients",
          "correct": false,
          "feedback": "Snapshots protect history, not the mathematical stability of the optimizer."
        }
      ]
    },
    {
      "prompt": "If every residual is zero, what does the analytical update do?",
      "choices": [
        {
          "label": "Leaves w and b unchanged",
          "correct": true,
          "feedback": "Both gradients are sums of zero residual contributions."
        },
        {
          "label": "Changes η to zero",
          "correct": false,
          "feedback": "This optimizer does not learn the learning rate."
        },
        {
          "label": "Adds one to each parameter to continue learning",
          "correct": false,
          "feedback": "Moving a perfect-fit parameter without a gradient is not this update rule."
        }
      ]
    }
  ],
  "III-06": [
    {
      "prompt": "Which rows determine both polynomial coefficients and the honest mean baseline?",
      "choices": [
        {
          "label": "Every row, to stabilize the estimate",
          "correct": false,
          "feedback": "That contaminates held-out evaluation, even if variance decreases."
        },
        {
          "label": "Only the active training IDs",
          "correct": true,
          "feedback": "Changing membership changes the fitting sample and baseline mean together."
        },
        {
          "label": "Only validation rows",
          "correct": false,
          "feedback": "Validation evaluates candidates; its targets are not used to fit them."
        }
      ]
    },
    {
      "prompt": "Seed 0, noise 0.5: degree 8 nearly interpolates training but has validation MSE ≈ 0.3031 versus ≈ 0.0678 for degree 2. What does this show?",
      "choices": [
        {
          "label": "Zero training loss guarantees generalization",
          "correct": false,
          "feedback": "This example directly contradicts that guarantee."
        },
        {
          "label": "A higher degree always wins",
          "correct": false,
          "feedback": "Capacity is a choice to evaluate, not a quality certificate."
        },
        {
          "label": "Training fit can improve while held-out fit worsens",
          "correct": true,
          "feedback": "The degree-8 fit follows noise; held-out residuals reveal the cost."
        }
      ]
    },
    {
      "prompt": "How is the constant baseline fit under squared error?",
      "choices": [
        {
          "label": "Use the training target mean",
          "correct": true,
          "feedback": "Differentiating Σ(c − y)² gives c = the training mean."
        },
        {
          "label": "Use zero regardless of data",
          "correct": false,
          "feedback": "Zero is a possible constant, not generally the minimizing one."
        },
        {
          "label": "Use the whole-target mean including test",
          "correct": false,
          "feedback": "That uses held-out labels and makes the comparison dishonest."
        }
      ]
    },
    {
      "prompt": "One training x remains, but degree 2 requests three coefficients. What should the sheet report?",
      "choices": [
        {
          "label": "Three invented zero coefficients",
          "correct": false,
          "feedback": "Invented coefficients hide nonidentifiability."
        },
        {
          "label": "A unique quadratic through that one row",
          "correct": false,
          "feedback": "Many quadratics pass through one row."
        },
        {
          "label": "Insufficient distinct inputs for unique coefficients",
          "correct": true,
          "feedback": "A rank-deficient design needs an explicit reason; degree 0 is still fit-able."
        }
      ]
    },
    {
      "prompt": "If degrees 2 and 3 have validation MSE equal within 1e−12, which does this bounded selector choose?",
      "choices": [
        {
          "label": "Degree 3 because complexity is always better",
          "correct": false,
          "feedback": "A tie is not evidence for a more complex model."
        },
        {
          "label": "Degree 2 by the stated smallest-degree tie policy",
          "correct": true,
          "feedback": "The selector examines degrees in increasing order and requires improvement beyond 1e−12."
        },
        {
          "label": "Whichever has the best test MSE",
          "correct": false,
          "feedback": "Test outcomes must not choose the candidate."
        }
      ]
    }
  ]
};
