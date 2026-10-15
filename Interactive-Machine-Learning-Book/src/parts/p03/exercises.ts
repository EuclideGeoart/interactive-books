interface Question {id:string;prompt:string;choices:readonly {label:string;correct:boolean;feedback:string}[]}
export const EXERCISES:Readonly<Record<string,readonly Question[]>>={
  'III-17':[
    {id:'iii17-q1',prompt:'At the original query with k=3, which observations enter the prediction?',choices:[
      {label:'s4, s2, s3',correct:true,feedback:'s4 has distance 1. s2, s3 and s5 tie at sqrt(2); ID order admits s2 and s3.'},
      {label:'Every A observation',correct:false,feedback:'Neighbors are selected by feature distance before their categories are counted. Category does not choose the neighborhood.'},
      {label:'s4, s5, s6',correct:false,feedback:'Those B observations become the nearest three at query x=1.5, y=0. They are not the original query neighborhood.'}]},
    {id:'iii17-q2',prompt:'What is the unweighted regression output for original k=3?',choices:[
      {label:'6',correct:true,feedback:'The selected targets are 8, 4 and 6. Their average is (8+4+6)/3 = 6.'},
      {label:'18',correct:false,feedback:'18 is the sum of selected targets. Unweighted k-NN regression divides that sum by the number selected.'},
      {label:'A',correct:false,feedback:'A is the classification majority. Regression aggregates numerical targets rather than category identifiers.'}]},
    {id:'iii17-q3',prompt:'There are six stored observations and k=7. What does this sheet do?',choices:[
      {label:'Show an undefined prediction with a reason',correct:true,feedback:'Seven distinct stored rows cannot be selected from six. The sheet preserves k=7 and explains the failure.'},
      {label:'Silently use six neighbors',correct:false,feedback:'That would change the requested hyperparameter. A different policy could be documented, but this sheet explicitly rejects that prediction.'},
      {label:'Duplicate the nearest row',correct:false,feedback:'Repeating an existing row would invent a vote and a regression observation. It would not implement the stated selection rule.'}]},
    {id:'iii17-q4',prompt:'Two stored rows have identical coordinates but different labels. Are they one observation?',choices:[
      {label:'No: distinct IDs remain separate observations',correct:true,feedback:'Geometry alone does not erase data identity. The duplicate preset retains both rows and exposes their conflicting votes.'},
      {label:'Yes: coordinates define sample identity',correct:false,feedback:'The dataset defines identity by stable unique IDs. Deduplicating coordinates would alter both the classification vote and regression mean.'},
      {label:'The query must be undefined',correct:false,feedback:'A deterministic ID tie rule can choose or include coincident rows. Their conflict is visible rather than a numerical failure.'}]},
    {id:'iii17-q5',prompt:'How should k and feature scales be chosen for a real prediction task?',choices:[
      {label:'Using training data and a held-out validation design',correct:true,feedback:'The geometry and smoothing effect are modeling choices. Validation estimates how those choices perform beyond the stored examples.'},
      {label:'Choose the smallest training error alone',correct:false,feedback:'k=1 can memorize training observations, including their noise. Training error alone does not establish generalization.'},
      {label:'Tune on the final test outcomes repeatedly',correct:false,feedback:'Repeated test-driven choices turn the test into another validation set. Preserve an independent final evaluation.'}]},
  ],
  'III-18':[
    {id:'iii18-q1',prompt:'For differences (3,4) with unit reference scales, what are L1 and L2?',choices:[
      {label:'7 and 5',correct:true,feedback:'L1 adds absolute differences: 3+4=7. L2 takes sqrt(3²+4²)=5.'},
      {label:'5 and 7',correct:false,feedback:'This swaps the norm definitions. Euclidean distance uses the square root of a squared sum.'},
      {label:'25 and 7',correct:false,feedback:'25 is the squared Euclidean distance. The L2 distance itself is 5.'}]},
    {id:'iii18-q2',prompt:'A coordinate changes from 2 metres to 200 centimetres. How can the scaled distance remain the same?',choices:[
      {label:'Convert its 1 metre reference scale to 100 centimetres',correct:true,feedback:'Both numerator and reference scale change by 100, leaving the dimensionless ratio equal to 2.'},
      {label:'Keep the numerical reference scale equal to 1',correct:false,feedback:'That changes the reference to 1 centimetre, giving this feature 100 times the normalized difference.'},
      {label:'Add a zero target column',correct:false,feedback:'A target is not a unit conversion. Distances compare feature coordinates and their stated scales.'}]},
    {id:'iii18-q3',prompt:'What happens to raw distances when a line is embedded by adding only zero coordinates?',choices:[
      {label:'They stay unchanged',correct:true,feedback:'Every added absolute difference is zero. The intrinsic one-dimensional geometry remains the same.'},
      {label:'They must concentrate near a single value',correct:false,feedback:'Ambient dimension alone implies no universal concentration. This distribution is a concrete counterexample.'},
      {label:'They become zero',correct:false,feedback:'The original nonzero coordinate still contributes to the norm. Adding zeros cannot erase it.'}]},
    {id:'iii18-q4',prompt:'The sheet divides every L2 distance by sqrt(d). Does that change its coefficient of variation?',choices:[
      {label:'No: SD and mean share the same positive divisor',correct:true,feedback:'The common scale cancels in SD/mean. It changes numerical magnitude, not relative spread or neighbor ordering.'},
      {label:'Yes: only the mean changes',correct:false,feedback:'Standard deviation also scales by that divisor. Both numerator and denominator must be transformed.'},
      {label:'Yes: the closest point becomes farthest',correct:false,feedback:'Multiplying all distances by the same positive constant preserves their ordering.'}]},
    {id:'iii18-q5',prompt:'Under the independent uniform-coordinate model, which quantity has expectation d/3?',choices:[
      {label:'Squared Euclidean distance to the origin',correct:true,feedback:'Each uniform coordinate has E[U²]=1/3, so the expected sum of d squared coordinates is d/3.'},
      {label:'Euclidean distance itself',correct:false,feedback:'The expectation of a square root is not generally the square root of an expectation. The exact statement concerns the squared norm.'},
      {label:'Every observed distance in every dataset',correct:false,feedback:'An expectation describes a distribution. A finite seeded sample has variability, and other distributions need not obey this formula.'}]},
  ],
  'III-19':[
    {id:'iii19-q1',prompt:'Which statement correctly describes conditional independence in Naive Bayes?',choices:[
      {label:'It is the model assumption used to factor likelihoods',correct:true,feedback:'The model replaces a joint class-conditional likelihood with feature factors. Empirical features can remain correlated.'},
      {label:'The training data must actually have independent features',correct:false,feedback:'Naive Bayes can be estimated and evaluated on correlated data. A violated assumption affects interpretation and possibly accuracy, not whether counts can be entered.'},
      {label:'Class priors must be equal',correct:false,feedback:'Priors need a valid probability distribution, not equality. They are a separate factor from conditional feature likelihoods.'}]},
    {id:'iii19-q2',prompt:'With alpha=1 and class A count 6, present count 4, what is P(feature 1 present | A)?',choices:[
      {label:'5/8',correct:true,feedback:'Add one count to both binary outcomes: (4+1)/(6+2)=5/8.'},
      {label:'5/7',correct:false,feedback:'The denominator must include smoothing for both present and absent outcomes, so it increases by 2 alpha.'},
      {label:'4/6',correct:false,feedback:'4/6 is the unsmoothed estimate. It omits the chosen alpha=1 pseudocounts.'}]},
    {id:'iii19-q3',prompt:'Both classes give the observed evidence probability zero. What is the posterior?',choices:[
      {label:'Undefined; the normalizing evidence is zero',correct:true,feedback:'Bayes would divide zero scores by zero evidence. A uniform posterior would invent information rather than normalize the stated model.'},
      {label:'One half for each class by default',correct:false,feedback:'Equal zero scores do not imply a valid tie. There is no positive evidence mass to normalize.'},
      {label:'Always the class with the larger prior',correct:false,feedback:'A larger prior cannot rescue an event that the model assigns probability zero under every class.'}]},
    {id:'iii19-q4',prompt:'Two positive raw class scores underflow to zero, but their log scores are finite. What should be done?',choices:[
      {label:'Subtract the largest log score before exponentiating',correct:true,feedback:'Shifted exponentials retain relative scores. Their positive sum gives a defined normalized posterior despite raw-product underflow.'},
      {label:'Treat the evidence as structurally impossible',correct:false,feedback:'Underflow is a representation failure, not a zero-probability model event. Finite logs distinguish these cases.'},
      {label:'Multiply more small likelihoods to restore precision',correct:false,feedback:'Additional small factors make raw-product underflow worse. Log arithmetic avoids that product.'}]},
    {id:'iii19-q5',prompt:'What are the original smoothed posterior probabilities for A and B?',choices:[
      {label:'135/263 and 128/263',correct:true,feedback:'The scores are 3/32 and 4/45. Divide each by their sum 263/1440 to obtain these posterior probabilities.'},
      {label:'3/32 and 4/45',correct:false,feedback:'Those are unnormalized prior-times-likelihood scores. They do not sum to one.'},
      {label:'3/5 and 2/5',correct:false,feedback:'Those are the chosen priors. Conditioning on the observed features changes the relative class mass.'}]},
  ],
};
