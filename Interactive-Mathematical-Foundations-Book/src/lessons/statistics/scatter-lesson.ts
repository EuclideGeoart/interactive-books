import { scatter,regression,type ScatterInput } from '../../math/statistics/scatter';
import { toNumber } from '../../math/quantity/rational';
import { approx,exactRow,exactText,numericRow,parameter,steps,tex,type ProbabilityView } from '../probability/view';
export type ScatterChapter='covariance'|'regression';
export interface ScatterState extends ScatterInput {selected:number}
export const SCATTER_CANONICAL:ScatterState={xs:[-3,-1,0,1,3],ys:[-1,0,1,2,3],weights:[1,1,1,1,1],selected:4};
export const scatterSpecs={x:parameter('x','Selected x coordinate','x_i',-8,8,3,.5,2),y:parameter('y','Selected y coordinate','y_i',-8,8,3,.5,2),weight:parameter('weight','Selected observation weight','w_i',0,9,1)};
export function deriveScatterLesson(chapter:ScatterChapter,state:ScatterState){
 if(!['covariance','regression'].includes(chapter)||!Number.isInteger(state.selected)||state.selected<0||state.selected>=state.xs.length)throw new RangeError('Select an existing pair in a known chapter.');
 const fit=chapter==='regression'?regression(state):null,model=fit??scatter(state);
 const shape=model.rank===0?'Zero spread: the ellipse collapses to a point.':model.rank===1?'Singular covariance: the ellipse collapses to a line.':model.repeated?'Equal eigenvalues: a circle has no unique principal orientation.':'The ellipse aligns with the covariance principal directions.';
 const verdict=fit?(fit.unique?`Least-squares slope = ${exactText(fit.slope!)}, intercept = ${exactText(fit.intercept!)}; residual sum of squares = ${exactText(fit.rss)}.`:`All x coordinates coincide. Slope and intercept are not uniquely identifiable. Fitted values at observed x equal ${exactText(model.my.mean)}; extrapolation is not determined.`):`${shape} Covariance is symmetric and positive semidefinite by its exact centered-product construction. This one-standard-deviation shape is not a confidence region.`;
 const formula=fit?(fit.slope?`b=\\frac{S_{xy}}{S_{xx}}=${tex(fit.slope)},\\quad a=\\bar y-b\\bar x=${tex(fit.intercept!)}`:'\\text{No unique slope/intercept: }S_{xx}=0'):`\\Sigma=\\begin{bmatrix}${tex(model.mx.variance)}&${tex(model.covariance)}\\\\${tex(model.covariance)}&${tex(model.my.variance)}\\end{bmatrix}`;
 const description=`Actual pairs: ${state.xs.map((x,i)=>`(${x}, ${state.ys[i]})${fit?'':`, weight ${state.weights[i]}`}`).join('; ')}. ${verdict}`;
 const rows=fit?[exactRow('slope','b','Least-squares slope',fit.slope,'A constant x column makes slope/intercept nonidentifiable.'),exactRow('intercept','a','Least-squares intercept',fit.intercept,'Only a + b x₀ is determined.'),exactRow('rss','\\operatorname{RSS}','Residual sum of squares',fit.rss),exactRow('residual-sum','\\sum r_i','Residual sum',fit.residualSum),exactRow('orthogonality','\\sum x_i r_i','Residual orthogonality to x',fit.orthogonality),numericRow('correlation','r','Observed linear correlation',model.correlation)]
 :[exactRow('var-x','\\Sigma_{11}','Marginal x variance',model.mx.variance),exactRow('var-y','\\Sigma_{22}','Marginal y variance',model.my.variance),exactRow('covariance','\\Sigma_{12}=\\Sigma_{21}','Off-diagonal covariance',model.covariance),exactRow('determinant','\\det\\Sigma','Covariance determinant',model.determinant),numericRow('lambda-major','\\lambda_1','Largest eigenvalue',model.spectral.pairs[0]!.value),numericRow('lambda-minor','\\lambda_2','Smallest eigenvalue',model.spectral.pairs[1]!.value),numericRow('orientation','\\theta','Principal-axis orientation (radians)',model.orientation,'Repeated eigenvalues do not determine a unique orientation.')];
 const view:ProbabilityView={title:fit?'Fit actual observations; inspect every residual':'Turn centered products into a spread ellipse',verdict,description,rows,formulas:[formula,fit?`\\operatorname{RSS}=\\sum_i(y_i-\\hat y_i)^2=${tex(fit.rss)}`:'\\Sigma=\\sum_i p_i(x_i-\\mu)(x_i-\\mu)^{\\mathsf T}'],trace:steps([{title:'Read and center actual observations',detail:`Observed center = (${exactText(model.mx.mean)}, ${exactText(model.my.mean)}).`,formula:'\\mu=\\sum_i p_i x_i',values:model.x},{title:fit?'Project onto the design columns':'Accumulate centered outer products',detail:fit?'The design columns are the constant vector and the observed x coordinates. Residuals are orthogonal to both.':shape,formula},{title:fit?'Verify residual identities':'Interpret the spectrum',detail:verdict,formula:fit?'\\sum_i r_i=0,\\quad\\sum_i x_i r_i=0':'\\lambda_i\\geq0'}])};
 const points=state.xs.map((x,i)=>({x,y:state.ys[i]!,radius:fit?4:3+Math.sqrt(state.weights[i]!)*2}));
 const line=fit?.unique?[{x:-8,y:toNumber(fit.intercept!)-8*toNumber(fit.slope!)},{x:8,y:toNumber(fit.intercept!)+8*toNumber(fit.slope!)}]:null;
 const residuals=fit?points.map((p,i)=>({from:p,to:{x:p.x,y:toNumber(fit.predicted[i]!)},predicted:exactText(fit.predicted[i]!),residual:exactText(fit.residuals[i]!)})):[];
 const axes=model.repeated?[]:model.spectral.pairs.map(p=>{const length=Math.sqrt(p.value);return {from:{x:model.center.x-length*p.unit[0],y:model.center.y-length*p.unit[1]},to:{x:model.center.x+length*p.unit[0],y:model.center.y+length*p.unit[1]}};});
 const geometry=[...points,...(fit?[]:model.ellipse),...(line??[])];
 return {model,fit,view,points,line,residuals,axes,window:{xMin:Math.min(-9,...geometry.map(p=>p.x))-1,xMax:Math.max(9,...geometry.map(p=>p.x))+1,yMin:Math.min(-9,...geometry.map(p=>p.y))-1,yMax:Math.max(9,...geometry.map(p=>p.y))+1},handle:points[state.selected]!,handleLabel:`Observation ${state.selected+1}, x ${state.xs[state.selected]}, y ${state.ys[state.selected]}`,matrixText:model.matrix.values.map(row=>row.map(exactText)),pairRows:points.map((p,i)=>({index:i+1,x:p.x,y:p.y,weight:state.weights[i]!,predicted:residuals[i]?.predicted,residual:residuals[i]?.residual}))};
}
export function scatterPreset(name:string):ScatterState {
 const base={...SCATTER_CANONICAL,selected:0};
 if(name==='noiseless')return {...base,ys:[-2,0,1,2,4]};
 if(name==='outlier')return {...base,ys:[-1,0,1,2,8]};
 if(name==='degenerate')return {...base,xs:[2,2,2],ys:[1,2,4],weights:[1,1,1]};
 if(name==='singular')return {...base,xs:[-2,0,2],ys:[-2,0,2],weights:[1,1,1]};
 if(name==='zero')return {...base,xs:[2,2],ys:[3,3],weights:[1,1]};
 if(name==='repeated')return {...base,xs:[-1,1,0,0],ys:[0,0,-1,1],weights:[1,1,1,1]};
 throw new RangeError('Unknown scatter preset.');
}
