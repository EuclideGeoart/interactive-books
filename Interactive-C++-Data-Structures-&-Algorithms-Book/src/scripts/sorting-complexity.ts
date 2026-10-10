import '../styles/sorting.css';
import { escapeHtml as esc } from '../components/visualizers/primitives';
import { measureWork, type InputShape, type WorkCounts } from '../visualizers/sorting/complexity';

for(const root of document.querySelectorAll<HTMLElement>('[data-sorting-complexity]')) {
  const form=root.querySelector<HTMLFormElement>('form')!, output=root.querySelector<HTMLOutputElement>('output')!;
  function render() {
    if(!form.reportValidity()) return;
    const data=new FormData(form);
    try {
      const {input,rows}=measureWork(root.dataset.sortingComplexity!,Number(data.get('size')),String(data.get('shape')) as InputShape,String(data.get('target')??'missing'),Number(data.get('key-bound')??9));
      const fields:[keyof WorkCounts,string][]=[['comparisons','Key comparisons'],['swaps','Swaps'],['shifts','Shifts'],['writes','Array writes'],['bufferWrites','Temporary writes'],['passes','Passes'],['maxDepth','Max depth'],['digitReads','Digit reads'],['maximumScans','Maximum scans']];
      const peak=Math.max(1,...rows.map(r=>r.counts.comparisons));
      output.innerHTML=`<p>Input: <code>[${input.join(', ')}]</code></p><div class="sort-counts" tabindex="0" role="region" aria-label="Operation counts table"><table><caption>Actual work · n = ${input.length}</caption><thead><tr><th scope="col">Algorithm</th>${fields.map(([,label])=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr><th scope="row">${esc(row.name)}</th>${fields.map(([field])=>`<td>${row.counts[field]}${field==='comparisons'?`<span class="sort-count-bar" style="width:${100*row.counts[field]/peak}%" aria-hidden="true"></span>`:''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${rows.map(row=>`<p><strong>${esc(row.name)}:</strong> ${esc(row.detail)}</p>`).join('')}`;
    } catch(error) { output.textContent=error instanceof Error?error.message:'Unable to measure this input.'; }
  }
  form.addEventListener('submit',event=>{event.preventDefault();render();});
  form.addEventListener('change',render);
  render();
}
